/**
 * The two date windows the Insights rollup and the Pace card are built on.
 *
 * Both were untested and both were off by a boundary: the 'week' range covered
 * eight calendar days under a "last 7 days" label, and the last-month window
 * ended at 00:00 on the final day of the month, silently dropping everything
 * logged after midnight on it. Every case here pins a bound, so a future edit
 * to either window fails loudly rather than shifting a total on screen.
 *
 * The calculators take an injected `now`, so nothing here depends on the day
 * the suite happens to run.
 */
// ReportsContext reaches utils/storage for the dashboard config. Nothing here
// touches it, but the module has to load.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  WEEK_WINDOW_DAYS,
  getDateRangeForTimeRange,
  computeSpendingByCategory,
  computeMonthlyProjection,
} from '@/contexts/ReportsContext';
import type { Expense } from '@/types/expense';
import type { Category } from '@/types/category';

function makeExpense(date: Date, amount = 500, category = 'Food'): Expense {
  return {
    id: `e-${date.getTime()}-${category}`,
    title: 'Coffee',
    amount,
    category: category as Expense['category'],
    categoryId: 'food',
    date,
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
}

const FOOD: Category = {
  id: 'food',
  name: 'Food',
  icon: 'fast-food-outline',
  color: '#F59E0B',
  isDefault: true,
  isHidden: false,
  createdAt: new Date(2026, 0, 1),
};

/** Distinct local calendar days touched by an inclusive [start, end] range. */
function distinctLocalDays(start: Date, end: Date): number {
  const days = new Set<string>();
  const cursor = new Date(start);
  while (cursor <= end) {
    days.add(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  // The loop steps by whole days from start's midnight, so the final partial
  // day is only counted when end lands on or after it.
  return days.size;
}

describe("getDateRangeForTimeRange, 'week'", () => {
  const now = new Date(2026, 8, 10, 15, 0); // Thu Sep 10 2026, 3pm

  it('covers exactly WEEK_WINDOW_DAYS calendar days, counting today', () => {
    const { start, end } = getDateRangeForTimeRange('week', now);
    expect(distinctLocalDays(start, end)).toBe(WEEK_WINDOW_DAYS);
    expect(WEEK_WINDOW_DAYS).toBe(7);
  });

  it('opens at local midnight on (today minus 6) and closes at the end of today', () => {
    const { start, end } = getDateRangeForTimeRange('week', now);
    expect(start).toEqual(new Date(2026, 8, 4, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 8, 10, 23, 59, 59, 999));
  });

  it('excludes the eighth day back, which the old window wrongly included', () => {
    const { start } = getDateRangeForTimeRange('week', now);
    expect(new Date(2026, 8, 3, 9, 0) >= start).toBe(false);
  });

  it('includes the first instant of the window and the last', () => {
    const { start, end } = getDateRangeForTimeRange('week', now);
    expect(new Date(2026, 8, 4, 0, 0, 0, 0) >= start).toBe(true);
    expect(new Date(2026, 8, 10, 23, 59, 59) <= end).toBe(true);
  });

  it('excludes tomorrow', () => {
    const { end } = getDateRangeForTimeRange('week', now);
    expect(new Date(2026, 8, 11, 0, 0) <= end).toBe(false);
  });

  it('wraps backwards over a month boundary', () => {
    const { start } = getDateRangeForTimeRange('week', new Date(2026, 9, 3, 12, 0));
    expect(start).toEqual(new Date(2026, 8, 27, 0, 0, 0, 0));
  });
});

describe('computeSpendingByCategory', () => {
  const now = new Date(2026, 8, 10, 15, 0);

  it('uses the same 7 day window: an expense 7 days back at 09:00 is out', () => {
    const rows = computeSpendingByCategory(
      [makeExpense(new Date(2026, 8, 3, 9, 0), 8740)],
      [FOOD],
      'week',
      now
    );
    expect(rows).toEqual([]);
  });

  it('keeps an expense on the opening day of the window', () => {
    const rows = computeSpendingByCategory(
      [makeExpense(new Date(2026, 8, 4, 0, 0, 0), 1000)],
      [FOOD],
      'week',
      now
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(1000);
  });

  it('keeps an expense later today and drops one dated tomorrow', () => {
    const rows = computeSpendingByCategory(
      [
        makeExpense(new Date(2026, 8, 10, 23, 59, 59), 100),
        makeExpense(new Date(2026, 8, 11, 0, 0), 999),
      ],
      [FOOD],
      'week',
      now
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(100);
  });
});

describe('computeMonthlyProjection, last month window', () => {
  const now = new Date(2026, 8, 10, 15, 0); // Sep 10 2026

  it('includes the whole final day of the previous month', () => {
    const p = computeMonthlyProjection([makeExpense(new Date(2026, 7, 31, 8, 32), 650)], now);
    expect(p.lastMonthTotal).toBe(650);
  });

  it('includes the first instant of the previous month', () => {
    const p = computeMonthlyProjection([makeExpense(new Date(2026, 7, 1, 0, 0, 0), 650)], now);
    expect(p.lastMonthTotal).toBe(650);
  });

  it('excludes the first instant of this month', () => {
    const p = computeMonthlyProjection([makeExpense(new Date(2026, 8, 1, 0, 0, 0), 650)], now);
    expect(p.lastMonthTotal).toBe(0);
  });

  it('excludes the last instant of the month before last', () => {
    const p = computeMonthlyProjection([makeExpense(new Date(2026, 6, 31, 23, 59, 59), 650)], now);
    expect(p.lastMonthTotal).toBe(0);
  });

  it('computes comparedToLastMonth from the corrected total', () => {
    // Sep 1..10 spend of $100 over 10 elapsed days projects $300 across 30 days.
    const p = computeMonthlyProjection(
      [
        makeExpense(new Date(2026, 8, 5, 12, 0), 10000),
        makeExpense(new Date(2026, 7, 31, 8, 32), 20000),
      ],
      now
    );
    expect(p.currentSpent).toBe(10000);
    expect(p.lastMonthTotal).toBe(20000);
    expect(p.projectedTotal).toBe(30000);
    expect(p.comparedToLastMonth).toBe(50);
  });

  it('wraps to December of the prior year in January', () => {
    const jan = new Date(2027, 0, 15, 12, 0);
    const p = computeMonthlyProjection(
      [
        makeExpense(new Date(2026, 11, 31, 22, 0), 4000),
        makeExpense(new Date(2026, 11, 1, 0, 0), 1000),
        makeExpense(new Date(2026, 10, 30, 23, 59), 9999),
      ],
      jan
    );
    expect(p.lastMonthTotal).toBe(5000);
  });
});
