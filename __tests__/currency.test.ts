import {
  formatAmountAtRest,
  formatMoney,
  scaleThresholdCents,
  currencyMeta,
  isCurrencyCode,
  CURRENCIES,
  DEFAULT_CURRENCY,
} from '@/utils/currency';

describe('formatMoney', () => {
  it('formats USD with two decimals', () => {
    expect(formatMoney(500, 'USD')).toBe('$5.00');
    expect(formatMoney(1234, 'USD')).toBe('$12.34');
  });

  it('renders a signed (negative) amount for expenses', () => {
    expect(formatMoney(500, 'USD', { signed: true })).toBe('-$5.00');
    // signed always shows negative regardless of input sign
    expect(formatMoney(-500, 'USD', { signed: true })).toBe('-$5.00');
  });

  it('drops fraction digits for zero-decimal JPY', () => {
    // 50000 cents = 500 major units. The yen glyph varies by ICU build
    // (fullwidth vs ASCII), so assert the number and absence of decimals only.
    const out = formatMoney(50000, 'JPY');
    expect(out).toContain('500');
    expect(out).not.toContain('.00');
  });

  it('formats EUR and GBP with their symbols', () => {
    expect(formatMoney(1000, 'EUR')).toContain('10.00');
    expect(formatMoney(1000, 'EUR')).toContain('€');
    expect(formatMoney(1000, 'GBP')).toContain('£');
  });

  it('compact mode removes fraction digits', () => {
    expect(formatMoney(12345, 'USD', { compact: true })).toBe('$123');
  });

  it('defaults to USD and handles non-finite input as zero', () => {
    expect(formatMoney(500)).toBe('$5.00');
    expect(formatMoney(Number.NaN)).toBe('$0.00');
  });
});

describe('scaleThresholdCents', () => {
  it('leaves USD-scale currencies unchanged', () => {
    expect(scaleThresholdCents(2000, 'USD')).toBe(2000);
    expect(scaleThresholdCents(2000, 'EUR')).toBe(2000);
  });

  it('scales up high-magnitude currencies', () => {
    // JPY usdScale is 150, so a $20 floor becomes ~JPY 3000 worth of "cents"
    expect(scaleThresholdCents(2000, 'JPY')).toBe(300000);
    expect(scaleThresholdCents(10000, 'INR')).toBe(830000);
  });
});

describe('metadata helpers', () => {
  it('returns a known currency and falls back to the first entry', () => {
    expect(currencyMeta('EUR').code).toBe('EUR');
    // @ts-expect-error testing the runtime fallback for an invalid code
    expect(currencyMeta('ZZZ')).toBe(CURRENCIES[0]);
  });

  it('validates currency codes', () => {
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('ZZZ')).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
    expect(isCurrencyCode(42)).toBe(false);
  });

  it('DEFAULT_CURRENCY is a valid code', () => {
    expect(isCurrencyCode(DEFAULT_CURRENCY)).toBe(true);
  });
});

/**
 * C9: the amount FIELD used to keep its editable string on screen even at
 * rest, so a bill read "$2100.00" in the sheet and "$2,100.00" in the row it
 * came from. This is the at-rest half. The editable half stays ungrouped on
 * purpose, because the keystroke sanitizer treats a comma as the decimal key.
 */
describe('formatAmountAtRest', () => {
  it('groups thousands, without the currency symbol', () => {
    expect(formatAmountAtRest(210000, 'USD')).toBe('2,100.00');
    expect(formatAmountAtRest(123456789, 'USD')).toBe('1,234,567.89');
  });

  it('agrees with formatMoney on everything but the symbol', () => {
    expect(formatMoney(210000, 'USD')).toBe(`$${formatAmountAtRest(210000, 'USD')}`);
  });

  it("uses the currency's own decimal count, so JPY shows none", () => {
    expect(formatAmountAtRest(210000, 'JPY')).toBe('2,100');
  });

  it('returns empty for zero, so the field shows its placeholder', () => {
    expect(formatAmountAtRest(0, 'USD')).toBe('');
    expect(formatAmountAtRest(Number.NaN, 'USD')).toBe('');
  });

  it('leaves a sub-thousand amount exactly as the editable form had it', () => {
    expect(formatAmountAtRest(1200, 'USD')).toBe('12.00');
  });
});
