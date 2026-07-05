/**
 * Pure data derivation for <SpendPulse> (results 5.3, visual spec 5). Reusable
 * "spend intensity" grid sharing grid grammar with the habit streak calendar but
 * NOT its day-states: three cell states here (spend / zero-spend / out-of-coverage),
 * heat-ramp fill for spend, sqrt-scaled to the session max, never confused with a
 * slip. Kept in utils/leakScan/ (not the bridge module) because it operates purely
 * on ScanResult/FileScan shapes with no UI-model dependency.
 */

import type { FileScan, ScanResult, ScanRow } from './types';
import { spendableRows } from './netting';

const DAY = 24 * 60 * 60 * 1000;

export type PulseGranularity = 'day' | 'month' | 'year';

export type PulseCellState = 'spend' | 'zero-spend' | 'out-of-coverage';

export type PulseCell = {
  /** ISO date (day granularity) or ISO year-month (month granularity: yyyy-mm) or
   *  ISO year (year granularity: yyyy). */
  key: string;
  state: PulseCellState;
  /** Total outflow magnitude in cents for this cell (0 for zero-spend/out-of-coverage). */
  totalCents: number;
  /** Heat-ramp level 0..5 (sqrt-scaled to the session max), only meaningful when state === 'spend'. */
  level: number;
};

export type PulseData = {
  granularity: PulseGranularity;
  cells: PulseCell[];
  /** Days that have at least one transaction, for the caption. */
  daysTransacted: number;
  /** Covered days (union of per-file date ranges), for the caption. */
  coveredDays: number;
};

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Auto-select granularity by coverage span (spec 5.3): <=45 days daily, <=14
 *  months monthly, year view only when coverage >= 10 months (~300 days). */
export function autoGranularity(coveredSpanDays: number): PulseGranularity {
  if (coveredSpanDays <= 45) return 'day';
  if (coveredSpanDays <= 14 * 31) return 'month';
  return 'year';
}

/** Build the set of ISO dates "in coverage": union of each passing file's own
 *  [startISO, endISO] range (inclusive), so a gap between two files' ranges is
 *  correctly out-of-coverage even though the session's overall min/max spans it. */
function coveredDateSet(files: FileScan[]): Set<string> {
  const covered = new Set<string>();
  for (const f of files) {
    if (f.belowFloor || !f.dateRange) continue;
    const start = parseISODate(f.dateRange.startISO);
    const end = parseISODate(f.dateRange.endISO);
    for (let t = start.getTime(); t <= end.getTime(); t += DAY) {
      covered.add(toISODate(new Date(t)));
    }
  }
  return covered;
}

/** sqrt-scaled 0..5 heat level relative to the session max (spec 5.3). */
function heatLevel(cents: number, maxCents: number): number {
  if (maxCents <= 0 || cents <= 0) return 0;
  const ratio = Math.sqrt(cents) / Math.sqrt(maxCents);
  return Math.max(1, Math.min(5, Math.round(ratio * 5)));
}

/**
 * Build day-granularity pulse cells across the full session coverage span
 * (min start to max end across all passing files), so gaps between files
 * render as out-of-coverage rather than being silently skipped.
 */
function dayCells(result: ScanResult, spendable: ScanRow[]): PulseCell[] {
  const files = result.files.filter((f) => !f.belowFloor && f.dateRange);
  if (files.length === 0) return [];
  const covered = coveredDateSet(files);
  const allStarts = files.map((f) => parseISODate(f.dateRange!.startISO).getTime());
  const allEnds = files.map((f) => parseISODate(f.dateRange!.endISO).getTime());
  const spanStart = Math.min(...allStarts);
  const spanEnd = Math.max(...allEnds);

  const byDay = new Map<string, number>();
  for (const r of spendable) {
    byDay.set(r.dateISO, (byDay.get(r.dateISO) ?? 0) + Math.abs(r.amountCents));
  }
  const maxCents = Math.max(0, ...Array.from(byDay.values()));

  const cells: PulseCell[] = [];
  for (let t = spanStart; t <= spanEnd; t += DAY) {
    const iso = toISODate(new Date(t));
    if (!covered.has(iso)) {
      cells.push({ key: iso, state: 'out-of-coverage', totalCents: 0, level: 0 });
      continue;
    }
    const cents = byDay.get(iso) ?? 0;
    if (cents > 0) {
      cells.push({ key: iso, state: 'spend', totalCents: cents, level: heatLevel(cents, maxCents) });
    } else {
      cells.push({ key: iso, state: 'zero-spend', totalCents: 0, level: 0 });
    }
  }
  return cells;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // yyyy-mm
}

function yearKey(iso: string): string {
  return iso.slice(0, 4); // yyyy
}

/** Aggregate day cells into month or year cells. A month/year is "spend" if any
 *  constituent day had spend, "zero-spend" if every constituent day was covered
 *  with no spend, and "out-of-coverage" only if every constituent day was
 *  out-of-coverage (a month partially covered still reads as data, not a gap). */
function aggregateCells(days: PulseCell[], keyFn: (iso: string) => string): PulseCell[] {
  const groups = new Map<string, PulseCell[]>();
  for (const d of days) {
    const k = keyFn(d.key);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(d);
  }
  const maxCents = Math.max(
    0,
    ...Array.from(groups.values()).map((g) => g.reduce((s, c) => s + c.totalCents, 0))
  );
  const out: PulseCell[] = [];
  for (const [k, group] of groups) {
    const totalCents = group.reduce((s, c) => s + c.totalCents, 0);
    const allOutOfCoverage = group.every((c) => c.state === 'out-of-coverage');
    if (allOutOfCoverage) {
      out.push({ key: k, state: 'out-of-coverage', totalCents: 0, level: 0 });
    } else if (totalCents > 0) {
      out.push({ key: k, state: 'spend', totalCents, level: heatLevel(totalCents, maxCents) });
    } else {
      out.push({ key: k, state: 'zero-spend', totalCents: 0, level: 0 });
    }
  }
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}

/** Build the full PulseData for a scan result at the given granularity
 *  (falls back to auto-selecting when granularity is omitted). */
export function buildSpendPulse(result: ScanResult, granularity?: PulseGranularity): PulseData {
  const spendable = spendableRows(result.rows);
  const days = dayCells(result, spendable);
  days.sort((a, b) => a.key.localeCompare(b.key));

  const coveredDays = result.coverage?.coveredDays ?? 0;
  const daysTransacted = new Set(spendable.map((r) => r.dateISO)).size;

  const spanDays = days.length;
  const g = granularity ?? autoGranularity(spanDays);

  let cells: PulseCell[];
  if (g === 'day') cells = days;
  else if (g === 'month') cells = aggregateCells(days, monthKey);
  else cells = aggregateCells(days, yearKey);

  return { granularity: g, cells, daysTransacted, coveredDays };
}
