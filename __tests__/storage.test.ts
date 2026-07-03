jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getExpenses, getHabitGoals } from '@/utils/storage';

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
