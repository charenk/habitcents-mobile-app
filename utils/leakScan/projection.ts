/**
 * Pure aggregation for the next-month projection (spec 5.5, visual spec 7).
 * "Locked in" (fixed recurrences, biweekly 3-payment flag), "Run rate"
 * (variable governable/influence categories, median of covered months), and
 * a +12% buffer line. Renders only when coverage >= 1 full calendar month.
 */

import type { ExpenseCategory } from '@/types/expense';
import type { ConfidenceTier, GovernClass, RecurringItem, ScanRow } from './types';
import { spendableRows } from './netting';

const BUFFER_RATE = 0.12;

export type RunRateItem = {
  category: ExpenseCategory;
  medianMonthlyCents: number;
  tier: ConfidenceTier;
};

export type ProjectionSummary = {
  /** False when coverage < 1 full calendar month; caller renders the placeholder. */
  hasFullMonth: boolean;
  lockedIn: RecurringItem[];
  runRate: RunRateItem[];
  /** +12% of (locked-in + run-rate) subtotal, in cents. */
  bufferCents: number;
  subtotalCents: number;
};

function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/** Governable/influence categories eligible for a run-rate line (fixed items
 *  are already covered by lockedIn / the tip card, never double-counted here). */
const RUN_RATE_CLASSES: GovernClass[] = ['govern', 'influence'];

/**
 * Median-of-covered-months run rate per category, restricted to spend rows
 * belonging to a governable/influence habit candidate's category. Falls back
 * to a single-month run-rate (tier likely) when only one full month exists.
 */
function buildRunRate(
  rows: ScanRow[],
  eligibleCategories: Set<ExpenseCategory>
): RunRateItem[] {
  const byCategory = new Map<ExpenseCategory, Map<string, number>>();
  for (const r of rows) {
    if (!eligibleCategories.has(r.category)) continue;
    if (!byCategory.has(r.category)) byCategory.set(r.category, new Map());
    const monthMap = byCategory.get(r.category)!;
    const key = monthKey(r.dateISO);
    monthMap.set(key, (monthMap.get(key) ?? 0) + Math.abs(r.amountCents));
  }

  const items: RunRateItem[] = [];
  for (const [category, monthMap] of byCategory) {
    const monthTotals = Array.from(monthMap.values());
    if (monthTotals.length === 0) continue;
    const sorted = [...monthTotals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    items.push({
      category,
      medianMonthlyCents: median,
      tier: monthTotals.length < 2 ? 'likely' : 'solid',
    });
  }
  items.sort((a, b) => b.medianMonthlyCents - a.medianMonthlyCents);
  return items;
}

/**
 * Build the projection summary. `habitCategoriesByClass` maps each detected
 * habit candidate's category to its governability class, so the run-rate
 * line only covers governable/influence categories (fixed items are locked-in
 * or tip-card only, never double-counted in the run-rate).
 */
export function buildProjectionSummary(
  rows: ScanRow[],
  recurring: RecurringItem[],
  coveredDays: number,
  habitClassByCategory: Map<ExpenseCategory, GovernClass>
): ProjectionSummary {
  const hasFullMonth = coveredDays >= 28;
  if (!hasFullMonth) {
    return { hasFullMonth: false, lockedIn: [], runRate: [], bufferCents: 0, subtotalCents: 0 };
  }

  const eligibleCategories = new Set(
    Array.from(habitClassByCategory.entries())
      .filter(([, cls]) => RUN_RATE_CLASSES.includes(cls))
      .map(([cat]) => cat)
  );

  const spendable = spendableRows(rows);
  const runRate = buildRunRate(spendable, eligibleCategories);

  const lockedInTotal = recurring.reduce((s, r) => s + r.amountCents * (r.nextMonthHits || 1), 0);
  const runRateTotal = runRate.reduce((s, r) => s + r.medianMonthlyCents, 0);
  const subtotalCents = lockedInTotal + runRateTotal;
  const bufferCents = Math.round(subtotalCents * BUFFER_RATE);

  return { hasFullMonth: true, lockedIn: recurring, runRate, bufferCents, subtotalCents };
}
