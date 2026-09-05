jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  purchasesEnabled,
  purchasesMode,
  getEntitlement,
  isPremium,
  purchase,
  restore,
  hydrateEntitlement,
  resetMockEntitlement,
  setMockEntitlement,
  subscribeToEntitlementChanges,
  useEntitlement,
  __setPurchasesForTests,
  __resetPurchasesInitForTests,
  MOCK_ENTITLEMENT_KEY,
  PRODUCT_ANNUAL,
  PRODUCT_MONTHLY,
  type PurchasesClient,
} from '@/utils/purchases';
import {
  FREE_TIER_HABIT_LIMIT,
  PREMIUM_TIER_HABIT_LIMIT,
  habitLimitForEntitlement,
  isHabitLimitReached,
} from '@/utils/habitLogging';

const KEY = 'EXPO_PUBLIC_REVENUECAT_API_KEY';

// Keep the mock '[purchases:mock]' lines out of the test output. The dedicated
// logging test opts back in with its own spy.
let logSpy: jest.SpyInstance;
beforeEach(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
  __setPurchasesForTests(null);
});

describe('purchases config gating', () => {
  const original = process.env[KEY];
  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
  });

  it('is disabled (mock mode) when the key is absent', () => {
    delete process.env[KEY];
    expect(purchasesEnabled()).toBe(false);
    expect(purchasesMode()).toBe('mock');
  });

  it('is enabled (live mode) when the key is present', () => {
    process.env[KEY] = 'rcat_test';
    expect(purchasesEnabled()).toBe(true);
    expect(purchasesMode()).toBe('live');
  });
});

/**
 * Mock entitlement (device feedback 2026-08-04). The previous version of this
 * block asserted the opposite: that a mock purchase must leave the user on
 * 'free'. That is what made the paywall lie, because it announced "Trial
 * started" and returned the user to a still-locked sheet, and it left free = 1
 * vs premium = 5 untestable. The mock now grants a clearly-labeled MOCK
 * entitlement locally; what must stay true is that the mode is still 'mock',
 * nothing claims a real charge, and the grant can be cleared.
 */
