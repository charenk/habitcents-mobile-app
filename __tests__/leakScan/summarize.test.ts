/** SYNTHETIC fixtures built directly at the ScanRow/FileScan/ScanResult shape,
 *  matching the pattern in __tests__/leakScan/resultsSummary.test.ts. */
import { scanResultToSummary } from '@/utils/leakScan/summarize';
import { buildKpiSummary } from '@/utils/leakScan/resultsSummary';
import type {
  FileScan,
  HabitCandidate,
  RecurringItem,
  ScanResult,
  ScanRow,
} from '@/utils/leakScan/types';

const NOW = new Date('2026-02-01T00:00:00.000Z');

let rowCounter = 0;
function row(overrides: Partial<ScanRow> = {}): ScanRow {
  rowCounter += 1;
  return {
    id: `r${rowCounter}`,
    dateISO: '2026-01-05',
    date: new Date('2026-01-05'),
    amountCents: -1000,
    rawDescription: 'Test Merchant',
    merchantStem: 'test',
    merchantDisplay: 'Test Merchant',
    category: 'Food',
    categoryTier: 'solid',
    rowClass: 'spend',
    account: 'A',
    pending: false,
    foreign: false,
    internal: false,
    reversed: false,
    needsReview: false,
    hash: `h${rowCounter}`,
    ...overrides,
  };
}

function fileScan(overrides: Partial<FileScan> = {}): FileScan {
  return {
    fileName: 'file.csv',
    account: 'A',
    rows: [],
    rowsRead: 0,
    rowsSkipped: 0,
    headerFound: true,
    sign: { outflowSign: -1, method: 'balance', confidence: 1, needsConfirmation: false },
    confidenceScore: 0.9,
    confidenceTier: 'solid',
    dateRange: null,
    truncated: false,
    belowFloor: false,
    ...overrides,
  };
}

function habit(overrides: Partial<HabitCandidate> = {}): HabitCandidate {
  return {
    merchantStem: 'coffee',
    merchantDisplay: 'Coffee Shop',
    category: 'Food',
    governClass: 'govern',
    tier: 'solid',
    occurrences: 8,
    activeDays: 8,
    totalCents: 4000,
    annualizedLeakCents: 48000,
    rankScore: 48000,
    topMerchants: ['Coffee Shop'],
    // Default fixture is an ordinary behavioral leak, the deck's own shape.
    isBehavioral: true,
    isSubscription: false,
    ...overrides,
  };
}

function recurringItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    merchantStem: 'coffee',
    merchantDisplay: 'Coffee Shop',
    category: 'Food',
    rowClass: 'spend',
    amountCents: 500,
    interval: 'weekly',
    occurrences: 8,
    lastDateISO: '2026-01-30',
    nextDateISO: '2026-02-06',
    nextMonthHits: 4,
    ...overrides,
  };
}

function scanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    importId: 'import-1',
    status: 'ok',
    files: [],
    rows: [],
    questions: [],
    transfers: [],
    refunds: [],
    duplicatesMerged: 0,
    recurring: [],
    habits: [],
    coverage: null,
    tier: 'solid',
    gracefulFailure: false,
    ...overrides,
  };
}

