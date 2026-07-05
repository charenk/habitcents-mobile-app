/**
 * Bridges between the Leak Scan pipeline (utils/leakScan/, UI-free) and the
 * habit-logging v2 surfaces (contexts/HabitsContext.tsx, types/habit.ts) that the
 * results screen must reuse rather than duplicate. Kept out of utils/leakScan/
 * itself because that package stays pure pipeline output with no dependency on
 * the DetectedHabit/HabitChangeGoal UI model.
 *
 * "Track this leak" (habit-card Govern CTA, results 5.4) must open the identical
 * pick-one sheet Door 1 uses (visual spec acceptance 6). The sheet and
 * HabitsContext.startBreakingHabit both operate on a DetectedHabit already
 * present in habits state, so a HabitCandidate is converted here and admitted via
 * HabitsContext.addScanHabit before the sheet opens.
 */

import type { HabitCandidate } from '@/utils/leakScan/types';
import type { DetectedHabit, HabitFrequency } from '@/types/habit';
import type { ExpenseCategory } from '@/types/expense';

/**
 * Display label for an ExpenseCategory value written by the scan. The type
 * keeps the legacy 'Mortgage' literal for storage backward-compatibility
 * (ADR 0006), but the taxonomy-v2 category list renders it as "Mortgage/Rent";
 * every other category's display label is its own value unchanged.
 */
export function categoryDisplayLabel(category: ExpenseCategory): string {
  if (category === 'Mortgage') return 'Mortgage/Rent';
  return category;
}

/**
 * Derive a display HabitFrequency from a monthly occurrence rate. Mirrors the
 * bucket thresholds habitDetection.ts uses for merchant-detected habits, so a
 * scan-sourced habit and a manually-detected one read the same way in the
 * pick-one sheet and check-in card.
 */
export function frequencyFromMonthlyRate(monthlyOccurrences: number): HabitFrequency {
  if (monthlyOccurrences >= 20) return 'daily';
  if (monthlyOccurrences >= 4) return 'weekly';
  return 'monthly';
}

/** Occurrences-per-period for the frequency's named period (day/week/month). */
function occurrencesPerPeriod(monthlyOccurrences: number, frequency: HabitFrequency): number {
  if (frequency === 'daily') return Math.max(1, Math.round(monthlyOccurrences / 30));
  if (frequency === 'weekly') return Math.max(1, Math.round((monthlyOccurrences * 7) / 30));
  return Math.max(1, Math.round(monthlyOccurrences));
}

/** Stable id for a scan-sourced habit, derived from the merchant stem (not random),
 *  so re-running a scan (or re-tapping Track on the same session) converges on the
 *  same habit id rather than creating duplicates ahead of the merchant-pattern
 *  de-dup in HabitsContext.addScanHabit. */
export function scanHabitId(merchantStem: string): string {
  return `scan-habit-${merchantStem}`;
}

/**
 * Convert a Leak Scan HabitCandidate (Stage 9 governability output) into a
 * DetectedHabit the existing habit-logging surfaces understand. `coveredDays`
 * is the scan's evidence window, used to derive a monthly-equivalent spend and
 * occurrence rate consistent with the card's own stats row math.
 */
export function habitCandidateToDetectedHabit(
  candidate: HabitCandidate,
  coveredDays: number
): DetectedHabit {
  const windowDays = Math.max(coveredDays, 1);
  const monthlyOccurrences = (candidate.occurrences / windowDays) * 30;
  const frequency = frequencyFromMonthlyRate(monthlyOccurrences);
  const totalMonthlySpend = Math.round((candidate.totalCents / windowDays) * 30);
  const averageAmount =
    candidate.occurrences > 0 ? Math.round(candidate.totalCents / candidate.occurrences) : 0;

  const topMerchantsLabel = candidate.topMerchants.length > 0
    ? candidate.topMerchants.join(', ')
    : candidate.merchantDisplay;

  return {
    id: scanHabitId(candidate.merchantStem),
    name: candidate.merchantDisplay,
    description: `${topMerchantsLabel} landed ${candidate.activeDays} of your ${coveredDays} covered days.`,
    categoryId: candidate.category,
    merchantPattern: candidate.merchantStem,
    averageAmount,
    frequency,
    occurrencesPerPeriod: occurrencesPerPeriod(monthlyOccurrences, frequency),
    totalMonthlySpend,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status: 'discovered',
    sentiment: 'neutral',
    discoveredAt: new Date(),
  };
}
