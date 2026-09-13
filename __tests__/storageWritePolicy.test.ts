jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StorageWriteError,
  clearAuditAnswers,
  getExpenses,
  getHabits,
  saveCategories,
  saveDashboardConfig,
  saveExpenses,
  saveHabitGoals,
  saveHabits,
  saveOnboardingState,
  setCurrency,
  setHasOnboarded,
  setLocaleOverride,
} from '@/utils/storage';
import type { Expense } from '@/types/expense';

/**
 * The write policy (utils/storage.ts): reads degrade, writes throw.
 *
 * Every writer here used to swallow its error and resolve, which is what let a
 * failed persist reach the user as a success haptic and the word "Logged."
 * These tests fail on the version of the file that swallowed.
 */

const disk = { full: () => new Error('SQLITE_FULL: database or disk is full') };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('writes reject rather than swallowing', () => {
  it.each([
    ['saveExpenses', () => saveExpenses([])],
    ['saveCategories', () => saveCategories([])],
    ['saveHabits', () => saveHabits([])],
    ['saveHabitGoals', () => saveHabitGoals([])],
    ['saveDashboardConfig', () => saveDashboardConfig({ widgets: [], lastUpdated: new Date() })],
    ['saveOnboardingState', () => saveOnboardingState({} as never)],
    ['setHasOnboarded', () => setHasOnboarded()],
    ['setCurrency', () => setCurrency('USD')],
    ['setLocaleOverride', () => setLocaleOverride('fr')],
  ])('%s rejects when the device cannot write', async (_name, write) => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(disk.full());

    await expect(write()).rejects.toBeInstanceOf(StorageWriteError);
  });

  it('names the key it could not write, so a log says which data was lost', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(disk.full());

    await expect(saveExpenses([])).rejects.toMatchObject({
      name: 'StorageWriteError',
      key: '@habitcents_expenses',
    });
  });

  it('keeps the original failure attached for logging', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const cause = disk.full();
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(cause);

    await expect(saveExpenses([])).rejects.toMatchObject({ underlying: cause });
  });

  it('rejects on a failed removal too, not just a failed write', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(disk.full());

    await expect(clearAuditAnswers()).rejects.toBeInstanceOf(StorageWriteError);
  });

  it('leaves the previously stored data untouched when a write fails', async () => {
    const stored: Expense[] = [
      {
        id: 'e1',
        title: 'Coffee',
        amount: 450,
        category: 'Food',
        date: new Date('2026-01-05T09:00:00Z'),
        time: '9:00 AM',
      } as Expense,
    ];
    await saveExpenses(stored);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(disk.full());
    await expect(saveExpenses([])).rejects.toBeInstanceOf(StorageWriteError);

    const after = await getExpenses();
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe('e1');
  });
});

describe('reads still degrade', () => {
  it('returns [] rather than throwing when the store cannot be read', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('unreadable'));

    await expect(getHabits()).resolves.toEqual([]);
  });
});
