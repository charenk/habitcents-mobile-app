/**
 * Pure date/state math for habit logging v2
 * (docs/design-package-phase2/01-habit-logging-spec.md, decision 0004).
 *
 * Kept deliberately free of React/storage/analytics so the day-state, week
 * strip, and chapter arithmetic are unit-testable and reused identically by
 * the Habits tab check-in card, the habit detail screen, and the history
 * calendar (spec principle 6: "one model everywhere").
 *
 * Vocabulary is load-bearing: skip is the win, slip is neutral and never
 * subtracts from Kept, kept is the running total. Never rename in comments,
 * copy, or code to streak/success/completed language.
 */

import type { ChapterName, DayState, HabitLogEntry, MilestoneThreshold } from '@/types/habit';
import { MILESTONE_THRESHOLDS } from '@/types/habit';
import type { Entitlement } from '@/utils/purchases';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Free tier shows 1 active (breaking-now) habit at a time (spec 01 §4.2,
 * ADR 0007). Premium raises the ceiling to 5 (BET-004, Phase 3, prices/limits
 * pending Charen's sign-off). The gate is entitlement-driven now, not a hard
 * constant: use habitLimitForEntitlement / isHabitLimitReached at call sites so
 * a premium user gets the higher limit once real entitlements land.
 */
export const FREE_TIER_HABIT_LIMIT = 1;
export const PREMIUM_TIER_HABIT_LIMIT = 5;

/** Active-habit ceiling for an entitlement level. */
export function habitLimitForEntitlement(entitlement: Entitlement): number {
  return entitlement === 'premium' ? PREMIUM_TIER_HABIT_LIMIT : FREE_TIER_HABIT_LIMIT;
}

/**
 * True when starting one more active habit would exceed the entitlement's
 * ceiling (free = 1, premium = 5). `activeCount` is the number of habits already
 * tracking/changing.
 */
export function isHabitLimitReached(activeCount: number, entitlement: Entitlement): boolean {
  return activeCount >= habitLimitForEntitlement(entitlement);
}

export function atMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return atMidnight(a).getTime() === atMidnight(b).getTime();
}

