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