describe('scanResultToSummary', () => {
  it('returns null on graceful failure', () => {
    const result = scanResult({ gracefulFailure: true });
    expect(scanResultToSummary(result, NOW)).toBeNull();
  });

  it('builds a full golden summary from a small synthetic scan', () => {
    const rows = [
      row({ id: 'food-1', category: 'Food', amountCents: -1000, dateISO: '2026-01-05' }),
      row({ id: 'shop-1', category: 'Shopping', amountCents: -3000, dateISO: '2026-01-10' }),
      // Internal transfer: excluded from spend/category totals but still counts
      // toward evidence.rowCount (a surviving, netted row of the session).
      row({ id: 'xfer-1', category: 'Food', amountCents: -500, internal: true, dateISO: '2026-01-15' }),
    ];
    const result = scanResult({
      files: [fileScan({ account: 'A' }), fileScan({ account: 'B' })],
      rows,
      coverage: { startISO: '2026-01-01', endISO: '2026-01-31', spanDays: 31, coveredDays: 31 },
      habits: [
        habit({
          merchantStem: 'coffee',
          merchantDisplay: 'Coffee Shop',
          category: 'Food',
          governClass: 'govern',
          tier: 'solid',
          occurrences: 8,
          totalCents: 4000,
        }),
        habit({
          merchantStem: 'rideshare',
          merchantDisplay: 'Rideshare',
          category: 'Transportation',
          governClass: 'influence',
          tier: 'likely',
          occurrences: 4,
          totalCents: 6000,
        }),
      ],
      recurring: [recurringItem({ merchantStem: 'coffee', amountCents: 500, nextMonthHits: 4 })],
    });

    const summary = scanResultToSummary(result, NOW);
    expect(summary).not.toBeNull();
    if (!summary) return;

    expect(summary.schemaVersion).toBe(1);
    expect(summary.createdAt).toBe(NOW);

    // Evidence
    expect(summary.evidence.windowStart).toEqual(new Date('2026-01-01'));
    expect(summary.evidence.windowEnd).toEqual(new Date('2026-01-31'));
    expect(summary.evidence.fileCount).toBe(2);
    expect(summary.evidence.rowCount).toBe(3);

    // KPIs mirror resultsSummary's own builder exactly.
    expect(summary.kpis).toEqual(buildKpiSummary(result));

    // Categories: sorted by spend descending, internal row excluded.
    expect(summary.categories).toEqual([
      { name: 'Shopping', totalCents: 3000, share: 0.75 },
      { name: 'Food', totalCents: 1000, share: 0.25 },
    ]);

    // Top leaks: ranked by monthly cost (annualized from the 31-day window),
    // not raw observed total -- rideshare's larger monthly run rate outranks
    // coffee's larger occurrence count. Coffee has a matching recurring entry
    // (weekly); rideshare does not, so it falls back to 'irregular'.
    expect(summary.topLeaks).toEqual([
      { name: 'Rideshare', monthlyCents: 5806, observedCents: 6000, buys: 4, cadence: 'irregular', tier: 'likely' },
      { name: 'Coffee Shop', monthlyCents: 3871, observedCents: 4000, buys: 8, cadence: 'weekly', tier: 'solid' },
    ]);

    // Projection: full-month coverage, so locked-in (recurring * nextMonthHits)
    // plus run-rate (Food, the only govern/influence category with spend rows)
    // plus the 12% buffer.
    expect(summary.projection).toEqual({ nextMonthCents: 3360, lockedInCents: 2000 });
  });

  it('caps top leaks at 5, ranked by monthly cost', () => {
    const habits = Array.from({ length: 7 }, (_, i) =>
      habit({
        merchantStem: `m${i}`,
        merchantDisplay: `Merchant ${i}`,
        totalCents: (i + 1) * 1000, // 1000..7000, strictly increasing
        occurrences: i + 1,
      })
    );
    const result = scanResult({
      habits,
      coverage: { startISO: '2026-01-01', endISO: '2026-01-31', spanDays: 31, coveredDays: 31 },
    });
    const summary = scanResultToSummary(result, NOW);
    expect(summary?.topLeaks).toHaveLength(5);
    // Highest observed total (Merchant 6, 7000 cents) ranks first.
    expect(summary?.topLeaks[0].name).toBe('Merchant 6');
    expect(summary?.topLeaks[4].name).toBe('Merchant 2');
  });

  it('tiebreaks equal monthly cost by occurrence count', () => {
    const result = scanResult({
      habits: [
        habit({ merchantStem: 'a', merchantDisplay: 'A', totalCents: 1000, occurrences: 2 }),
        habit({ merchantStem: 'b', merchantDisplay: 'B', totalCents: 1000, occurrences: 5 }),
      ],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-31', spanDays: 31, coveredDays: 31 },
    });
    const summary = scanResultToSummary(result, NOW);
    expect(summary?.topLeaks.map((l) => l.name)).toEqual(['B', 'A']);
  });

  it('leaves evidence window and projection null when there is no coverage', () => {
    const result = scanResult({ rows: [row()] });
    const summary = scanResultToSummary(result, NOW);
    expect(summary?.evidence.windowStart).toBeNull();
    expect(summary?.evidence.windowEnd).toBeNull();
    expect(summary?.projection).toBeNull();
  });

  it('leaves projection null when coverage is under a full calendar month', () => {
    const result = scanResult({
      coverage: { startISO: '2026-01-01', endISO: '2026-01-15', spanDays: 15, coveredDays: 15 },
    });
    const summary = scanResultToSummary(result, NOW);
    expect(summary?.projection).toBeNull();
  });
});
