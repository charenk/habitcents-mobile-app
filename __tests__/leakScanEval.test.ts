/**
 * Leak Scan evaluation harness suite (OB-2, ADR 0020). Runs the real pipeline
 * (`runScan`) over every fixture the harness knows about:
 *   - the 14 acceptance fixtures (adapted from __tests__/leakScan/fixtures.ts),
 *   - the committed synthetic "realistic mess" fixtures in leakScanEval/fixtures/,
 *   - Charen's gitignored private drop-in fixtures in leakScanEval/private/, when
 *     present (absent on a fresh checkout and in CI -- see leakScanEval/README.md).
 *
 * Each fixture is scored against its manifest's floors (see leakScanEval/eval.ts)
 * and asserted here. This suite also prints a score table so a PR can quote real
 * numbers instead of vibes:
 *
 *   npm test -- leakScanEval
 *
 * This gates the Door 2 UX work (ADR 0020): quality is measured before it is built
 * on top of. This unit does not fix pipeline code -- see OB-3.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { scoreFixture, type FixtureCase, type FixtureScore } from './leakScanEval/eval';
import { adaptedFixtures } from './leakScanEval/adaptedFixtures';
import { loadSyntheticFixtures, loadPrivateFixtures, loadPrivateCombinedFixture } from './leakScanEval/loadFixtures';

const syntheticFixtures = loadSyntheticFixtures();
const privateFixtures = loadPrivateFixtures();
const privateCombined = loadPrivateCombinedFixture();

const allCases: FixtureCase[] = [
  ...adaptedFixtures,
  ...syntheticFixtures,
  ...privateFixtures,
  ...(privateCombined ? [privateCombined] : []),
];

const scored: { fixture: FixtureCase; score: FixtureScore }[] = allCases.map((fixture) => ({
  fixture,
  score: scoreFixture(fixture),
}));

describe('Leak Scan eval harness: fixture discovery', () => {
  it('discovers the adapted acceptance fixtures and the committed synthetic fixtures', () => {
    // 13 of the 14 acceptance-spec fixtures (spec section 9; acceptance 14, undo,
    // needs the expense-log helpers and isn't pipeline-scan output, so it stays in
    // the acceptance suite only) plus 2 PapaParse-robustness fixtures (quoted
    // fields, semicolon delimiter) also reused from fixtures.ts.
    expect(adaptedFixtures.length).toBe(15);
    expect(syntheticFixtures.length).toBeGreaterThanOrEqual(2);
  });

  it('discovers csv+json pairs from the gitignored private/ dir without throwing when it is empty (CI contract)', () => {
    // This does not assert private/ IS empty -- locally, right now, it isn't. It
    // asserts discovery is a total function: an empty/missing directory returns []
    // rather than failing the suite, which is what keeps CI green with no private
    // fixtures checked out at all.
    expect(Array.isArray(privateFixtures)).toBe(true);
  });
});

describe.each(scored.map(({ fixture, score }) => [fixture.name, fixture, score] as const))(
  '%s',
  (_name, fixture, score) => {
    it(`parses at least ${score.minRowsParsed} row(s) (measured: ${score.rowsParsed})`, () => {
      expect(score.rowsParsed).toBeGreaterThanOrEqual(score.minRowsParsed);
    });

    it(`keeps needs-review share at or below ${score.maxNeedsReviewShare} (measured: ${score.needsReviewShare.toFixed(3)})`, () => {
      expect(score.needsReviewShare).toBeLessThanOrEqual(score.maxNeedsReviewShare);
    });

    it('finds every required candidate', () => {
      const missing = score.candidates.filter((c) => c.required && !c.found);
      expect(missing).toEqual([]);
    });

    it(`matches its graceful-failure expectation (expected ${fixture.manifest.expectGracefulFailure})`, () => {
      expect(score.gracefulFailure).toBe(fixture.manifest.expectGracefulFailure);
    });
  }
);

describe('Leak Scan eval harness: score table', () => {
  it('prints a per-fixture score table', () => {
    printScoreTable(scored.map((s) => s.score));
    expect(scored.length).toBe(allCases.length);
  });
});

function printScoreTable(scores: FixtureScore[]): void {
  // eslint-disable-next-line no-console -- this IS the report (npm test -- leakScanEval).
  console.table(
    scores.map((s) => ({
      fixture: s.name,
      status: s.status,
      rowsParsed: `${s.rowsParsed}/${s.minRowsParsed}`,
      solid: pct(s.tierShares.solid),
      likely: pct(s.tierShares.likely),
      needsReview: `${pct(s.needsReviewShare)} (floor <=${pct(s.maxNeedsReviewShare)})`,
      requiredCandidates: `${s.requiredCandidatesFound}/${s.requiredCandidatesTotal}`,
      knownGaps: s.knownGapCount,
      unexpectedCandidates: s.unexpectedCandidateCount,
      gracefulFailure: s.gracefulFailureCorrect ? 'as expected' : 'MISMATCH',
    }))
  );
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
