jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageWriteError, getLocaleOverride, setLocaleOverride } from '@/utils/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('locale override persistence', () => {
  it('defaults to null (follow the device locale) when nothing is stored', async () => {
    await expect(getLocaleOverride()).resolves.toBeNull();
  });

  it('round-trips a set override', async () => {
    await setLocaleOverride('fr');
    await expect(getLocaleOverride()).resolves.toBe('fr');
  });

  it('clears back to null (follow device) when set to null', async () => {
    await setLocaleOverride('ja');
    await setLocaleOverride(null);
    await expect(getLocaleOverride()).resolves.toBeNull();
  });

  it('degrades to null rather than throwing on a corrupt stored value', async () => {
    await AsyncStorage.setItem('@habitcents_locale_override', 'not-a-real-locale');
    await expect(getLocaleOverride()).resolves.toBeNull();
  });

  it('degrades to null when the read itself fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('unreadable'));
    await expect(getLocaleOverride()).resolves.toBeNull();
  });

  it('rejects with StorageWriteError when clearing the override fails to write', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(setLocaleOverride(null)).rejects.toBeInstanceOf(StorageWriteError);
  });
});
