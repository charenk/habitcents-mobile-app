/**
 * Transactional import writers + undo (spec Stage 0, results 5.5/5.6, acceptance 14).
 *
 * Pure functions that turn a ScanResult into Expense records tagged with the scan's
 * importId, and the inverse: strip everything an import wrote. The results screen /
 * context wires these to storage; the pipeline itself never touches AsyncStorage,
 * so these stay fully testable. Rows written here pass the same shape validation as
 * a manual log (id, valid date, category, amount cents).
 */

import type { AddExpenseInput, Expense, ExpenseCategory, RecurrenceFrequency } from '@/types/expense';
import type { RecurringItem, ScanResult, ScanRow } from './types';
import { spendableRows } from './netting';

const DAY = 24 * 60 * 60 * 1000;

function timeLabel(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Map a scan interval to the stored RecurrenceFrequency. */
function toRecurrence(interval: RecurringItem['interval']): RecurrenceFrequency {
  return interval; // weekly | biweekly | monthly | annual all valid post taxonomy v2
}

/**
 * Convert a ScanRow into an Expense tagged with the import id. Non-spend rows keep
 * their class; spend rows default to 'spend'. Amount is stored as a positive cents
 * magnitude for spend (matching manual entry), signed handling lives in the pipeline.
 */
export function rowToExpense(row: ScanRow, importId: string): Expense {
  return {
    id: `imp-${row.id}`,
    title: row.merchantDisplay || row.rawDescription || 'Imported',
    amount: Math.abs(row.amountCents),
    category: row.category,
    class: row.rowClass,
    merchant: row.merchantDisplay || undefined,
    date: row.date,
    time: timeLabel(row.date),
    isRecurring: false,
    reminderEnabled: false,
    source: 'import',
    importId,
    iconVariant: 'yellow',
  };
}

/**
 * The last-N-days seed (post-scan handoff): the most recent `days` days of
 * categorized SPEND rows become expense-log entries. Detection/projection keep
 * full-history basis elsewhere; this only limits what lands in the
 * Reporting-scale log. The results screen CTA calls this with 30 (ADR 0020,
 * W4 finding-first ladder); `days` stays a parameter rather than a hardcoded
 * window so a future change to the CTA's window doesn't need a second copy of
 * this function.
 */
export function seedLastDays(result: ScanResult, days: number, now: Date = new Date()): Expense[] {
  const cutoff = now.getTime() - days * DAY;
  return spendableRows(result.rows)
    .filter((r) => r.date.getTime() >= cutoff)
    .map((r) => rowToExpense(r, result.importId));
}

/**
 * Back-compat wrapper for the pre-ADR-0020 15-day window. The results screen
 * itself now calls seedLastDays(result, 30) directly; this wrapper exists only
 * because __tests__/leakScan/acceptance.test.ts's undo test (acceptance 14)
 * still exercises the 15-day shape.
 */
export function seedLast15Days(result: ScanResult, now: Date = new Date()): Expense[] {
  return seedLastDays(result, 15, now);
}

/**
 * Recurring items saved to the recurring-expense list (results 5.5 "Save to
 * HabitCents"). Each carries source 'import', its cadence, amount, and next date.
 * `remindBefore` captures the reminder intent (no delivery in v1).
 */
export function recurringToExpenses(
  result: ScanResult,
  opts: { remindBefore?: Record<string, boolean> } = {}
): Expense[] {
  return result.recurring.map((item) => {
    const remind = opts.remindBefore?.[item.merchantStem] ?? false;
    const nextDate = new Date(item.nextDateISO);
    return {
      id: `imp-rec-${result.importId}-${item.merchantStem}`,
      title: item.merchantDisplay,
      amount: item.amountCents,
      category: item.category as ExpenseCategory,
      class: item.rowClass,
      merchant: item.merchantDisplay,
      date: nextDate,
      time: timeLabel(nextDate),
      isRecurring: true,
      recurrence: toRecurrence(item.interval),
      reminderEnabled: remind,
      remindBefore: remind,
      source: 'import',
      importId: result.importId,
      iconVariant: 'yellow',
    };
  });
}

/**
 * Maps an Expense this file already built (rowToExpense / recurringToExpenses)
 * onto the AddExpenseInput shape ExpensesContext.addExpense expects. The
 * results screen write sites (handleSaveProjection, handleBringInDays) call
 * this instead of hand-listing fields, which is the fix for a real bug: both
 * write sites used to list only a subset of fields (title/amount/category/
 * merchant/date/isRecurring/recurrence/reminderEnabled), silently dropping
 * `source` and `importId` on the way into storage. Every row written that way
 * defaulted to source 'manual' with no importId, so ResultsScreen's undo
 * (which filters expenses by importId, see undoImport below) could never find
 * them -- "Undo this import" removed nothing. `class` isn't carried here: the
 * write path doesn't support it yet (AddExpenseInput has no `class` field),
 * an existing gap outside this fix's scope.
 */
export function toAddExpenseInput(exp: Expense): AddExpenseInput {
  return {
    title: exp.title,
    amount: exp.amount,
    category: exp.category,
    categoryId: exp.categoryId,
    merchant: exp.merchant,
    date: exp.date,
    isRecurring: exp.isRecurring,
    recurrence: exp.recurrence,
    recurrenceRule: exp.recurrenceRule,
    reminderEnabled: exp.reminderEnabled,
    source: exp.source,
    importId: exp.importId,
  };
}

/**
 * Undo: remove every expense a given import wrote. Returns the filtered list. Applied
 * to the expense log AND the recurring list; anything with a matching importId is
 * stripped, leaving pre-existing and manually-logged data untouched (acceptance 14).
 */
export function undoImport(expenses: Expense[], importId: string): Expense[] {
  return expenses.filter((e) => e.importId !== importId);
}

/** yyyy-m-d in the device's local calendar, not UTC: two rows on the same
 *  local day must dedupe even if their UTC day differs near midnight. */
function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Merchant when present, else title (rowToExpense falls back to title when a
 *  row has no merchant), lowercased and trimmed so casing/whitespace never
 *  cause a false miss. */
function merchantOrTitleKey(exp: Pick<Expense, 'merchant' | 'title'>): string {
  return (exp.merchant || exp.title).trim().toLowerCase();
}

function dedupeKey(exp: Pick<Expense, 'date' | 'amount' | 'merchant' | 'title'>): string {
  return `${localDayKey(exp.date)}|${exp.amount}|${merchantOrTitleKey(exp)}`;
}

/**
 * Re-scan dedup (review fix, build 12 re-scan entry): the Insights "Run a new
 * scan" entry point lets an already-onboarded user re-import a statement that
 * overlaps a prior import, which used to double-record every overlapping row
 * (fresh ids, no dedup). Drops any candidate whose (local calendar day,
 * amount, normalized merchant-or-title) matches an existing expense already
 * on record from a PRIOR import.
 *
 * Deliberately conservative: only expenses with source 'import' are matched
 * against. A hand-logged row with the same day/amount/merchant is left alone
 * on purpose -- a person can genuinely buy the same coffee they already
 * logged by hand, and this helper has no way to tell that apart from a true
 * duplicate, so it only ever removes rows it's confident are the same import
 * data coming back through the pipeline twice.
 */
export function filterAlreadyImported(candidateRows: Expense[], existingExpenses: Expense[]): Expense[] {
  const alreadyImportedKeys = new Set(
    existingExpenses.filter((e) => e.source === 'import').map(dedupeKey)
  );
  return candidateRows.filter((c) => !alreadyImportedKeys.has(dedupeKey(c)));
}
