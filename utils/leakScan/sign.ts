/**
 * Stage 4: sign convention (per file, never shared across files in a session).
 *
 * Detection ladder:
 *  1. Balance column exists -> provable via balance walk. Confidence 1.0.
 *  2. Type column exists (debit/credit) -> correlate sign with type. Confidence 0.95.
 *  3. Neither -> majority-sign heuristic + keyword anchors. If confidence < 0.8,
 *     surface one confirmation chip.
 *
 * Output outflowSign: multiply a cell's asserted sign by this to get a signed cents
 * value where OUTFLOW (spending) is negative.
 */

import { parseAmount, parseDateParts, resolveDate } from './parsers';
import type { ColumnRoles, DateOrder, RawRow, SignConvention } from './types';

const SAMPLE = 20;

const INFLOW_KEYWORDS = /\b(payroll|deposit|refund|interest|rebate|cashback|salary|dividend|reversal)\b/i;

/** Signed cents a cell asserts on its own (parentheses/minus/CRDR), or null. */
function cellSignedCents(raw: string): number | null {
  const parsed = parseAmount(raw);
  if (!parsed) return null;
  return parsed.cents * parsed.cellSign;
}

/**
 * Detect the file's sign convention. `rules` supplies a persisted answer keyed on the
 * header fingerprint (spec 6); when present it wins with full confidence.
 */
export function detectSign(
  rows: RawRow[],
  roles: ColumnRoles,
  order: DateOrder,
  ruleOutflowSign?: 1 | -1
): SignConvention {
  if (ruleOutflowSign) {
    return { outflowSign: ruleOutflowSign, method: 'heuristic', confidence: 1, needsConfirmation: false };
  }

  // Split debit/credit columns: debit is outflow by construction. outflowSign is +1
  // because we build the signed amount ourselves in row assembly (debit negative).
  if (roles.debitIndex >= 0 && roles.creditIndex >= 0) {
    return { outflowSign: 1, method: 'type', confidence: 0.98, needsConfirmation: false };
  }

  // Ladder 1: balance walk.
  if (roles.balanceIndex >= 0 && roles.amountIndex >= 0) {
    const proven = proveByBalance(rows, roles, order);
    if (proven) return proven;
  }

  // Ladder 2: type column correlation.
  if (roles.typeIndex >= 0 && roles.amountIndex >= 0) {
    const byType = proveByType(rows, roles);
    if (byType) return byType;
  }

  // Ladder 3: majority-sign heuristic + keyword anchors.
  return heuristicSign(rows, roles);
}

/**
 * Verify balance[i-1] - balance[i] == outflow over a sample. Detects sort order via
 * date monotonicity so the walk works regardless of ascending/descending export.
 */
