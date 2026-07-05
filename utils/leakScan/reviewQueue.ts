/**
 * Pure aggregation for the merchant review queue (spec 6/7 "60-second task",
 * visual spec 10). Top 10 needs-review merchants by absolute dollar impact;
 * everything below the top 10 stays Other, correctable later from any
 * transaction row (spec 5.4 "Stage 7 review queue").
 */

import type { ExpenseCategory } from '@/types/expense';
import type { ScanRow } from './types';
import { spendableRows } from './netting';

export type ReviewQueueItem = {
  merchantStem: string;
  merchantDisplay: string;
  guessedCategory: ExpenseCategory;
  totalCents: number;
};

const MAX_QUEUE = 10;

/** Build the capped, dollar-ranked review queue from needs-review rows. */
export function buildReviewQueue(rows: ScanRow[]): ReviewQueueItem[] {
  const needsReview = spendableRows(rows).filter((r) => r.categoryTier === 'needs-review');
  const byStem = new Map<string, ScanRow[]>();
  for (const r of needsReview) {
    if (!r.merchantStem) continue;
    if (!byStem.has(r.merchantStem)) byStem.set(r.merchantStem, []);
    byStem.get(r.merchantStem)!.push(r);
  }

  const items: ReviewQueueItem[] = Array.from(byStem.entries()).map(([stem, group]) => ({
    merchantStem: stem,
    merchantDisplay: group[0].merchantDisplay,
    guessedCategory: group[0].category,
    totalCents: group.reduce((s, r) => s + Math.abs(r.amountCents), 0),
  }));

  items.sort((a, b) => b.totalCents - a.totalCents);
  return items.slice(0, MAX_QUEUE);
}