export function addDays(d: Date, n: number): Date {
  const copy = atMidnight(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Monday of the week containing `d` (week strip runs Mon to Sun, section 4.2). */
export function startOfWeek(d: Date): Date {
  const mid = atMidnight(d);
  const dow = mid.getDay(); // 0 = Sun .. 6 = Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return addDays(mid, diffToMonday);
}

/**
 * Resolve the day-state for one calendar day from a habit's real log history.
 * Pre-tracking and future days are "no-log" here; callers that need the
 * distinct "out of range" visual (section 2) check trackingStart/today
 * themselves, since that is a rendering concern, not a logging fact.
 */
export function dayStateFor(dayLogs: HabitLogEntry[], day: Date): DayState {
  const entry = dayLogs.find((e) => isSameDay(e.date, day));
  if (!entry) return 'no-log';
  return entry.state === 'skipped' ? 'skipped' : 'slipped';
}

export type WeekDayCell = {
  date: Date;
  state: DayState;
  isToday: boolean;
  isFuture: boolean;
  isOutOfRange: boolean;
};

/**
 * The seven Mon-Sun cells for the week containing `today`, each resolved
 * against real log history and the habit's tracking start (section 4.2).
 */
export function weekStrip(dayLogs: HabitLogEntry[], today: Date, trackingStart: Date): WeekDayCell[] {
  const monday = startOfWeek(today);
  const cells: WeekDayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    const isFuture = date.getTime() > atMidnight(today).getTime();
    const isOutOfRange = date.getTime() < atMidnight(trackingStart).getTime();
    const state = isFuture || isOutOfRange ? 'no-log' : dayStateFor(dayLogs, date);
    cells.push({
      date,
      state,
      isToday: isSameDay(date, today),
      isFuture,
      isOutOfRange,
    });
  }
  return cells;
}

export type WeekStats = {
  /** Days skipped so far this week. */
  skips: number;
  /** Days answered (skipped + slipped) so far this week. */
  answered: number;
  /** Kept accrued this week (skips * skipValue). */
  weekKept: number;
};

/** Summary line stats for the week strip: "{n} of {m} days skipped this week". */
export function weekStats(dayLogs: HabitLogEntry[], today: Date, trackingStart: Date, skipValue: number): WeekStats {
  const cells = weekStrip(dayLogs, today, trackingStart);
  let skips = 0;
  let answered = 0;
  for (const cell of cells) {
    if (cell.state === 'skipped') {
      skips += 1;
      answered += 1;
    } else if (cell.state === 'slipped') {
      answered += 1;
    }
  }
  return { skips, answered, weekKept: skips * skipValue };
}

/** Total skips ever recorded (not consecutive; section 3.4). */
export function countTotalSkips(dayLogs: HabitLogEntry[]): number {
  return dayLogs.filter((e) => e.state === 'skipped').length;
}

/** The chapter name for a given total-skip count (section 4.6). */
export function chapterForTotal(totalSkips: number): ChapterName {
  if (totalSkips >= 66) return 'Rewired';
  if (totalSkips >= 50) return 'Rewiring';
  if (totalSkips >= 30) return 'Cruising';
  if (totalSkips >= 10) return 'Rhythm';
  return 'Deciding';
}

/** The identity-line copy for a given total-skip count (section 4.6). */
export function identityLineForTotal(totalSkips: number): string {
  if (totalSkips >= 66) return "Rewired. This habit doesn't run you anymore.";
  if (totalSkips >= 50) return "You're almost rewired.";
  if (totalSkips >= 30) return "You're cruising. The habit is losing its grip.";
  if (totalSkips >= 10) return "You're finding your rhythm.";
  return "You're deciding where your money goes.";
}

/**
 * The chapter label to *display*, honoring "never backward" (section 4.6, 9):
 * a same-day correction can lower totalSkips by one, but the shown chapter
 * reflects the highest total ever reached, not the live total.
 */
export function displayChapter(totalSkips: number, highestMilestoneReached: number): ChapterName {
  return chapterForTotal(Math.max(totalSkips, highestMilestoneReached));
}

/**
 * The single milestone threshold newly crossed by going from `before` to
 * `after` total skips, or null if none. Used to fire `milestone_reached`
 * exactly once per threshold per habit (acceptance test 10).
 */
export function milestoneCrossed(before: number, after: number): MilestoneThreshold | null {
  for (const t of MILESTONE_THRESHOLDS) {
    if (before < t && after >= t) return t;
  }
  return null;
}

/** Fraction (0-1) of the long arc's 66-skip ring that should be filled. */
export function arcProgress(totalSkips: number): number {
  return Math.min(1, totalSkips / 66);
}

/**
 * Yesterday is eligible for the one-time backfill affordance (section 3.6, 5)
 * when: it has no log yet, backfill has never been used for this habit, and
 * yesterday is on or after the tracking start (can't backfill before tracking
 * began).
 */
export function canBackfillYesterday(
  dayLogs: HabitLogEntry[],
  today: Date,
  trackingStart: Date,
  backfillUsed: boolean
): boolean {
  if (backfillUsed) return false;
  const yesterday = addDays(atMidnight(today), -1);
  if (yesterday.getTime() < atMidnight(trackingStart).getTime()) return false;
  return dayStateFor(dayLogs, yesterday) === 'no-log';
}

/** Credit for a partial slip (section 4.7): never negative, capped at skipValue. */
export function partialSlipCredit(skipValue: number, amountSpent: number): number {
  return Math.max(0, skipValue - amountSpent);
}

/**
 * True when a slip follows 3+ consecutive prior skips, prioritizing the
 * recovery Coach Moment (section 3.5). Looks at the days immediately before
 * `day` (not including it) in the real log history.
 */
export function slipFollowsStreak(dayLogs: HabitLogEntry[], day: Date, minStreak = 3): boolean {
  let consecutive = 0;
  let cursor = addDays(atMidnight(day), -1);
  // Cap the walk-back so a very old, fully-logged habit can't loop unbounded.
  for (let i = 0; i < 400; i++) {
    const state = dayStateFor(dayLogs, cursor);
    if (state !== 'skipped') break;
    consecutive += 1;
    cursor = addDays(cursor, -1);
  }
  return consecutive >= minStreak;
}