function proveByBalance(rows: RawRow[], roles: ColumnRoles, order: DateOrder): SignConvention | null {
  const sample = rows.slice(0, Math.min(rows.length, SAMPLE + 5));
  // Sort the sample by date so consecutive balances are truly adjacent in time.
  const withDate = sample
    .map((r) => {
      const parts = parseDateParts(r[roles.dateIndex] ?? '');
      if (!parts) return null;
      const { y, mo, d } = resolveDate(parts, order);
      const bal = parseAmount(r[roles.balanceIndex] ?? '');
      const amt = parseAmount(r[roles.amountIndex] ?? '');
      if (!bal || !amt) return null;
      return { t: Date.UTC(y, mo - 1, d), balance: bal.cents * bal.cellSign, amountAbs: amt.cents, cellSign: amt.cellSign };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (withDate.length < 3) return null;
  withDate.sort((a, b) => a.t - b.t);

  // For each adjacent pair, delta = balance[i] - balance[i-1]. If delta matches the
  // cell's asserted signed amount, the cell already encodes outflow-as-negative
  // (outflowSign +1). If it matches the negated asserted amount, outflow is positive
  // in the file (outflowSign -1).
  let matchAsIs = 0;
  let matchNegated = 0;
  let compared = 0;
  for (let i = 1; i < withDate.length; i++) {
    const delta = withDate[i].balance - withDate[i - 1].balance;
    const asserted = withDate[i].amountAbs * withDate[i].cellSign;
    if (asserted === 0) continue;
    compared++;
    if (delta === asserted) matchAsIs++;
    else if (delta === -asserted) matchNegated++;
  }
  if (compared < 2) return null;

  if (matchAsIs >= matchNegated && matchAsIs / compared >= 0.7) {
    return { outflowSign: 1, method: 'balance', confidence: 1, needsConfirmation: false };
  }
  if (matchNegated > matchAsIs && matchNegated / compared >= 0.7) {
    return { outflowSign: -1, method: 'balance', confidence: 1, needsConfirmation: false };
  }
  return null;
}

/** Correlate the cell sign with a debit/credit type column over a sample. */
function proveByType(rows: RawRow[], roles: ColumnRoles): SignConvention | null {
  const sample = rows.slice(0, Math.min(rows.length, SAMPLE + 10));
  let debitPositive = 0;
  let debitNegative = 0;
  let seen = 0;
  for (const r of sample) {
    const typeCell = (r[roles.typeIndex] ?? '').toLowerCase();
    const signed = cellSignedCents(r[roles.amountIndex] ?? '');
    if (signed === null || signed === 0) continue;
    const isDebit = /\b(debit|withdrawal|d|dr)\b/.test(typeCell) || typeCell === 'd';
    const isCredit = /\b(credit|deposit|c|cr)\b/.test(typeCell) || typeCell === 'c';
    if (!isDebit && !isCredit) continue;
    seen++;
    if (isDebit) {
      if (signed > 0) debitPositive++;
      else debitNegative++;
    }
  }
  if (seen < 3) return null;
  // If debits are positive numbers, outflow is positive in file -> outflowSign -1.
  if (debitPositive > debitNegative) {
    return { outflowSign: -1, method: 'type', confidence: 0.95, needsConfirmation: false };
  }
  return { outflowSign: 1, method: 'type', confidence: 0.95, needsConfirmation: false };
}

/**
 * Majority-sign heuristic: most rows in a personal account are spending, so the
 * majority sign is outflow. Keyword anchors (payroll/deposit/refund) that sit on the
 * opposite sign confirm the read and raise confidence.
 */
function heuristicSign(rows: RawRow[], roles: ColumnRoles): SignConvention {
  let positive = 0;
  let negative = 0;
  let anchorAgree = 0;
  let anchorTotal = 0;

  for (const r of rows) {
    const signed = cellSignedCents(r[roles.amountIndex] ?? '');
    if (signed === null || signed === 0) continue;
    if (signed > 0) positive++;
    else negative++;

    const desc = (r[roles.descriptionIndex] ?? '').toString();
    if (INFLOW_KEYWORDS.test(desc)) {
      anchorTotal++;
      // Inflow keyword should sit on the minority (inflow) sign. Record which sign.
      // We resolve the outflow sign below and check agreement afterward.
    }
  }

  const total = positive + negative;
  if (total === 0) {
    return { outflowSign: -1, method: 'heuristic', confidence: 0.5, needsConfirmation: true };
  }

  // Majority sign is outflow. If negatives dominate, outflow is negative in file
  // (outflowSign +1). If positives dominate, outflow is positive (outflowSign -1).
  const outflowSign: 1 | -1 = negative >= positive ? 1 : -1;

  // Recompute keyword-anchor agreement: inflow keywords should carry the inflow sign
  // (opposite of the outflow sign in the file).
  for (const r of rows) {
    const signed = cellSignedCents(r[roles.amountIndex] ?? '');
    if (signed === null || signed === 0) continue;
    const desc = (r[roles.descriptionIndex] ?? '').toString();
    if (!INFLOW_KEYWORDS.test(desc)) continue;
    const fileOutflowIsNegative = outflowSign === 1;
    const inflowSignInFile = fileOutflowIsNegative ? 1 : -1;
    if (Math.sign(signed) === inflowSignInFile) anchorAgree++;
  }

  const majorityRatio = Math.max(positive, negative) / total;
  // Base confidence from how lopsided the majority is, boosted by anchor agreement.
  let confidence = 0.6 + 0.3 * (majorityRatio - 0.5) * 2; // 0.6..0.9 as ratio 0.5..1
  if (anchorTotal > 0) {
    const anchorRatio = anchorAgree / anchorTotal;
    confidence += 0.1 * anchorRatio;
  }
  confidence = Math.max(0.4, Math.min(0.95, confidence));

  return {
    outflowSign,
    method: 'heuristic',
    confidence,
    needsConfirmation: confidence < 0.8,
  };
}