describe('mock entitlement + purchase/restore', () => {
  beforeEach(async () => {
    delete process.env[KEY];
    __setPurchasesForTests(null);
    await AsyncStorage.clear();
  });

  it('reports free entitlement before any mock purchase', () => {
    expect(getEntitlement()).toBe('free');
    expect(isPremium()).toBe(false);
  });

  it('mock purchase grants a MOCK premium entitlement and stays in mock mode', async () => {
    const result = await purchase(PRODUCT_ANNUAL);
    expect(result).toMatchObject({
      ok: true,
      mode: 'mock',
      entitlement: 'premium',
      productId: PRODUCT_ANNUAL,
    });
    // The gate really opens, which is the whole point.
    expect(getEntitlement()).toBe('premium');
    expect(isPremium()).toBe(true);
    // Nothing pretends the purchase was real: the mode is still mock and the
    // stored value says so out loud.
    expect(purchasesMode()).toBe('mock');
    expect(await AsyncStorage.getItem(MOCK_ENTITLEMENT_KEY)).toBe('premium-mock');
  });

  it('keeps the mock grant across a relaunch, and clears it on reset', async () => {
    await purchase(PRODUCT_MONTHLY);
    // Simulate a cold start: memory is empty, storage is not.
    __setPurchasesForTests(null);
    expect(getEntitlement()).toBe('free');
    expect(await hydrateEntitlement()).toBe('premium');
    expect(getEntitlement()).toBe('premium');

    await resetMockEntitlement();
    expect(getEntitlement()).toBe('free');
    expect(await AsyncStorage.getItem(MOCK_ENTITLEMENT_KEY)).toBeNull();
  });

  it('mock restore reports the local grant, free when there is none', async () => {
    expect(await restore()).toMatchObject({ ok: true, mode: 'mock', entitlement: 'free' });
    await purchase(PRODUCT_ANNUAL);
    expect(await restore()).toMatchObject({ ok: true, mode: 'mock', entitlement: 'premium' });
  });

  // The developer menu flips this directly instead of faking a purchase, so it
  // has to round-trip the same way a purchase does: memory, storage, relaunch.
  it('setMockEntitlement round-trips premium through a relaunch', async () => {
    await setMockEntitlement('premium');
    expect(getEntitlement()).toBe('premium');
    expect(isPremium()).toBe(true);
    expect(await AsyncStorage.getItem(MOCK_ENTITLEMENT_KEY)).toBe('premium-mock');

    // Cold start: memory is empty, storage is not.
    __setPurchasesForTests(null);
    expect(getEntitlement()).toBe('free');
    expect(await hydrateEntitlement()).toBe('premium');
  });

  it('setMockEntitlement back to free clears memory and storage', async () => {
    await setMockEntitlement('premium');
    await setMockEntitlement('free');
    expect(getEntitlement()).toBe('free');
    expect(isPremium()).toBe(false);
    expect(await AsyncStorage.getItem(MOCK_ENTITLEMENT_KEY)).toBeNull();
    expect(await hydrateEntitlement()).toBe('free');
  });

  it('setMockEntitlement flips the habit ceiling the gate reads', async () => {
    await setMockEntitlement('free');
    expect(habitLimitForEntitlement(getEntitlement())).toBe(FREE_TIER_HABIT_LIMIT);
    await setMockEntitlement('premium');
    expect(habitLimitForEntitlement(getEntitlement())).toBe(PREMIUM_TIER_HABIT_LIMIT);
  });

  it('logs a [purchases:mock] line on a mock purchase', async () => {
    logSpy.mockClear();
    await purchase(PRODUCT_MONTHLY);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('[purchases:mock]');
    expect(logSpy.mock.calls[0][0]).toContain(PRODUCT_MONTHLY);
  });
});

describe('injected client seam (live path)', () => {
  it('delegates entitlement and purchase to the injected client', async () => {
    const calls: string[] = [];
    const fake: PurchasesClient = {
      getEntitlement: () => 'premium',
      purchase: async (productId) => {
        calls.push(productId);
        return { ok: true, mode: 'live', entitlement: 'premium', productId };
      },
      restore: async () => ({ ok: true, mode: 'live', entitlement: 'premium' }),
    };
    __setPurchasesForTests(fake);

    expect(getEntitlement()).toBe('premium');
    expect(isPremium()).toBe(true);
    const result = await purchase(PRODUCT_ANNUAL);
    expect(result).toEqual({ ok: true, mode: 'live', entitlement: 'premium', productId: PRODUCT_ANNUAL });
    expect(calls).toEqual([PRODUCT_ANNUAL]);
    const restored = await restore();
    expect(restored).toEqual({ ok: true, mode: 'live', entitlement: 'premium' });
  });
});

/**
 * Live mode configured, but the live client never came up (bad key, no
 * network, SDK unavailable). This is the one behavior the live client had to
 * get right (2026-09-04): before this run, purchase()/restore() only checked
 * `impl`, so a live-enabled install whose real client merely failed to start
 * would silently fall into the mock branch and comp a free "premium" grant
 * that charged nobody. Now the mock branch only runs when purchases are
 * disabled outright; a configured-but-broken live path reports a failure.
 *
 * The mechanism that fails initPurchases() here is incidental: this project's
 * Jest/Babel config can't execute a real ESM dynamic import (no
 * --experimental-vm-modules), so `await import('react-native-purchases')`
 * itself rejects. On a real device the same code path would instead fail at
 * configure()/getCustomerInfo() (bad key, offline at boot, native module
 * missing). Either way initPurchases() catches it and leaves `impl` null,
 * which is the invariant these tests actually check.
 */
