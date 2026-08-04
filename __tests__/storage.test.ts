jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getExpenses, getHabitGoals } from '@/utils/storage';
import { dayStateFor } from '@/utils/habitLogging';

const EXPENSES_KEY = '@habitcents_expenses';
const GOALS_KEY = '@habitcents_habit_goals';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('safe storage loading', () => {
  it('returns [] when nothing is stored', async () => {
    expect(await getExpenses()).toEqual([]);
  });

  it('loads valid expenses and revives dates', async () => {
    await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify([
      { id: 'a', title: 'Coffee', amount: 500, category: 'Food', date: '2026-06-01T09:00:00.000Z' },
    ]));
    const out = await getExpenses();
    expect(out).toHaveLength(1);
    expect(out[0].date instanceof Date).toBe(true);
    expect(isNaN(out[0].date.getTime())).toBe(false);
  });

  it('does NOT crash or wipe on non-array JSON; backs it up instead', async () => {
    await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify({ oops: 'not an array' }));
    const out = await getExpenses();
    expect(out).toEqual([]);
    // Raw blob preserved so a later save cannot silently destroy it.
    const backup = await AsyncStorage.getItem(EXPENSES_KEY + '_corrupt_backup');
    expect(backup).toContain('oops');
  });

  it('backs up malformed (unparseable) JSON', async () => {
    await AsyncStorage.setItem(EXPENSES_KEY, '{ this is not json ');
    expect(await getExpenses()).toEqual([]);
    expect(await AsyncStorage.getItem(EXPENSES_KEY + '_corrupt_backup')).toContain('not json');
  });

  it('drops individual records with invalid dates but keeps the good ones', async () => {
    await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify([
      { id: 'good', title: 'Coffee', amount: 500, category: 'Food', date: '2026-06-01T09:00:00.000Z' },
      { id: 'bad', title: 'Broken', amount: 100, category: 'Food', date: 'not-a-date' },
      { id: 'alsobad' }, // missing date entirely
    ]));
    const out = await getExpenses();
    expect(out.map(e => e.id)).toEqual(['good']);
  });

  it('defaults goal logs to [] and revives log/milestone dates safely', async () => {
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify([
      {
        id: 'g1', habitId: 'h1', targetType: 'reduce_amount', currentStreak: 2,
        longestStreak: 2, savingsGoal: 1000, actualSavings: 200, skipValue: 100,
        startDate: '2026-06-01T00:00:00.000Z',
        logs: [{ date: '2026-06-02T00:00:00.000Z', completed: true, amount: 100 }, { date: 'bad', completed: true }],
        milestones: [{ id: 'm', name: 'x', description: 'y', targetStreak: 1, icon: 'flame-outline', reachedAt: '2026-06-01T00:00:00.000Z' }],
      },
    ]));
    const goals = await getHabitGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].logs).toHaveLength(1); // the 'bad'-dated log dropped
    expect(goals[0].logs[0].date instanceof Date).toBe(true);
    expect(goals[0].milestones[0].reachedAt instanceof Date).toBe(true);
  });
});

// Regression: build 5 crashed at launch on a real device because a habit goal
// written before habit-logging v2 revived with dayLogs undefined, and
// dayStateFor() called .find() on it while rendering the check-in card.
// Device log: "Unhandled JS Exception: TypeError: Cannot read property 'find'
// of undefined ... dayStateFor ... CheckInCard".
describe('habit goal revive: pre-v2 goals', () => {
  const preV2Goal = {
    id: 'goal-legacy',
    habitId: 'habit-legacy',
    targetType: 'reduce_frequency',
    startDate: '2026-06-01T00:00:00.000Z',
    currentStreak: 3,
    longestStreak: 5,
    savingsGoal: 10000,
    actualSavings: 2500,
    milestones: [],
    logs: [],
    // No dayLogs, trackingStart, skipValue, kept, totalSkips,
    // highestMilestoneReached, firstRun or backfillUsed: none existed yet.
  };

  it('backfills every v2 field so the check-in card can render', async () => {
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify([preV2Goal]));
    const [goal] = await getHabitGoals();

    expect(Array.isArray(goal.dayLogs)).toBe(true);
    expect(goal.dayLogs).toHaveLength(0);
    expect(goal.trackingStart instanceof Date).toBe(true);
    expect(isNaN(goal.trackingStart.getTime())).toBe(false);
    expect(goal.skipValue).toBe(0);
    expect(goal.kept).toBe(0);
    expect(goal.totalSkips).toBe(0);
    expect(goal.highestMilestoneReached).toBe(0);
    expect(goal.firstRun).toBe(true);
    expect(goal.backfillUsed).toBe(false);
  });

  it('dayStateFor survives the revived goal (the exact crash path)', async () => {
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify([preV2Goal]));
    const [goal] = await getHabitGoals();
    expect(() => dayStateFor(goal.dayLogs, new Date())).not.toThrow();
    expect(dayStateFor(goal.dayLogs, new Date())).toBe('no-log');
  });

  it('dayStateFor is defensive even if dayLogs is undefined outright', () => {
    expect(dayStateFor(undefined as never, new Date())).toBe('no-log');
  });

  it('keeps real dayLogs and revives their dates', async () => {
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify([
      {
        ...preV2Goal,
        dayLogs: [
          { date: '2026-06-02T00:00:00.000Z', state: 'skipped' },
          { date: 'not-a-date', state: 'slipped' },
        ],
        skipValue: 650,
        kept: 1300,
        totalSkips: 2,
      },
    ]));
    const [goal] = await getHabitGoals();
    expect(goal.dayLogs).toHaveLength(1);
    expect(goal.dayLogs[0].date instanceof Date).toBe(true);
    expect(goal.skipValue).toBe(650);
    expect(goal.kept).toBe(1300);
    expect(goal.firstRun).toBe(false);
  });
});
