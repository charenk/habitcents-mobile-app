/**
 * Stage 2: header & preamble detection.
 *
 * Scan the first 10 rows. Score each as a header candidate by: (a) column count
 * matches the modal count of the next 20 rows, (b) cells are short non-numeric
 * strings, (c) no cell parses as a date or amount. Rows above the winner are
 * preamble and discarded. If no header is found but row 1 sniffs as data,
 * synthesize col_1..col_n.
 */

import { looksLikeAmount, looksLikeDate } from './parsers';
import type { HeaderResult, RawRow } from './types';

const SCAN_ROWS = 10;
const LOOKAHEAD = 20;

/** Modal (most common) column count among the given rows, ignoring empty rows. */
function modalColumnCount(rows: RawRow[]): number {
  const freq = new Map<number, number>();
  for (const r of rows) {
    const n = r.length;
    if (n === 0) continue;
    freq.set(n, (freq.get(n) ?? 0) + 1);
  }
  let modal = 0;
  let hits = -1;
  for (const [count, count2] of freq) {
    if (count2 > hits) {
      hits = count2;
      modal = count;
    }
  }
  return modal;
}

/** Score a single candidate row as a header (0..1). */
function scoreHeaderRow(row: RawRow, modalBelow: number): number {
  if (row.length === 0) return 0;
  let score = 0;

  // (a) column count matches the data below.
  if (modalBelow > 0 && row.length === modalBelow) score += 0.4;

  // (b) cells are short non-numeric strings.
  const shortStrings = row.filter((c) => c.length > 0 && c.length <= 30 && !/^\d/.test(c));
  score += 0.3 * (shortStrings.length / row.length);

  // (c) no cell parses as a date or amount.
  const dataLike = row.filter((c) => looksLikeDate(c) || looksLikeAmount(c));
  score += 0.3 * (1 - dataLike.length / row.length);

  return score;
}

/**
 * Run Stage 2 over parsed rows. Returns the header, the data rows below it, and how
 * many preamble rows were discarded.
 */
export function detectHeader(rows: RawRow[]): HeaderResult {
  if (rows.length === 0) {
    return {
      headerIndex: -1,
      headers: [],
      headerFound: false,
      dataRows: [],
      preambleDiscarded: 0,
    };
  }

  const scanLimit = Math.min(SCAN_ROWS, rows.length);
  let bestIndex = -1;
  let bestScore = 0;

  for (let i = 0; i < scanLimit; i++) {
    const below = rows.slice(i + 1, i + 1 + LOOKAHEAD);
    const modalBelow = modalColumnCount(below.length > 0 ? below : rows.slice(i + 1));
    const score = scoreHeaderRow(rows[i], modalBelow);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // Header threshold: a real header should clear a moderate bar. Below it, treat the
  // file as headerless and synthesize column names.
  if (bestIndex >= 0 && bestScore >= 0.6) {
    const headers = rows[bestIndex].map((c, i) => c.trim() || `col_${i + 1}`);
    const dataRows = rows.slice(bestIndex + 1);
    return {
      headerIndex: bestIndex,
      headers,
      headerFound: true,
      dataRows,
      preambleDiscarded: bestIndex,
    };
  }

  // No confident header. Synthesize col_1..col_n from the modal width of the file.
  const width = modalColumnCount(rows) || rows[0].length;
  const headers = Array.from({ length: width }, (_, i) => `col_${i + 1}`);
  return {
    headerIndex: -1,
    headers,
    headerFound: false,
    dataRows: rows,
    preambleDiscarded: 0,
  };
}

/** A stable fingerprint of the header shape, used to key personal rules (spec 6). */
export function headerFingerprint(headers: string[]): string {
  return headers
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
    .join('|');
}
