/**
 * Type definitions for expense data model.
 */

// Taxonomy v2 (ADR 0006): 10 user-facing spend categories. 'Mortgage' keeps its
// stored id/value for backward compatibility; its display name renders as
// "Mortgage/Rent" in the UI. 'Software & Subscriptions' is the only added value.
// Existing stored expenses load unchanged.
export type ExpenseCategory =
  | 'Mortgage'
  | 'Car'
  | 'Entertainment'
  | 'Food'
  | 'Shopping'
  | 'Utilities'
  | 'Healthcare'
  | 'Transportation'
  | 'Software & Subscriptions'
  | 'Other';

// Row class (ADR 0006). Non-spend classes are a field on the row, never
// categories: they never appear in the category picker and never count in spend
// totals. Manual logs are always 'spend'; the Leak Scan may write any class.
// Optional and defaulting to 'spend' keeps existing stored data backward compatible.
export type ExpenseClass = 'spend' | 'transfer' | 'income' | 'cash';

// Where a row originated. 'import' rows come from a Leak Scan session; used so a
// single-tap undo can remove everything one import wrote (see importId).
export type ExpenseSource = 'manual' | 'import';

// How often a recurring expense repeats. Drives the real Upcoming projection.
// biweekly and annual are import-only cadences surfaced by the Leak Scan
// recurrence detector; the manual add form still only offers weekly and monthly.
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'biweekly' | 'annual';

export type Expense = {
  id: string;
  title: string;
  amount: number;           // Cents (integer)
  amountDisplay?: string;   // Deprecated: derive at render via useCurrency().format(amount, { signed: true })
  category: ExpenseCategory;
  categoryId?: string;      // Reference to Category.id
  class?: ExpenseClass;     // Defaults to 'spend' when absent (ADR 0006)
  merchant?: string;        // Merchant name for habit detection
  date: Date;
  time: string;             // "9:30 AM"
  isRecurring: boolean;
  recurrence?: RecurrenceFrequency; // set when isRecurring is true
  reminderEnabled: boolean;
  reminderTime?: string;    // "1h before"
  remindBefore?: boolean;   // Leak Scan intent capture: reminder the day before (no delivery in v1)
  source?: ExpenseSource;   // Defaults to 'manual' when absent
  importId?: string;        // Set on rows written by a Leak Scan import, for undo
  iconVariant: 'yellow' | 'green';
};

export type ExpenseSection = {
  title: string;            // "Feb 14", "Feb 13 - Yesterday"
  data: Expense[];
};

export type AddExpenseInput = {
  title: string;
  amount: number;           // Cents
  category: ExpenseCategory;
  categoryId?: string;      // Reference to Category.id
  merchant?: string;        // Merchant name for habit detection
  date: Date;
  isRecurring: boolean;
  recurrence?: RecurrenceFrequency;
  reminderEnabled: boolean;
  reminderTime?: string;
};
