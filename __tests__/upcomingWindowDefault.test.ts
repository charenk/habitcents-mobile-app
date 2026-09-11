/**
 * The Upcoming pane's opening window for a user who has never picked one
 * (D2): the narrowest preset that actually has a bill in it, falling back to
 * one month.
 *
 * The defect this replaces: a fixed 14-day default meant a monthly bill
 * produced the window-empty state on first open roughly half the time, so the
 * pane's first impression was a dead end for the most common bill there is.
 *
 * The case worth reading first is the due-today one. A bill due only today has
 * already been materialized into Spent and is advanced past on this surface,
 * so counting it as "data in the 14-day window" would pick 14 and then render
 * empty: the defect reproduced by its own fix. That is why the picker projects
 * through `advancePastToday` rather than `computeUpcoming` alone.
 */
import type { Expense } from '@/types/expense';
import {
  DEFAULT_UPCOMING_WINDOW_DAYS,
  pickDefaultUpcomingWindow,
} from '@/utils/upcomingWindow';

/** Fixed "today" so the fixtures below are not calendar-dependent. */
const FROM = new Date(2026, 8, 11, 9, 0, 0);

function daysFrom(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** A monthly bill whose next occurrence lands `days` out from FROM. */
function monthlyBill(days: number, overrides: Partial<Expense> = {}): Expense {
  return {
    id: `bill-${days}`,
    title: 'Rent',
    amount: 200000,
    category: 'Mortgage',
    date: daysFrom(FROM, days),
    time: '9:00 AM',
    isRecurring: true,
    recurrence: 'monthly',
    recurrenceRule: { type: 'monthly' },
    reminderEnabled: false,
    iconVariant: 'green',
    ...overrides,
  };
}

describe('pickDefaultUpcomingWindow', () => {
  it('opens on 2 weeks when something lands inside 14 days', () => {
    expect(pickDefaultUpcomingWindow([monthlyBill(5)], FROM)).toBe(14);
  });

  it('opens on 1 month when the nearest bill is 25 days out', () => {
    expect(pickDefaultUpcomingWindow([monthlyBill(25)], FROM)).toBe(30);
  });

  it('opens on 3 months when the nearest bill is 60 days out', () => {
    // A one-time bill, so nothing recurs back into the narrower windows.
    const far = monthlyBill(60, {
      isRecurring: false,
      recurrence: undefined,
      recurrenceRule: { type: 'once' },
    });
    expect(pickDefaultUpcomingWindow([far], FROM)).toBe(90);
  });

  it('takes the narrowest window that has data, not the first bill it finds', () => {
    const bills = [monthlyBill(60), monthlyBill(9), monthlyBill(25)];
    expect(pickDefaultUpcomingWindow(bills, FROM)).toBe(14);
  });

  it('falls back to the default when nothing recurs at all', () => {
    const plain: Expense = {
      id: 'plain',
      title: 'Coffee',
      amount: 450,
      category: 'Food',
      date: daysFrom(FROM, -1),
      time: '8:00 AM',
      isRecurring: false,
      reminderEnabled: false,
      iconVariant: 'green',
    };
    expect(pickDefaultUpcomingWindow([plain], FROM)).toBe(DEFAULT_UPCOMING_WINDOW_DAYS);
    expect(pickDefaultUpcomingWindow([], FROM)).toBe(DEFAULT_UPCOMING_WINDOW_DAYS);
  });

  /**
   * The trap. A weekly bill due TODAY has an occurrence inside 14 days that
   * the pane will never show, because the materializer already wrote it into
   * Spent and `advancePastToday` re-points the row at next week's. Its next
   * VISIBLE occurrence is 7 days out, so 14 is still right here; the assertion
   * that matters is the monthly one below it, where today's occurrence is the
   * only one inside 14 days.
   */
  it('ignores a due-today occurrence, which the pane never shows', () => {
    const dueTodayOnly = monthlyBill(0);
    // Today's is the only occurrence a monthly rule puts inside 14 days, and
    // it is not shown, so this must not open on 2 weeks.
    expect(pickDefaultUpcomingWindow([dueTodayOnly], FROM)).toBe(30);
  });

  it('still opens on 2 weeks for a weekly bill due today, whose next one is 7 days out', () => {
    const weekly = monthlyBill(0, {
      recurrence: 'weekly',
      recurrenceRule: { type: 'weekly', weekday: daysFrom(FROM, 0).getDay() as 0 },
    });
    expect(pickDefaultUpcomingWindow([weekly], FROM)).toBe(14);
  });
});
