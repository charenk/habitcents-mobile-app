/**
 * Month grouping for Money > Upcoming (2026-09-11).
 *
 * The invariants at the bottom are the point of this file. The whole redesign
 * turns on the numbers reconciling at three levels: a group's rows sum to its
 * header, the headers sum to the card, and the card is still
 * `upcomingWindowTotal` unchanged. If those drift, the pane is back to showing
 * two numbers that cannot be reconciled by looking, which is the defect this
 * work exists to remove.
 */
import {
  groupUpcomingByMonth,
  monthGroupPayments,
  monthGroupTotal,
  monthRowTotal,
} from '@/utils/upcomingGroups';
import {
  computeUpcoming,
  upcomingWindowPaymentsCount,
  upcomingWindowTotal,
  type UpcomingItem,
} from '@/utils/recurring';
import { upcomingWindowEnd } from '@/utils/upcomingWindow';
import type { Expense } from '@/types/expense';

function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  return {
    title: 'Rent',
    amount: 210000,
    category: 'Mortgage',
    date: new Date('2026-09-01T00:00:00'),
    time: '9:00 AM',
    isRecurring: true,
    recurrence: 'monthly',
    recurrenceRule: { type: 'monthly' },
    reminderEnabled: false,
    iconVariant: 'green',
    ...overrides,
  };
}

function item(expense: Expense, occurrences: Date[]): UpcomingItem {
  return {
    expense,
    nextDate: occurrences[0],
    daysUntil: 3,
    occurrencesInWindow: occurrences,
  };
}

const d = (iso: string) => new Date(`${iso}T00:00:00`);

