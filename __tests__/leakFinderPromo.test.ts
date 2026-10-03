/**
 * activateLeakFinderPromoIfEligible() (punch list, 2026-09-06: "dated
 * entitlement, owed before the leak finder ships"). Its eligibility check
 * reads SCAN_FLOW_ENABLED, a module-load constant baked from
 * `process.env.EXPO_PUBLIC_SCAN_FLOW` (utils/scanFlow.ts), so toggling it
 * needs a fresh module per test, the same idiom __tests__/scanFlowGate.test.tsx
 * uses for the flag itself. Everything else about the promo grant (its
 * composition with getEntitlement(), storage round-trip) lives in
 * __tests__/purchases.test.ts, which does not need to touch the flag.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FLAG = 'EXPO_PUBLIC_SCAN_FLOW';

describe('activateLeakFinderPromoIfEligible', () => {
  const originalFlag = process.env[FLAG];
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    if (originalFlag === undefined) delete process.env[FLAG];
    else process.env[FLAG] = originalFlag;
    jest.resetModules();
  });

  it('is a no-op while the scan flow is dormant, even for someone who already opted in', async () => {
    delete process.env[FLAG];
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const purchases = require('@/utils/purchases');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const storage = require('@/utils/storage');

    await storage.saveLeakFinderInterest();
    await purchases.activateLeakFinderPromoIfEligible();

    expect(purchases.getEntitlement()).toBe('free');
  });

  it('is a no-op when the flag is on but nobody opted in', async () => {
    process.env[FLAG] = '1';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const purchases = require('@/utils/purchases');

    await purchases.activateLeakFinderPromoIfEligible();

    expect(purchases.getEntitlement()).toBe('free');
  });

  it('grants six months of premium once the flag is on and the install had opted in', async () => {
    process.env[FLAG] = '1';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const purchases = require('@/utils/purchases');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const storage = require('@/utils/storage');

    const before = Date.now();
    await storage.saveLeakFinderInterest();
    await purchases.activateLeakFinderPromoIfEligible();

    expect(purchases.getEntitlement()).toBe('premium');
    expect(purchases.isPremium()).toBe(true);

    // Six months out, give or take the test's own run time: not a fixed
    // calendar date (leap years, 28-31 day months), so bound it instead of
    // pinning an exact instant.
    const expected = new Date(before);
    expected.setMonth(expected.getMonth() + 6);
    const raw = await require('@react-native-async-storage/async-storage').getItem(
      '@habitcents_promo_entitlement'
    );
    const stored = JSON.parse(raw);
    expect(stored.source).toBe('leak_finder_interest');
    expect(Math.abs(new Date(stored.expiresAt).getTime() - expected.getTime())).toBeLessThan(5000);
  });

  it('never re-activates or extends an existing grant', async () => {
    process.env[FLAG] = '1';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const purchases = require('@/utils/purchases');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const storage = require('@/utils/storage');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    await storage.saveLeakFinderInterest();
    await purchases.activateLeakFinderPromoIfEligible();
    const first = await AsyncStorage.getItem('@habitcents_promo_entitlement');

    // A second call (e.g. the next app boot) must not touch the record.
    await purchases.activateLeakFinderPromoIfEligible();
    const second = await AsyncStorage.getItem('@habitcents_promo_entitlement');
    expect(second).toBe(first);
  });

  it('grants immediately on a fresh opt-in when the flag is already on, matching insights.tsx calling it right after the tap', async () => {
    process.env[FLAG] = '1';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const purchases = require('@/utils/purchases');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const storage = require('@/utils/storage');

    expect(purchases.getEntitlement()).toBe('free');
    await storage.saveLeakFinderInterest();
    await purchases.activateLeakFinderPromoIfEligible();
    expect(purchases.getEntitlement()).toBe('premium');
  });
});
