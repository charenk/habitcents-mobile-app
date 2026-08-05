/**
 * Leak Scan evaluation harness (OB-2, ADR 0020). Pure scoring logic: given a
 * fixture (one or more CSV files + a manifest of expectations), run the real
 * pipeline (`runScan`) and compute measured scores against the manifest's floors.
 *
 * Nothing here touches Jest or the filesystem's fixture discovery directly (see
 * loadFixtures.ts for that); this module is the pure "run + score" step so it can
 * be unit tested and reused by both the jest suite and the score-table report.
 */

import { runScan, type ScanFileInput, type RunScanOptions, type ScanResult } from '@/utils/leakScan';

// ---------------------------------------------------------------------------
// Manifest shape (persisted as <name>.expected.json next to <name>.csv)
// ---------------------------------------------------------------------------

export type Cadence = 'daily' | 'weekly' | 'monthly';

export type ExpectedCandidate = {
  /** Case-insensitive substring match against the merchant stem/display name. */
  merchantContains: string;
  cadence: Cadence;
  /**
   * When true, the suite fails if this candidate is not found. When false, the
   * candidate is measured and reported but never fails the suite: use this for
   * a documented, known pipeline gap (pair with `knownGap`).
   */
  required: boolean;
  /** Required when `required` is false: why the pipeline doesn't find this yet. */
  knownGap?: string;
};

export type FixtureManifest = {
  description: string;
  /** Floor on rows successfully parsed into ScanRow objects (summed across files). */
  minRowsParsed: number;
  expectedCandidates: ExpectedCandidate[];
  /** Ceiling on the share of rows landing in the needs-review category tier. */
  maxNeedsReviewShare: number;
  expectGracefulFailure: boolean;
};

/** One fixture case: named input files plus the manifest scoring them. */
export type FixtureCase = {
  name: string;
  files: ScanFileInput[];
  manifest: FixtureManifest;
  options?: RunScanOptions;
};

// ---------------------------------------------------------------------------
// Cadence -> recurring/habit matching convention
// ---------------------------------------------------------------------------
//
// The manifest only exposes three cadences (daily/weekly/monthly) even though the
// pipeline's RecurringItem.interval also has 'biweekly' and 'annual'. Convention:
//   - 'monthly'  matches a RecurringItem with interval 'monthly' (or 'annual').
//   - 'weekly'   matches a RecurringItem with interval 'weekly' or 'biweekly'
//                (both read as "roughly weekly cadence" from a manifest author's
//                point of view).
//   - 'daily'    has no RecurringItem interval to match (the recurrence detector's
//                shortest interval is weekly); it instead matches a behavioral
//                HabitCandidate, which is exactly the detector for frequent,
//                variable-amount, discretionary spend (coffee, takeout, etc).

const RECURRING_INTERVALS_FOR_CADENCE: Record<'weekly' | 'monthly', string[]> = {
  weekly: ['weekly', 'biweekly'],
  monthly: ['monthly', 'annual'],
};

function merchantMatches(needle: string, ...haystacks: string[]): boolean {
  const n = needle.toLowerCase();
  return haystacks.some((h) => (h ?? '').toLowerCase().includes(n));
}

function candidateFound(result: ScanResult, candidate: ExpectedCandidate): boolean {
  if (candidate.cadence === 'daily') {
    return result.habits.some((h) =>
      merchantMatches(candidate.merchantContains, h.merchantStem, h.merchantDisplay, ...h.topMerchants)
    );
  }
  const wantedIntervals = RECURRING_INTERVALS_FOR_CADENCE[candidate.cadence];
  return result.recurring.some(
    (r) => wantedIntervals.includes(r.interval) && merchantMatches(candidate.merchantContains, r.merchantStem, r.merchantDisplay)
  );
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type CandidateScore = ExpectedCandidate & { found: boolean };

export type TierShares = { solid: number; likely: number; needsReview: number };

export type FixtureScore = {
  name: string;
  description: string;
  status: ScanResult['status'];
  gracefulFailure: boolean;
  expectGracefulFailure: boolean;
  gracefulFailureCorrect: boolean;

  rowsParsed: number;
  minRowsParsed: number;
  rowParseFloorMet: boolean;

  tierShares: TierShares;
  needsReviewShare: number;
  maxNeedsReviewShare: number;
  needsReviewFloorMet: boolean;

  candidates: CandidateScore[];
  requiredCandidatesTotal: number;
  requiredCandidatesFound: number;
  candidateRecall: number; // requiredFound / requiredTotal, 1 when there are none required
  knownGapCount: number;

  /**
   * Precision proxy: recurring + habit candidates the pipeline found that no
   * manifest entry (required or not) matches on merchant substring. Reported,
   * never failed on: a fixture author cannot enumerate every true candidate a
   * good pipeline might surface (spec asks for "reported not failed").
   */
  unexpectedCandidateCount: number;
};

function tierShares(rows: ScanResult['rows']): TierShares {
  const total = rows.length;
  if (total === 0) return { solid: 0, likely: 0, needsReview: 0 };
  let solid = 0;
  let likely = 0;
  let needsReview = 0;
  for (const r of rows) {
    if (r.categoryTier === 'solid') solid++;
    else if (r.categoryTier === 'likely') likely++;
    else needsReview++;
  }
  return { solid: solid / total, likely: likely / total, needsReview: needsReview / total };
}

/** Run the real pipeline over a fixture's files and score the result against its manifest. */
export function scoreFixture(fixture: FixtureCase): FixtureScore {
  const result = runScan(fixture.files, fixture.options);
  const manifest = fixture.manifest;

  const rowsParsed = result.files.reduce((sum, f) => sum + f.rowsRead, 0);
  const shares = tierShares(result.rows);

  const candidates: CandidateScore[] = manifest.expectedCandidates.map((c) => ({
    ...c,
    found: candidateFound(result, c),
  }));
  const required = candidates.filter((c) => c.required);
  const requiredFound = required.filter((c) => c.found);
  const knownGapCount = candidates.filter((c) => !c.required && c.knownGap).length;

  const expectedNeedles = candidates.map((c) => c.merchantContains.toLowerCase());
  const isExpected = (name: string) => expectedNeedles.some((n) => (name ?? '').toLowerCase().includes(n));
  const unexpectedRecurring = result.recurring.filter((r) => !isExpected(r.merchantStem) && !isExpected(r.merchantDisplay));
  const unexpectedHabits = result.habits.filter((h) => !isExpected(h.merchantStem) && !isExpected(h.merchantDisplay));

  return {
    name: fixture.name,
    description: manifest.description,
    status: result.status,
    gracefulFailure: result.gracefulFailure,
    expectGracefulFailure: manifest.expectGracefulFailure,
    gracefulFailureCorrect: result.gracefulFailure === manifest.expectGracefulFailure,

    rowsParsed,
    minRowsParsed: manifest.minRowsParsed,
    rowParseFloorMet: rowsParsed >= manifest.minRowsParsed,

    tierShares: shares,
    needsReviewShare: shares.needsReview,
    maxNeedsReviewShare: manifest.maxNeedsReviewShare,
    needsReviewFloorMet: shares.needsReview <= manifest.maxNeedsReviewShare,

    candidates,
    requiredCandidatesTotal: required.length,
    requiredCandidatesFound: requiredFound.length,
    candidateRecall: required.length === 0 ? 1 : requiredFound.length / required.length,
    knownGapCount,

    unexpectedCandidateCount: unexpectedRecurring.length + unexpectedHabits.length,
  };
}

export function scoreFixtures(fixtures: FixtureCase[]): FixtureScore[] {
  return fixtures.map(scoreFixture);
}
