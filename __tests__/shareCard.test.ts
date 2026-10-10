import { computeShareCardStats } from '@/utils/shareCard';
import type { HabitChangeGoal } from '@/types/habit';

function goal(overrides: Partial<HabitChangeGoal> = {}): HabitChangeGoal {
  return {
    id: 'g1',
    habitId: 'h1',
    targetType: 'eliminate',
    startDate: new Date('2026-08-01'),
    currentStreak: 0,
    longestStreak: 0,
    savingsGoal: 0,
    actualSavings: 0,
    milestones: [],
    logs: [],
    skipValue: 500,
    kept: 0,
    totalSkips: 0,
    highestMilestoneReached: 0,
    trackingStart: new Date('2026-08-01'),
    dayLogs: [],
    firstRun: false,
    backfillUsed: false,
    ...overrides,
  };
}

const today = new Date('2026-09-05T12:00:00');

describe('computeShareCardStats', () => {
  it('returns null with no goals', () => {
    expect(computeShareCardStats([], today)).toBeNull();
  });

  it('returns null when total kept is zero', () => {
    const goals = [goal({ kept: 0 })];
    expect(computeShareCardStats(goals, today)).toBeNull();
  });

  it('sums kept across every goal', () => {
    const goals = [
      goal({ kept: 500, trackingStart: new Date('2026-09-01') }),
      goal({ kept: 300, trackingStart: new Date('2026-09-01') }),
    ];
    const result = computeShareCardStats(goals, today);
    expect(result?.keptCents).toBe(800);
  });

  it('counts days from the earliest trackingStart across all goals, inclusive', () => {
    const goals = [
      goal({ kept: 100, trackingStart: new Date('2026-09-01') }),
      // A later habit's tracking start does not shorten the span; the card
      // is a lifetime counter from the very first habit.
      goal({ kept: 200, trackingStart: new Date('2026-09-03') }),
    ];
    const result = computeShareCardStats(goals, today);
    // Sep 1 through Sep 5 inclusive = 5 days.
    expect(result?.days).toBe(5);
  });

  it('never returns fewer than 1 day, even for a goal started today', () => {
    const goals = [goal({ kept: 100, trackingStart: today })];
    const result = computeShareCardStats(goals, today);
    expect(result?.days).toBe(1);
  });

  it('ignores time-of-day when computing the span', () => {
    const goals = [
      goal({ kept: 100, trackingStart: new Date('2026-09-01T23:59:00') }),
    ];
    const result = computeShareCardStats(goals, new Date('2026-09-02T00:01:00'));
    expect(result?.days).toBe(2);
  });

  describe('DST spring-forward (review feedback, 2026-09-05)', () => {
    const TZ_ORIGINAL = process.env.TZ;
    beforeEach(() => {
      // America/New_York clocks jump forward 2am -> 3am on 2026-03-08, so a
      // midnight-to-midnight span crossing that day is 23 real hours, not 24.
      // Math.floor(spanMs / MS_PER_DAY) used to read that as 0 whole days and
      // undercount by one; Math.round reads it as 1, matching the calendar.
      process.env.TZ = 'America/New_York';
    });
    afterEach(() => {
      if (TZ_ORIGINAL === undefined) delete process.env.TZ;
      else process.env.TZ = TZ_ORIGINAL;
    });

    it('does not undercount the day span across the transition', () => {
      const goals = [goal({ kept: 100, trackingStart: new Date('2026-03-08T00:00:00') })];
      const result = computeShareCardStats(goals, new Date('2026-03-09T00:00:00'));
      // March 8 through March 9 inclusive = 2 days, same as any other
      // adjacent-day span; only the transition made the raw ms span short.
      expect(result?.days).toBe(2);
    });
  });
});
