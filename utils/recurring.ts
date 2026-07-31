/**
 * Projects the next occurrence of recurring expenses. Pure and testable: every
 * upcoming item is derived from a real recurring expense the user created, so
 * nothing here is placeholder/fake data.
 *
 * Step 04 added `RecurrenceRule`. There is NO storage migration: `resolveRule`
 * is a read-path normalizer that maps the legacy `isRecurring` + `recurrence`
 * pair onto the same rule shape, and the legacy date math below is preserved
 * verbatim so an expense stored before step 04 projects to byte-identical
 * dates forever. `__tests__/recurring.test.ts` pins that, unmodified.
 */

import { formatDate } from '@/utils/dates';
import { strings } from '@/constants/strings';
import type { Expense, MonthDayOption, RecurrenceRule, Weekday } from '@/types/expense';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Custom cadence bounds, enforced on write (the sheet) and on read (here). */
const MIN_EVERY_N_DAYS = 2;
const MAX_EVERY_N_DAYS = 90;
/** Cadence used when a stored everyNDays is corrupt beyond repair (not a number). */
const FALLBACK_EVERY_N_DAYS = 30;

/** Iteration caps, so a far-past date with a bad clock can never loop forever. */
const MAX_ADVANCE_STEPS = 1000;
const MAX_OCCURRENCES = 400;

export type UpcomingItem = {
  expense: Expense;
  nextDate: Date;
  daysUntil: number;
  /**
   * Every occurrence inside the same window `computeUpcoming` was asked for,
   * ascending. The first entry always equals `nextDate`. Drives the true window
   * total and the "3 payments in Aug" pill.
   */
  occurrencesInWindow: Date[];
};

function atMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Days in the calendar month that `year`/`month` (0-indexed) names. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Local 'YYYY-MM-DD'. Built from local parts so it never shifts a day. */
function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse a stored biweekAnchor as a LOCAL calendar date. `new Date('2026-06-04')`
 * would be UTC midnight and read as Jun 3 west of Greenwich, so the date part is
 * split and rebuilt from local components instead.
 */
function parseLocalISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Defensive clamp for corrupt or hand-edited stored data. */
function clampEveryNDays(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return FALLBACK_EVERY_N_DAYS;
  return Math.min(MAX_EVERY_N_DAYS, Math.max(MIN_EVERY_N_DAYS, n));
}

function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

const MONTH_DAY_OPTIONS: readonly string[] = ['1', '15', '30', 'last'];

function isMonthDayOption(value: unknown): value is MonthDayOption {
  return typeof value === 'string' && MONTH_DAY_OPTIONS.includes(value);
}

/**
 * Normalize a stored rule. Anything malformed returns null so the caller can
 * fall through to the legacy mapping rather than project a nonsense schedule.
 */
function normalizeRule(rule: RecurrenceRule | undefined): RecurrenceRule | null {
  if (!rule || typeof rule !== 'object') return null;
  switch (rule.type) {
    case 'once':
      return { type: 'once' };
    case 'weekly':
      return isWeekday(rule.weekday) ? { type: 'weekly', weekday: rule.weekday } : null;
    case 'biweekly':
      return isWeekday(rule.weekday)
        ? { type: 'biweekly', weekday: rule.weekday, biweekAnchor: rule.biweekAnchor }
        : null;
    case 'monthly':
      return isMonthDayOption(rule.monthDay)
        ? { type: 'monthly', monthDay: rule.monthDay }
        : { type: 'monthly' };
    case 'annual':
      return { type: 'annual' };
    case 'custom':
      return { type: 'custom', everyNDays: clampEveryNDays(rule.everyNDays) };
    default:
      return null;
  }
}

/**
 * The schedule an expense actually follows. PURE: it never writes back to
 * storage, so rows saved before step 04 keep working untouched.
 *
 * A stored `recurrenceRule` wins (with everyNDays clamped); an unknown or
 * malformed one falls through to the legacy `isRecurring` + `recurrence` pair;
 * a plain spend resolves to null.
 *
 * Legacy 'monthly' deliberately maps to `{ type: 'monthly' }` with NO monthDay,
 * which keeps the original anchor stepping and its Jan 31 -> Mar 3 overflow roll.
 */
export function resolveRule(expense: Expense): RecurrenceRule | null {
  const stored = normalizeRule(expense.recurrenceRule);
  if (stored) return stored;

  if (!expense.isRecurring || !expense.recurrence) return null;

  const start = expense.date instanceof Date ? expense.date : new Date(expense.date);
  switch (expense.recurrence) {
    case 'weekly':
      return { type: 'weekly', weekday: start.getDay() as Weekday };
    case 'biweekly':
      return { type: 'biweekly', weekday: start.getDay() as Weekday, biweekAnchor: localISODate(start) };
    case 'monthly':
      return { type: 'monthly' };
    case 'annual':
      return { type: 'annual' };
    default:
      return null;
  }
}

