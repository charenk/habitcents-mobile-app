/**
 * Transactional import writers + undo (spec Stage 0, results 5.5/5.6, acceptance 14).
 *
 * Pure functions that turn a ScanResult into Expense records tagged with the scan's
 * importId, and the inverse: strip everything an import wrote. The results screen /
 * context wires these to storage; the pipeline itself never touches AsyncStorage,
 * so these stay fully testable. Rows written here pass the same shape validation as
 * a manual log (id, valid date, category, amount cents).
 */

import type { Expense, ExpenseCategory, RecurrenceFrequency } from '@/types/expense';
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
 * The 15-day seed (post-scan handoff): the most recent 15 days of categorized SPEND
 * rows become expense-log entries. Detection/projection keep full-history basis
 * elsewhere; this only limits what lands in the Reporting-scale log.
 */
export function seedLast15Days(result: ScanResult, now: Date = new Date()): Expense[] {
  const cutoff = now.getTime() - 15 * DAY;
  return spendableRows(result.rows)
    .filter((r) => r.date.getTime() >= cutoff)
    .map((r) => rowToExpense(r, result.importId));
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
 * Undo: remove every expense a given import wrote. Returns the filtered list. Applied
 * to the expense log AND the recurring list; anything with a matching importId is
 * stripped, leaving pre-existing and manually-logged data untouched (acceptance 14).
 */
export function undoImport(expenses: Expense[], importId: string): Expense[] {
  return expenses.filter((e) => e.importId !== importId);
}
