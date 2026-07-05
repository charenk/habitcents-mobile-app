/**
 * Stage 9: recurrence & habit detection (runs on FULL history).
 *
 * Fixed recurrence: same merchant stem, amount variance <= 2%, interval regularity
 * (monthly +/-4d, biweekly +/-2d, weekly +/-1d, annual +/-10d), >= 3 occurrences
 * (>= 2 for annual). Detects rent, loans, insurance, subscriptions, and small fixed
 * transfers regardless of size (the $11/mo e-transfer case).
 *
 * Behavioral habit: merchant stem or category with >= 4 occurrences/month, variable
 * amounts, discretionary category. Governability classifier ranks candidates by
 * annualizedLeak * governabilityWeight; list capped at 10, none pre-selected.
 */

import type { ExpenseCategory } from '@/types/expense';
import type {
  GovernClass,
  HabitCandidate,
  RecurrenceInterval,
  RecurringItem,
  ScanRow,
} from './types';
import type { ScanRules } from '@/utils/scanRules';

const DAY = 24 * 60 * 60 * 1000;
const MAX_HABITS = 10;

const AMOUNT_VARIANCE_MAX = 0.02; // <= 2%

// Interval definitions: nominal days and tolerance (spec 9).
const INTERVALS: { interval: RecurrenceInterval; days: number; tol: number; minOcc: number }[] = [
  { interval: 'weekly', days: 7, tol: 1, minOcc: 3 },
  { interval: 'biweekly', days: 14, tol: 2, minOcc: 3 },
  { interval: 'monthly', days: 30, tol: 4, minOcc: 3 },
  { interval: 'annual', days: 365, tol: 10, minOcc: 2 },
];

// Discretionary categories (behavioral habits fire here).
const DISCRETIONARY: Set<ExpenseCategory> = new Set([
  'Food',
  'Shopping',
  'Entertainment',
]);

// Contract / fixed categories.
const CONTRACT: Set<ExpenseCategory> = new Set([
  'Mortgage',
  'Utilities',
  'Car',
  'Software & Subscriptions',
]);

const GOVERN_WEIGHT: Record<GovernClass, number> = {
  govern: 1.0,
  influence: 0.5,
  fixed: 0.15,
};

const SUBSCRIPTION_RE = /subscription|software|saas|netflix|spotify|prime|icloud|adobe|patreon|substack|membership/i;

type Group = {
  stem: string;
  display: string;
  category: ExpenseCategory;
  rowClass: ScanRow['rowClass'];
  rows: ScanRow[];
};

/** Group rows by merchant stem (empty stems excluded). */
function groupByStem(rows: ScanRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    if (!r.merchantStem) continue;
    let g = map.get(r.merchantStem);
    if (!g) {
      g = {
        stem: r.merchantStem,
        display: r.merchantDisplay,
        category: r.category,
        rowClass: r.rowClass,
        rows: [],
      };
      map.set(r.merchantStem, g);
    }
    g.rows.push(r);
  }
  return Array.from(map.values());
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Advance an ISO date by one interval, returning ISO. */
function advanceISO(dateISO: string, interval: RecurrenceInterval): string {
  const d = new Date(dateISO);
  if (interval === 'weekly') d.setDate(d.getDate() + 7);
  else if (interval === 'biweekly') d.setDate(d.getDate() + 14);
  else if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Count how many occurrences of a biweekly cadence fall in the month after lastDate. */
function biweeklyHitsNextMonth(lastDateISO: string): number {
  const start = new Date(lastDateISO);
  const monthStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 2, 0);
  let cursor = new Date(start);
  // Advance to the first occurrence on/after monthStart.
  while (cursor < monthStart) cursor = new Date(cursor.getTime() + 14 * DAY);
  let hits = 0;
  while (cursor <= monthEnd) {
    hits++;
    cursor = new Date(cursor.getTime() + 14 * DAY);
  }
  return hits;
}

/**
 * Test a group for fixed recurrence. Returns the recurring item, or null. Amounts
 * must be within 2% variance; gaps must fit one interval's tolerance; occurrence
 * count must clear the interval floor.
 */
function detectRecurrence(group: Group): RecurringItem | null {
  const rows = [...group.rows].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (rows.length < 2) return null;

  const amounts = rows.map((r) => Math.abs(r.amountCents));
  const med = median(amounts);
  if (med === 0) return null;
  const maxDev = Math.max(...amounts.map((a) => Math.abs(a - med) / med));
  if (maxDev > AMOUNT_VARIANCE_MAX) return null;

  // Average gap in days.
  const gaps: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    gaps.push((rows[i].date.getTime() - rows[i - 1].date.getTime()) / DAY);
  }
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

  for (const def of INTERVALS) {
    if (rows.length < def.minOcc) continue;
    const allFit = gaps.every((g) => Math.abs(g - def.days) <= def.tol);
    const avgFit = Math.abs(avgGap - def.days) <= def.tol;
    if (allFit || avgFit) {
      const lastDateISO = rows[rows.length - 1].dateISO;
      const nextDateISO = advanceISO(lastDateISO, def.interval);
      return {
        merchantStem: group.stem,
        merchantDisplay: group.display,
        category: group.category,
        rowClass: group.rowClass,
        amountCents: med,
        interval: def.interval,
        occurrences: rows.length,
        lastDateISO,
        nextDateISO,
        nextMonthHits: def.interval === 'biweekly' ? biweeklyHitsNextMonth(lastDateISO) : 1,
      };
    }
  }
  return null;
}

