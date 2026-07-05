/**
 * Stage 8: coverage & truncation.
 *
 * Per-file date range = min/max parsed dates. Session coverage = union window.
 * Truncation heuristic: row count in a suspicious round set {100,250,500,1000} AND
 * the file's range is < 40% of the sibling files' median range -> flag truncated.
 */

import type { CoverageWindow, ScanRow } from './types';

const DAY = 24 * 60 * 60 * 1000;
const SUSPICIOUS_ROW_COUNTS = new Set([100, 250, 500, 1000]);
const TRUNCATION_RANGE_FRACTION = 0.4;

/** Min/max ISO date range for a set of rows, or null when empty. */
export function fileDateRange(rows: ScanRow[]): { startISO: string; endISO: string } | null {
  if (rows.length === 0) return null;
  let min = rows[0].date.getTime();
  let max = min;
  let minISO = rows[0].dateISO;
  let maxISO = rows[0].dateISO;
  for (const r of rows) {
    const t = r.date.getTime();
    if (t < min) {
      min = t;
      minISO = r.dateISO;
    }
    if (t > max) {
      max = t;
      maxISO = r.dateISO;
    }
  }
  return { startISO: minISO, endISO: maxISO };
}

/** Range length in days for a date range (inclusive). */
export function rangeDays(range: { startISO: string; endISO: string } | null): number {
  if (!range) return 0;
  const start = new Date(range.startISO).getTime();
  const end = new Date(range.endISO).getTime();
  return Math.round((end - start) / DAY) + 1;
}

/**
 * Decide whether a file looks truncated given its raw row count and the median range
 * (in days) of its sibling files. Both conditions must hold.
 */
export function isTruncated(rowCount: number, fileRangeDays: number, siblingMedianRangeDays: number): boolean {
  if (!SUSPICIOUS_ROW_COUNTS.has(rowCount)) return false;
  if (siblingMedianRangeDays <= 0) return false;
  return fileRangeDays < siblingMedianRangeDays * TRUNCATION_RANGE_FRACTION;
}

/** Median of a numeric array (0 for empty). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Union coverage window across all rows. coveredDays = distinct days with data. */
export function sessionCoverage(rows: ScanRow[]): CoverageWindow | null {
  if (rows.length === 0) return null;
  const range = fileDateRange(rows);
  if (!range) return null;
  const distinctDays = new Set(rows.map((r) => r.dateISO));
  return {
    startISO: range.startISO,
    endISO: range.endISO,
    coveredDays: distinctDays.size,
  };
}
