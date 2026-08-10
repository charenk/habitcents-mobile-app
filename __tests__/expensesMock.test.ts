/**
 * groupExpensesByDate (data/expensesMock.ts), U7.
 *
 * Grouping itself is unchanged by U7: only the section's `title` changed, from
 * a display string built with a hardcoded 'en-US' locale (formatDateHeader,
 * now removed) to a stable per-day key. SpentList (see spentList.test.tsx) is
 * the only place a day turns into display text now.
 */
import { groupExpensesByDate } from '@/data/expensesMock';
import type { Expense } from '@/types/expense';

function daysAgo(n: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function dateKeyFor(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function makeExpense(overrides: Partial<Expense> & { id: string; date: Date }): Expense {
  return {
    title: 'Coffee',
    amount: 450,
    category: 'Food',
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
    ...overrides,
  };
}

describe('groupExpensesByDate', () => {
  it('buckets same-day expenses into one section keyed by the stable local-day key', () => {
    const day = daysAgo(3);
    const expenses = [
      makeExpense({ id: 'a', date: new Date(day.getTime()), amount: 500 }),
      makeExpense({ id: 'b', date: new Date(day.getTime() + 3600_000), amount: 700 }),
    ];

    const sections = groupExpensesByDate(expenses);

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe(dateKeyFor(day));
    expect(sections[0].data.map((e) => e.id).sort()).toEqual(['a', 'b']);
  });

  it('splits expenses on different days into separate sections, newest first', () => {
    const older = daysAgo(5);
    const newer = daysAgo(1);
    const expenses = [
      makeExpense({ id: 'old', date: older }),
      makeExpense({ id: 'new', date: newer }),
    ];

    const sections = groupExpensesByDate(expenses);

    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe(dateKeyFor(newer));
    expect(sections[1].title).toBe(dateKeyFor(older));
  });

  it('never produces a title built from a hardcoded locale (title is the raw grouping key, not display text)', () => {
    const day = daysAgo(2);
    const sections = groupExpensesByDate([makeExpense({ id: 'a', date: day })]);

    // A locale-formatted string like "Aug 8" would contain a letter; the
    // stable key is purely numeric with '-' separators.
    expect(sections[0].title).toMatch(/^-?\d+-\d+-\d+$/);
  });

  it('returns no section for a day with zero expenses', () => {
    const sections = groupExpensesByDate([]);
    expect(sections).toHaveLength(0);
  });
});
