/**
 * Builds the persisted ScanSummary (OB-4, ADR 0020) from a completed pipeline
 * ScanResult. Pure: no storage import, no UI-model dependency, matching the
 * rest of this directory's stage modules (spec 5's own aggregation pattern in
 * resultsSummary.ts / projection.ts). Reuses those two builders directly so
 * the persisted snapshot never drifts from what the results screen renders.
 */

import type { ScanSummary } from '@/types/scanSummary';
import type { ScanResult } from './types';
import { buildKpiSummary, buildCategorySummary } from './resultsSummary';
import { buildProjectionSummary } from './projection';

const TOP_LEAKS_CAP = 5;

/**
 * Convert a completed ScanResult into a small, display-ready snapshot, or
 * null on graceful failure (spec 7: nothing worth summarizing when every
 * file scored below the confidence floor / zero rows survived). Never
 * throws: any unexpected shape falls back to null so a bad summary can never
 * block or corrupt the scan flow itself.
 */
export function scanResultToSummary(result: ScanResult, now: Date): ScanSummary | null {
  if (result.gracefulFailure) return null;

  try {
    const kpis = buildKpiSummary(result);
    const categorySummary = buildCategorySummary(result);
    const categories = categorySummary.map((c) => ({
      name: c.category,
      totalCents: c.totalCents,
      share: c.percentOfTotal / 100,
    }));

    const coveredDays = result.coverage?.coveredDays ?? 0;
    // Same windowDays floor ResultsScreen uses to annualize a habit's evidence-
    // window total into a monthly figure (see components/leak-scan/ResultsScreen.tsx).
    const windowDays = Math.max(coveredDays, 1);
    const recurringByStem = new Map(result.recurring.map((r) => [r.merchantStem, r]));

    const topLeaks = [...result.habits]
      .map((h) => ({
        name: h.merchantDisplay,
        monthlyCents: Math.round((h.totalCents / windowDays) * 30),
        observedCents: h.totalCents,
        buys: h.occurrences,
        // A habit without a matching recurring entry (stage 9's stricter
        // periodicity test) is real spend but not on a detected schedule.
        cadence: recurringByStem.get(h.merchantStem)?.interval ?? 'irregular',
        tier: h.tier,
      }))
      .sort((a, b) => b.monthlyCents - a.monthlyCents || b.buys - a.buys)
      .slice(0, TOP_LEAKS_CAP);

    const habitClassByCategory = new Map(result.habits.map((h) => [h.category, h.governClass]));
    const projectionSummary = buildProjectionSummary(
      result.rows,
      result.recurring,
      coveredDays,
      habitClassByCategory
    );
    const projection = projectionSummary.hasFullMonth
      ? {
          nextMonthCents: projectionSummary.subtotalCents + projectionSummary.bufferCents,
          // projection.ts computes this same total internally but does not export
          // it on ProjectionSummary; recomputed here from its own lockedIn array
          // with its own nextMonthHits formula, kept in lockstep by comment.
          lockedInCents: projectionSummary.lockedIn.reduce(
            (s, r) => s + r.amountCents * (r.nextMonthHits || 1),
            0
          ),
        }
      : null;

    return {
      schemaVersion: 1,
      createdAt: now,
      evidence: {
        windowStart: result.coverage ? new Date(result.coverage.startISO) : null,
        windowEnd: result.coverage ? new Date(result.coverage.endISO) : null,
        fileCount: result.files.length,
        rowCount: result.rows.length,
      },
      kpis,
      categories,
      topLeaks,
      projection,
    };
  } catch {
    return null;
  }
}
