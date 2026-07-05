/**
 * Stage 6: netting (non-negotiable core).
 *
 * Internal transfers: chequing debit <-> card credit matched on amountCents,
 * a +/-3-day window, and a transfer keyword set. Mark internal, exclude from spend.
 * Refund netting: same normalized merchant, offsetting amounts within 14 days ->
 * paired as reversed, net contribution zero. Ambiguous (multiple candidates) rows
 * are flagged needs-review and NOT auto-netted.
 *
 * Personal rules (spec 6, pairInternal keyed on a pair signature) override the
 * automatic decision.
 */

import type { RefundPair, ScanRow, TransferPair } from './types';
import type { ScanRules } from '@/utils/scanRules';

const DAY = 24 * 60 * 60 * 1000;
const TRANSFER_WINDOW = 3 * DAY;
const REFUND_WINDOW = 14 * DAY;

const TRANSFER_KEYWORDS = /\b(payment|transfer|credit card|loc pay|payment from|payment to|e-?transfer|interac|cc payment)\b/i;

/** A stable signature for a candidate pair, so a user confirm/deny rule can key it. */
export function pairSignature(a: ScanRow, b: ScanRow): string {
  const [x, y] = [a.id, b.id].sort();
  return `${x}::${y}::${Math.abs(a.amountCents)}`;
}

type NettingOutput = {
  rows: ScanRow[];
  transfers: TransferPair[];
  refunds: RefundPair[];
};

/**
 * Run netting over a set of rows (already deduped). Returns new rows with internal /
 * reversed / needsReview flags set, plus the discovered pairs.
 */
export function netTransactions(input: ScanRow[], rules: ScanRules): NettingOutput {
  // Work on shallow clones so callers keep their originals.
  const rows = input.map((r) => ({ ...r }));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const transfers: TransferPair[] = [];
  const refunds: RefundPair[] = [];
  const used = new Set<string>();

  // --- Internal transfers: opposite-sign, cross-account, amount match, 3-day window,
  // transfer keyword on at least one side.
  const outflows = rows.filter((r) => r.amountCents < 0 && !used.has(r.id));
  for (const out of outflows) {
    if (used.has(out.id)) continue;
    const target = Math.abs(out.amountCents);
    const candidates = rows.filter(
      (r) =>
        !used.has(r.id) &&
        r.id !== out.id &&
        r.amountCents > 0 &&
        Math.abs(r.amountCents) === target &&
        r.account !== out.account &&
        Math.abs(r.date.getTime() - out.date.getTime()) <= TRANSFER_WINDOW &&
        (TRANSFER_KEYWORDS.test(out.rawDescription) || TRANSFER_KEYWORDS.test(r.rawDescription))
    );
    if (candidates.length === 0) continue;

    // Nearest-in-time candidate.
    candidates.sort(
      (a, b) => Math.abs(a.date.getTime() - out.date.getTime()) - Math.abs(b.date.getTime() - out.date.getTime())
    );
    const match = candidates[0];
    const sig = pairSignature(out, match);

    // Personal rule override.
    if (rules.pairInternal[sig] === false) continue;

    if (candidates.length > 1 && rules.pairInternal[sig] === undefined) {
      // Ambiguous: flag both, do not auto-net.
      out.needsReview = true;
      match.needsReview = true;
      continue;
    }

    out.internal = true;
    match.internal = true;
    used.add(out.id);
    used.add(match.id);
    transfers.push({ outflowRowId: out.id, inflowRowId: match.id, amountCents: target });
  }

  // --- Refund netting: same merchant stem, offsetting amounts within 14 days.
  const charges = rows.filter((r) => r.amountCents < 0 && !r.internal && !used.has(r.id));
  for (const charge of charges) {
    if (used.has(charge.id)) continue;
    const target = Math.abs(charge.amountCents);
    const candidates = rows.filter(
      (r) =>
        !used.has(r.id) &&
        r.id !== charge.id &&
        r.amountCents > 0 &&
        !r.internal &&
        Math.abs(r.amountCents) === target &&
        r.merchantStem === charge.merchantStem &&
        r.merchantStem.length > 0 &&
        Math.abs(r.date.getTime() - charge.date.getTime()) <= REFUND_WINDOW
    );
    if (candidates.length === 0) continue;

    candidates.sort(
      (a, b) => Math.abs(a.date.getTime() - charge.date.getTime()) - Math.abs(b.date.getTime() - charge.date.getTime())
    );
    const refund = candidates[0];
    const sig = pairSignature(charge, refund);
    if (rules.pairInternal[sig] === false) continue;

    if (candidates.length > 1 && rules.pairInternal[sig] === undefined) {
      charge.needsReview = true;
      refund.needsReview = true;
      continue;
    }

    charge.reversed = true;
    refund.reversed = true;
    used.add(charge.id);
    used.add(refund.id);
    refunds.push({
      chargeRowId: charge.id,
      refundRowId: refund.id,
      amountCents: target,
      merchantStem: charge.merchantStem,
    });
  }

  return { rows: Array.from(byId.values()), transfers, refunds };
}

/**
 * The set of rows that count toward spend totals: spend class, not internal, not
 * reversed, not pending, not foreign. Outflow magnitude in cents (positive).
 */
export function spendableRows(rows: ScanRow[]): ScanRow[] {
  return rows.filter(
    (r) =>
      r.rowClass === 'spend' &&
      !r.internal &&
      !r.reversed &&
      !r.pending &&
      !r.foreign &&
      r.amountCents < 0
  );
}

/** Total spend in cents (positive magnitude) over spendable rows. */
export function totalSpendCents(rows: ScanRow[]): number {
  return spendableRows(rows).reduce((sum, r) => sum + Math.abs(r.amountCents), 0);
}
