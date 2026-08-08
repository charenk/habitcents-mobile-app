/**
 * Persisted snapshot of a successful Leak Scan (OB-4, ADR 0020). Feeds the
 * Insights segment planned for OB-6. Deliberately small and display-ready:
 * this is a summary for later reference, never the raw scanned rows (D-9,
 * privacy: merchant strings/amounts stay on-device; size: AsyncStorage is not
 * a database). Kept until replaced by the next successful scan, no expiry.
 */

import type { ExpenseCategory } from '@/types/expense';
import type { ConfidenceTier } from '@/utils/leakScan/types';
import type { KpiSummary } from '@/utils/leakScan/resultsSummary';

export type ScanSummary = {
  schemaVersion: 1;
  createdAt: Date;
  evidence: {
    windowStart: Date | null;
    windowEnd: Date | null;
    fileCount: number;
    rowCount: number;
  };
  /** Mirrors resultsSummary's own KPI row (5.1) verbatim: same fields, same
   *  tier-flooring rules. Keeps this summary consistent with what the user
   *  actually saw on the results screen. */
  kpis: KpiSummary;
  categories: { name: ExpenseCategory; totalCents: number; share: number }[];
  /** Top 5 leaks (habit candidates), ranked by monthly cost, occurrence-count
   *  tiebreak (ADR 0020). */
  topLeaks: {
    name: string;
    monthlyCents: number;
    observedCents: number;
    buys: number;
    cadence: string;
    tier: ConfidenceTier;
  }[];
  /** Null when the scan's evidence window is under a full calendar month
   *  (projection.ts's own hasFullMonth gate); the results screen shows a
   *  placeholder in that case and this summary carries nothing to show either. */
  projection: { nextMonthCents: number; lockedInCents: number } | null;
};
