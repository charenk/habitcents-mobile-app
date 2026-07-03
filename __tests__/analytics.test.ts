import {
  analyticsEnabled,
  bucketCents,
  bucketCount,
  debugEnabled,
  sanitizeProps,
  track,
  __setClientForTests,
  type TestCapturer,
} from '@/utils/analytics';

const KEY = 'EXPO_PUBLIC_POSTHOG_API_KEY';
const DEBUG = 'EXPO_PUBLIC_ANALYTICS_DEBUG';

// __DEV__ is true under jest-expo, which would turn the debug logger on for every
// track() call. Force it off for the suite so output stays clean; the dedicated
// debug describe below opts back in explicitly.
const originalDebug = process.env[DEBUG];
beforeAll(() => {
  process.env[DEBUG] = '0';
});
afterAll(() => {
  if (originalDebug === undefined) delete process.env[DEBUG];
  else process.env[DEBUG] = originalDebug;
});

function makeCapturer() {
  const calls: { event: string; props?: Record<string, unknown> }[] = [];
  const client: TestCapturer = {
    capture: (event, props) => calls.push({ event, props }),
  };
  return { client, calls };
}

describe('analytics config gating', () => {
  const original = process.env[KEY];
  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
    __setClientForTests(null);
  });

  it('is disabled when the key is absent', () => {
    delete process.env[KEY];
    expect(analyticsEnabled()).toBe(false);
  });

  it('is enabled when the key is present', () => {
    process.env[KEY] = 'phc_test';
    expect(analyticsEnabled()).toBe(true);
  });

  it('no-ops track() entirely when disabled (no client call, no throw)', () => {
    delete process.env[KEY];
    const { client, calls } = makeCapturer();
    __setClientForTests(client);
    // Even with a client injected, a missing key means track short-circuits.
    delete process.env[KEY];
    expect(() => track('expense_deleted', {})).not.toThrow();
    expect(calls).toHaveLength(0);
  });

  it('forwards events to the client when enabled', () => {
    process.env[KEY] = 'phc_test';
    const { client, calls } = makeCapturer();
    __setClientForTests(client);
    track('expense_logged', { category: 'Food', has_merchant: true, is_recurring: false });
    expect(calls).toHaveLength(1);
    expect(calls[0].event).toBe('expense_logged');
    expect(calls[0].props).toEqual({ category: 'Food', has_merchant: true, is_recurring: false });
  });
});

describe('sanitizeProps (PII defense)', () => {
  it('drops blocked PII keys but keeps safe enums/counts', () => {
    const out = sanitizeProps({
      category: 'Food',
      merchant: 'Starbucks on Main St',
      title: 'oat latte',
      email: 'a@b.com',
      amount: 599,
      count: 3,
      flag: true,
    });
    expect(out).toEqual({ category: 'Food', count: 3, flag: true });
  });

  it('drops long free-text strings and non-primitive values', () => {
    const out = sanitizeProps({
      short: 'ok',
      long: 'x'.repeat(200),
      nested: { a: 1 },
      list: [1, 2, 3],
    });
    expect(out).toEqual({ short: 'ok' });
  });

  it('drops null and undefined', () => {
    const out = sanitizeProps({ a: null, b: undefined, c: 0 });
    expect(out).toEqual({ c: 0 });
  });

  it('forwarded events never carry a raw amount', () => {
    process.env[KEY] = 'phc_test';
    const { client, calls } = makeCapturer();
    __setClientForTests(client);
    // A caller mistakenly passes an amount; sanitize must strip it.
    track('skip_logged', { completed: true, saved_bucket: bucketCents(1800), amount: 1800 } as never);
    expect(calls[0].props).not.toHaveProperty('amount');
    expect(calls[0].props).toEqual({ completed: true, saved_bucket: '5-20' });
    delete process.env[KEY];
    __setClientForTests(null);
  });
});

describe('bucketing (no raw values leave the device)', () => {
  it('buckets cents into coarse dollar ranges', () => {
    expect(bucketCents(0)).toBe('0');
    expect(bucketCents(undefined)).toBe('0');
    expect(bucketCents(499)).toBe('<5');
    expect(bucketCents(500)).toBe('5-20');
    expect(bucketCents(1999)).toBe('5-20');
    expect(bucketCents(2000)).toBe('20-50');
    expect(bucketCents(9999)).toBe('50-100');
    expect(bucketCents(99999)).toBe('500-1000');
    expect(bucketCents(100000)).toBe('1000+');
  });

  it('buckets counts into coarse ranges', () => {
    expect(bucketCount(0)).toBe('0');
    expect(bucketCount(5)).toBe('1-9');
    expect(bucketCount(49)).toBe('10-49');
    expect(bucketCount(1200)).toBe('1000+');
  });
});

describe('dev debug logger', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    spy.mockRestore();
    delete process.env[DEBUG];
    delete process.env[KEY];
    __setClientForTests(null);
  });

  it('respects the force on/off flag', () => {
    process.env[DEBUG] = '1';
    expect(debugEnabled()).toBe(true);
    process.env[DEBUG] = '0';
    expect(debugEnabled()).toBe(false);
  });

  it('logs a dry-run line and sends nothing when no key is set', () => {
    process.env[DEBUG] = '1';
    track('expense_logged', { category: 'Food', has_merchant: true, is_recurring: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('[analytics:dry-run]');
    expect(spy.mock.calls[0][0]).toContain('expense_logged');
  });

  it('logs a sent line and forwards the sanitized payload when a key is set', () => {
    process.env[DEBUG] = '1';
    process.env[KEY] = 'phc_test';
    const { client, calls } = makeCapturer();
    __setClientForTests(client);
    track('skip_logged', { completed: true, saved_bucket: bucketCents(1800), amount: 1800 } as never);
    expect(spy.mock.calls[0][0]).toContain('[analytics:sent]');
    // The logged payload is the sanitized one, not the caller's raw props.
    expect(spy.mock.calls[0][1]).toEqual({ completed: true, saved_bucket: '5-20' });
    expect(calls[0].props).not.toHaveProperty('amount');
  });

  it('stays silent when the flag forces it off', () => {
    process.env[DEBUG] = '0';
    track('app_opened', {});
    expect(spy).not.toHaveBeenCalled();
  });
});