describe('live mode configured but the client fails to initialize', () => {
  const KEY_ORIGINAL = process.env[KEY];
  beforeEach(() => {
    process.env[KEY] = 'rcat_test_key';
    __setPurchasesForTests(null);
    __resetPurchasesInitForTests();
  });
  afterEach(() => {
    if (KEY_ORIGINAL === undefined) delete process.env[KEY];
    else process.env[KEY] = KEY_ORIGINAL;
  });

  it('getEntitlement() reports free while live init is pending or failed, never a mock grant', () => {
    expect(getEntitlement()).toBe('free');
  });

  it('purchase() reports a live failure, never a mock premium grant', async () => {
    const result = await purchase(PRODUCT_ANNUAL);
    expect(result.ok).toBe(false);
    expect(result.mode).toBe('live');
    expect(getEntitlement()).toBe('free');
  });

  it('restore() reports a live failure, never a mock premium grant', async () => {
    const result = await restore();
    expect(result.ok).toBe(false);
    expect(result.mode).toBe('live');
    expect(getEntitlement()).toBe('free');
  });
});

/**
 * Reactivity (backlog from the gating audit, 2026-08-11): getEntitlement()
 * itself stays a plain synchronous read (utils/devMenu.ts and the tests above
 * still call it directly), but a mounted screen that renders through
 * useEntitlement() must repaint the moment the grant actually changes,
 * without needing an unrelated re-render to happen to pick up the new value.
 */
describe('entitlement reactivity', () => {
  beforeEach(async () => {
    delete process.env[KEY];
    __setPurchasesForTests(null);
    await AsyncStorage.clear();
  });

  it('subscribeToEntitlementChanges fires on a mock purchase, and stops firing once unsubscribed', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToEntitlementChanges(listener);

    await purchase(PRODUCT_ANNUAL);
    expect(listener).toHaveBeenCalledTimes(1);

    await resetMockEntitlement();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    await purchase(PRODUCT_MONTHLY);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('subscribeToEntitlementChanges fires on setMockEntitlement (the dev menu path)', async () => {
    const listener = jest.fn();
    subscribeToEntitlementChanges(listener);

    await setMockEntitlement('premium');
    expect(listener).toHaveBeenCalledTimes(1);
    await setMockEntitlement('free');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('useEntitlement() re-renders a mounted component when a mock purchase changes the grant', async () => {
    const { result } = await renderHook(() => useEntitlement());
    expect(result.current).toBe('free');

    await act(async () => {
      await purchase(PRODUCT_ANNUAL);
    });
    expect(result.current).toBe('premium');

    await act(async () => {
      await resetMockEntitlement();
    });
    expect(result.current).toBe('free');
  });

  it('useEntitlement() picks up setMockEntitlement (the dev menu path) without an unrelated re-render', async () => {
    const { result } = await renderHook(() => useEntitlement());
    expect(result.current).toBe('free');

    await act(async () => {
      await setMockEntitlement('premium');
    });
    expect(result.current).toBe('premium');
  });
});

describe('entitlement gating math', () => {
  it('maps entitlement to the right active-habit ceiling', () => {
    expect(FREE_TIER_HABIT_LIMIT).toBe(1);
    expect(PREMIUM_TIER_HABIT_LIMIT).toBe(5);
    expect(habitLimitForEntitlement('free')).toBe(1);
    expect(habitLimitForEntitlement('premium')).toBe(5);
  });

  it('free = 1 habit: the first is allowed, a second is blocked', () => {
    expect(isHabitLimitReached(0, 'free')).toBe(false);
    expect(isHabitLimitReached(1, 'free')).toBe(true);
  });

  it('premium = up to 5 habits: allows through 5, blocks a sixth', () => {
    expect(isHabitLimitReached(0, 'premium')).toBe(false);
    expect(isHabitLimitReached(4, 'premium')).toBe(false);
    expect(isHabitLimitReached(5, 'premium')).toBe(true);
  });
});
