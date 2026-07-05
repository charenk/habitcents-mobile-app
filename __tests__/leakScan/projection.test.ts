/** SYNTHETIC fixtures built directly at the ScanRow/RecurringItem shape. */
import { buildProjectionSummary } from '@/utils/leakScan/projection';
import type { GovernClass, RecurringItem, ScanRow } from '@/utils/leakScan/types';
import type { ExpenseCategory } from '@/types/expense';

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

function recurringItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    merchantStem: 'loan',
    merchantDisplay: 'Car Loan',
    category: 'Car',
    rowClass: 'spend',
    amountCents: 29380,
    interval: 'biweekly',
    occurrences: 6,
    lastDateISO: '2026-06-20',
    nextDateISO: '2026-07-04',
    nextMonthHits: 1,
    ...overrides,
  };
}

function classMap(entries: [ExpenseCategory, GovernClass][]): Map<ExpenseCategory, GovernClass> {
  return new Map(entries);
}

describe('buildProjectionSummary', () => {
  it('returns hasFullMonth false and empty groups below 28 covered days', () => {
    const summary = buildProjectionSummary([], [], 20, classMap([]));
    expect(summary.hasFullMonth).toBe(false);
    expect(summary.lockedIn).toHaveLength(0);
    expect(summary.runRate).toHaveLength(0);
    expect(summary.bufferCents).toBe(0);
  });

  it('renders once coverage reaches a full calendar month', () => {
    const summary = buildProjectionSummary([], [], 28, classMap([]));
    expect(summary.hasFullMonth).toBe(true);
  });

  it('carries fixed recurring items into lockedIn unchanged', () => {
    const recurring = [recurringItem()];
    const summary = buildProjectionSummary([], recurring, 30, classMap([]));
    expect(summary.lockedIn).toEqual(recurring);
  });

  it('multiplies a biweekly 3-payment month into the subtotal via nextMonthHits', () => {
    const recurring = [recurringItem({ nextMonthHits: 3, amountCents: 10000 })];
    const summary = buildProjectionSummary([], recurring, 30, classMap([]));
    expect(summary.subtotalCents).toBe(30000);
  });

  it('computes the run-rate median across covered months for eligible categories', () => {
    const rows = [
      row({ category: 'Food', dateISO: '2026-01-05', amountCents: -10000 }),
      row({ category: 'Food', dateISO: '2026-02-05', amountCents: -20000 }),
      row({ category: 'Food', dateISO: '2026-03-05', amountCents: -30000 }),
    ];
    const summary = buildProjectionSummary(rows, [], 90, classMap([['Food', 'govern']]));
    const food = summary.runRate.find((r) => r.category === 'Food');
    expect(food?.medianMonthlyCents).toBe(20000);
    expect(food?.tier).toBe('solid');
  });

  it('falls back to a single-month run rate with tier likely', () => {
    const rows = [row({ category: 'Food', dateISO: '2026-01-05', amountCents: -5000 })];
    const summary = buildProjectionSummary(rows, [], 30, classMap([['Food', 'govern']]));
    const food = summary.runRate.find((r) => r.category === 'Food');
    expect(food?.medianMonthlyCents).toBe(5000);
    expect(food?.tier).toBe('likely');
  });

  it('excludes fixed-class categories from the run-rate line (no double count)', () => {
    const rows = [row({ category: 'Mortgage', dateISO: '2026-01-05', amountCents: -100000 })];
    const summary = buildProjectionSummary(rows, [], 30, classMap([['Mortgage', 'fixed']]));
    expect(summary.runRate).toHaveLength(0);
  });

  it('excludes categories with no habit classification at all', () => {
    const rows = [row({ category: 'Utilities', dateISO: '2026-01-05', amountCents: -8000 })];
    const summary = buildProjectionSummary(rows, [], 30, classMap([]));
    expect(summary.runRate).toHaveLength(0);
  });

  it('computes a 12% buffer of the locked-in + run-rate subtotal', () => {
    const recurring = [recurringItem({ amountCents: 10000, nextMonthHits: 1 })];
    const rows = [row({ category: 'Food', dateISO: '2026-01-05', amountCents: -5000 })];
    const summary = buildProjectionSummary(rows, recurring, 30, classMap([['Food', 'govern']]));
    expect(summary.subtotalCents).toBe(15000);
    expect(summary.bufferCents).toBe(1800);
  });

  it('excludes internal/reversed rows from the run-rate computation', () => {
    const rows = [
      row({ category: 'Food', dateISO: '2026-01-05', amountCents: -5000 }),
      row({ category: 'Food', dateISO: '2026-01-06', amountCents: -50000, internal: true }),
    ];
    const summary = buildProjectionSummary(rows, [], 30, classMap([['Food', 'govern']]));
    const food = summary.runRate.find((r) => r.category === 'Food');
    expect(food?.medianMonthlyCents).toBe(5000);
  });
});
