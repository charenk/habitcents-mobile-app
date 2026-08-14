/**
 * utils/leakScan/importWrite.ts's toAddExpenseInput (U11): the fix for the
 * results-screen write sites silently dropping `source`/`importId` (and
 * `recurrenceRule`) on the way into ExpensesContext.addExpense, which meant
 * "Undo this import" (filtering on importId) removed nothing. Pure-function
 * coverage here; the end-to-end save-then-undo flow through the real
 * ResultsScreen UI is covered in __tests__/leakScanImportUndo.test.tsx.
 */
import {
  filterAlreadyImported,
  recurringToExpenses,
  rowToExpense,
  seedLastDays,
  toAddExpenseInput,
} from '@/utils/leakScan/importWrite';
import type { RecurringItem, ScanResult, ScanRow } from '@/utils/leakScan/types';
import type { Expense } from '@/types/expense';

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
    coverage: { startISO: '2026-01-01', endISO: '2026-01-30', spanDays: 30, coveredDays: 30 },
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

describe('filterAlreadyImported', () => {
  function makeExpense(overrides: Partial<Expense> = {}): Expense {
    return {
      id: 'e1',
      title: 'Coffee Shop',
      amount: 1200,
      category: 'Food',
      merchant: 'Coffee Shop',
      date: new Date('2026-06-01T09:00:00'),
      time: '9:00 AM',
      isRecurring: false,
      reminderEnabled: false,
      source: 'import',
      importId: 'imp-old',
      iconVariant: 'yellow',
      ...overrides,
    };
  }

  it('drops a candidate matching an existing imported row on day, amount, and merchant', () => {
    const existing = [makeExpense()];
    const candidate = makeExpense({ id: 'e2', importId: 'imp-new' });

    expect(filterAlreadyImported([candidate], existing)).toEqual([]);
  });

  it('keeps a candidate on a different local calendar day', () => {
    const existing = [makeExpense()];
    const candidate = makeExpense({ id: 'e2', date: new Date('2026-06-02T09:00:00'), importId: 'imp-new' });

    expect(filterAlreadyImported([candidate], existing)).toEqual([candidate]);
  });

  it('keeps a candidate with a different amount', () => {
    const existing = [makeExpense()];
    const candidate = makeExpense({ id: 'e2', amount: 1300, importId: 'imp-new' });

    expect(filterAlreadyImported([candidate], existing)).toEqual([candidate]);
  });

  it('keeps a candidate with a different merchant/title', () => {
    const existing = [makeExpense()];
    const candidate = makeExpense({
      id: 'e2',
      title: 'Different Shop',
      merchant: 'Different Shop',
      importId: 'imp-new',
    });

    expect(filterAlreadyImported([candidate], existing)).toEqual([candidate]);
  });

  it('matches merchant/title case- and whitespace-insensitively', () => {
    const existing = [makeExpense({ merchant: '  Coffee Shop  ' })];
    const candidate = makeExpense({ id: 'e2', merchant: 'coffee shop', importId: 'imp-new' });

    expect(filterAlreadyImported([candidate], existing)).toEqual([]);
  });

  it('falls back to title when merchant is absent, on both sides', () => {
    const existing = [makeExpense({ merchant: undefined, title: 'Coffee Shop' })];
    const candidate = makeExpense({ id: 'e2', merchant: undefined, title: 'Coffee Shop', importId: 'imp-new' });

    expect(filterAlreadyImported([candidate], existing)).toEqual([]);
  });

  it('does NOT match a hand-logged (source manual) row, even with the same day/amount/merchant', () => {
    // Conservative by design (see importWrite.ts header comment on
    // filterAlreadyImported): a person can genuinely buy the same thing they
    // already logged by hand, so only prior IMPORT rows count as duplicates.
    const existing = [makeExpense({ source: 'manual', importId: undefined })];
    const candidate = makeExpense({ id: 'e2', importId: 'imp-new' });

    expect(filterAlreadyImported([candidate], existing)).toEqual([candidate]);
  });

  it('does not match a row with no source set (defaults to manual)', () => {
    const existing = [makeExpense({ source: undefined, importId: undefined })];
    const candidate = makeExpense({ id: 'e2', importId: 'imp-new' });

    expect(filterAlreadyImported([candidate], existing)).toEqual([candidate]);
  });

  it('keeps every candidate when there is no existing data', () => {
    const candidate = makeExpense({ id: 'e2', importId: 'imp-new' });
    expect(filterAlreadyImported([candidate], [])).toEqual([candidate]);
  });
});
