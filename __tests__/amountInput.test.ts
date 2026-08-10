import { amountInputToCents, sanitizeAmountInput } from '@/utils/amountInput';

describe('sanitizeAmountInput', () => {
  it('passes clean decimal strings through unchanged', () => {
    expect(sanitizeAmountInput('12.34')).toBe('12.34');
    expect(sanitizeAmountInput('6')).toBe('6');
  });

  it('treats empty as empty', () => {
    expect(sanitizeAmountInput('')).toBe('');
  });

  it('keeps a lone decimal point as itself', () => {
    expect(sanitizeAmountInput('.')).toBe('.');
  });

  it('caps at two decimal digits, dropping the rest', () => {
    expect(sanitizeAmountInput('12.345')).toBe('12.34');
    expect(sanitizeAmountInput('0.999')).toBe('0.99');
  });

  it('collapses leading zeros in the integer part', () => {
    expect(sanitizeAmountInput('007')).toBe('7');
    expect(sanitizeAmountInput('00')).toBe('0');
    expect(sanitizeAmountInput('0')).toBe('0');
    // A leading zero immediately before '.' is not "collapsed away".
    expect(sanitizeAmountInput('0.5')).toBe('0.5');
  });

  it('strips a stray minus sign (the decimal pad has no minus key, but paste can)', () => {
    expect(sanitizeAmountInput('-12.50')).toBe('12.50');
  });

  it('normalizes a locale comma decimal separator to a dot', () => {
    expect(sanitizeAmountInput('12,50')).toBe('12.50');
  });

  it('keeps only the first decimal point', () => {
    expect(sanitizeAmountInput('1.2.3')).toBe('1.23');
  });

  it('drops any other non-numeric characters (paste noise, currency symbols)', () => {
    expect(sanitizeAmountInput('$12.34')).toBe('12.34');
    expect(sanitizeAmountInput('1 2 . 3 4')).toBe('12.34');
  });
});

describe('amountInputToCents', () => {
  it('resolves the documented edge cases to the expected cents', () => {
    expect(amountInputToCents('')).toBe(0);
    expect(amountInputToCents('.')).toBe(0);
    expect(amountInputToCents('12.345')).toBe(1234);
    expect(amountInputToCents('007')).toBe(700);
    expect(amountInputToCents('00')).toBe(0);
  });

  it('never goes negative', () => {
    expect(amountInputToCents('-5.00')).toBe(500);
  });

  it('agrees with a clean amount typed digit by digit', () => {
    expect(amountInputToCents('6.50')).toBe(650);
    expect(amountInputToCents('1234.56')).toBe(123456);
  });
});

// A paste hands the field a whole formatted number in one change, so the
// length delta versus the field's previous text (more than one character)
// is what tells sanitizeAmountInput to stop treating comma as "the decimal
// key" and instead infer which separator, if any, is actually the decimal
// point. Without this, a pasted "1,234.56" silently became 1.23 (every comma
// mapped to a dot before parsing).
describe('paste handling (previousText supplied, multi-character delta)', () => {
  it('reads a US-formatted paste ("1,234.56") as 1234.56, not 1.23', () => {
    expect(sanitizeAmountInput('1,234.56', '')).toBe('1234.56');
    expect(amountInputToCents('1,234.56', '')).toBe(123456);
  });

  it('reads a EU-formatted paste ("1.234,56") as 1234.56', () => {
    expect(sanitizeAmountInput('1.234,56', '')).toBe('1234.56');
    expect(amountInputToCents('1.234,56', '')).toBe(123456);
  });

  it('treats a single separator with 3 trailing digits as a thousands mark, not a decimal point', () => {
    expect(sanitizeAmountInput('12,345', '')).toBe('12345');
    expect(amountInputToCents('12,345', '')).toBe(1234500);

    expect(sanitizeAmountInput('1.234', '')).toBe('1234');
    expect(amountInputToCents('1.234', '')).toBe(123400);
  });

  it('still infers a trailing 1- or 2-digit single separator as the decimal point', () => {
    expect(sanitizeAmountInput('12,5', '')).toBe('12.5');
    expect(sanitizeAmountInput('12.50', '')).toBe('12.50');
  });

  it('falls back to the keystroke path when previousText is not supplied at all', () => {
    // Same string as the thousands-mark case above, but with no previousText
    // argument the call is indistinguishable from every pre-existing
    // single-argument call site, so it must keep the old keystroke result.
    expect(sanitizeAmountInput('12,345')).toBe('12.34');
  });
});

// Keystroke path: a delta of 1 character or fewer, whether or not the
// caller supplies previousText, must behave exactly as before so typing an
// amount one digit at a time never jumps mid-entry.
describe('keystroke handling (delta of 1 or less)', () => {
  it('treats a typed comma as the decimal key ("1,5" -> 150 cents)', () => {
    expect(sanitizeAmountInput('1,5', '1,')).toBe('1.5');
    expect(amountInputToCents('1,5', '1,')).toBe(150);
  });

  it('keeps the two-decimal cap on a value that arrives one keystroke at a time', () => {
    // Going from "12.34" to "12.345" is one more character typed at the end,
    // not a paste, so the third decimal digit is dropped exactly as the
    // keystroke rules always dropped it.
    expect(sanitizeAmountInput('12.345', '12.34')).toBe('12.34');
    expect(amountInputToCents('12.345', '12.34')).toBe(1234);
  });
});
