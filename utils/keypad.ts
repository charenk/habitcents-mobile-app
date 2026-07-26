/**
 * Pure keypad logic for the amount-entry primitives (WP-2).
 *
 * The keypad edits a human-typed decimal STRING (e.g. "6.50"), never cents.
 * Conversion to and from the integer-cents storage format lives here too so the
 * rules stay in one tested place. No React, no theme, no side effects.
 */

export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | 'backspace';

const MAX_INTEGER_DIGITS = 6;
const MAX_DECIMAL_DIGITS = 2;

/**
 * Apply a single keypress to the current value string and return the next value.
 * Rules (all enforced here):
 * - one '.' max, further '.' presses are ignored.
 * - max 2 digits after the decimal point.
 * - max 6 digits before the decimal point.
 * - '.' on an empty value yields '0.'.
 * - a leading '0' is replaced by a following digit ('0' + '5' -> '5'), but
 *   '0' + '.' -> '0.'.
 * - backspace removes the last character; on a single-char or empty value it
 *   clears to ''.
 */
export function applyKeypadKey(value: string, key: KeypadKey): string {
  if (key === 'backspace') {
    return value.length <= 1 ? '' : value.slice(0, -1);
  }

  if (key === '.') {
    if (value === '') return '0.';
    if (value.includes('.')) return value;
    return value + '.';
  }

  // key is a digit '0'-'9'
  const dotIndex = value.indexOf('.');

  if (dotIndex === -1) {
    // Editing the integer part.
    if (value === '0') {
      // Replace a lone leading zero unless another zero was pressed.
      return key === '0' ? '0' : key;
    }
    if (value.length >= MAX_INTEGER_DIGITS) return value;
    return value + key;
  }

  // Editing the decimal part.
  const decimals = value.length - dotIndex - 1;
  if (decimals >= MAX_DECIMAL_DIGITS) return value;
  return value + key;
}

/**
 * Convert a keypad value string to integer cents (hundredths of the major unit).
 * Empty, '.', and '0.' all resolve to 0. Rounds to the nearest cent so that
 * float artifacts (0.29 * 100) never leak through.
 */
export function keypadValueToCents(value: string): number {
  if (!value) return 0;
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convert integer cents back to a keypad value string with two decimals.
 * Zero (or a non-finite input) returns '' so the amount display shows its
 * placeholder rather than "0.00".
 */
export function centsToKeypadValue(cents: number): string {
  if (!Number.isFinite(cents) || cents === 0) return '';
  return (cents / 100).toFixed(MAX_DECIMAL_DIGITS);
}
