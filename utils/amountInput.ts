/**
 * Sanitizing for AmountField (components/ui/AmountField.tsx, ADR 0023).
 *
 * The native iOS decimal pad can still hand back more than a clean decimal
 * string: a pasted value, a locale keyboard that uses ',' as the decimal
 * separator, or (defensively) a stray '-' the pad itself never offers. This
 * is the one place that turns whatever `onChangeText` reports into the same
 * canonical decimal string the retiring Keypad produced, so
 * `keypadValueToCents` (utils/keypad.ts) stays the single source of truth for
 * string-to-cents conversion. No React, no theme, no side effects.
 */
import { keypadValueToCents } from './keypad';

const MAX_INTEGER_DIGITS = 6;
const MAX_DECIMAL_DIGITS = 2;

/**
 * Turn a raw TextInput value into a canonical decimal string:
 * - locale comma decimal separators normalize to '.'
 * - every other non-digit, non-'.' character (including '-') is dropped
 * - only the first '.' survives; later ones are dropped
 * - at most two digits after the decimal point
 * - at most six digits before it
 * - a run of leading zeros in the integer part collapses to none, except a
 *   lone '0' immediately before '.' or at the very end, which is kept so
 *   '0.5' and '0' still read as themselves rather than '.5' and ''.
 */
export function sanitizeAmountInput(raw: string): string {
  let s = raw.replace(/,/g, '.');
  s = s.replace(/[^0-9.]/g, '');

  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }

  const dotIndex = s.indexOf('.');
  const intPart = dotIndex === -1 ? s : s.slice(0, dotIndex);
  const rest = dotIndex === -1 ? '' : s.slice(dotIndex); // '.' plus decimals

  // Collapse leading zeros ('007' -> '7', '00' -> '0'), never eating the last
  // digit of an all-zero run.
  const trimmedInt = intPart.replace(/^0+(?=\d)/, '').slice(0, MAX_INTEGER_DIGITS);

  const decimals = rest.length > 0 ? rest.slice(1, 1 + MAX_DECIMAL_DIGITS) : '';
  const cappedRest = rest.length > 0 ? `.${decimals}` : '';

  return trimmedInt + cappedRest;
}

/** Sanitize then convert straight to integer cents, rounding half to even cent. */
export function amountInputToCents(raw: string): number {
  return keypadValueToCents(sanitizeAmountInput(raw));
}
