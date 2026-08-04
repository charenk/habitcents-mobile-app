/**
 * Developer menu: the gate and the data personas.
 *
 * Three things are worth pinning. The gate must be OFF in a build that is
 * neither development nor flagged, because that is the App Store build and the
 * whole design rests on the menu being unreachable there. The personas must
 * produce the states they claim, because a preset that lands in the wrong state
 * is worse than no preset. And applying one must touch only this app's storage
 * keys: the old dev seeder called AsyncStorage.clear(), which took out
 * everything on the device including keys we do not own.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_KEY_PREFIX,
  PERSONA_BUILDERS,
  PERSONA_ORDER,
  applyPersona,
  buildFirstRunPersona,
  buildNewUserPersona,
  buildReturningUserPersona,
  clearAppData,
} from '@/data/devPersonas';
import { DEV_MENU_ENABLED } from '@/utils/devMenu';

const FLAG = 'EXPO_PUBLIC_DEV_MENU';

describe('dev menu gate', () => {
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;
  const originalFlag = process.env[FLAG];

  afterEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
    if (originalFlag === undefined) delete process.env[FLAG];
    else process.env[FLAG] = originalFlag;
    jest.resetModules();
  });

  it('is on in development, which is how the local simulator gets it', () => {
    expect(__DEV__).toBe(true);
    expect(DEV_MENU_ENABLED).toBe(true);
  });

  it('is off when neither the dev build nor the flag is set', () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    delete process.env[FLAG];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DEV_MENU_ENABLED: gate } = require('@/utils/devMenu');
    expect(gate).toBe(false);
  });

  it('is on in a non-dev build only when the flag is exactly "1"', () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;

    process.env[FLAG] = '0';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('@/utils/devMenu').DEV_MENU_ENABLED).toBe(false);

    process.env[FLAG] = '1';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('@/utils/devMenu').DEV_MENU_ENABLED).toBe(true);
  });
});

describe('persona shapes', () => {
  it('new user has zero data and is not onboarded', () => {
    const p = buildNewUserPersona();
    expect(p.categories).toHaveLength(0);
    expect(p.expenses).toHaveLength(0);
    expect(p.habits).toHaveLength(0);
    expect(p.goals).toHaveLength(0);
    expect(p.onboarded).toBe(false);
    expect(p.onboardingState).toBeNull();
    expect(p.entitlement).toBe('free');
  });

  it('first run keeps the default categories but nothing logged yet', () => {
    const p = buildFirstRunPersona();
    expect(p.categories.length).toBeGreaterThan(0);
    expect(p.expenses).toHaveLength(0);
    expect(p.habits).toHaveLength(0);
    expect(p.onboarded).toBe(false);
  });

  it('returning user is onboarded with a habit mid-arc and day logs', () => {
    const p = buildReturningUserPersona();
    expect(p.onboarded).toBe(true);
    expect(p.expenses.length).toBeGreaterThanOrEqual(15);
    expect(p.habits.length).toBeGreaterThan(0);
    expect(p.goals).toHaveLength(1);
    expect(p.goals[0].dayLogs.length).toBeGreaterThanOrEqual(28);
    expect(p.progressive?.expenseCount).toBe(p.expenses.length);
  });

  it('returning user repeats one merchant enough times for detection to fire', () => {
    const counts = new Map<string, number>();
    for (const e of buildReturningUserPersona().expenses) {
      const m = e.merchant ?? e.title;
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    expect(Math.max(...counts.values())).toBeGreaterThanOrEqual(4);
  });

  it('every persona in the menu order has a builder', () => {
    for (const id of PERSONA_ORDER) {
      expect(typeof PERSONA_BUILDERS[id]).toBe('function');
      expect(PERSONA_BUILDERS[id]().id).toBe(id);
    }
  });
});

describe('applying a persona to storage', () => {
  const FOREIGN_KEY = 'some-other-library:cache';

  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(FOREIGN_KEY, 'keep me');
  });

  it('writes only keys this app owns and leaves a foreign key intact', async () => {
    await applyPersona(buildReturningUserPersona());

    const keys = await AsyncStorage.getAllKeys();
    const foreign = keys.filter((k) => !k.startsWith(APP_KEY_PREFIX));
    expect(foreign).toEqual([FOREIGN_KEY]);
    expect(await AsyncStorage.getItem(FOREIGN_KEY)).toBe('keep me');
    expect(keys.some((k) => k.startsWith(APP_KEY_PREFIX))).toBe(true);
  });

  it('replaces the previous persona rather than merging into it', async () => {
    await applyPersona(buildReturningUserPersona());
    expect(await AsyncStorage.getItem('@habitcents_expenses')).not.toBeNull();

    await applyPersona(buildNewUserPersona());
    expect(await AsyncStorage.getItem('@habitcents_expenses')).toBeNull();
    expect(await AsyncStorage.getItem('@habitcents_onboarded')).toBeNull();
    expect(await AsyncStorage.getItem(FOREIGN_KEY)).toBe('keep me');
  });

  it('wiping app data removes this app only', async () => {
    await applyPersona(buildReturningUserPersona());
    await clearAppData();

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.startsWith(APP_KEY_PREFIX))).toEqual([]);
    expect(await AsyncStorage.getItem(FOREIGN_KEY)).toBe('keep me');
  });
});
