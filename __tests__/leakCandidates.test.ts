/**
 * Pins the leak-candidate rules (utils/habitDetection.ts, 2026-09-11): a
 * merchant earns a candidate at its SECOND log in the window, merchants
 * already represented by any habit (dismissed included) never appear, the
 * list is biggest-money-first capped at three, and the 7-day strip is
 * evidence with today at index 6.
 */
import { leakCandidates, merchantDays7 } from '@/utils/habitDetection';
import type { DetectedHabit } from '@/types/habit';
import type { Expense } from '@/types/expense';

function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  const base: Expense = {
    id: overrides.id,
    title: 'Food',
    amount: 500,
    category: 'Food',
    date: new Date(),
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
  return { ...base, ...overrides } as Expense;
}

function makeHabit(overrides: Partial<DetectedHabit> & { id: string }): DetectedHabit {
  return {
    name: 'Habit',
    description: '',
    categoryId: 'Food',
    merchantPattern: 'tims',
    averageAmount: 500,
    frequency: 'daily',
    occurrencesPerPeriod: 1,
    totalMonthlySpend: 15000,
    observedTotal: 500,
    observedCount: 1,
    spanDays: 0,
    hasReliableRate: false,
    medianAmount: 500,
    minAmount: 500,
    maxAmount: 500,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status: 'discovered',
    sentiment: 'bad',
    discoveredAt: new Date(),
    ...overrides,
  } as DetectedHabit;
}

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

describe('leakCandidates', () => {
  it('needs two logs at one merchant; one log is noise', () => {
    const expenses = [
      makeExpense({ id: 'e1', merchant: 'Tims' }),
      makeExpense({ id: 'e2', merchant: 'Walmart' }),
      makeExpense({ id: 'e3', merchant: 'Walmart' }),
    ];
    const result = leakCandidates(expenses, []);
    expect(result.map((c) => c.merchant)).toEqual(['walmart']);
    expect(result[0].name).toBe('Walmart');
    expect(result[0].count).toBe(2);
    expect(result[0].observedTotal).toBe(1000);
  });

  it('excludes merchants already represented by any habit, dismissed included', () => {
    const expenses = [
      makeExpense({ id: 'e1', merchant: 'Tims' }),
      makeExpense({ id: 'e2', merchant: ' TIMS ' }),
    ];
    const dismissed = makeHabit({ id: 'h1', merchantPattern: 'tims', dismissedAt: new Date() });
    expect(leakCandidates(expenses, [dismissed])).toEqual([]);
    const changing = makeHabit({ id: 'h2', merchantPattern: 'tims', status: 'changing' });
    expect(leakCandidates(expenses, [changing])).toEqual([]);
    expect(leakCandidates(expenses, [])).toHaveLength(1);
  });

  it('sorts by observed total and caps at three', () => {
    const expenses = ['a', 'b', 'c', 'd'].flatMap((m, i) => [
      makeExpense({ id: `${m}1`, merchant: m, amount: (i + 1) * 100 }),
      makeExpense({ id: `${m}2`, merchant: m, amount: (i + 1) * 100 }),
    ]);
    const result = leakCandidates(expenses, []);
    expect(result.map((c) => c.merchant)).toEqual(['d', 'c', 'b']);
  });

  it('ignores merchantless expenses entirely', () => {
    const expenses = [makeExpense({ id: 'e1' }), makeExpense({ id: 'e2' })];
    expect(leakCandidates(expenses, [])).toEqual([]);
  });
});

describe('merchantDays7', () => {
  it('marks the days with a buy, today at index 6, oldest first', () => {
    const expenses = [
      makeExpense({ id: 'e1', merchant: 'Tims', date: daysAgo(0) }),
      makeExpense({ id: 'e2', merchant: 'Tims', date: daysAgo(3) }),
      makeExpense({ id: 'e3', merchant: 'Tims', date: daysAgo(9) }),
      makeExpense({ id: 'e4', merchant: 'Walmart', date: daysAgo(1) }),
    ];
    expect(merchantDays7(expenses, 'Tims')).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });

  it('returns an empty strip for a missing merchant pattern', () => {
    expect(merchantDays7([makeExpense({ id: 'e1', merchant: 'Tims' })], undefined)).toEqual(
      new Array(7).fill(false)
    );
  });
});
