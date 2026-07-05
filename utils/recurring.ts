/**
 * Projects the next occurrence of recurring expenses. Pure and testable: every
 * upcoming item is derived from a real recurring expense the user created, so
 * nothing here is placeholder/fake data.
 */

import type { Expense, RecurrenceFrequency } from '@/types/expense';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type UpcomingItem = {
  expense: Expense;
  nextDate: Date;
  daysUntil: number;
};

function atMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Advance a date by one recurrence interval. */
function advance(date: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(date);
  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'biweekly') {
    // Leak Scan recurrence detector cadence (docs/design-context/leak-scan-spec.md
    // Stage 9): fixed 14-day step, so a biweekly item can land 3 times in a
    // calendar month (the projection's 3-payment-month flag).
    next.setDate(next.getDate() + 14);
  } else if (frequency === 'annual') {
    // Leak Scan annual-renewal detection (Stage 9, >=2-occurrence floor). Same
    // month/day next year; JS rolls Feb 29 -> Mar 1 on non-leap years, which is
    // acceptable for a projection.
    next.setFullYear(next.getFullYear() + 1);
  } else {
    // Monthly: same day-of-month next month. JS rolls overflow (e.g. Jan 31 ->
    // Mar 3), which is acceptable for a projection.
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

/**
 * The next occurrence of a recurring expense on or after `from`, starting from
 * its last logged date and stepping forward by its frequency.
 */
export function nextOccurrence(expense: Expense, from: Date): Date | null {
  if (!expense.isRecurring || !expense.recurrence) return null;
  const fromMid = atMidnight(from).getTime();
  let next = atMidnight(expense.date);
  // Cap iterations so a far-past date with a bad clock can never loop forever.
  for (let i = 0; i < 1000 && next.getTime() < fromMid; i++) {
    next = advance(next, expense.recurrence);
  }
  return next.getTime() >= fromMid ? next : null;
}

/**
 * Upcoming recurring expenses within `withinDays`, sorted soonest-first.
 * One row per recurring expense (its next occurrence).
 */
export function computeUpcoming(
  expenses: Expense[],
  withinDays = 60,
  from: Date = new Date()
): UpcomingItem[] {
  const fromMid = atMidnight(from);
  const horizon = fromMid.getTime() + withinDays * MS_PER_DAY;
  const items: UpcomingItem[] = [];

  for (const expense of expenses) {
    const nextDate = nextOccurrence(expense, fromMid);
    if (!nextDate) continue;
    if (nextDate.getTime() > horizon) continue;
    const daysUntil = Math.round((nextDate.getTime() - fromMid.getTime()) / MS_PER_DAY);
    items.push({ expense, nextDate, daysUntil });
  }

  items.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  return items;
}

/** Total cents of a set of upcoming items. */
export function upcomingTotal(items: UpcomingItem[]): number {
  return items.reduce((sum, i) => sum + i.expense.amount, 0);
}

/** "in 6 days" / "Today" / "Tomorrow" label. */
export function daysUntilLabel(daysUntil: number): string {
  if (daysUntil <= 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `in ${daysUntil} days`;
}

/**
 * Pre-coverage guard for the Reports Monthly Projection widget (P2-4, spec
 * 05 section 5.3): a projection extrapolated from a partial first month is a
 * fabricated number dressed as a real one. True once at least one full
 * calendar month has elapsed since the earliest expense (i.e. there is at
 * least one expense dated before the start of the current calendar month).
 */
export function hasFullMonthOfData(expenses: Expense[]): boolean {
  if (expenses.length === 0) return false;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return expenses.some((e) => e.date < monthStart);
}
