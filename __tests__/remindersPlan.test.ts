/**
 * The pure reminder planner (utils/reminders/plan.ts): refusals, the
 * three-occurrence horizon, the past-fire drop, per-cadence occurrence math,
 * the 64 cap, and the fingerprint's stability. No mocks: desiredReminders is
 * pure and takes `format` injected, which is the point of the injection.
 *
 * The month-precision refusal test here is one half of the spec's "assert
 * both" acceptance (section 7): the control's ABSENCE in the sheet is the
 * other half, in __tests__/addUpcomingSheet.test.tsx, so the guarantee does
 * not depend on the UI being the only caller.
 */

import {
  DEFAULT_REMINDER_PREFS,
  desiredReminders,
  MAX_SCHEDULED,
  REMINDER_HORIZON,
  REMINDER_ID_PREFIX,
  reminderFingerprint,
  type ReminderPrefs,
} from '@/utils/reminders/plan';
import { strings } from '@/constants/strings';
import type { Expense } from '@/types/expense';

// Fixed clock: Friday Sep 25 2026, noon. Everything below is relative to it.
const NOW = new Date(2026, 8, 25, 12, 0, 0);
const PREFS: ReminderPrefs = { enabled: true, hour: 9, minute: 0 };
const fmt = (cents: number) => `AMT(${cents})`;

function bill(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'bill-1',
    title: 'Netflix',
    amount: 1499,
    category: 'Entertainment',
    date: new Date(2026, 8, 1), // Sep 1 2026
    time: '9:00 AM',
    isRecurring: true,
    recurrence: 'monthly',
    recurrenceRule: { type: 'monthly', monthDay: '1' },
    reminderEnabled: true,
    iconVariant: 'yellow',
    ...overrides,
  };
}

function plan(expenses: Expense[], prefs = PREFS, permission: 'granted' | 'denied' | 'undetermined' = 'granted', now = NOW) {
  return desiredReminders(expenses, prefs, permission, now, fmt, strings);
}

describe('gates that empty the whole set', () => {
  it('global switch off returns nothing regardless of per-bill intent', () => {
    expect(plan([bill()], { ...PREFS, enabled: false })).toEqual([]);
  });

  it('denied and undetermined permission return nothing; intent persists untouched', () => {
    expect(plan([bill()], PREFS, 'denied')).toEqual([]);
    expect(plan([bill()], PREFS, 'undetermined')).toEqual([]);
  });
});

describe('per-bill refusals', () => {
  it('a bill with reminders off contributes nothing', () => {
    expect(plan([bill({ reminderEnabled: false })])).toEqual([]);
  });

  it('a materialized child never schedules, even with the flag forced on', () => {
    expect(plan([bill({ source: 'recurring', parentId: 'p1', isRecurring: false })])).toEqual([]);
  });

  it('REFUSES a month-precision bill regardless of stored intent (ADR 0042; spec section 7 "assert both")', () => {
    const unknownDay = bill({
      datePrecision: 'month',
      date: new Date(2026, 8, 30), // anchor: last day of the named month
      recurrenceRule: { type: 'monthly', monthDay: 'last' },
      reminderEnabled: true,
    });
    expect(plan([unknownDay])).toEqual([]);
  });

  it('malformed precision degrades to day and still schedules (precisionOf is the shared read)', () => {
    const malformed = bill({ datePrecision: 'sometime' as never });
    expect(plan([malformed])).toHaveLength(REMINDER_HORIZON);
  });
});

describe('the horizon and fire-time arithmetic', () => {
  it('a monthly bill yields three occurrences, each announced the day before at the preferred time', () => {
    const out = plan([bill()]);
    expect(out).toHaveLength(3);
    // Oct 1, Nov 1, Dec 1 -> fired Sep 30, Oct 31, Nov 30 at 9:00 local.
    expect(out[0].fireDate).toEqual(new Date(2026, 8, 30, 9, 0, 0, 0));
    expect(out[1].fireDate).toEqual(new Date(2026, 9, 31, 9, 0, 0, 0));
    expect(out[2].fireDate).toEqual(new Date(2026, 10, 30, 9, 0, 0, 0));
    expect(out.map((d) => d.identifier)).toEqual([
      `${REMINDER_ID_PREFIX}bill-1:2026-10-01`,
      `${REMINDER_ID_PREFIX}bill-1:2026-11-01`,
      `${REMINDER_ID_PREFIX}bill-1:2026-12-01`,
    ]);
  });

  it('the body is the injected currency format plus "due tomorrow", the title is the bill name', () => {
    const out = plan([bill()]);
    expect(out[0].title).toBe('Netflix');
    expect(out[0].body).toBe('AMT(1499) due tomorrow.');
  });

  it('the preferred time moves every fire date', () => {
    const out = plan([bill()], { enabled: true, hour: 20, minute: 30 });
    expect(out[0].fireDate).toEqual(new Date(2026, 8, 30, 20, 30, 0, 0));
  });

  it('a once bill due tomorrow whose fire moment already passed gets NOTHING, never a late fire', () => {
    const once = bill({
      isRecurring: false,
      recurrence: undefined,
      recurrenceRule: { type: 'once' },
      date: new Date(2026, 8, 26), // tomorrow; fire would be today 9:00, now is noon
    });
    expect(plan([once])).toEqual([]);
  });

  it('the same once bill IS scheduled while the fire moment is still ahead', () => {
    const once = bill({
      isRecurring: false,
      recurrence: undefined,
      recurrenceRule: { type: 'once' },
      date: new Date(2026, 8, 26),
    });
    const earlier = new Date(2026, 8, 25, 8, 0, 0); // before 9:00
    const out = plan([once], PREFS, 'granted', earlier);
    expect(out).toHaveLength(1);
    expect(out[0].fireDate).toEqual(new Date(2026, 8, 25, 9, 0, 0, 0));
  });

  it('a recurring bill due tomorrow with the fire moment passed skips to the following occurrences', () => {
    const weekly = bill({
      recurrence: 'weekly',
      recurrenceRule: { type: 'weekly', weekday: 6 }, // Saturdays; Sep 26 2026 is one
      date: new Date(2026, 8, 5),
    });
    const out = plan([weekly]);
    expect(out).toHaveLength(3);
    // Sep 26 dropped (fire today 9:00 already past); Oct 3, 10, 17 kept.
    expect(out[0].occDate).toBe('2026-10-03');
  });

  it('a once bill whose date has passed contributes nothing', () => {
    const past = bill({
      isRecurring: false,
      recurrence: undefined,
      recurrenceRule: { type: 'once' },
      date: new Date(2026, 8, 20),
    });
    expect(plan([past])).toEqual([]);
  });
});

