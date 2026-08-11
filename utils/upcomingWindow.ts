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

export type UpcomingWindowDays = 14 | 30 | 90;

/** Ascending, so any UI zipping this with labels renders shortest-first. */
export const UPCOMING_WINDOW_PRESETS: readonly UpcomingWindowDays[] = [14, 30, 90];

/** 2 weeks: short enough that "what's coming" reads as imminent, not a quarter. */
export const DEFAULT_UPCOMING_WINDOW_DAYS: UpcomingWindowDays = 14;

export function isUpcomingWindowDays(value: unknown): value is UpcomingWindowDays {
  return (
    typeof value === 'number' &&
    (UPCOMING_WINDOW_PRESETS as readonly number[]).includes(value)
  );
}
