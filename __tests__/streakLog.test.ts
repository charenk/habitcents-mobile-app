import {
  applyStreakLog,
  upsertStreakLog,
  hasCompletedLogFor,
  type StreakLogInput,
} from '@/utils/streakLog';
import type { StreakDay } from '@/types/habit';

function goal(overrides: Partial<StreakLogInput> = {}): StreakLogInput {
  return {
    currentStreak: 0,
    longestStreak: 0,
    actualSavings: 0,
    skipValue: 600, // $6.00
    ...overrides,
  };
}

const AVG = 600;
const today = new Date('2026-07-02T09:00:00');
const yesterday = new Date('2026-07-01T20:00:00');
const twoDaysAgo = new Date('2026-06-30T20:00:00');

describe('applyStreakLog savings accrual', () => {
  it('banks the skip value on the first completed day', () => {
    const r = applyStreakLog(goal(), AVG, true, today);
    expect(r.actualSavings).toBe(600);
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(1);
    expect(r.isNewDay).toBe(true);
  });

  it('accrues again on a consecutive new day and extends the streak', () => {
    const r = applyStreakLog(
      goal({ currentStreak: 1, longestStreak: 1, actualSavings: 600, lastLogDate: yesterday }),
      AVG,
      true,
      today
    );
    expect(r.actualSavings).toBe(1200);
    expect(r.currentStreak).toBe(2);
  });

  it('does NOT double-count when logged twice on the same day', () => {
    const r = applyStreakLog(
      goal({ currentStreak: 1, actualSavings: 600, lastLogDate: new Date('2026-07-02T07:00:00') }),
      AVG,
      true,
      today
    );
    expect(r.actualSavings).toBe(600); // unchanged
    expect(r.currentStreak).toBe(1);
    expect(r.isNewDay).toBe(false);
  });

  it('restarts the streak after a gap but keeps banked savings', () => {
    const r = applyStreakLog(
      goal({ currentStreak: 5, longestStreak: 5, actualSavings: 3000, lastLogDate: twoDaysAgo }),
      AVG,
      true,
      today
    );
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(5); // preserved
    expect(r.actualSavings).toBe(3600); // still banked one more skip
  });

  it('resets the streak to 0 on a missed day without losing savings', () => {
    const r = applyStreakLog(
      goal({ currentStreak: 4, longestStreak: 4, actualSavings: 2400, lastLogDate: yesterday }),
      AVG,
      false,
      today
    );
    expect(r.currentStreak).toBe(0);
    expect(r.actualSavings).toBe(2400);
  });

  it('with an explicit partial-spend amount, banks only what was avoided', () => {
    // Spent $2 against a $6 average habit -> saved $4.
    const r = applyStreakLog(goal(), AVG, true, today, 200);
    expect(r.actualSavings).toBe(400);
  });

  it('never banks negative savings when the day overspends the average', () => {
    const r = applyStreakLog(goal(), AVG, true, today, 1000); // spent $10 on a $6 habit
    expect(r.actualSavings).toBe(0);
  });
});

describe('upsertStreakLog history', () => {
  it('appends a real entry for a new day, newest first', () => {
    const logs = upsertStreakLog([], today, true, 600);
    expect(logs).toHaveLength(1);
    expect(logs[0].completed).toBe(true);
    expect(logs[0].amount).toBe(600);
  });

  it('does not duplicate an entry when the same day is logged twice', () => {
    const first = upsertStreakLog([], today, true, 600);
    const second = upsertStreakLog(first, new Date('2026-07-02T18:00:00'), true, 0);
    expect(second).toHaveLength(1); // still one entry for that day
  });

  it('replaces the same day when a completed log is later corrected to missed', () => {
    const done = upsertStreakLog([], today, true, 600);
    const missed = upsertStreakLog(done, today, false, 0);
    expect(missed).toHaveLength(1);
    expect(missed[0].completed).toBe(false);
  });

  it('keeps entries sorted newest-first across days', () => {
    let logs: StreakDay[] = [];
    logs = upsertStreakLog(logs, twoDaysAgo, true, 600);
    logs = upsertStreakLog(logs, today, true, 600);
    logs = upsertStreakLog(logs, yesterday, true, 600);
    const times = logs.map((d) => d.date.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(logs).toHaveLength(3);
  });

  it('hasCompletedLogFor reflects only actually-logged completed days (fixes fake "today")', () => {
    // A goal with a streak but whose last real log was yesterday must NOT report
    // today as logged (the old fabrication bug hid the Log Today button).
    const logs = upsertStreakLog([], yesterday, true, 600);
    expect(hasCompletedLogFor(logs, today)).toBe(false);
    expect(hasCompletedLogFor(logs, yesterday)).toBe(true);
  });

  it('hasCompletedLogFor ignores missed days', () => {
    const logs = upsertStreakLog([], today, false, 0);
    expect(hasCompletedLogFor(logs, today)).toBe(false);
  });
});