/** The day of the month a monthDay anchor lands on inside a given month. */
function resolveMonthDay(year: number, month: number, monthDay: MonthDayOption): number {
  const dim = daysInMonth(year, month);
  return monthDay === 'last' ? dim : Math.min(Number(monthDay), dim);
}

/**
 * Advance a date by one recurrence interval.
 *
 * The weekly / biweekly / annual / legacy-monthly expressions are the step-03
 * ones verbatim: same Date mutators, same order, same overflow behavior.
 */
function advance(date: Date, rule: RecurrenceRule): Date {
  const next = new Date(date);
  if (rule.type === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (rule.type === 'biweekly') {
    // Leak Scan recurrence detector cadence (docs/design-context/leak-scan-spec.md
    // Stage 9): fixed 14-day step, so a biweekly item can land 3 times in a
    // calendar month (the projection's 3-payment-month flag).
    next.setDate(next.getDate() + 14);
  } else if (rule.type === 'annual') {
    // Leak Scan annual-renewal detection (Stage 9, >=2-occurrence floor). Same
    // month/day next year; JS rolls Feb 29 -> Mar 1 on non-leap years, which is
    // acceptable for a projection.
    next.setFullYear(next.getFullYear() + 1);
  } else if (rule.type === 'custom') {
    next.setDate(next.getDate() + clampEveryNDays(rule.everyNDays));
  } else if (rule.type === 'monthly' && rule.monthDay) {
    // Authored monthly anchor: land on the 1st / 15th / 30th / last day of the
    // NEXT month, clamped to that month's length (so '30' is Feb 28 or Feb 29).
    // setDate(1) first, so changing the month can never overflow on the way.
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    next.setDate(resolveMonthDay(next.getFullYear(), next.getMonth(), rule.monthDay));
  } else {
    // Monthly: same day-of-month next month. JS rolls overflow (e.g. Jan 31 ->
    // Mar 3), which is acceptable for a projection.
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

/**
 * Where stepping starts. For legacy-mapped rules this is exactly
 * `atMidnight(expense.date)`, unchanged from step 03. The alignment branches
 * below are no-ops whenever the write invariant holds (expense.date is the
 * first scheduled occurrence) and only repair hand-edited or drifted data.
 */
function startFor(expense: Expense, rule: RecurrenceRule): Date {
  const fromDate = atMidnight(expense.date);

  if (rule.type === 'weekly') return alignToWeekday(fromDate, rule.weekday);

  if (rule.type === 'biweekly') {
    // The anchor fixes which of the two weeks the cadence falls on. Legacy rows
    // resolve their anchor from expense.date, so this is the same date.
    const anchor = parseLocalISODate(rule.biweekAnchor);
    return alignToWeekday(anchor ?? fromDate, rule.weekday);
  }

  if (rule.type === 'monthly' && rule.monthDay) {
    const target = resolveMonthDay(fromDate.getFullYear(), fromDate.getMonth(), rule.monthDay);
    if (fromDate.getDate() === target) return fromDate;
    if (fromDate.getDate() < target) {
      const sameMonth = new Date(fromDate);
      sameMonth.setDate(target);
      return sameMonth;
    }
    return advance(fromDate, rule);
  }

  return fromDate;
}

/** Move forward to the first date on or after `date` falling on `weekday`. */
function alignToWeekday(date: Date, weekday: Weekday): Date {
  const delta = (weekday - date.getDay() + 7) % 7;
  if (delta === 0) return date;
  const aligned = new Date(date);
  aligned.setDate(aligned.getDate() + delta);
  return aligned;
}

/**
 * The next occurrence of a recurring expense on or after `from`, starting from
 * its last logged date and stepping forward by its frequency.
 */
export function nextOccurrence(expense: Expense, from: Date): Date | null {
  const rule = resolveRule(expense);
  if (!rule) return null;
  const fromMid = atMidnight(from).getTime();

  if (rule.type === 'once') {
    // A one-time item is upcoming until its day passes; then it is history.
    const only = atMidnight(expense.date);
    return only.getTime() >= fromMid ? only : null;
  }

  let next = startFor(expense, rule);
  // Cap iterations so a far-past date with a bad clock can never loop forever.
  for (let i = 0; i < MAX_ADVANCE_STEPS && next.getTime() < fromMid; i++) {
    next = advance(next, rule);
  }
  return next.getTime() >= fromMid ? next : null;
}

/**
 * Every occurrence of an expense inside `withinDays` of `from`, ascending.
 * Empty when the expense has no schedule or nothing lands in the window.
 */
export function occurrencesWithin(expense: Expense, from: Date, withinDays: number): Date[] {
  const rule = resolveRule(expense);
  if (!rule) return [];

  const fromMid = atMidnight(from);
  const horizon = fromMid.getTime() + withinDays * MS_PER_DAY;
  const first = nextOccurrence(expense, fromMid);
  if (!first) return [];

  const out: Date[] = [];
  let cursor = first;
  for (let i = 0; i < MAX_OCCURRENCES && cursor.getTime() <= horizon; i++) {
    out.push(cursor);
    if (rule.type === 'once') break;
    cursor = advance(cursor, rule);
  }
  return out;
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
    items.push({
      expense,
      nextDate,
      daysUntil,
      occurrencesInWindow: occurrencesWithin(expense, fromMid, withinDays),
    });
  }

  items.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  return items;
}

/** Total cents of a set of upcoming items. */
export function upcomingTotal(items: UpcomingItem[]): number {
  return items.reduce((sum, i) => sum + i.expense.amount, 0);
}

/**
 * Total cents actually due inside the window: every occurrence counts, so a
 * weekly item due 9 times in 60 days contributes 9 payments, not 1.
 */
export function upcomingWindowTotal(items: UpcomingItem[]): number {
  return items.reduce(
    (sum, i) => sum + i.expense.amount * Math.max(1, i.occurrencesInWindow.length),
    0
  );
}

/** "in 6 days" / "Today" / "Tomorrow" label. */
export function daysUntilLabel(daysUntil: number): string {
  if (daysUntil <= 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `in ${daysUntil} days`;
}

const SCHEDULE_SEPARATOR = strings.money.scheduleSeparator;

/** Sunday of a known week, so a weekday number can be named in the device locale. */
const WEEKDAY_REFERENCE_SUNDAY = new Date(2024, 0, 7);

function weekdayPlural(weekday: Weekday): string {
  const d = new Date(WEEKDAY_REFERENCE_SUNDAY);
  d.setDate(d.getDate() + weekday);
  return strings.money.scheduleWeekdayPlural(formatDate(d, { weekday: 'long' }));
}

function monthDayLabel(monthDay: MonthDayOption): string {
  if (monthDay === 'last') return strings.addUpcoming.monthDayLast;
  if (monthDay === '1') return strings.addUpcoming.monthDayFirst;
  return monthDay === '15' ? strings.addUpcoming.monthDayFifteenth : strings.addUpcoming.monthDayThirtieth;
}

/** "Aug 1" in the device locale (ADA-008: never hardcode en-US). */
function shortDate(date: Date): string {
  return formatDate(date, { month: 'short', day: 'numeric' });
}

/**
 * The human schedule line under an upcoming row: "Monthly · 1st · next Aug 1",
 * "Weekly · Fridays · next Aug 7", "Every 2 weeks · next Aug 14",
 * "Every 9 days · next Aug 3", "One-time · Aug 12", "Yearly · next Jul 15".
 */
export function describeSchedule(rule: RecurrenceRule, nextDate: Date): string {
  const parts: string[] = [];

  switch (rule.type) {
    case 'once':
      return [strings.money.scheduleOneTime, shortDate(nextDate)].join(SCHEDULE_SEPARATOR);
    case 'weekly':
      parts.push(strings.money.scheduleWeekly, weekdayPlural(rule.weekday));
      break;
    case 'biweekly':
      parts.push(strings.money.scheduleBiweekly);
      break;
    case 'monthly':
      parts.push(strings.money.scheduleMonthly);
      if (rule.monthDay) parts.push(monthDayLabel(rule.monthDay));
      break;
    case 'annual':
      parts.push(strings.money.scheduleAnnual);
      break;
    case 'custom':
      parts.push(strings.money.scheduleEveryNDays(clampEveryNDays(rule.everyNDays)));
      break;
  }

  parts.push(strings.money.scheduleNext(shortDate(nextDate)));
  return parts.join(SCHEDULE_SEPARATOR);
}

/**
 * The calendar month where 3 or more of these occurrences land, if any. Drives
 * the amber "3 payments in Aug" pill: a biweekly item hits a 3-payment month
 * roughly twice a year and that is the surprise worth flagging. Earliest such
 * month wins when more than one qualifies.
 */
export function multiPaymentMonth(
  occurrences: Date[]
): { monthLabel: string; count: number } | null {
  const counts = new Map<string, { count: number; first: Date }>();

  for (const d of occurrences) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const seen = counts.get(key);
    if (seen) seen.count += 1;
    else counts.set(key, { count: 1, first: d });
  }

  let winner: { count: number; first: Date } | null = null;
  for (const entry of counts.values()) {
    if (entry.count < 3) continue;
    if (!winner || entry.first.getTime() < winner.first.getTime()) winner = entry;
  }
  if (!winner) return null;

  return { monthLabel: formatDate(winner.first, { month: 'short' }), count: winner.count };
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
