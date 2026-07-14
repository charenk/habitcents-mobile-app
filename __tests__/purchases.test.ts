import {
  purchasesEnabled,
  purchasesMode,
  getEntitlement,
  isPremium,
  purchase,
  restore,
  __setPurchasesForTests,
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

describe('mock entitlement + purchase/restore', () => {
  beforeEach(() => {
    delete process.env[KEY];
    __setPurchasesForTests(null);
  });

  it('reports free entitlement in mock mode', () => {
    expect(getEntitlement()).toBe('free');
    expect(isPremium()).toBe(false);
  });

  it('mock purchase resolves ok without granting premium', async () => {
    const result = await purchase(PRODUCT_ANNUAL);
    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ ok: true, mode: 'mock', productId: PRODUCT_ANNUAL });
    // The mock must not silently hand out premium.
    expect(getEntitlement()).toBe('free');
  });

  it('mock restore resolves ok with nothing to restore', async () => {
    const result = await restore();
    expect(result).toMatchObject({ ok: true, mode: 'mock', entitlement: 'free' });
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
