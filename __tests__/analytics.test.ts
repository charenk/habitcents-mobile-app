import {
  analyticsEnabled,
  bucketCents,
  bucketCount,
  sanitizeProps,
  track,
  __setClientForTests,
  type TestCapturer,
} from '@/utils/analytics';

const KEY = 'EXPO_PUBLIC_POSTHOG_API_KEY';

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
