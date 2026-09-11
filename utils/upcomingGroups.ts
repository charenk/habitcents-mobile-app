/**
 * Money > Upcoming, grouped by calendar month (2026-09-11).
 *
 * The pane's list groups by the month a payment lands in, the way Money > Spent
 * groups by day, and each group carries its own subtotal. That is what makes
 * "what is left to pay this month" answerable at every window setting rather
 * than only when a one-month filter is selected, which is the reason the three
 * window presets could stay durations instead of becoming calendar spans
 * (ADR 0041).
 *
 * A bill that lands in three months produces three rows, one per month, each
 * scoped to that month. The arithmetic then closes at three levels: a group's
 * rows sum to its header, the headers sum to the card's total, and the card is
 * still `upcomingWindowTotal(items)` unchanged. Without the per-month scope, a
 * row under an "October" header would show a number counting three months,
 * which is the incoherence the whole redesign has been removing.
 *
 * Display-free, like `groupExpensesByDate`: this returns a stable key and the
 * month's first day, never a formatted label. Turning a month into words is the
 * component's job, through the locale-aware helpers in utils/dates (ADA-008).
 */
import type { Expense } from '@/types/expense';
import type { UpcomingItem } from '@/utils/recurring';

export type UpcomingMonthRow = {
  expense: Expense;
  /** This bill's occurrences inside THIS month, ascending. Never empty. */
  occurrences: Date[];
};

export type UpcomingMonthGroup = {
  /** Stable grouping key, "2026-8" style. Not display text. */
  key: string;
  /** First day of the month, for the component to format. */
  monthStart: Date;
  rows: UpcomingMonthRow[];
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/**
 * The occurrences a row should count.
 *
 * Mirrors `upcomingItemPayments`' `Math.max(1, ...)` floor deliberately. Real
 * data never produces an item with no occurrences (computeUpcoming only admits
 * items whose nextDate is inside the horizon, so occurrencesWithin returns at
 * least one), but hand-built test fixtures do, and without the same floor the
 * groups would silently sum to less than the card on exactly those inputs.
 */
function occurrencesOf(item: UpcomingItem): Date[] {
  return item.occurrencesInWindow.length > 0 ? item.occurrencesInWindow : [item.nextDate];
}

/**
 * Group a window's items by the calendar month each payment lands in.
 *
 * Groups ascend by month; rows within a group ascend by their first occurrence,
 * which keeps the soonest-first reading the flat list always had.
 */
export function groupUpcomingByMonth(items: UpcomingItem[]): UpcomingMonthGroup[] {
  const byMonth = new Map<string, { monthStart: Date; rows: Map<string, UpcomingMonthRow> }>();

  for (const item of items) {
    for (const occurrence of occurrencesOf(item)) {
      const key = monthKey(occurrence);
      let group = byMonth.get(key);
      if (!group) {
        group = {
          monthStart: new Date(occurrence.getFullYear(), occurrence.getMonth(), 1),
          rows: new Map(),
        };
        byMonth.set(key, group);
      }

      const row = group.rows.get(item.expense.id);
      if (row) row.occurrences.push(occurrence);
      else group.rows.set(item.expense.id, { expense: item.expense, occurrences: [occurrence] });
    }
  }

  return Array.from(byMonth.entries())
    .map(([key, group]) => ({
      key,
      monthStart: group.monthStart,
      rows: Array.from(group.rows.values())
        .map((row) => ({
          ...row,
          occurrences: [...row.occurrences].sort((a, b) => a.getTime() - b.getTime()),
        }))
        .sort((a, b) => a.occurrences[0].getTime() - b.occurrences[0].getTime()),
    }))
    .sort((a, b) => a.monthStart.getTime() - b.monthStart.getTime());
}

/** What this row costs inside its own month. */
export function monthRowTotal(row: UpcomingMonthRow): number {
  return row.expense.amount * row.occurrences.length;
}

/** What a month costs: the number its header carries. */
export function monthGroupTotal(group: UpcomingMonthGroup): number {
  return group.rows.reduce((sum, row) => sum + monthRowTotal(row), 0);
}

/** How many payments land in a month. */
export function monthGroupPayments(group: UpcomingMonthGroup): number {
  return group.rows.reduce((sum, row) => sum + row.occurrences.length, 0);
}

/**
 * Drop the months an unknown-day bill has already been paid for.
 *
 * The materializer refuses to write a real spend on a day the user never
 * asserted (ADR 0042), so a month-precision bill has no automatic path into
 * Spent. The row offers the user one instead: "I paid this" writes a child
 * dated today. This is the other half of that, and it mirrors the
 * materializer's own idempotency rule, scoped to a month rather than a day:
 * an occurrence whose month already holds a child for this parent is not
 * upcoming any more.
 *
 * Day-precision bills are untouched. Their occurrences leave Upcoming through
 * `advancePastToday`, which is ADR 0024's mechanism and stays the only one.
 */
export function dropPaidMonths(items: UpcomingItem[], expenses: Expense[]): UpcomingItem[] {
  const paid = new Set<string>();
  for (const e of expenses) {
    if (!e.parentId) continue;
    paid.add(`${e.parentId}:${e.date.getFullYear()}-${e.date.getMonth()}`);
  }
  if (paid.size === 0) return items;

  const out: UpcomingItem[] = [];
  for (const item of items) {
    if (item.expense.datePrecision !== 'month') {
      out.push(item);
      continue;
    }

    const occurrences = occurrencesOf(item).filter(
      (d) => !paid.has(`${item.expense.id}:${d.getFullYear()}-${d.getMonth()}`)
    );
    // Every month settled: the bill has nothing upcoming inside this window.
    if (occurrences.length === 0) continue;
    out.push({ ...item, nextDate: occurrences[0], occurrencesInWindow: occurrences });
  }
  return out;
}

/**
 * Whether this row is one the user can settle by hand: a bill whose day is
 * unknown, in the month we are actually in.
 *
 * Only the current month. A future month has not happened, so "I paid it" is
 * not something a person says about it, and allowing it would mean asking a
 * second question (which day, in a month that has not started) to avoid
 * inventing one. The date written is today, because that is the day the user
 * is asserting the money moved.
 */
export function isSettleable(row: UpcomingMonthRow, monthStart: Date, today: Date = new Date()): boolean {
  if (row.expense.datePrecision !== 'month') return false;
  return (
    monthStart.getFullYear() === today.getFullYear() &&
    monthStart.getMonth() === today.getMonth()
  );
}
