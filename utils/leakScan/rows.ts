/**
 * Row assembly: turn raw CSV rows + inferred roles + sign convention into normalized
 * ScanRow records (Stages 3/4/7 combined into concrete rows). Also computes the
 * dedupe hash used in Stage 5.
 */

import { categorize, displayName, normalizeMerchant } from './categorize';
import { parseAmount, parseDateParts, resolveDate, isValidYMD, toISO, toDate } from './parsers';
import type { ColumnRoles, DateOrder, RawRow, ScanRow, SignConvention } from './types';
import type { ScanRules } from '@/utils/scanRules';
import type { CurrencyCode } from '@/utils/currency';
import { DEFAULT_CURRENCY, currencyMeta } from '@/utils/currency';

/** Small deterministic string hash (djb2). Not cryptographic; only for dedupe keys. */
export function hashRow(dateISO: string, amountCents: number, normalizedDesc: string): string {
  const input = `${dateISO}|${amountCents}|${normalizedDesc}`;
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const PENDING_RE = /\bpending\b/i;

/**
 * Build ScanRows for one file. `homeCurrency` marks rows in another currency as
 * foreign (excluded from totals). Rows that fail date or amount parsing are dropped
 * and counted by the caller (returned skippedRows).
 */
export function buildRows(
  fileName: string,
  account: string,
  dataRows: RawRow[],
  roles: ColumnRoles,
  order: DateOrder,
  sign: SignConvention,
  rules: ScanRules,
  homeCurrency: CurrencyCode = DEFAULT_CURRENCY
): { rows: ScanRow[]; skipped: number } {
  const rows: ScanRow[] = [];
  let skipped = 0;
  const homeCode = currencyMeta(homeCurrency).code;

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];

    // Date
    const parts = parseDateParts(r[roles.dateIndex] ?? '');
    if (!parts) {
      skipped++;
      continue;
    }
    const { y, mo, d } = resolveDate(parts, order);
    if (!isValidYMD(y, mo, d)) {
      skipped++;
      continue;
    }
    const dateISO = toISO(y, mo, d);
    const date = toDate(y, mo, d);

    // Amount -> signed cents where outflow is negative.
    let signedCents: number | null = null;
    if (roles.debitIndex >= 0 && roles.creditIndex >= 0) {
      const debit = parseAmount(r[roles.debitIndex] ?? '');
      const credit = parseAmount(r[roles.creditIndex] ?? '');
      const debitCents = debit ? debit.cents : 0;
      const creditCents = credit ? credit.cents : 0;
      if (debitCents === 0 && creditCents === 0 && !debit && !credit) {
        skipped++;
        continue;
      }
      // Debit = outflow (negative), credit = inflow (positive).
      signedCents = creditCents - debitCents;
    } else if (roles.amountIndex >= 0) {
      const amt = parseAmount(r[roles.amountIndex] ?? '');
      if (!amt) {
        skipped++;
        continue;
      }
      const rawCell = (r[roles.amountIndex] ?? '').trim();
      const cellCarriesSign = /^[(-]|[-)]\s*$|\b(CR|DR)\s*$/i.test(rawCell);
      const typeCell = roles.typeIndex >= 0 ? (r[roles.typeIndex] ?? '').toLowerCase() : '';
      const typeIsDebit = /\b(debit|withdrawal|dr)\b/.test(typeCell) || typeCell.trim() === 'd';
      const typeIsCredit = /\b(credit|deposit|cr)\b/.test(typeCell) || typeCell.trim() === 'c';

      if (sign.method === 'type' && (typeIsDebit || typeIsCredit) && !cellCarriesSign) {
        // A type column drives direction when the amount cell is unsigned: debit is
        // outflow (negative), credit is inflow (positive), independent of the file's
        // majority sign.
        signedCents = typeIsDebit ? -amt.cents : amt.cents;
      } else {
        // amt.cellSign is the file's raw sign; multiply by outflowSign convention.
        // outflowSign +1 means the file already encodes outflow-as-negative.
        const fileSigned = amt.cents * amt.cellSign;
        signedCents = sign.outflowSign === 1 ? fileSigned : -fileSigned;
      }
    } else {
      skipped++;
      continue;
    }

    const rawDescription = (r[roles.descriptionIndex] ?? '').toString();
    const merchantStem = normalizeMerchant(rawDescription);
    const cat = categorize(rawDescription, merchantStem, signedCents, rules);

    // Posted date (secondary).
    let postedDateISO: string | undefined;
    if (roles.postedDateIndex >= 0) {
      const pp = parseDateParts(r[roles.postedDateIndex] ?? '');
      if (pp) {
        const rp = resolveDate(pp, order);
        if (isValidYMD(rp.y, rp.mo, rp.d)) postedDateISO = toISO(rp.y, rp.mo, rp.d);
      }
    }

    // Pending / foreign.
    const statusCell = roles.statusIndex >= 0 ? (r[roles.statusIndex] ?? '') : '';
    const pending = PENDING_RE.test(statusCell);
    let foreign = false;
    if (roles.currencyIndex >= 0) {
      const cur = (r[roles.currencyIndex] ?? '').trim().toUpperCase();
      if (cur && cur !== homeCode) foreign = true;
    }

    const normDesc = merchantStem || rawDescription.toLowerCase();
    const hash = hashRow(dateISO, signedCents, normDesc);

    rows.push({
      id: `${account}-${i}-${hash}`,
      dateISO,
      date,
      postedDateISO,
      amountCents: signedCents,
      rawDescription,
      merchantStem,
      merchantDisplay: displayName(merchantStem, rules),
      category: cat.category,
      categoryTier: cat.tier,
      rowClass: cat.rowClass,
      account,
      pending,
      foreign,
      internal: false,
      reversed: false,
      needsReview: false,
      hash,
    });
  }

  return { rows, skipped };
}
