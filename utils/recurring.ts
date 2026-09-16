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
import type { Catalog } from '@/utils/i18n';
import type {
  DatePrecision,
  Expense,
  MonthDayOption,
  RecurrenceRule,
  Weekday,
} from '@/types/expense';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How precisely this bill's date is known. Anything malformed reads as 'day',
 * so a hand-edited or half-written row degrades to today's behaviour rather
 * than to a state no UI can explain.
 */
function precisionOf(expense: Expense): DatePrecision {
  return expense.datePrecision === 'month' ? 'month' : 'day';
}

/**
 * Whether the window admits this occurrence.
 *
 * A month-precision occurrence claims a MONTH, not a day, so the window admits
 * it as soon as it reaches that month at all. "Is a December bill before
 * December 10" is a question the stored data cannot answer, and the app must
 * not invent an answer to it. Under-showing would be the worse error here: the
 * pane's contract is that you are not surprised, and the group header already
 * scopes the claim to the month.
 */
function admits(date: Date, horizonTime: number, precision: DatePrecision): boolean {
  if (precision !== 'month') return date.getTime() <= horizonTime;
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime() <= horizonTime;
}

/** Custom cadence bounds, enforced on write (the sheet) and on read (here). */
const MIN_EVERY_N_DAYS = 2;
const MAX_EVERY_N_DAYS = 90;
/** Cadence used when a stored everyNDays is corrupt beyond repair (not a number). */
const FALLBACK_EVERY_N_DAYS = 30;

/** Iteration caps, so a far-past date with a bad clock can never loop forever. */
const MAX_ADVANCE_STEPS = 1000;
const MAX_OCCURRENCES = 400;
/**
 * Materializer catch-up cap (ADR 0024, U11): generous headroom for a parent
 * that hasn't run in a long time (e.g. a weekly bill untouched for years),
 * while still bounding a corrupt/looping rule. Higher than MAX_OCCURRENCES
 * (a display-window cap) because catch-up walks from the parent's own date,
 * which can be arbitrarily old, not from a bounded "next N days" window.
 */
const MAX_MATERIALIZE_OCCURRENCES = 2000;

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

  const precision = precisionOf(expense);
  const out: Date[] = [];
  let cursor = first;
  for (let i = 0; i < MAX_OCCURRENCES && admits(cursor, horizon, precision); i++) {
    out.push(cursor);
    if (rule.type === 'once') break;
    cursor = advance(cursor, rule);
  }
  return out;
}

/**
 * Every occurrence of a recurring expense strictly after its OWN stored date
 * (the historical first spend) and not after `today` (ADR 0024, U11): each
 * one becomes a real written expense record in Money > Spent. A 'once'
 * schedule or a plain non-recurring spend never materializes anything -- its
 * own row already IS the full history. `today` defaults to now so a caller
 * that doesn't care about a fixed clock can omit it, matching this file's
 * other "now unless told otherwise" functions.
 *
 * PURE: reuses the exact `startFor`/`advance` stepping every projection in
 * this file uses, so a materialized child's date is byte-identical to what
 * `nextOccurrence` would have projected for that same cycle. Calling this
 * twice with the same `expense`/`today` always returns the same dates --
 * idempotency against duplicate writes is the CALLER's job (see
 * utils/materializer.ts planMaterialization, which dedupes against already-
 * materialized children and tombstones before this list is ever turned into
 * a write).
 */
export function occurrencesToMaterialize(expense: Expense, today: Date = new Date()): Date[] {
  const rule = resolveRule(expense);
  if (!rule || rule.type === 'once') return [];
  // A bill whose day is unknown has no due day, so materializing it would write
  // a real spend into Money > Spent on a day the user never asserted. The
  // consequence is permanent and deliberate: such a bill rolls forward in
  // Upcoming and never graduates into the ledger, because the app does not know
  // that it happened. ADR 0042.
  if (precisionOf(expense) !== 'day') return [];

  const parentTime = atMidnight(expense.date).getTime();
  const todayTime = atMidnight(today).getTime();
  const out: Date[] = [];

  let cursor = startFor(expense, rule);
  for (let i = 0; i < MAX_MATERIALIZE_OCCURRENCES; i++) {
    if (cursor.getTime() > todayTime) break;
    if (cursor.getTime() > parentTime) out.push(cursor);
    cursor = advance(cursor, rule);
  }
  return out;
}