/** All fixed recurrences across the full history. */
export function detectRecurring(rows: ScanRow[]): RecurringItem[] {
  const groups = groupByStem(rows);
  const items: RecurringItem[] = [];
  for (const g of groups) {
    const item = detectRecurrence(g);
    if (item) items.push(item);
  }
  return items;
}

/** Governability classifier (spec 9 table). */
function classifyGovernability(
  group: Group,
  isRecurring: boolean,
  amountVariance: number,
  monthlyOccurrences: number
): GovernClass {
  const isDiscretionary = DISCRETIONARY.has(group.category);
  const isSubscription = SUBSCRIPTION_RE.test(group.stem) || group.category === 'Software & Subscriptions';

  // Fixed: low variance + regular + contract category.
  if (isRecurring && amountVariance <= AMOUNT_VARIANCE_MAX && CONTRACT.has(group.category) && !isSubscription) {
    return 'fixed';
  }
  // Govern: discretionary + frequent + variable, OR a renewing subscription.
  if ((isDiscretionary && monthlyOccurrences >= 4 && amountVariance > AMOUNT_VARIANCE_MAX) || isSubscription) {
    return 'govern';
  }
  // Influence: necessary category, behavior-shaped.
  return 'influence';
}

/** Weakest tier among a group's rows. */
function groupTier(group: Group): HabitCandidate['tier'] {
  if (group.rows.some((r) => r.categoryTier === 'needs-review')) return 'needs-review';
  if (group.rows.some((r) => r.categoryTier === 'likely')) return 'likely';
  return 'solid';
}

/**
 * Detect habit candidates over the full history. `coveredDays` scales the annualized
 * leak (evidence window). Suppressed habits (spec 6) are filtered out. Returns up to
 * 10 candidates ranked by annualizedLeak * governabilityWeight, none pre-selected.
 */
export function detectHabitCandidates(
  rows: ScanRow[],
  coveredDays: number,
  rules: ScanRules
): HabitCandidate[] {
  const spendRows = rows.filter((r) => r.rowClass === 'spend' && !r.internal && !r.reversed && r.amountCents < 0);
  const groups = groupByStem(spendRows);
  const recurringStems = new Set(detectRecurring(spendRows).map((i) => i.merchantStem));
  const windowDays = Math.max(coveredDays, 1);

  const candidates: HabitCandidate[] = [];
  for (const g of groups) {
    if (rules.suppressedHabits[g.stem]) continue;
    const occ = g.rows.length;
    const amounts = g.rows.map((r) => Math.abs(r.amountCents));
    const med = median(amounts);
    const maxDev = med > 0 ? Math.max(...amounts.map((a) => Math.abs(a - med) / med)) : 0;
    const totalCents = amounts.reduce((s, a) => s + a, 0);
    const monthlyOccurrences = (occ / windowDays) * 30;
    const activeDays = new Set(g.rows.map((r) => r.dateISO)).size;

    const isRecurring = recurringStems.has(g.stem);
    const isSubscription = SUBSCRIPTION_RE.test(g.stem) || g.category === 'Software & Subscriptions';
    const isDiscretionary = DISCRETIONARY.has(g.category);

    // Include a group when it is a recurring commitment OR a behavioral habit
    // (>= 4 occurrences/month, variable, discretionary) OR a renewing subscription.
    const behavioral = monthlyOccurrences >= 4 && maxDev > AMOUNT_VARIANCE_MAX && isDiscretionary;
    if (!isRecurring && !behavioral && !isSubscription) continue;

    const governClass = classifyGovernability(g, isRecurring, maxDev, monthlyOccurrences);
    const annualizedLeakCents = Math.round((totalCents / windowDays) * 365);
    const rankScore = annualizedLeakCents * GOVERN_WEIGHT[governClass];

    // Top merchants: the display name (single-merchant groups) or the most frequent
    // raw descriptions within the stem cluster.
    const descCounts = new Map<string, number>();
    for (const r of g.rows) {
      const key = r.merchantDisplay || r.rawDescription;
      descCounts.set(key, (descCounts.get(key) ?? 0) + 1);
    }
    const topMerchants = Array.from(descCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    candidates.push({
      merchantStem: g.stem,
      merchantDisplay: g.display,
      category: g.category,
      governClass,
      tier: groupTier(g),
      occurrences: occ,
      activeDays,
      totalCents,
      annualizedLeakCents,
      rankScore,
      topMerchants,
    });
  }

  candidates.sort((a, b) => b.rankScore - a.rankScore);
  return candidates.slice(0, MAX_HABITS);
}
