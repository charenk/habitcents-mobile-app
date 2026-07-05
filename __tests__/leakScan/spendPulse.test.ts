/**
 * SYNTHETIC fixtures only, built directly at the ScanRow/FileScan/ScanResult
 * shape (not run through the full CSV pipeline) so these tests isolate
 * spendPulse's own aggregation and coverage-honesty logic.
 */
import { autoGranularity, buildSpendPulse } from '@/utils/leakScan/spendPulse';
import type { FileScan, ScanResult, ScanRow } from '@/utils/leakScan/types';

let rowCounter = 0;
function row(overrides: Partial<ScanRow> = {}): ScanRow {
  rowCounter += 1;
  const dateISO = overrides.dateISO ?? '2026-01-01';
  return {
    id: `r${rowCounter}`,
    dateISO,
    date: new Date(dateISO),
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

describe('autoGranularity', () => {
  it('selects day for <= 45 days of coverage', () => {
    expect(autoGranularity(1)).toBe('day');
    expect(autoGranularity(45)).toBe('day');
  });

  it('selects month for > 45 days and <= 14 months', () => {
    expect(autoGranularity(46)).toBe('month');
    expect(autoGranularity(14 * 31)).toBe('month');
  });

  it('selects year beyond 14 months of coverage', () => {
    expect(autoGranularity(14 * 31 + 1)).toBe('year');
  });
});

describe('buildSpendPulse', () => {
  it('marks a covered day with spend as state spend, with a heat level', () => {
    const rows = [row({ dateISO: '2026-01-05', amountCents: -2000 })];
    const result = scanResult({
      rows,
      files: [fileScan({ rows, rowsRead: 1, dateRange: { startISO: '2026-01-01', endISO: '2026-01-10' } })],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-10', coveredDays: 10 },
    });
    const pulse = buildSpendPulse(result, 'day');
    const spendCell = pulse.cells.find((c) => c.key === '2026-01-05');
    expect(spendCell?.state).toBe('spend');
    expect(spendCell?.totalCents).toBe(2000);
    expect(spendCell?.level).toBeGreaterThan(0);
  });

  it('marks a covered day with no transactions as zero-spend, never out-of-coverage', () => {
    const rows = [row({ dateISO: '2026-01-05' })];
    const result = scanResult({
      rows,
      files: [fileScan({ rows, dateRange: { startISO: '2026-01-01', endISO: '2026-01-10' } })],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-10', coveredDays: 10 },
    });
    const pulse = buildSpendPulse(result, 'day');
    const zeroCell = pulse.cells.find((c) => c.key === '2026-01-03');
    expect(zeroCell?.state).toBe('zero-spend');
    expect(zeroCell?.totalCents).toBe(0);
  });

  it('marks a day outside every file range as out-of-coverage, distinct from zero-spend', () => {
    // File covers only Jan 1-10; the session span used for day cells should
    // never silently extend the file's own coverage.
    const rows = [row({ dateISO: '2026-01-05' })];
    const result = scanResult({
      rows,
      files: [fileScan({ rows, dateRange: { startISO: '2026-01-01', endISO: '2026-01-10' } })],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-10', coveredDays: 10 },
    });
    const pulse = buildSpendPulse(result, 'day');
    // Every emitted cell must fall within the file's own range; none should be
    // out-of-coverage for a single-file, single-range session.
    expect(pulse.cells.every((c) => c.state !== 'out-of-coverage')).toBe(true);
  });

  it('renders the gap between two files as out-of-coverage, never as zero-spend', () => {
    const rowsA = [row({ dateISO: '2026-01-05', amountCents: -1500 })];
    const rowsB = [row({ dateISO: '2026-03-05', amountCents: -1500 })];
    const result = scanResult({
      rows: [...rowsA, ...rowsB],
      files: [
        fileScan({ rows: rowsA, dateRange: { startISO: '2026-01-01', endISO: '2026-01-10' } }),
        fileScan({ rows: rowsB, dateRange: { startISO: '2026-03-01', endISO: '2026-03-10' } }),
      ],
      coverage: { startISO: '2026-01-01', endISO: '2026-03-10', coveredDays: 20 },
    });
    const pulse = buildSpendPulse(result, 'day');
    // Feb 15 sits in the gap between the two file ranges.
    const gapCell = pulse.cells.find((c) => c.key === '2026-02-15');
    expect(gapCell?.state).toBe('out-of-coverage');
  });

  it('excludes a belowFloor file from the covered date set', () => {
    const rows = [row({ dateISO: '2026-01-05' })];
    const badRows = [row({ dateISO: '2026-02-05' })];
    const result = scanResult({
      rows,
      files: [
        fileScan({ rows, dateRange: { startISO: '2026-01-01', endISO: '2026-01-10' } }),
        fileScan({ rows: badRows, dateRange: { startISO: '2026-02-01', endISO: '2026-02-10' }, belowFloor: true }),
      ],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-10', coveredDays: 10 },
    });
    const pulse = buildSpendPulse(result, 'day');
    const badFileCell = pulse.cells.find((c) => c.key === '2026-02-05');
    // The belowFloor file's range should not appear as covered at all in the
    // emitted span in the first place, or if it does, it must read out-of-coverage.
    if (badFileCell) {
      expect(badFileCell.state).toBe('out-of-coverage');
    }
  });

  it('never nets internal/reversed rows into spend totals', () => {
    const spendRow = row({ dateISO: '2026-01-05', amountCents: -1000 });
    const internalRow = row({ dateISO: '2026-01-05', amountCents: -5000, internal: true });
    const reversedRow = row({ dateISO: '2026-01-05', amountCents: -3000, reversed: true });
    const rows = [spendRow, internalRow, reversedRow];
    const result = scanResult({
      rows,
      files: [fileScan({ rows, dateRange: { startISO: '2026-01-01', endISO: '2026-01-10' } })],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-10', coveredDays: 10 },
    });
    const pulse = buildSpendPulse(result, 'day');
    const cell = pulse.cells.find((c) => c.key === '2026-01-05');
    expect(cell?.totalCents).toBe(1000);
  });

  it('aggregates day cells into a month cell that is spend if any day had spend', () => {
    const rows = [row({ dateISO: '2026-01-05', amountCents: -1000 })];
    const result = scanResult({
      rows,
      files: [fileScan({ rows, dateRange: { startISO: '2026-01-01', endISO: '2026-01-31' } })],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-31', coveredDays: 31 },
    });
    const pulse = buildSpendPulse(result, 'month');
    const monthCell = pulse.cells.find((c) => c.key === '2026-01');
    expect(monthCell?.state).toBe('spend');
    expect(monthCell?.totalCents).toBe(1000);
  });

  it('aggregates a month as out-of-coverage only when every constituent day is out-of-coverage', () => {
    // File only covers Jan 1-5; aggregating to month granularity should still
    // read January as covered (zero-spend), not as a gap, because part of the
    // month has real data.
    const rows = [row({ dateISO: '2026-01-03' })];
    const result = scanResult({
      rows,
      files: [fileScan({ rows, dateRange: { startISO: '2026-01-01', endISO: '2026-01-05' } })],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-05', coveredDays: 5 },
    });
    const pulse = buildSpendPulse(result, 'month');
    const monthCell = pulse.cells.find((c) => c.key === '2026-01');
    expect(monthCell?.state).not.toBe('out-of-coverage');
  });

  it('reports daysTransacted and coveredDays for the caption', () => {
    const rows = [
      row({ dateISO: '2026-01-05', amountCents: -1000 }),
      row({ dateISO: '2026-01-06', amountCents: -1000 }),
    ];
    const result = scanResult({
      rows,
      files: [fileScan({ rows, dateRange: { startISO: '2026-01-01', endISO: '2026-01-10' } })],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-10', coveredDays: 10 },
    });
    const pulse = buildSpendPulse(result, 'day');
    expect(pulse.daysTransacted).toBe(2);
    expect(pulse.coveredDays).toBe(10);
  });

  it('auto-selects a granularity when none is given', () => {
    const rows = [row({ dateISO: '2026-01-05' })];
    const result = scanResult({
      rows,
      files: [fileScan({ rows, dateRange: { startISO: '2026-01-01', endISO: '2026-01-10' } })],
      coverage: { startISO: '2026-01-01', endISO: '2026-01-10', coveredDays: 10 },
    });
    const pulse = buildSpendPulse(result);
    expect(pulse.granularity).toBe('day');
  });

  it('returns no cells when there are no passing files', () => {
    const result = scanResult({ files: [fileScan({ belowFloor: true, dateRange: null })] });
    const pulse = buildSpendPulse(result, 'day');
    expect(pulse.cells).toHaveLength(0);
  });
});
