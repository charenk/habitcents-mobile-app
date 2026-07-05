/**
 * Pure aggregation for the results screen's KPI row (5.1) and category
 * breakdown (5.2). Kept alongside the pipeline (not the bridge module)
 * because it only touches ScanResult/ScanRow, no UI-model dependency.
 */

import type { ExpenseCategory } from '@/types/expense';
import type { ConfidenceTier, ScanResult, ScanRow } from './types';
import { spendableRows, totalSpendCents } from './netting';

const TIER_RANK: Record<ConfidenceTier, number> = { solid: 0, likely: 1, 'needs-review': 2 };

/** The weaker (worse) of two tiers. */
export function weakerTier(a: ConfidenceTier, b: ConfidenceTier): ConfidenceTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

/** The weakest tier across a set of rows (defaults to 'solid' for an empty set,
 *  matching the pipeline's own weakest-passing-file convention). */
function weakestRowTier(rows: ScanRow[]): ConfidenceTier {
  return rows.reduce<ConfidenceTier>((worst, r) => weakerTier(worst, r.categoryTier), 'solid');
}

export type KpiSummary = {
  totalSpentCents: number;
  totalSpentTier: ConfidenceTier;
  perDayCents: number;
  transactionCount: number;
  purchasesPerDay: number;
  coveredDays: number;
  nAccounts: number;
};

/** KPI row data (spec 5.1). Each KPI carries the tier of its weakest input;
 *  for all three KPIs here that is the weakest tier among the spendable rows
 *  they are computed from, floored by the session's overall tier. */
export function buildKpiSummary(result: ScanResult): KpiSummary {
  const spendable = spendableRows(result.rows);
  const totalSpentCents = totalSpendCents(result.rows);
  const coveredDays = result.coverage?.coveredDays ?? 0;
  const transactionCount = spendable.length;
  const perDayCents = coveredDays > 0 ? Math.round(totalSpentCents / coveredDays) : 0;
  const purchasesPerDay = coveredDays > 0 ? transactionCount / coveredDays : 0;
  const accounts = new Set(result.files.filter((f) => !f.belowFloor).map((f) => f.account));

  const rowsTier = weakestRowTier(spendable);
  const totalSpentTier = weakerTier(rowsTier, result.tier);

  return {
    totalSpentCents,
    totalSpentTier,
    perDayCents,
    transactionCount,
    purchasesPerDay,
    coveredDays,
    nAccounts: accounts.size,
  };
}

export type CategorySummary = {
  category: ExpenseCategory;
  totalCents: number;
  percentOfTotal: number;
  tier: ConfidenceTier;
};

/** Category breakdown (spec 5.2), sorted by net spend descending. Percent is
 *  rounded to the nearest whole number; tier is the weakest among that
 *  category's rows. */
export function buildCategorySummary(result: ScanResult): CategorySummary[] {
  const spendable = spendableRows(result.rows);
  const totalCents = spendable.reduce((s, r) => s + Math.abs(r.amountCents), 0);

  const byCategory = new Map<ExpenseCategory, ScanRow[]>();
  for (const r of spendable) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }

  const summaries: CategorySummary[] = Array.from(byCategory.entries()).map(([category, rows]) => {
    const cents = rows.reduce((s, r) => s + Math.abs(r.amountCents), 0);
    return {
      category,
      totalCents: cents,
      percentOfTotal: totalCents > 0 ? Math.round((cents / totalCents) * 100) : 0,
      tier: weakestRowTier(rows),
    };
  });

  summaries.sort((a, b) => b.totalCents - a.totalCents);
  return summaries;
}
