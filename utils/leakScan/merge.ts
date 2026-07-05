/**
 * Stage 5: cross-file merge & dedupe, plus account identity.
 *
 * Same-account overlap: identical row hash (dateISO|amountCents|normalizedDesc)
 * across files is a duplicate; drop exact-hash duplicates, surface the count.
 * Account identity is inferred from filename tokens; labels A/B/C for display.
 */

import type { ScanRow } from './types';

/** Derive a display account label from a filename. Falls back to A/B/C by index. */
export function accountLabelFromFile(fileName: string, index: number): string {
  const base = fileName.replace(/\.[^.]+$/, '').toLowerCase();
  if (/che?que?/.test(base) || /checking/.test(base)) return 'Chequing';
  if (/saving/.test(base)) return 'Savings';
  if (/credit|card|visa|mastercard|amex/.test(base)) return 'Card';
  if (/loc|line of credit/.test(base)) return 'Line of credit';
  // Fall back to a letter label.
  return String.fromCharCode(65 + (index % 26));
}

/**
 * Dedupe rows across files by exact hash. Keeps the first occurrence of each hash;
 * returns the deduped rows and the number of duplicates dropped.
 */
export function dedupeRows(rows: ScanRow[]): { rows: ScanRow[]; duplicatesMerged: number } {
  const seen = new Set<string>();
  const out: ScanRow[] = [];
  let dupes = 0;
  for (const row of rows) {
    if (seen.has(row.hash)) {
      dupes++;
      continue;
    }
    seen.add(row.hash);
    out.push(row);
  }
  return { rows: out, duplicatesMerged: dupes };
}
