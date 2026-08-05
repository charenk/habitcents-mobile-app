/**
 * Fixture discovery for the Leak Scan eval harness (OB-2, ADR 0020). Reads
 * <name>.csv + <name>.expected.json pairs from a directory. Used for both the
 * committed `fixtures/` directory (synthetic, always present) and the gitignored
 * `private/` directory (Charen's sanitized real exports, absent in CI and on a
 * fresh checkout).
 */

import fs from 'fs';
import path from 'path';
import type { FixtureCase, FixtureManifest } from './eval';

function discoverDir(dir: string): FixtureCase[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir);
  const csvFiles = entries.filter((f) => f.endsWith('.csv')).sort();

  const cases: FixtureCase[] = [];
  for (const csvFile of csvFiles) {
    const name = csvFile.slice(0, -'.csv'.length);
    const manifestFile = `${name}.expected.json`;
    if (!entries.includes(manifestFile)) {
      // A stray CSV with no manifest is not a fixture; skip it rather than fail the
      // whole discovery pass (keeps a work-in-progress drop-in from breaking CI/local
      // runs of every other fixture).
      continue;
    }
    const text = fs.readFileSync(path.join(dir, csvFile), 'utf-8');
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, manifestFile), 'utf-8')) as FixtureManifest;
    cases.push({ name, files: [{ fileName: csvFile, text }], manifest });
  }
  return cases;
}

/** The committed synthetic fixtures directory: always present, safe for CI. */
export function loadSyntheticFixtures(): FixtureCase[] {
  return discoverDir(path.join(__dirname, 'fixtures'));
}

/**
 * Charen's gitignored drop-in directory of sanitized real exports (see README.md).
 * Absent on a fresh checkout and in CI; returns an empty list rather than failing.
 * Case names are prefixed `private:` so they read distinctly in the score table and
 * never collide with a synthetic fixture name.
 */
export function loadPrivateFixtures(): FixtureCase[] {
  return discoverDir(path.join(__dirname, 'private')).map((c) => ({ ...c, name: `private:${c.name}` }));
}

/**
 * A combined multi-file case built from every private fixture's first file, run as
 * ONE scan session (cross-account netting only happens within a single runScan
 * call). Returns null when there are fewer than two private fixtures to combine.
 */
export function loadPrivateCombinedFixture(): FixtureCase | null {
  const cases = loadPrivateFixtures();
  if (cases.length < 2) return null;
  return {
    name: 'private:combined',
    files: cases.flatMap((c) => c.files),
    manifest: {
      description: 'Every private fixture run as ONE multi-file scan session, to check cross-account transfer netting.',
      // Combining files never loses rows relative to running them separately (parsing
      // is per-file); the floor is just the sum of each fixture's own measured floor.
      minRowsParsed: cases.reduce((sum, c) => sum + c.manifest.minRowsParsed, 0),
      expectedCandidates: [],
      maxNeedsReviewShare: 1,
      expectGracefulFailure: false,
    },
  };
}