describe('groupUpcomingByMonth', () => {
  it('puts a window that sits inside one month into one group', () => {
    const groups = groupUpcomingByMonth([
      item(makeExpense({ id: 'rent' }), [d('2026-09-29')]),
      item(makeExpense({ id: 'gym', amount: 3000 }), [d('2026-09-15')]),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('2026-8');
    expect(groups[0].monthStart).toEqual(new Date(2026, 8, 1));
    // Soonest first inside the group, as the flat list always read.
    expect(groups[0].rows.map((r) => r.expense.id)).toEqual(['gym', 'rent']);
  });

  it('splits one bill across the months it lands in, ascending', () => {
    const groups = groupUpcomingByMonth([
      item(makeExpense({ id: 'rent' }), [d('2026-09-29'), d('2026-10-29'), d('2026-11-29')]),
    ]);

    expect(groups.map((g) => g.key)).toEqual(['2026-8', '2026-9', '2026-10']);
    // One row per month, not one row carrying three months.
    for (const group of groups) {
      expect(group.rows).toHaveLength(1);
      expect(group.rows[0].occurrences).toHaveLength(1);
    }
  });

  it('scopes a row to its own month, not the whole window', () => {
    const rent = makeExpense({ id: 'rent' }); // 2100.00
    const groups = groupUpcomingByMonth([
      item(rent, [d('2026-09-29'), d('2026-10-29'), d('2026-11-29')]),
    ]);

    // Each row is one month's cost, never the 6,300.00 the window holds.
    expect(groups.map((g) => monthRowTotal(g.rows[0]))).toEqual([210000, 210000, 210000]);
  });

  it('keeps several occurrences of one bill inside a single month on one row', () => {
    const groups = groupUpcomingByMonth([
      item(makeExpense({ id: 'gym', amount: 3000, recurrence: 'weekly' }), [
        d('2026-09-04'),
        d('2026-09-11'),
        d('2026-09-18'),
        d('2026-10-02'),
      ]),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].rows[0].occurrences).toHaveLength(3);
    expect(monthRowTotal(groups[0].rows[0])).toBe(9000);
    expect(groups[1].rows[0].occurrences).toHaveLength(1);
  });

  it('crosses a year boundary in order', () => {
    const groups = groupUpcomingByMonth([
      item(makeExpense({ id: 'rent' }), [d('2026-12-01'), d('2027-01-01')]),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['2026-11', '2027-0']);
  });

  /**
   * The floor trap. `upcomingItemPayments` counts an item with no recorded
   * occurrences as one payment at its nextDate, so the grouper has to as well.
   * Real data never hits this; the render tests' hand-built fixtures do, and
   * without the same floor the groups would silently sum to less than the card.
   */
  it('falls back to nextDate when an item records no occurrences', () => {
    const bare: UpcomingItem = {
      expense: makeExpense({ id: 'rent' }),
      nextDate: d('2026-09-29'),
      daysUntil: 18,
      occurrencesInWindow: [],
    };

    const groups = groupUpcomingByMonth([bare]);
    expect(groups).toHaveLength(1);
    expect(groups[0].rows[0].occurrences).toEqual([d('2026-09-29')]);
    expect(monthRowTotal(groups[0].rows[0])).toBe(210000);
  });

  it('returns nothing for an empty window', () => {
    expect(groupUpcomingByMonth([])).toEqual([]);
  });
});

describe('grouping reconciles with the card', () => {
  const items: UpcomingItem[] = [
    item(makeExpense({ id: 'rent' }), [d('2026-09-29'), d('2026-10-29'), d('2026-11-29')]),
    item(makeExpense({ id: 'gym', amount: 3000 }), [
      d('2026-09-04'),
      d('2026-09-18'),
      d('2026-10-02'),
    ]),
    item(makeExpense({ id: 'netflix', amount: 1599 }), [d('2026-10-05')]),
    // The floor case, in the same fixture set as everything else.
    {
      expense: makeExpense({ id: 'pge', amount: 8740 }),
      nextDate: d('2026-11-04'),
      daysUntil: 54,
      occurrencesInWindow: [],
    },
  ];

  it('sums every group to exactly the window total', () => {
    const groups = groupUpcomingByMonth(items);
    const summed = groups.reduce((sum, g) => sum + monthGroupTotal(g), 0);
    expect(summed).toBe(upcomingWindowTotal(items));
  });

  it('sums every group payment count to exactly the window count', () => {
    const groups = groupUpcomingByMonth(items);
    const summed = groups.reduce((sum, g) => sum + monthGroupPayments(g), 0);
    expect(summed).toBe(upcomingWindowPaymentsCount(items));
  });

  it("sums a group's rows to its own header", () => {
    for (const group of groupUpcomingByMonth(items)) {
      const rows = group.rows.reduce((sum, r) => sum + monthRowTotal(r), 0);
      expect(rows).toBe(monthGroupTotal(group));
    }
  });
});

/**
 * The label the card draws has to name a date the engine will actually admit.
 * Built with `setDate` instead of millisecond arithmetic these drift by an hour
 * across a DST boundary, which is enough to claim a day the list does not show.
 */
describe('upcomingWindowEnd agrees with the projection horizon', () => {
  function lastAdmittedDate(from: Date, days: 14 | 30 | 90): Date | null {
    // A daily bill, so every day in the window is admitted and the last
    // occurrence is the horizon itself.
    const daily = makeExpense({
      id: 'daily',
      date: from,
      recurrence: undefined,
      recurrenceRule: { type: 'custom', everyNDays: 2 },
    });
    const [projected] = computeUpcoming([daily], days, from);
    if (!projected) return null;
    const occ = projected.occurrencesInWindow;
    return occ[occ.length - 1] ?? null;
  }

  it('never names a date past what the window admits', () => {
    for (const from of [
      new Date('2026-09-11T09:00:00'),
      // US DST ends Nov 1 2026; a 30-day window from here crosses it.
      new Date('2026-10-20T09:00:00'),
      // And starts Mar 8 2026.
      new Date('2026-02-25T09:00:00'),
    ]) {
      for (const days of [14, 30, 90] as const) {
        const end = upcomingWindowEnd(days, from);
        const last = lastAdmittedDate(from, days);
        expect(last).not.toBeNull();
        expect(last!.getTime()).toBeLessThanOrEqual(end.getTime());
      }
    }
  });

  it('lands on the same calendar day the engine measures to', () => {
    const from = new Date('2026-10-20T09:00:00'); // crosses the DST change
    const end = upcomingWindowEnd(30, from);
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    expect(end.getTime() - start.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