/**
 * Whether a Spent-ledger row should carry the small cycle indicator (ADR
 * 0024, U11): a materialized recurring child (source 'recurring'), or a
 * parent row whose own schedule is still active (a resolvable rule that
 * isn't 'once' -- the historical first spend of a recurring bill). A plain
 * user-added spend or a one-time upcoming item shows nothing.
 */
export function isRecurringLedgerRow(expense: Expense): boolean {
  if (expense.source === 'recurring') return true;
  const rule = resolveRule(expense);
  return !!rule && rule.type !== 'once';
}

/**
 * Upcoming recurring expenses within `withinDays`, sorted soonest-first.
 * One row per recurring expense (its next occurrence).
 *
 * `withinDays` is required, not defaulted: the valid windows and their
 * default live in ONE place (utils/upcomingWindow.ts), read by
 * app/(tabs)/money.tsx and utils/storage.ts. A default here would be a second
 * source of truth for "how far ahead is upcoming" that this function's own
 * callers never actually exercise.
 */
export function computeUpcoming(
  expenses: Expense[],
  withinDays: number,
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
 * What ONE item contributes to the window, as a payment count and as cents.
 *
 * These exist so the row and the card headline are computed from one
 * definition rather than two that happen to agree. Before them, the reducers
 * below owned the `Math.max(1, ...)` floor and the row rendered
 * `expense.amount`, so a card saying "$6,643.14, 12 payments from 4 bills" sat
 * above four rows summing to $2,214.38 with nothing on screen reconciling
 * them. The floor is here, once: an item with no occurrences recorded still
 * counts as the one payment `nextDate` promises.
 */
export function upcomingItemPayments(item: UpcomingItem): number {
  return Math.max(1, item.occurrencesInWindow.length);
}

/** Cents this item contributes to the window total. */
export function upcomingItemWindowTotal(item: UpcomingItem): number {
  return item.expense.amount * upcomingItemPayments(item);
}

/**
 * Total cents actually due inside the window: every occurrence counts, so a
 * weekly item due 9 times in 60 days contributes 9 payments, not 1.
 */
export function upcomingWindowTotal(items: UpcomingItem[]): number {
  return items.reduce((sum, i) => sum + upcomingItemWindowTotal(i), 0);
}

/**
 * Payments due inside the window: the exact same denominator
 * `upcomingWindowTotal` sums over (`Math.max(1, occurrencesInWindow.length)`
 * per item), so a summary showing both can never disagree about what they are
 * counting. A weekly bill due nine times contributes nine payments here, same
 * as it contributes nine occurrences to the total above.
 */
export function upcomingWindowPaymentsCount(items: UpcomingItem[]): number {
  return items.reduce((sum, i) => sum + upcomingItemPayments(i), 0);
}

/**
 * "in 6 days" / "Today" / "Tomorrow" label.
 *
 * RETIRED FROM RENDERING (2026-09-11): an Upcoming row states its timing once
 * now, as the absolute date inside `describeSchedule`, because the relative
 * and absolute forms were saying the same thing in two places on one row. Kept
 * rather than deleted: `UpcomingItem.daysUntil` is still computed and still
 * used by `advancePastToday`, so this is a live revert path, not dead code.
 * Its 'Today' branch was already unreachable on that surface, since a
 * due-today occurrence is materialized into Spent and advanced past here.
 */
export function daysUntilLabel(daysUntil: number, strings: Catalog): string {
  if (daysUntil <= 0) return strings.money.daysUntilToday;
  if (daysUntil === 1) return strings.money.daysUntilTomorrow;
  return strings.money.daysUntilInDays(daysUntil);
}

/** Sunday of a known week, so a weekday number can be named in the device locale. */
const WEEKDAY_REFERENCE_SUNDAY = new Date(2024, 0, 7);

function weekdayPlural(weekday: Weekday, strings: Catalog): string {
  const d = new Date(WEEKDAY_REFERENCE_SUNDAY);
  d.setDate(d.getDate() + weekday);
  return strings.money.scheduleWeekdayPlural(formatDate(d, { weekday: 'long' }));
}

function monthDayLabel(monthDay: MonthDayOption, strings: Catalog): string {
  if (monthDay === 'last') return strings.addUpcoming.monthDayLast;
  if (monthDay === '1') return strings.addUpcoming.monthDayFirst;
  return monthDay === '15' ? strings.addUpcoming.monthDayFifteenth : strings.addUpcoming.monthDayThirtieth;
}

/**
 * "Aug 1" in the device locale (ADA-008: never hardcode en-US). Exported so a
 * row whose rule failed to resolve can degrade to the same date form the
 * schedule line would have used, rather than inventing a second one.
 */
export function shortDate(date: Date): string {
  return formatDate(date, { month: 'short', day: 'numeric' });
}

/**
 * The schedule facts a row needs, as separate fields rather than one sentence.
 *
 * `describeSchedule` below is a join over this, and stays byte-identical to
 * what it always returned. The split exists because the Upcoming row stopped
 * DRAWING that sentence (2026-09-11): the cadence moved into a badge and the
 * word "next" became an elbow arrow, so the row needs the pieces while
 * VoiceOver still needs the sentence. Visual decomposition only, which is the
 * same contract `labelSpoken` and `badgeSpoken` established on
 * SegmentedControl (ADR 0040).
 *
 * `date` is bare ("Sep 29") for the row; `dateSpoken` keeps the "next" that
 * makes it a sentence. For weekly and biweekly rules `date` also names the
 * weekday ("Fri, Sep 12"), because the qualifier those rules carry
 * ("Fridays") lives in the sentence and would otherwise be lost when the
 * cadence moves into a badge. A badge holding "Weekly · Fridays" would be a
 * sentence in a pill, so the weekday goes on the date instead.
 */
export type ScheduleParts = {
  cadence: string;
  qualifier: string | null;
  date: string;
  dateSpoken: string;
};

/** The cadence word alone, shared by both precisions. */
function cadenceWord(rule: RecurrenceRule, strings: Catalog): string {
  switch (rule.type) {
    case 'once':
      return strings.money.scheduleOneTime;
    case 'weekly':
      return strings.money.scheduleWeekly;
    case 'biweekly':
      return strings.money.scheduleBiweekly;
    case 'monthly':
      return strings.money.scheduleMonthly;
    case 'annual':
      return strings.money.scheduleAnnual;
    case 'custom':
      return strings.money.scheduleEveryNDays(clampEveryNDays(rule.everyNDays));
  }
}

export function scheduleParts(
  rule: RecurrenceRule,
  nextDate: Date,
  strings: Catalog,
  precision: DatePrecision = 'day'
): ScheduleParts {
  // The month is the claim and the day is not, so the qualifier goes too: it
  // would otherwise speak the storage anchor ("Monthly, Last day") for a bill
  // whose day the user explicitly said they do not know. That branch is the
  // only thing standing between the anchor and a spoken claim.
  if (precision === 'month') {
    const month = formatDate(nextDate, { month: 'long' });
    return {
      cadence: cadenceWord(rule, strings),
      qualifier: null,
      date: month,
      dateSpoken: strings.money.scheduleInMonth(month),
    };
  }
  const bare = shortDate(nextDate);
  const withWeekday = formatDate(nextDate, { weekday: 'short', month: 'short', day: 'numeric' });

  switch (rule.type) {
    case 'once':
      // The only rule whose date is not a "next": a one-time bill happens once,
      // so the sentence reads "One-time · Aug 12", never "next Aug 12".
      return { cadence: strings.money.scheduleOneTime, qualifier: null, date: bare, dateSpoken: bare };
    case 'weekly':
      return {
        cadence: strings.money.scheduleWeekly,
        qualifier: weekdayPlural(rule.weekday, strings),
        date: withWeekday,
        dateSpoken: strings.money.scheduleNext(bare),
      };
    case 'biweekly':
      return {
        cadence: strings.money.scheduleBiweekly,
        qualifier: null,
        date: withWeekday,
        dateSpoken: strings.money.scheduleNext(bare),
      };
    case 'monthly':
      return {
        cadence: strings.money.scheduleMonthly,
        qualifier: rule.monthDay ? monthDayLabel(rule.monthDay, strings) : null,
        date: bare,
        dateSpoken: strings.money.scheduleNext(bare),
      };
    case 'annual':
      return {
        cadence: strings.money.scheduleAnnual,
        qualifier: null,
        date: bare,
        dateSpoken: strings.money.scheduleNext(bare),
      };
    case 'custom':
      return {
        cadence: strings.money.scheduleEveryNDays(clampEveryNDays(rule.everyNDays)),
        qualifier: null,
        date: bare,
        dateSpoken: strings.money.scheduleNext(bare),
      };
  }
}

/**
 * The human schedule line under an upcoming row: "Monthly · 1st · next Aug 1",
 * "Weekly · Fridays · next Aug 7", "Every 2 weeks · next Aug 14",
 * "Every 9 days · next Aug 3", "One-time · Aug 12", "Yearly · next Jul 15".
 *
 * Still the whole sentence, and still what the row SPEAKS. A round-trip test
 * pins it against `scheduleParts` so the two can never drift.
 */
export function describeSchedule(
  rule: RecurrenceRule,
  nextDate: Date,
  strings: Catalog,
  precision: DatePrecision = 'day'
): string {
  const { cadence, qualifier, dateSpoken } = scheduleParts(rule, nextDate, strings, precision);
  return [cadence, qualifier, dateSpoken].filter(Boolean).join(strings.money.scheduleSeparator);
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

/**
 * Upcoming advances past a due-today occurrence (ADR 0024, U11): by the time
 * the Money screen renders, the materializer (contexts/ExpensesContext.tsx) has
 * already turned any occurrence due today into a real Spent row, so showing
 * it again here would resurrect the pre-ADR-0024 "same row in both tabs" bug.
 *
 * `computeUpcoming` itself stays untouched (it's pure and its own tests pin
 * "on/after from" -- this is a display-only adjustment, not a projection
 * change): an item whose earliest occurrence is today gets re-pointed at its
 * next occurrence already present in `occurrencesInWindow` (nothing here
 * re-projects anything), or dropped if today's was its only occurrence in the
 * window. `nextDate`/`daysUntil` stay relative to real "today" throughout, so
 * the "Tomorrow" / "in N days" pill keeps meaning what it says. Re-pointing
 * also trims `occurrencesInWindow` down to future dates only, which is the
 * same list #95's payments count sums over -- so "how many payments" now
 * counts only future ones for free, without touching upcomingWindowTotal/
 * upcomingWindowPaymentsCount themselves.
 */
export function advancePastToday(items: UpcomingItem[], todayMid: number): UpcomingItem[] {
  const out: UpcomingItem[] = [];
  for (const item of items) {
    // Never advance a bill whose day is unknown. This function exists because
    // the materializer already wrote today's occurrence into Spent, and for an
    // unknown-day bill the materializer deliberately wrote nothing, so there is
    // nothing to advance past. Without this the bill vanishes from its own
    // month on the 30th. ADR 0042.
    if (precisionOf(item.expense) !== 'day') {
      out.push(item);
      continue;
    }
    if (item.nextDate.getTime() > todayMid) {
      out.push(item);
      continue;
    }
    const future = item.occurrencesInWindow.filter((d) => d.getTime() > todayMid);
    if (future.length === 0) continue; // today's due date was the only one in the window
    const nextDate = future[0];
    const daysUntil = Math.round((nextDate.getTime() - todayMid) / MS_PER_DAY);
    out.push({ ...item, nextDate, daysUntil, occurrencesInWindow: future });
  }
  return out;
}

/**
 * Whether this projection has anything to show once a due-today occurrence has
 * been advanced past. The window picker's default (see
 * utils/upcomingWindow.ts) asks exactly this question, and it must ask it
 * through `advancePastToday` rather than `computeUpcoming` alone: a bill due
 * only today has already been materialized into Spent and is never shown on
 * Upcoming, so counting it would open on a window that then renders empty.
 */
export function hasUpcomingInWindow(items: UpcomingItem[], from: Date = new Date()): boolean {
  return advancePastToday(items, atMidnight(from).getTime()).length > 0;
}
