/** SYNTHETIC fixtures built directly at the ScanRow/FileScan/ScanResult shape. */
import { buildCategorySummary, buildKpiSummary, weakerTier } from '@/utils/leakScan/resultsSummary';
import type { FileScan, ScanResult, ScanRow } from '@/utils/leakScan/types';

let rowCounter = 0;
function row(overrides: Partial<ScanRow> = {}): ScanRow {
  rowCounter += 1;
  return {
    id: `r${rowCounter}`,
    dateISO: '2026-01-01',
    date: new Date('2026-01-01'),
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

describe('weakerTier', () => {
  it('returns needs-review when either input is needs-review', () => {
    expect(weakerTier('solid', 'needs-review')).toBe('needs-review');
    expect(weakerTier('needs-review', 'solid')).toBe('needs-review');
  });

  it('returns likely over solid', () => {
    expect(weakerTier('solid', 'likely')).toBe('likely');
  });

  it('returns solid when both are solid', () => {
    expect(weakerTier('solid', 'solid')).toBe('solid');
  });
});

describe('buildKpiSummary', () => {
  it('computes total spent as net of internal/reversed rows', () => {
    const rows = [
      row({ amountCents: -1000 }),
      row({ amountCents: -5000, internal: true }),
      row({ amountCents: -3000, reversed: true }),
    ];
    const result = scanResult({ rows });
    const kpi = buildKpiSummary(result);
    expect(kpi.totalSpentCents).toBe(1000);
  });

  it('computes per-day as total over covered days', () => {
    const rows = [row({ amountCents: -1000 }), row({ amountCents: -1000 })];
    const result = scanResult({
      rows,
      coverage: { startISO: '2026-01-01', endISO: '2026-01-10', coveredDays: 10 },
    });
    const kpi = buildKpiSummary(result);
    expect(kpi.perDayCents).toBe(200);
  });

  it('returns zero per-day and purchases-per-day when there is no coverage', () => {
    const result = scanResult({ rows: [row()] });
    const kpi = buildKpiSummary(result);
    expect(kpi.perDayCents).toBe(0);
    expect(kpi.purchasesPerDay).toBe(0);
  });

  it('counts only spendable transactions', () => {
    const rows = [
      row({ amountCents: -1000 }),
      row({ amountCents: -1000 }),
      row({ amountCents: -1000, internal: true }),
      row({ amountCents: 2000, rowClass: 'income' }),
    ];
    const result = scanResult({ rows });
    const kpi = buildKpiSummary(result);
    expect(kpi.transactionCount).toBe(2);
  });

  it('counts accounts only from passing (non-belowFloor) files', () => {
    const result = scanResult({
      files: [
        fileScan({ account: 'A' }),
        fileScan({ account: 'B' }),
        fileScan({ account: 'C', belowFloor: true }),
      ],
    });
    const kpi = buildKpiSummary(result);
    expect(kpi.nAccounts).toBe(2);
  });

  it('carries the weakest tier among spendable rows, floored by session tier', () => {
    const rows = [row({ categoryTier: 'solid' }), row({ categoryTier: 'needs-review' })];
    const result = scanResult({ rows, tier: 'likely' });
    const kpi = buildKpiSummary(result);
    expect(kpi.totalSpentTier).toBe('needs-review');
  });

  it('floors the KPI tier by the overall session tier even if all rows are solid', () => {
    const rows = [row({ categoryTier: 'solid' })];
    const result = scanResult({ rows, tier: 'likely' });
    const kpi = buildKpiSummary(result);
    expect(kpi.totalSpentTier).toBe('likely');
  });
});

describe('buildCategorySummary', () => {
  it('sums spend per category and sorts by net spend descending', () => {
    const rows = [
      row({ category: 'Food', amountCents: -1000 }),
      row({ category: 'Shopping', amountCents: -5000 }),
      row({ category: 'Food', amountCents: -500 }),
    ];
    const result = scanResult({ rows });
    const summary = buildCategorySummary(result);
    expect(summary[0].category).toBe('Shopping');
    expect(summary[0].totalCents).toBe(5000);
    expect(summary[1].category).toBe('Food');
    expect(summary[1].totalCents).toBe(1500);
  });

  it('computes percent of total correctly', () => {
    const rows = [
      row({ category: 'Food', amountCents: -2500 }),
      row({ category: 'Shopping', amountCents: -7500 }),
    ];
    const result = scanResult({ rows });
    const summary = buildCategorySummary(result);
    const food = summary.find((s) => s.category === 'Food')!;
    const shopping = summary.find((s) => s.category === 'Shopping')!;
    expect(food.percentOfTotal).toBe(25);
    expect(shopping.percentOfTotal).toBe(75);
  });

  it('excludes internal/reversed/non-spend rows from category totals', () => {
    const rows = [
      row({ category: 'Food', amountCents: -1000 }),
      row({ category: 'Food', amountCents: -9000, internal: true }),
      row({ category: 'Other', amountCents: 5000, rowClass: 'transfer' }),
    ];
    const result = scanResult({ rows });
    const summary = buildCategorySummary(result);
    expect(summary).toHaveLength(1);
    expect(summary[0].totalCents).toBe(1000);
  });

  it('carries the weakest tier within each category', () => {
    const rows = [
      row({ category: 'Food', categoryTier: 'solid' }),
      row({ category: 'Food', categoryTier: 'likely' }),
    ];
    const result = scanResult({ rows });
    const summary = buildCategorySummary(result);
    expect(summary[0].tier).toBe('likely');
  });

  it('returns an empty list when there is no spend', () => {
    const result = scanResult({ rows: [] });
    expect(buildCategorySummary(result)).toHaveLength(0);
  });
});
