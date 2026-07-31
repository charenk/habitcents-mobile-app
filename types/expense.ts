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
// single-tap undo can remove everything one import wrote (see importId). 'audit'
// rows come from the onboarding Leak Audit (P2-1, spec 02 section 5): a
// selected subscription chip seeds one recurring expense tagged this way, so
// re-running the audit can match on source + chip id rather than duplicate.
export type ExpenseSource = 'manual' | 'import' | 'audit';

// How often a recurring expense repeats. Drives the real Upcoming projection.
// biweekly and annual are import-only cadences surfaced by the Leak Scan
// recurrence detector; the manual add form still only offers weekly and monthly.
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'biweekly' | 'annual';

// Day of week as JS Date.getDay() reports it: 0 = Sunday ... 6 = Saturday.
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// The four monthly anchors the add-upcoming sheet offers. 'last' means the last
// calendar day of the month, so it lands on 28/29/30/31 depending on the month.
export type MonthDayOption = '1' | '15' | '30' | 'last';

/**
 * Schedule for an upcoming expense (step 04). Additive: `RecurrenceFrequency`,
 * `isRecurring` and `recurrence` all stay, and every expense stored before this
 * type existed keeps projecting through the legacy mapping in
 * `utils/recurring.ts resolveRule`. There is no storage migration.
 *
 * Write invariant for newly authored rules: `expense.date` is the FIRST
 * scheduled occurrence, `recurrenceRule` is set, and the legacy mirrors are
 * written for old readers (`isRecurring = rule.type !== 'once'`, `recurrence`
 * set to the matching legacy string where one exists, `undefined` for 'once'
 * and 'custom').
 */
export type RecurrenceRule =
  | { type: 'once' }
  | { type: 'weekly'; weekday: Weekday }
  // biweekAnchor is a LOCAL calendar date, 'YYYY-MM-DD'. It fixes which of the
  // two weeks the 14-day cadence falls on. Never write a UTC ISO timestamp
  // here: it can shift the day across the date line.
  | { type: 'biweekly'; weekday: Weekday; biweekAnchor: string }
  // monthDay absent = legacy anchor stepping (same day-of-month next month,
  // JS overflow roll included). Present = a fixed anchor, clamped per month.
  | { type: 'monthly'; monthDay?: MonthDayOption }
  // Legacy and Leak Scan import only; the manual sheet does not offer it.
  | { type: 'annual' }
  // everyNDays is clamped to 2..90 on read as well as on write.
  | { type: 'custom'; everyNDays: number };

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
  recurrenceRule?: RecurrenceRule;  // step 04 schedule; absent on older rows
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
  recurrenceRule?: RecurrenceRule;
  reminderEnabled: boolean;
  reminderTime?: string;
  // Defaults to 'manual' when absent (ADR 0006). The onboarding Leak Audit
  // (P2-1) passes 'audit' when seeding a chip as a recurring expense.
  source?: ExpenseSource;
};
