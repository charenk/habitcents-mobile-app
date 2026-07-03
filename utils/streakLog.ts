/**
 * Pure streak + savings math for logging a habit-change day. Extracted from
 * HabitsContext so the money-critical path is testable without React/storage.
 */

import type { StreakDay } from '@/types/habit';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type StreakLogInput = {
  currentStreak: number;
  longestStreak: number;
  actualSavings: number;
  // Cents banked per successful skipped day when no explicit amount is given.
  skipValue: number;
  lastLogDate?: Date;
};

export type StreakLogResult = {
  currentStreak: number;
  longestStreak: number;
  actualSavings: number;
  // True when this log advanced to a new calendar day (savings banked once).
  isNewDay: boolean;
};

function atMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Compute the updated streak and savings for a single log event.
 *
 * @param goal        current streak/savings state
 * @param habitAverageAmount  detected per-occurrence spend (cents), used as the
 *                    baseline when an explicit spent `amount` is provided
 * @param completed   true if the user stuck to the habit change (a skip)
 * @param today       the log date
 * @param amount      optional actual cents spent; when omitted a full skip banks
 *                    the goal's skipValue
 */
export function applyStreakLog(
  goal: StreakLogInput,
  habitAverageAmount: number | undefined,
  completed: boolean,
  today: Date,
  amount?: number
): StreakLogResult {
  if (!completed) {
    // A missed day resets the streak; savings already banked are kept.
    return {
      currentStreak: 0,
      longestStreak: goal.longestStreak,
      actualSavings: goal.actualSavings,
      isNewDay: true,
    };
  }

  const todayMid = atMidnight(today);
  let currentStreak = goal.currentStreak;
  let isNewDay = true;

  if (goal.lastLogDate) {
    const lastMid = atMidnight(goal.lastLogDate);
    const dayDiff = Math.floor((todayMid.getTime() - lastMid.getTime()) / MS_PER_DAY);
    if (dayDiff === 0) {
      isNewDay = false; // same day: no streak or savings change
    } else if (dayDiff === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1; // gap > 1 day: streak restarts
    }
  } else {
    currentStreak = 1;
  }

  const longestStreak = Math.max(goal.longestStreak, currentStreak);

  let actualSavings = goal.actualSavings;
  if (isNewDay) {
    const fallbackSkip = goal.skipValue ?? habitAverageAmount ?? 0;
    const saved = amount !== undefined
      ? Math.max(0, (habitAverageAmount ?? amount) - amount)
      : fallbackSkip;
    actualSavings += saved;
  }

  return { currentStreak, longestStreak, actualSavings, isNewDay };
}

/**
 * Upsert today's entry into a goal's real log history. One entry per calendar
 * day: re-logging the same day replaces that day's entry rather than appending
 * a duplicate. Entries are kept sorted newest-first. This is the source of truth
 * for the streak calendar and the "already logged today?" check (fixing the old
 * bug where those were synthesized from currentStreak and always faked "today").
 */
export function upsertStreakLog(
  logs: StreakDay[],
  today: Date,
  completed: boolean,
  amountSaved: number
): StreakDay[] {
  const todayMs = atMidnight(today).getTime();
  const withoutToday = logs.filter((d) => atMidnight(d.date).getTime() !== todayMs);
  const entry: StreakDay = { date: atMidnight(today), completed, amount: amountSaved };
  return [entry, ...withoutToday].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** True if the log history already contains a completed entry for `day`. */
export function hasCompletedLogFor(logs: StreakDay[], day: Date): boolean {
  const dayMs = atMidnight(day).getTime();
  return logs.some((d) => d.completed && atMidnight(d.date).getTime() === dayMs);
}
