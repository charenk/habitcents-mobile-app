/**
 * utils/keypad.ts, post ADR 0023: the custom Keypad component and its
 * per-keypress applyKeypadKey are gone (see __tests__/amountInput.test.ts for
 * AmountField's own sanitizing), but keypadValueToCents / centsToKeypadValue
 * are still the shared cents<->string conversion AmountField and
 * utils/amountInput.ts both depend on, so they keep their coverage here.
 */
import { keypadValueToCents, centsToKeypadValue } from '@/utils/keypad';

describe('keypadValueToCents', () => {
  it('converts decimal strings to cents', () => {
    expect(keypadValueToCents('6.5')).toBe(650);
    expect(keypadValueToCents('6.50')).toBe(650);
    expect(keypadValueToCents('12')).toBe(1200);
    expect(keypadValueToCents('0.29')).toBe(29);
  });

  it('treats empty and partial values as zero', () => {
    expect(keypadValueToCents('')).toBe(0);
    expect(keypadValueToCents('0.')).toBe(0);
    expect(keypadValueToCents('.')).toBe(0);
  });
});

describe('centsToKeypadValue', () => {
  it('formats cents with two decimals', () => {
    expect(centsToKeypadValue(650)).toBe('6.50');
    expect(centsToKeypadValue(600)).toBe('6.00');
    expect(centsToKeypadValue(1234)).toBe('12.34');
  });

  it('returns empty for zero so the placeholder shows', () => {
    expect(centsToKeypadValue(0)).toBe('');
  });

  it('round-trips with keypadValueToCents', () => {
    for (const cents of [650, 600, 1234, 29, 100000]) {
      expect(keypadValueToCents(centsToKeypadValue(cents))).toBe(cents);
    }
  });
});
