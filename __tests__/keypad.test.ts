import {
  applyKeypadKey,
  keypadValueToCents,
  centsToKeypadValue,
  type KeypadKey,
} from '@/utils/keypad';

/** Type a whole string of keys onto a starting value. */
function typeKeys(start: string, keys: string): string {
  return keys.split('').reduce((acc, ch) => applyKeypadKey(acc, ch as KeypadKey), start);
}

describe('applyKeypadKey', () => {
  it('appends digits into the integer part', () => {
    expect(applyKeypadKey('', '6')).toBe('6');
    expect(applyKeypadKey('6', '5')).toBe('65');
    expect(typeKeys('', '123')).toBe('123');
  });

  it("pressing '.' on an empty value yields '0.'", () => {
    expect(applyKeypadKey('', '.')).toBe('0.');
  });

  it('allows only one decimal point', () => {
    expect(applyKeypadKey('6.5', '.')).toBe('6.5');
    expect(applyKeypadKey('6.', '.')).toBe('6.');
    expect(typeKeys('', '6.5.')).toBe('6.5');
  });

  it('allows at most two digits after the decimal', () => {
    expect(applyKeypadKey('6.50', '1')).toBe('6.50');
    expect(typeKeys('', '6.505')).toBe('6.50');
    expect(applyKeypadKey('6.5', '0')).toBe('6.50');
  });

  it('allows at most six integer digits', () => {
    expect(applyKeypadKey('123456', '7')).toBe('123456');
    expect(typeKeys('', '1234567')).toBe('123456');
    // digits after the decimal are not blocked by the integer cap
    expect(applyKeypadKey('123456', '.')).toBe('123456.');
    expect(applyKeypadKey('123456.', '7')).toBe('123456.7');
  });

  it('replaces a lone leading zero with a following digit', () => {
    expect(applyKeypadKey('0', '5')).toBe('5');
    // but a second zero does not stack
    expect(applyKeypadKey('0', '0')).toBe('0');
  });

  it("keeps the leading zero when '.' follows", () => {
    expect(applyKeypadKey('0', '.')).toBe('0.');
    expect(typeKeys('', '0.5')).toBe('0.5');
  });

  it('backspace removes the last character', () => {
    expect(applyKeypadKey('6.50', 'backspace')).toBe('6.5');
    expect(applyKeypadKey('6.', 'backspace')).toBe('6');
  });

  it('backspace on a single char or empty clears to empty', () => {
    expect(applyKeypadKey('6', 'backspace')).toBe('');
    expect(applyKeypadKey('', 'backspace')).toBe('');
  });
});

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
