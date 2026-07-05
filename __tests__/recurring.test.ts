import { computeUpcoming, nextOccurrence, upcomingTotal } from '@/utils/recurring';
import type { Expense, RecurrenceFrequency } from '@/types/expense';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    title: 'Netflix',
    amount: 1599,
    amountDisplay: '-$15.99',
    category: 'Entertainment',
    date: new Date('2026-06-01T00:00:00'),
    time: '12:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'green',
    ...overrides,
  };
}

function recurring(freq: RecurrenceFrequency, date: string): Expense {
  return expense({ isRecurring: true, recurrence: freq, date: new Date(date) });
}

const FROM = new Date('2026-07-02T09:00:00');

describe('nextOccurrence', () => {
  it('returns null for non-recurring expenses', () => {
    expect(nextOccurrence(expense(), FROM)).toBeNull();
  });

  it('projects a monthly expense to the next future same-day-of-month', () => {
    // Started Jun 1; monthly -> next on/after Jul 2 is Aug 1.
    const next = nextOccurrence(recurring('monthly', '2026-06-01T00:00:00'), FROM);
    expect(next?.getMonth()).toBe(7); // August (0-indexed)
    expect(next?.getDate()).toBe(1);
  });

  it('projects a weekly expense forward to the next future week', () => {
    // Started Jun 29 (Mon); weekly -> Jul 6 is the first on/after Jul 2.
    const next = nextOccurrence(recurring('weekly', '2026-06-29T00:00:00'), FROM);
    expect(next?.getTime()).toBe(new Date('2026-07-06T00:00:00').getTime());
  });

  it('returns the same day when the occurrence lands exactly on `from`', () => {
    const next = nextOccurrence(recurring('weekly', '2026-06-25T00:00:00'), FROM);
    // Jun 25 + 7 = Jul 2 == from
    expect(next?.getDate()).toBe(2);
  });

  it('projects a biweekly expense forward in fixed 14-day steps', () => {
    // Started Jun 4 (14-day cadence): Jun 4 -> Jun 18 -> Jul 2 == from.
    const next = nextOccurrence(recurring('biweekly', '2026-06-04T00:00:00'), FROM);
    expect(next?.getTime()).toBe(new Date('2026-07-02T00:00:00').getTime());
  });

  it('steps a biweekly expense by exactly 14 days each cycle', () => {
    // Started Jun 20: Jun 20 -> Jul 4 is the first on/after Jul 2.
    const next = nextOccurrence(recurring('biweekly', '2026-06-20T00:00:00'), FROM);
    expect(next?.getTime()).toBe(new Date('2026-07-04T00:00:00').getTime());
  });

  it('projects an annual expense to the same month/day next year', () => {
    // Started 2025-07-15; annual -> next on/after 2026-07-02 is 2026-07-15.
    const next = nextOccurrence(recurring('annual', '2025-07-15T00:00:00'), FROM);
    expect(next?.getFullYear()).toBe(2026);
    expect(next?.getMonth()).toBe(6); // July (0-indexed)
    expect(next?.getDate()).toBe(15);
  });

  it('advances an annual expense by full years when several have elapsed', () => {
    // Started 2023-01-10; annual steps: 2024, 2025, 2026 -> first on/after Jul 2, 2026.
    const next = nextOccurrence(recurring('annual', '2023-01-10T00:00:00'), FROM);
    expect(next?.getFullYear()).toBe(2027);
    expect(next?.getMonth()).toBe(0);
    expect(next?.getDate()).toBe(10);
  });
});

describe('computeUpcoming', () => {
  it('ignores non-recurring expenses', () => {
    expect(computeUpcoming([expense(), expense({ id: 'e2' })], 60, FROM)).toHaveLength(0);
  });

  it('lists recurring expenses within the horizon, soonest first', () => {
    const items = computeUpcoming([
      recurring('monthly', '2026-06-15T00:00:00'), // next Jul 15
      recurring('weekly', '2026-06-29T00:00:00'),  // next Jul 6
    ], 60, FROM);
    expect(items).toHaveLength(2);
    expect(items[0].nextDate.getTime()).toBeLessThan(items[1].nextDate.getTime());
    expect(items[0].expense.recurrence).toBe('weekly'); // Jul 6 before Jul 15
  });

  it('excludes occurrences beyond the horizon', () => {
    // Monthly next is ~Jul 15; a 7-day horizon excludes it.
    const items = computeUpcoming([recurring('monthly', '2026-06-15T00:00:00')], 7, FROM);
    expect(items).toHaveLength(0);
  });

  it('computes a correct total and daysUntil', () => {
    const items = computeUpcoming([recurring('weekly', '2026-06-29T00:00:00')], 60, FROM);
    expect(items[0].daysUntil).toBe(4); // Jul 2 -> Jul 6
    expect(upcomingTotal(items)).toBe(1599);
  });
});
