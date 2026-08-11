/**
 * Cents <-> decimal-string conversion for the amount-entry primitives (WP-2;
 * ADR 0023).
 *
 * The retiring custom Keypad used to edit a human-typed decimal STRING
 * (e.g. "6.50") one keypress at a time; that per-keypress editing (
 * applyKeypadKey) is gone with it, but the string FORMAT it produced is not
 * -- AmountField (components/ui/AmountField.tsx) still keeps its own raw
 * typed text in this same shape, and utils/amountInput.ts still hands off to
 * keypadValueToCents for the final string-to-cents conversion. This file is
 * what's left of the shared conversion layer, so both stay in agreement. No
 * React, no theme, no side effects.
 */

const MAX_DECIMAL_DIGITS = 2;

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
