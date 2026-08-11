/**
 * utils/leakScan/importWrite.ts's toAddExpenseInput (U11): the fix for the
 * results-screen write sites silently dropping `source`/`importId` (and
 * `recurrenceRule`) on the way into ExpensesContext.addExpense, which meant
 * "Undo this import" (filtering on importId) removed nothing. Pure-function
 * coverage here; the end-to-end save-then-undo flow through the real
 * ResultsScreen UI is covered in __tests__/leakScanImportUndo.test.tsx.
 */
import {
  recurringToExpenses,
  rowToExpense,
  seedLastDays,
  toAddExpenseInput,
} from '@/utils/leakScan/importWrite';
import type { RecurringItem, ScanResult, ScanRow } from '@/utils/leakScan/types';

function makeScanRow(overrides: Partial<ScanRow> = {}): ScanRow {
  return {
    id: 'r1',
    dateISO: '2026-06-01',
    date: new Date('2026-06-01'),
    amountCents: -1200,
    rawDescription: 'Coffee Shop',
    merchantStem: 'coffeeshop',
    merchantDisplay: 'Coffee Shop',
    category: 'Food',
    categoryTier: 'solid',
    rowClass: 'spend',
    account: 'A',
    pending: false,
    foreign: false,
    internal: false,
    reversed: false,
    needsReview: false,
    hash: 'h1',
    ...overrides,
  };
}

function makeRecurringItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    merchantStem: 'netflix',
    merchantDisplay: 'Netflix',
    category: 'Software & Subscriptions',
    rowClass: 'spend',
    amountCents: 1599,
    interval: 'monthly',
    occurrences: 3,
    lastDateISO: '2026-05-01',
    nextDateISO: '2026-06-01',
    nextMonthHits: 1,
    ...overrides,
  };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    importId: 'imp-test-1',
    status: 'ok',
    files: [],
    rows: [],
    questions: [],
    transfers: [],
    refunds: [],
    duplicatesMerged: 0,
    recurring: [],
    habits: [],
    coverage: { startISO: '2026-01-01', endISO: '2026-01-30', coveredDays: 30 },
    tier: 'solid',
    gracefulFailure: false,
    ...overrides,
  };
}

describe('toAddExpenseInput', () => {
  it('carries source and importId through for a seeded (rowToExpense) row', () => {
    const row = makeScanRow();
    const exp = rowToExpense(row, 'imp-abc');
    const input = toAddExpenseInput(exp);

    expect(input.source).toBe('import');
    expect(input.importId).toBe('imp-abc');
    expect(input.category).toBe('Food');
    expect(input.amount).toBe(1200);
  });

  it('carries source and importId through for a recurring (recurringToExpenses) row', () => {
    const result = makeScanResult({ recurring: [makeRecurringItem()] });
    const [exp] = recurringToExpenses(result);
    const input = toAddExpenseInput(exp);

    expect(input.source).toBe('import');
    expect(input.importId).toBe('imp-test-1');
    expect(input.isRecurring).toBe(true);
    expect(input.recurrence).toBe('monthly');
  });

  it('never invents a source/importId for a plain manual-shaped Expense', () => {
    const input = toAddExpenseInput({
      id: 'e1',
      title: 'Coffee',
      amount: 500,
      category: 'Food',
      date: new Date('2026-06-01'),
      time: '9:00 AM',
      isRecurring: false,
      reminderEnabled: false,
      iconVariant: 'yellow',
    });
    expect(input.source).toBeUndefined();
    expect(input.importId).toBeUndefined();
  });

  it('round-trips seedLastDays output the same way', () => {
    const result = makeScanResult({
      rows: [makeScanRow({ id: 'r-recent', date: new Date(), dateISO: new Date().toISOString().slice(0, 10) })],
    });
    const [exp] = seedLastDays(result, 30);
    const input = toAddExpenseInput(exp);
    expect(input.source).toBe('import');
    expect(input.importId).toBe(result.importId);
  });
});
