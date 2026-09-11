/**
 * The Upcoming window presets (U8, Money > Upcoming redesign).
 *
 * Before this, the projection window lived in two places at once:
 * app/(tabs)/money.tsx hardcoded 60 days for its own call, and
 * utils/recurring.ts computeUpcoming had its own default of 60, which nothing
 * actually exercised (every caller already passed an explicit value). This
 * module is the one place that defines what a valid window is: the three
 * presets a user can pick, and the default for someone who has never chosen
 * one. utils/storage.ts (persistence), UpcomingList (the picker UI), and
 * app/(tabs)/money.tsx (the screen that owns the selection) all read from
 * here, so they can never disagree about what "the window" means.
 */

import type { Expense } from '@/types/expense';
import { computeUpcoming, hasUpcomingInWindow } from '@/utils/recurring';

/** Same constant the projection engine measures its horizon with. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type UpcomingWindowDays = 14 | 30 | 90;

/** Ascending, so any UI zipping this with labels renders shortest-first. */
export const UPCOMING_WINDOW_PRESETS: readonly UpcomingWindowDays[] = [14, 30, 90];

/**
 * The window to fall back to when NONE of the presets has anything in it.
 *
 * This used to be 14, on the reasoning that "what's coming" should read as
 * imminent rather than as a quarter. Good instinct, wrong arithmetic: monthly
 * bills land once a month, so a 14-day opening window produced the
 * window-empty state on first open roughly half the time, and the most common
 * bill there is was the one it hid. The imminence instinct now lives in
 * `pickDefaultUpcomingWindow` below, which opens on the NARROWEST window that
 * actually has something in it; this constant only decides what to show
 * someone whose bills are all further out than 90 days, or who has none.
 */
export const DEFAULT_UPCOMING_WINDOW_DAYS: UpcomingWindowDays = 30;

/**
 * The window to open on for a user who has never picked one: the narrowest
 * preset with at least one bill in it, or the default when none of them has.
 * A stored choice always wins over this, and any tap freezes it; see
 * app/(tabs)/money.tsx.
 *
 * It projects through the same pipeline the pane renders, `advancePastToday`
 * included, so "this window has data" and "this window shows rows" cannot
 * disagree. That is not a detail: a bill due only TODAY has already been
 * materialized into Spent and is never shown here, so a naive
 * `computeUpcoming(expenses, 14).length > 0` would pick 14 and then render
 * window-empty, reproducing the exact defect this function exists to prevent.
 *
 * Three bounded projections over a list the screen already holds in memory,
 * and only while no explicit choice exists.
 */
export function pickDefaultUpcomingWindow(
  expenses: Expense[],
  from: Date = new Date()
): UpcomingWindowDays {
  for (const days of UPCOMING_WINDOW_PRESETS) {
    if (hasUpcomingInWindow(computeUpcoming(expenses, days, from), from)) return days;
  }
  return DEFAULT_UPCOMING_WINDOW_DAYS;
}

/**
 * The last day the window admits, as a Date.
 *
 * It must use the same millisecond arithmetic `computeUpcoming` does, never
 * `setDate(d.getDate() + days)`: across a DST boundary those differ by an hour,
 * and a label built the second way can name a date the engine excludes. Pinned
 * against the engine in __tests__/upcomingGroups.test.ts, DST included.
 */
export function upcomingWindowEnd(days: UpcomingWindowDays, from: Date = new Date()): Date {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  return new Date(start.getTime() + days * MS_PER_DAY);
}

export function isUpcomingWindowDays(value: unknown): value is UpcomingWindowDays {
  return (
    typeof value === 'number' &&
    (UPCOMING_WINDOW_PRESETS as readonly number[]).includes(value)
  );
}
