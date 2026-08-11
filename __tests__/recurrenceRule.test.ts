/**
 * Step 04 recurrence engine. The bar: an expense stored before RecurrenceRule
 * existed must project to byte-identical dates forever, so every legacy case is
 * pinned against hand-derived dates here as well as in recurring.test.ts (which
 * must keep passing unmodified).
 */

import {
  computeUpcoming,
  describeSchedule,
  multiPaymentMonth,
  nextOccurrence,
  occurrencesWithin,
  resolveRule,
  upcomingTotal,
  upcomingWindowPaymentsCount,
  upcomingWindowTotal,
} from '@/utils/recurring';
import { formatDate } from '@/utils/dates';
import type { Expense, RecurrenceFrequency, RecurrenceRule } from '@/types/expense';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    title: 'Netflix',
    amount: 1599,
    category: 'Entertainment',
    date: new Date('2026-06-01T00:00:00'),
    time: '12:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'green',
    ...overrides,
  };
}

/** Legacy row: isRecurring + recurrence, no recurrenceRule. */
function legacy(freq: RecurrenceFrequency, date: string, overrides: Partial<Expense> = {}): Expense {
  return expense({ isRecurring: true, recurrence: freq, date: new Date(date), ...overrides });
}

/** Step 04 row: an authored rule plus the legacy mirrors a writer must set. */
function ruled(rule: RecurrenceRule, date: string, overrides: Partial<Expense> = {}): Expense {
  return expense({
    isRecurring: rule.type !== 'once',
    recurrenceRule: rule,
    date: new Date(date),
    ...overrides,
  });
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

function ymdAll(dates: Date[]): string[] {
  return dates.map(ymd);
}

const FROM = new Date('2026-07-02T09:00:00'); // Thursday

// ---------------------------------------------------------------------------
// 1. Legacy mapping
// ---------------------------------------------------------------------------

describe('resolveRule: legacy mapping (read-path only, never writes)', () => {
  it('maps weekly to the weekday of the stored date', () => {
    // Jun 29 2026 is a Monday.
    expect(resolveRule(legacy('weekly', '2026-06-29T00:00:00'))).toEqual({
      type: 'weekly',
      weekday: 1,
    });
  });

  it('maps biweekly to the weekday plus a local-calendar anchor', () => {
    // Jun 4 2026 is a Thursday.
    expect(resolveRule(legacy('biweekly', '2026-06-04T00:00:00'))).toEqual({
      type: 'biweekly',
      weekday: 4,
      biweekAnchor: '2026-06-04',
    });
  });

  it('maps monthly with NO monthDay, preserving legacy anchor stepping', () => {
    // A monthDay here would silently change the Jan 31 overflow behavior.
    expect(resolveRule(legacy('monthly', '2026-01-31T00:00:00'))).toEqual({ type: 'monthly' });
  });

  it('maps annual', () => {
    expect(resolveRule(legacy('annual', '2025-07-15T00:00:00'))).toEqual({ type: 'annual' });
  });

  it('returns null for a plain spend', () => {
    expect(resolveRule(expense())).toBeNull();
  });

  it('returns null when isRecurring is set but the frequency is missing', () => {
    expect(resolveRule(expense({ isRecurring: true }))).toBeNull();
  });

  it('does not mutate the expense it reads', () => {
    const e = legacy('weekly', '2026-06-29T00:00:00');
    const before = JSON.stringify(e);
    resolveRule(e);
    expect(JSON.stringify(e)).toBe(before);
    expect(e.recurrenceRule).toBeUndefined();
  });

  it('prefers a stored rule over the legacy pair', () => {
    const e = legacy('monthly', '2026-06-01T00:00:00', {
      recurrenceRule: { type: 'weekly', weekday: 5 },
    });
    expect(resolveRule(e)).toEqual({ type: 'weekly', weekday: 5 });
  });

  it('falls through to the legacy mapping when the stored rule is unknown or malformed', () => {
    const unknownType = legacy('monthly', '2026-06-01T00:00:00', {
      recurrenceRule: { type: 'quarterly' } as unknown as RecurrenceRule,
    });
    expect(resolveRule(unknownType)).toEqual({ type: 'monthly' });

    const badWeekday = legacy('weekly', '2026-06-29T00:00:00', {
      recurrenceRule: { type: 'weekly', weekday: 'friday' } as unknown as RecurrenceRule,
    });
    expect(resolveRule(badWeekday)).toEqual({ type: 'weekly', weekday: 1 });
  });

  it('ignores a malformed rule on a non-recurring row', () => {
    expect(resolveRule(expense({ recurrenceRule: { type: 'nope' } as unknown as RecurrenceRule })))
      .toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Golden parity: legacy dates must not move
// ---------------------------------------------------------------------------

describe('nextOccurrence: golden parity with the pre-step-04 engine', () => {
  it('weekly: Jun 29 -> Jul 6', () => {
    expect(ymd(nextOccurrence(legacy('weekly', '2026-06-29T00:00:00'), FROM)!)).toBe('2026-07-06');
  });

  it('weekly landing exactly on `from` returns that day', () => {
    expect(ymd(nextOccurrence(legacy('weekly', '2026-06-25T00:00:00'), FROM)!)).toBe('2026-07-02');
  });

  it('biweekly steps by exactly 14 days: Jun 4 -> Jun 18 -> Jul 2', () => {
    expect(ymd(nextOccurrence(legacy('biweekly', '2026-06-04T00:00:00'), FROM)!)).toBe('2026-07-02');
    expect(ymd(nextOccurrence(legacy('biweekly', '2026-06-20T00:00:00'), FROM)!)).toBe('2026-07-04');
  });

  it('biweekly keeps its 14-day phase over a long gap', () => {
    // Jan 9 2025 is 539 days before Jul 2 2026, so 38 steps land on Jun 25 2026
    // and the first date on/after `from` is Jul 9. Same weekday, wrong week, is
    // the failure this pins.
    expect(ymd(nextOccurrence(legacy('biweekly', '2025-01-09T00:00:00'), FROM)!)).toBe('2026-07-09');
  });

  it('monthly: Jun 1 -> Aug 1 (same day-of-month stepping)', () => {
    expect(ymd(nextOccurrence(legacy('monthly', '2026-06-01T00:00:00'), FROM)!)).toBe('2026-08-01');
  });

  it('monthly keeps the pinned Jan 31 -> Mar 3 overflow roll', () => {
    const jan31 = legacy('monthly', '2026-01-31T00:00:00');
    // Feb 2026 has 28 days, so setMonth(+1) on Jan 31 overflows to Mar 3.
    expect(ymd(nextOccurrence(jan31, new Date('2026-02-01T00:00:00'))!)).toBe('2026-03-03');
    // And the anchor stays on the rolled day from then on: Mar 3 -> ... -> Jul 3.
    expect(ymdAll(occurrencesWithin(jan31, new Date('2026-02-01T00:00:00'), 160))).toEqual([
      '2026-03-03',
      '2026-04-03',
      '2026-05-03',
      '2026-06-03',
      '2026-07-03',
    ]);
    expect(ymd(nextOccurrence(jan31, FROM)!)).toBe('2026-07-03');
  });

  it('monthly rolls a 31st through a 30-day month the same way (Aug 31 -> Oct 1)', () => {
    const aug31 = legacy('monthly', '2026-08-31T00:00:00');
    expect(ymdAll(occurrencesWithin(aug31, new Date('2026-08-31T00:00:00'), 70))).toEqual([
      '2026-08-31',
      '2026-10-01',
      '2026-11-01',
    ]);
  });

  it('annual: same month/day next year, stepping whole years', () => {
    expect(ymd(nextOccurrence(legacy('annual', '2025-07-15T00:00:00'), FROM)!)).toBe('2026-07-15');
    expect(ymd(nextOccurrence(legacy('annual', '2023-01-10T00:00:00'), FROM)!)).toBe('2027-01-10');
  });

  it('an authored rule equivalent to a legacy row projects the identical date', () => {
    const pairs: Array<[Expense, Expense]> = [
      [legacy('weekly', '2026-06-29T00:00:00'), ruled({ type: 'weekly', weekday: 1 }, '2026-06-29T00:00:00')],
      [
        legacy('biweekly', '2026-06-04T00:00:00'),
        ruled({ type: 'biweekly', weekday: 4, biweekAnchor: '2026-06-04' }, '2026-06-04T00:00:00'),
      ],
      [legacy('monthly', '2026-01-31T00:00:00'), ruled({ type: 'monthly' }, '2026-01-31T00:00:00')],
      [legacy('annual', '2025-07-15T00:00:00'), ruled({ type: 'annual' }, '2025-07-15T00:00:00')],
    ];
    for (const [legacyRow, ruledRow] of pairs) {
      expect(nextOccurrence(ruledRow, FROM)!.getTime()).toBe(nextOccurrence(legacyRow, FROM)!.getTime());
    }
  });

  it('ignores the time of day on both the expense and `from`', () => {
    const evening = legacy('weekly', '2026-06-29T23:45:00');
    expect(ymd(nextOccurrence(evening, new Date('2026-07-02T23:59:59'))!)).toBe('2026-07-06');
  });
});

// ---------------------------------------------------------------------------
// 3. One-time
// ---------------------------------------------------------------------------

describe('once', () => {
  const once: RecurrenceRule = { type: 'once' };

  it('returns the date when it is in the future', () => {
    expect(ymd(nextOccurrence(ruled(once, '2026-08-12T00:00:00'), FROM)!)).toBe('2026-08-12');
  });

  it('returns the day when it lands on `from`, whatever the time of day', () => {
    expect(ymd(nextOccurrence(ruled(once, '2026-07-02T18:30:00'), FROM)!)).toBe('2026-07-02');
  });

  it('returns null once the day has passed', () => {
    expect(nextOccurrence(ruled(once, '2026-07-01T00:00:00'), FROM)).toBeNull();
  });

  it('yields exactly one occurrence in a window and never repeats', () => {
    expect(ymdAll(occurrencesWithin(ruled(once, '2026-07-10T00:00:00'), FROM, 60))).toEqual([
      '2026-07-10',
    ]);
  });

  it('shows up in computeUpcoming even though isRecurring is false', () => {
    const item = ruled(once, '2026-07-10T00:00:00', { isRecurring: false });
    const items = computeUpcoming([item], 60, FROM);
    expect(items).toHaveLength(1);
    expect(items[0].daysUntil).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// 4. Authored weekly / biweekly
// ---------------------------------------------------------------------------

describe('authored weekly and biweekly', () => {
  it('lands on the stored weekday even if the start date drifted off it', () => {
    // Jul 1 2026 is a Wednesday; the rule says Fridays.
    const e = ruled({ type: 'weekly', weekday: 5 }, '2026-07-01T00:00:00');
    const next = nextOccurrence(e, FROM)!;
    expect(next.getDay()).toBe(5);
    expect(ymd(next)).toBe('2026-07-03');
  });

  it('stays on that weekday for every occurrence in the window', () => {
    const e = ruled({ type: 'weekly', weekday: 5 }, '2026-07-03T00:00:00');
    const all = occurrencesWithin(e, FROM, 29);
    expect(ymdAll(all)).toEqual(['2026-07-03', '2026-07-10', '2026-07-17', '2026-07-24', '2026-07-31']);
    expect(all.every((d) => d.getDay() === 5)).toBe(true);
  });

  it('takes the biweekly phase from the anchor, not from the expense date', () => {
    // Anchor Jul 9 puts the cadence on the odd Thursdays: Jul 9, Jul 23, Aug 6.
    const e = ruled(
      { type: 'biweekly', weekday: 4, biweekAnchor: '2026-07-09' },
      '2026-07-09T00:00:00'
    );
    expect(ymdAll(occurrencesWithin(e, FROM, 40))).toEqual(['2026-07-09', '2026-07-23', '2026-08-06']);
  });

  it('reads the anchor as a LOCAL calendar date, never UTC midnight', () => {
    // '2026-07-09' parsed as UTC would read as Jul 8 west of Greenwich.
    const e = ruled(
      { type: 'biweekly', weekday: 4, biweekAnchor: '2026-07-09' },
      '2026-07-09T00:00:00'
    );
    expect(nextOccurrence(e, FROM)!.getDate()).toBe(9);
  });

  it('falls back to the expense date when the anchor is unusable', () => {
    const e = ruled(
      { type: 'biweekly', weekday: 4, biweekAnchor: 'not-a-date' },
      '2026-07-09T00:00:00'
    );
    expect(ymd(nextOccurrence(e, FROM)!)).toBe('2026-07-09');
  });
});

// ---------------------------------------------------------------------------
// 5. Authored monthly anchors
// ---------------------------------------------------------------------------

describe('authored monthly anchors', () => {
  it('monthDay 1 lands on the 1st every month', () => {
    const e = ruled({ type: 'monthly', monthDay: '1' }, '2026-08-01T00:00:00');
    expect(ymdAll(occurrencesWithin(e, FROM, 92))).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
  });

  it('monthDay 15 lands on the 15th, February included', () => {
    const e = ruled({ type: 'monthly', monthDay: '15' }, '2026-01-15T00:00:00');
    expect(ymdAll(occurrencesWithin(e, new Date('2026-01-01T00:00:00'), 75))).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
    ]);
  });

  it('monthDay 30 clamps to Feb 28 and then recovers to the 30th', () => {
    const e = ruled({ type: 'monthly', monthDay: '30' }, '2026-01-30T00:00:00');
    expect(ymdAll(occurrencesWithin(e, new Date('2026-01-01T00:00:00'), 120))).toEqual([
      '2026-01-30',
      '2026-02-28', // clamped, never rolled into March
      '2026-03-30',
      '2026-04-30',
    ]);
  });

  it('monthDay 30 clamps to Feb 29 in a leap year', () => {
    const e = ruled({ type: 'monthly', monthDay: '30' }, '2028-01-30T00:00:00');
    expect(ymdAll(occurrencesWithin(e, new Date('2028-01-01T00:00:00'), 90))).toEqual([
      '2028-01-30',
      '2028-02-29',
      '2028-03-30',
    ]);
  });

  it('monthDay last walks 31 / 28 / 31 / 30', () => {
    const e = ruled({ type: 'monthly', monthDay: 'last' }, '2026-01-31T00:00:00');
    expect(ymdAll(occurrencesWithin(e, new Date('2026-01-01T00:00:00'), 160))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('monthDay last hits Feb 29 in a leap year', () => {
    const e = ruled({ type: 'monthly', monthDay: 'last' }, '2028-02-29T00:00:00');
    expect(ymd(nextOccurrence(e, new Date('2028-02-01T00:00:00'))!)).toBe('2028-02-29');
  });

  it('pulls a drifted start forward to the anchor inside the same month', () => {
    // Stored on the 3rd but anchored to the 15th: the first due date is the 15th.
    const e = ruled({ type: 'monthly', monthDay: '15' }, '2026-07-03T00:00:00');
    expect(ymd(nextOccurrence(e, FROM)!)).toBe('2026-07-15');
  });

  it('pushes a drifted start to next month when the anchor already passed', () => {
    const e = ruled({ type: 'monthly', monthDay: '1' }, '2026-07-20T00:00:00');
    expect(ymd(nextOccurrence(e, FROM)!)).toBe('2026-08-01');
  });

  it('an anchored monthly never inherits the legacy overflow roll', () => {
    const anchored = ruled({ type: 'monthly', monthDay: 'last' }, '2026-01-31T00:00:00');
    const legacyRow = legacy('monthly', '2026-01-31T00:00:00');
    expect(ymd(nextOccurrence(anchored, new Date('2026-02-01T00:00:00'))!)).toBe('2026-02-28');
    expect(ymd(nextOccurrence(legacyRow, new Date('2026-02-01T00:00:00'))!)).toBe('2026-03-03');
  });
});

// ---------------------------------------------------------------------------
// 6. Custom cadence and the defensive clamp
// ---------------------------------------------------------------------------

describe('custom cadence', () => {
  it('steps by everyNDays', () => {
    const e = ruled({ type: 'custom', everyNDays: 9 }, '2026-07-25T00:00:00');
    expect(ymdAll(occurrencesWithin(e, FROM, 60))).toEqual([
      '2026-07-25',
      '2026-08-03',
      '2026-08-12',
      '2026-08-21',
      '2026-08-30',
    ]);
  });

  it('steps across a month boundary without drifting', () => {
    const e = ruled({ type: 'custom', everyNDays: 45 }, '2026-07-05T00:00:00');
    expect(ymdAll(occurrencesWithin(e, FROM, 100))).toEqual(['2026-07-05', '2026-08-19', '2026-10-03']);
  });

  it('clamps a too-small everyNDays up to 2', () => {
    for (const bad of [1, 0, -7]) {
      expect(resolveRule(ruled({ type: 'custom', everyNDays: bad }, '2026-07-05T00:00:00'))).toEqual({
        type: 'custom',
        everyNDays: 2,
      });
    }
  });

  it('clamps a too-large everyNDays down to 90', () => {
    expect(resolveRule(ruled({ type: 'custom', everyNDays: 5000 }, '2026-07-05T00:00:00'))).toEqual({
      type: 'custom',
      everyNDays: 90,
    });
  });

  it('rounds a fractional everyNDays', () => {
    expect(resolveRule(ruled({ type: 'custom', everyNDays: 9.4 }, '2026-07-05T00:00:00'))).toEqual({
      type: 'custom',
      everyNDays: 9,
    });
  });

  it('falls back to 30 days rather than dropping the item when everyNDays is corrupt', () => {
    const e = ruled(
      { type: 'custom', everyNDays: 'weekly' } as unknown as RecurrenceRule,
      '2026-07-05T00:00:00'
    );
    expect(resolveRule(e)).toEqual({ type: 'custom', everyNDays: 30 });
    expect(ymd(nextOccurrence(e, FROM)!)).toBe('2026-07-05');
  });

  it('applies the clamp when stepping, not only when resolving', () => {
    const e = ruled(
      { type: 'custom', everyNDays: 1 } as unknown as RecurrenceRule,
      '2026-07-05T00:00:00'
    );
    expect(ymdAll(occurrencesWithin(e, FROM, 6))).toEqual(['2026-07-05', '2026-07-07']);
  });
});

// ---------------------------------------------------------------------------
// 7. occurrencesWithin + multiPaymentMonth
// ---------------------------------------------------------------------------

describe('occurrencesWithin and multiPaymentMonth', () => {
  it('returns nothing for a plain spend', () => {
    expect(occurrencesWithin(expense(), FROM, 60)).toEqual([]);
  });

  it('returns nothing when the next occurrence is past the horizon', () => {
    expect(occurrencesWithin(legacy('monthly', '2026-06-15T00:00:00'), FROM, 7)).toEqual([]);
  });

  it('includes an occurrence landing exactly on the horizon', () => {
    const e = legacy('weekly', '2026-07-02T00:00:00');
    expect(ymdAll(occurrencesWithin(e, FROM, 14))).toEqual(['2026-07-02', '2026-07-09', '2026-07-16']);
  });

  it('flags a biweekly 3-payment month', () => {
    // Jul 2 / Jul 16 / Jul 30 all land in July.
    const all = occurrencesWithin(legacy('biweekly', '2026-06-04T00:00:00'), FROM, 60);
    expect(ymdAll(all)).toEqual(['2026-07-02', '2026-07-16', '2026-07-30', '2026-08-13', '2026-08-27']);
    expect(multiPaymentMonth(all)).toEqual({ monthLabel: 'Jul', count: 3 });
  });

  it('returns null when no month has 3 or more payments', () => {
    const monthly = occurrencesWithin(legacy('monthly', '2026-06-15T00:00:00'), FROM, 60);
    expect(monthly).toHaveLength(2);
    expect(multiPaymentMonth(monthly)).toBeNull();
    expect(multiPaymentMonth([])).toBeNull();
  });

  it('needs a third payment before it flags a month', () => {
    const all = occurrencesWithin(legacy('biweekly', '2026-06-04T00:00:00'), FROM, 30);
    expect(ymdAll(all)).toEqual(['2026-07-02', '2026-07-16', '2026-07-30']);
    expect(multiPaymentMonth(all.slice(0, 2))).toBeNull();
    expect(multiPaymentMonth(all)).toEqual({ monthLabel: 'Jul', count: 3 });
  });

  it('picks the earliest qualifying month when several qualify', () => {
    const all = occurrencesWithin(legacy('weekly', '2026-07-02T00:00:00'), FROM, 60);
    expect(all).toHaveLength(9); // Jul 2 through Aug 27
    expect(multiPaymentMonth(all)).toEqual({ monthLabel: 'Jul', count: 5 });
  });

  it('names the month through the locale-aware date helper', () => {
    const all = occurrencesWithin(legacy('biweekly', '2026-06-04T00:00:00'), FROM, 60);
    expect(multiPaymentMonth(all)!.monthLabel).toBe(
      formatDate(new Date('2026-07-02T00:00:00'), { month: 'short' })
    );
  });
});

// ---------------------------------------------------------------------------
// 8. Window totals
// ---------------------------------------------------------------------------

describe('upcomingTotal versus upcomingWindowTotal', () => {
  const weekly = legacy('weekly', '2026-06-29T00:00:00', { id: 'w1', amount: 1599 });
  const monthly = legacy('monthly', '2026-06-15T00:00:00', { id: 'm1', amount: 5000 });

  it('exposes occurrencesInWindow whose first entry is nextDate', () => {
    const items = computeUpcoming([weekly, monthly], 60, FROM);
    for (const item of items) {
      expect(item.occurrencesInWindow.length).toBeGreaterThan(0);
      expect(item.occurrencesInWindow[0].getTime()).toBe(item.nextDate.getTime());
    }
  });

  it('counts one payment per item, versus every payment in the window', () => {
    const items = computeUpcoming([weekly, monthly], 60, FROM);
    const weeklyItem = items.find((i) => i.expense.id === 'w1')!;
    const monthlyItem = items.find((i) => i.expense.id === 'm1')!;
    expect(weeklyItem.occurrencesInWindow).toHaveLength(9); // Jul 6 through Aug 31
    expect(monthlyItem.occurrencesInWindow).toHaveLength(2); // Jul 15, Aug 15

    expect(upcomingTotal(items)).toBe(1599 + 5000);
    expect(upcomingWindowTotal(items)).toBe(1599 * 9 + 5000 * 2);
  });

  it('agrees with upcomingTotal when everything is due exactly once', () => {
    const items = computeUpcoming([monthly], 40, FROM);
    expect(items[0].occurrencesInWindow).toHaveLength(1);
    expect(upcomingWindowTotal(items)).toBe(upcomingTotal(items));
  });

  it('is zero for an empty list', () => {
    expect(upcomingWindowTotal([])).toBe(0);
  });
});

describe('upcomingWindowPaymentsCount (U8: agrees with upcomingWindowTotal)', () => {
  const weekly = legacy('weekly', '2026-06-29T00:00:00', { id: 'w1', amount: 1599 });
  const monthly = legacy('monthly', '2026-06-15T00:00:00', { id: 'm1', amount: 5000 });

  it('counts every occurrence, the same denominator the total sums over', () => {
    const items = computeUpcoming([weekly, monthly], 60, FROM);
    // 9 weekly + 2 monthly occurrences (same fixture as the total test above),
    // versus 2 distinct bills -- the two numbers a summary can honestly show.
    expect(upcomingWindowPaymentsCount(items)).toBe(11);
    expect(items).toHaveLength(2);
  });

  it('equals the item count when nothing repeats inside the window', () => {
    const items = computeUpcoming([monthly], 40, FROM);
    expect(upcomingWindowPaymentsCount(items)).toBe(items.length);
  });

  it('is zero for an empty list', () => {
    expect(upcomingWindowPaymentsCount([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Mixed legacy and rule-based lists
// ---------------------------------------------------------------------------

describe('computeUpcoming with a mixed legacy and rule-based list', () => {
  const rows: Expense[] = [
    legacy('monthly', '2026-06-15T00:00:00', { id: 'legacy-monthly' }), // Jul 15
    ruled({ type: 'weekly', weekday: 5 }, '2026-07-03T00:00:00', { id: 'rule-weekly' }), // Jul 3
    ruled({ type: 'once' }, '2026-07-10T00:00:00', { id: 'rule-once', isRecurring: false }), // Jul 10
    ruled({ type: 'custom', everyNDays: 9 }, '2026-07-25T00:00:00', { id: 'rule-custom' }), // Jul 25
    legacy('annual', '2025-07-15T00:00:00', { id: 'legacy-annual' }), // Jul 15
    expense({ id: 'plain-spend' }), // never scheduled
  ];

  it('sorts soonest-first and drops plain spends', () => {
    const items = computeUpcoming(rows, 60, FROM);
    expect(items.map((i) => i.expense.id)).toEqual([
      'rule-weekly',
      'rule-once',
      'legacy-monthly',
      'legacy-annual',
      'rule-custom',
    ]);
    for (let i = 1; i < items.length; i++) {
      expect(items[i].nextDate.getTime()).toBeGreaterThanOrEqual(items[i - 1].nextDate.getTime());
    }
  });

  it('keeps daysUntil consistent with nextDate', () => {
    for (const item of computeUpcoming(rows, 60, FROM)) {
      expect(item.daysUntil).toBe(
        Math.round(
          (item.nextDate.getTime() - new Date('2026-07-02T00:00:00').getTime()) / (24 * 60 * 60 * 1000)
        )
      );
    }
  });

  it('honors the horizon for both kinds of row', () => {
    expect(computeUpcoming(rows, 2, FROM).map((i) => i.expense.id)).toEqual(['rule-weekly']);
  });
});

// ---------------------------------------------------------------------------
// describeSchedule
// ---------------------------------------------------------------------------

describe('describeSchedule', () => {
  const aug1 = new Date('2026-08-01T00:00:00');
  const aug3 = new Date('2026-08-03T00:00:00');
  const aug7 = new Date('2026-08-07T00:00:00'); // Friday
  const aug12 = new Date('2026-08-12T00:00:00');
  const aug14 = new Date('2026-08-14T00:00:00');
  const jul15 = new Date('2026-07-15T00:00:00');

  it('renders each rule shape', () => {
    expect(describeSchedule({ type: 'monthly', monthDay: '1' }, aug1)).toBe('Monthly · 1st · next Aug 1');
    expect(describeSchedule({ type: 'monthly', monthDay: '15' }, jul15)).toBe(
      'Monthly · 15th · next Jul 15'
    );
    expect(describeSchedule({ type: 'monthly', monthDay: '30' }, new Date('2026-08-30T00:00:00'))).toBe(
      'Monthly · 30th · next Aug 30'
    );
    expect(describeSchedule({ type: 'monthly', monthDay: 'last' }, new Date('2026-08-31T00:00:00'))).toBe(
      'Monthly · Last day · next Aug 31'
    );
    expect(describeSchedule({ type: 'monthly' }, jul15)).toBe('Monthly · next Jul 15');
    expect(describeSchedule({ type: 'weekly', weekday: 5 }, aug7)).toBe('Weekly · Fridays · next Aug 7');
    expect(describeSchedule({ type: 'biweekly', weekday: 5, biweekAnchor: '2026-08-14' }, aug14)).toBe(
      'Every 2 weeks · next Aug 14'
    );
    expect(describeSchedule({ type: 'custom', everyNDays: 9 }, aug3)).toBe('Every 9 days · next Aug 3');
    expect(describeSchedule({ type: 'once' }, aug12)).toBe('One-time · Aug 12');
    expect(describeSchedule({ type: 'annual' }, jul15)).toBe('Yearly · next Jul 15');
  });

  it('names every weekday from the rule, not from the date', () => {
    const names = [0, 1, 2, 3, 4, 5, 6].map((w) =>
      describeSchedule({ type: 'weekly', weekday: w as 0 }, aug7).split(' · ')[1]
    );
    expect(names).toEqual([
      'Sundays',
      'Mondays',
      'Tuesdays',
      'Wednesdays',
      'Thursdays',
      'Fridays',
      'Saturdays',
    ]);
  });

  it('builds date text through the locale-aware helper (ADA-008)', () => {
    const line = describeSchedule({ type: 'monthly', monthDay: '1' }, aug1);
    expect(line.endsWith(formatDate(aug1, { month: 'short', day: 'numeric' }))).toBe(true);
  });

  it('clamps a corrupt custom cadence in the label too', () => {
    expect(describeSchedule({ type: 'custom', everyNDays: 900 }, aug3)).toBe('Every 90 days · next Aug 3');
  });

  it('uses the middot separator and never an em or en dash', () => {
    const lines = [
      describeSchedule({ type: 'monthly', monthDay: '1' }, aug1),
      describeSchedule({ type: 'weekly', weekday: 5 }, aug7),
      describeSchedule({ type: 'once' }, aug12),
      describeSchedule({ type: 'annual' }, jul15),
      describeSchedule({ type: 'biweekly', weekday: 5, biweekAnchor: '2026-08-14' }, aug14),
      describeSchedule({ type: 'custom', everyNDays: 9 }, aug3),
    ];
    for (const line of lines) {
      expect(line).toContain('·');
      expect(line).not.toMatch(/[\u2014\u2013]/); // em dash, en dash
    }
  });

  it('pairs with resolveRule for a legacy row without extra plumbing', () => {
    const e = legacy('weekly', '2026-06-29T00:00:00'); // Mondays
    const next = nextOccurrence(e, FROM)!;
    expect(describeSchedule(resolveRule(e)!, next)).toBe('Weekly · Mondays · next Jul 6');
  });
});