describe('cadences all flow through the same occurrence math', () => {
  it('biweekly steps 14 days', () => {
    const biweekly = bill({
      recurrence: 'biweekly',
      recurrenceRule: { type: 'biweekly', weekday: 1, biweekAnchor: '2026-09-07' },
      date: new Date(2026, 8, 7),
    });
    const out = plan([biweekly]);
    expect(out.map((d) => d.occDate)).toEqual(['2026-10-05', '2026-10-19', '2026-11-02']);
  });

  it('custom steps everyNDays', () => {
    const custom = bill({
      recurrence: undefined,
      recurrenceRule: { type: 'custom', everyNDays: 10 },
      date: new Date(2026, 8, 20),
    });
    const out = plan([custom]);
    expect(out.map((d) => d.occDate)).toEqual(['2026-09-30', '2026-10-10', '2026-10-20']);
  });

  it('annual steps a year and monthly "last" clamps per month', () => {
    const annual = bill({
      recurrence: 'annual',
      recurrenceRule: { type: 'annual' },
      date: new Date(2026, 2, 15),
    });
    const lastDay = bill({
      id: 'bill-2',
      recurrenceRule: { type: 'monthly', monthDay: 'last' },
      date: new Date(2026, 8, 30),
    });
    expect(plan([annual]).map((d) => d.occDate)).toEqual(['2027-03-15', '2028-03-15', '2029-03-15']);
    expect(plan([lastDay]).map((d) => d.occDate)).toEqual(['2026-09-30', '2026-10-31', '2026-11-30']);
  });
});

describe('the 64 cap', () => {
  it('keeps the soonest 64, sorted ascending', () => {
    const bills = Array.from({ length: 30 }, (_, i) =>
      bill({ id: `bill-${i}`, date: new Date(2026, 8, 1 + (i % 28)) })
    );
    const out = plan(bills);
    expect(out).toHaveLength(MAX_SCHEDULED);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].fireDate.getTime()).toBeGreaterThanOrEqual(out[i - 1].fireDate.getTime());
    }
  });
});

describe('reminderFingerprint', () => {
  it('ignores rows that cannot affect the plan (a logged spend, a materialized child)', () => {
    const base = [bill()];
    const withSpend = [
      ...base,
      bill({ id: 'spend-1', reminderEnabled: false, isRecurring: false, recurrenceRule: undefined }),
      bill({ id: 'child-1', source: 'recurring', parentId: 'bill-1' }),
    ];
    expect(reminderFingerprint(withSpend, PREFS, 'granted')).toBe(
      reminderFingerprint(base, PREFS, 'granted')
    );
  });

  it('moves when a reminder-on bill, the prefs, or the permission change', () => {
    const base = reminderFingerprint([bill()], PREFS, 'granted');
    expect(reminderFingerprint([bill({ amount: 1599 })], PREFS, 'granted')).not.toBe(base);
    expect(reminderFingerprint([bill()], { ...PREFS, hour: 20 }, 'granted')).not.toBe(base);
    expect(reminderFingerprint([bill()], { ...PREFS, enabled: false }, 'granted')).not.toBe(base);
    expect(reminderFingerprint([bill()], PREFS, 'denied')).not.toBe(base);
    expect(reminderFingerprint([bill({ reminderEnabled: false })], PREFS, 'granted')).not.toBe(base);
  });

  it('is order-insensitive across the expense list', () => {
    const a = bill();
    const b = bill({ id: 'bill-2', title: 'Gym' });
    expect(reminderFingerprint([a, b], PREFS, 'granted')).toBe(
      reminderFingerprint([b, a], PREFS, 'granted')
    );
  });
});

describe('defaults', () => {
  it('DEFAULT_REMINDER_PREFS keeps the global switch ON (master override, not a second opt-in)', () => {
    expect(DEFAULT_REMINDER_PREFS.enabled).toBe(true);
    expect(DEFAULT_REMINDER_PREFS.hour).toBe(9);
    expect(DEFAULT_REMINDER_PREFS.minute).toBe(0);
  });
});
