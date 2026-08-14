/**
 * UX-073 regression: a rate's divisor is elapsed calendar time, never the count
 * of days that happened to carry a transaction.
 *
 * The bug shipped `coveredDays` (distinct transacted days) as the divisor for
 * every "a month" / "a year" / "per day" figure. Against the committed
 * chequing-split-mixed-dates fixture, whose three $1,200 rent rows sit 30 days
 * apart across an 87-day window, the biggest-leak card announced that rent cost
 * about $4,000 a month while the evidence eyebrow directly above it read
 * "Apr 1 to Jun 26". That is the app's loudest sentence stating a fabricated
 * figure, against the standing "never invent statistics" rule.
 *
 * These tests run the real pipeline over the real committed fixture rather than
 * a hand-built ScanResult, because the bug lived in the seam between coverage
 * and the rate math, and a hand-built fixture is exactly where it hid.
 */

// scanRules imports AsyncStorage at module load; mock it (matches acceptance.test.ts).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import fs from 'fs';
import path from 'path';
import { runScan } from '@/utils/leakScan';
import { sessionCoverage } from '@/utils/leakScan/coverage';
import { buildKpiSummary } from '@/utils/leakScan/resultsSummary';
import { scanResultToSummary } from '@/utils/leakScan/summarize';
import { emptyScanRules } from '@/utils/scanRules';
import { habitCandidateToDetectedHabit } from '@/utils/leakScanBridge';
import type { ScanRow } from '@/utils/leakScan/types';

const FIXTURE = path.join(__dirname, '..', 'leakScanEval', 'fixtures', 'chequing-split-mixed-dates.csv');

/** The fixture's own filter row states its window: 2026-04-01 to 2026-06-30. */
const RENT_CENTS = 120000;
const RENT_ROWS = 3;

async function scanFixture() {
  const text = fs.readFileSync(FIXTURE, 'utf-8');
  return runScan([{ fileName: 'chequing-split-mixed-dates.csv', text }], {
    rules: emptyScanRules(),
    homeCurrency: 'CAD',
    importId: 'ux073',
  });
}

function row(dateISO: string, amountCents: number): ScanRow {
  return {
    id: `r-${dateISO}-${amountCents}`,
    dateISO,
    date: new Date(`${dateISO}T00:00:00.000Z`),
    amountCents,
    rawDescription: 'Park Property Management Rent',
    merchantStem: 'park',
    merchantDisplay: 'Park Property Management',
    category: 'Mortgage',
    categoryTier: 'solid',
    rowClass: 'spend',
    account: 'chequing',
    pending: false,
    foreign: false,
    internal: false,
    reversed: false,
    needsReview: false,
    hash: `h-${dateISO}-${amountCents}`,
  };
}

describe('UX-073: coverage reports span and density separately', () => {
  it('separates calendar span from transacted days', () => {
    // Three rent rows, one a month. Span is a quarter; only 3 days transacted.
    const coverage = sessionCoverage([
      row('2026-04-01', -RENT_CENTS),
      row('2026-05-01', -RENT_CENTS),
      row('2026-06-01', -RENT_CENTS),
    ]);

    expect(coverage).not.toBeNull();
    expect(coverage!.startISO).toBe('2026-04-01');
    expect(coverage!.endISO).toBe('2026-06-01');
    // Apr 1 to Jun 1 inclusive.
    expect(coverage!.spanDays).toBe(62);
    // The old divisor, now density only.
    expect(coverage!.coveredDays).toBe(3);
  });

  it('counts a day with several transactions once toward density, not span', () => {
    const coverage = sessionCoverage([
      row('2026-04-01', -500),
      row('2026-04-01', -600),
      row('2026-04-10', -700),
    ]);
    expect(coverage!.spanDays).toBe(10);
    expect(coverage!.coveredDays).toBe(2);
  });
});

describe('UX-073: monthly rent reads its real price, not a sampling artifact', () => {
  it('rates the rent candidate near its true $1,200 a month', async () => {
    const result = await scanFixture();
    const rent = result.habits.find((h) => h.merchantStem.includes('park'));
    expect(rent).toBeDefined();
    expect(rent!.occurrences).toBe(RENT_ROWS);
    expect(rent!.totalCents).toBe(RENT_CENTS * RENT_ROWS);

    const habit = habitCandidateToDetectedHabit(rent!, result.coverage!.spanDays);

    // The honest figure. Three $1,200 payments across an 87-day window
    // annualize to about $1,200 a month; the exact value depends on the
    // window, so assert a band around the true rent rather than a magic
    // number, and assert hard that the fabricated $4,000 cannot come back.
    expect(habit.totalMonthlySpend).toBeGreaterThan(110000);
    expect(habit.totalMonthlySpend).toBeLessThan(140000);
    expect(habit.totalMonthlySpend).toBeLessThan(RENT_CENTS * 2);

    // Per-instance cost is a price, not a rate: it divides by the occurrence
    // count and is exactly the rent.
    expect(habit.averageAmount).toBe(RENT_CENTS);
  });

  it('would have overstated rent under the old transacted-day divisor', async () => {
    const result = await scanFixture();
    const rent = result.habits.find((h) => h.merchantStem.includes('park'))!;
    const { spanDays, coveredDays } = result.coverage!;

    // Guard the premise: this fixture is only a regression test while its
    // window stays sparse. If a future edit fills in the calendar, this
    // assertion fails loudly rather than the test quietly proving nothing.
    expect(coveredDays).toBeLessThan(spanDays);

    const honest = habitCandidateToDetectedHabit(rent, spanDays).totalMonthlySpend;
    const buggy = habitCandidateToDetectedHabit(rent, coveredDays).totalMonthlySpend;
    expect(buggy).toBeGreaterThan(honest * 2);
  });

  it('annualizes the leak off the span too', async () => {
    const result = await scanFixture();
    const rent = result.habits.find((h) => h.merchantStem.includes('park'))!;
    // 12 months of $1,200 rent is about $14,400 a year.
    expect(rent.annualizedLeakCents).toBeGreaterThan(1200000);
    expect(rent.annualizedLeakCents).toBeLessThan(1800000);
  });
});

describe('UX-073: the per-day KPIs and the persisted snapshot use the span', () => {
  it('divides spend-per-day by elapsed days', async () => {
    const result = await scanFixture();
    const kpis = buildKpiSummary(result);

    expect(kpis.spanDays).toBe(result.coverage!.spanDays);
    expect(kpis.coveredDays).toBe(result.coverage!.coveredDays);
    expect(kpis.perDayCents).toBe(Math.round(kpis.totalSpentCents / kpis.spanDays));
    expect(kpis.purchasesPerDay).toBeCloseTo(kpis.transactionCount / kpis.spanDays, 6);
  });

  it('carries the honest rent figure into the Insights snapshot', async () => {
    const result = await scanFixture();
    const summary = scanResultToSummary(result, new Date('2026-07-01T00:00:00.000Z'));
    expect(summary).not.toBeNull();

    const rentLeak = summary!.topLeaks.find((l) => l.name.toLowerCase().includes('park'));
    if (rentLeak) {
      // The snapshot outlives the scan on Insights, so a wrong divisor here is
      // a wrong number the user rereads for weeks.
      expect(rentLeak.monthlyCents).toBeLessThan(RENT_CENTS * 2);
    }
    expect(summary!.kpis.spanDays).toBe(result.coverage!.spanDays);
  });
});
