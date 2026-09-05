/**
 * Pure stats for the shareable counter card (roadmap P4-3): "I kept $X in Y
 * days". Extracted so the money-critical math is testable without React,
 * matching utils/streakLog.ts's pattern.
 *
 * `days` is the real elapsed span since the earliest habit started tracking,
 * through today, inclusive. It is deliberately NOT a streak (which resets on
 * a missed day) and NOT totalSkips (a count of skip days, not a calendar
 * span): the card is a lifetime counter, so the honest "Y days" is how long
 * the count-up has been running, per "never invent statistics".
 */

import type { HabitChangeGoal } from '@/types/habit';

export type ShareCardStats = {
  keptCents: number;
  days: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function atMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Returns null when there is nothing honest to share yet: no habit has ever
 * been started, or the running total is zero. Callers should treat null as
 * "no card to show" rather than rendering a zero-dollar card.
 */
export function computeShareCardStats(
  goals: HabitChangeGoal[],
  today: Date
): ShareCardStats | null {
  if (goals.length === 0) return null;

  const keptCents = goals.reduce((sum, g) => sum + (g.kept || 0), 0);
  if (keptCents <= 0) return null;

  const earliestStart = goals.reduce(
    (min, g) => (g.trackingStart < min ? g.trackingStart : min),
    goals[0].trackingStart
  );

  // Math.round rather than Math.floor (review feedback, 2026-09-05): a
  // midnight-to-midnight span that crosses a spring-forward DST transition is
  // n*24h minus 1h, so Math.floor(spanMs / MS_PER_DAY) undercounts by one day
  // right after the clocks jump forward. Rounding absorbs that one-hour drift
  // (and the symmetric one-hour gain on fall-back) without affecting any
  // non-DST span, since those are always exact multiples of a day.
  const spanMs = atMidnight(today).getTime() - atMidnight(earliestStart).getTime();
  const days = Math.max(1, Math.round(spanMs / MS_PER_DAY) + 1);

  return { keptCents, days };
}
