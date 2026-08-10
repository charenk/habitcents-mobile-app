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
 *
 * Keystroke vs paste: a single keystroke can only ever change the text by
 * one character, so the keystroke rules below (comma is the decimal key,
 * first separator wins) are safe to apply on every character typed without
 * ever mangling a value that was already correct. A paste can drop in a
 * whole formatted number at once ("1,234.56", "12.345"), where the SAME
 * comma-is-decimal rule would silently corrupt it (a pasted "1,234.56"
 * becoming 1.23). Callers that know the field's previous text should pass it
 * as `previousText` so a multi-character delta (a paste, not a keystroke)
 * takes the separate paste-aware path below instead.
 */
import { keypadValueToCents } from './keypad';

const MAX_INTEGER_DIGITS = 6;
const MAX_DECIMAL_DIGITS = 2;

/**
 * Caps a canonical (at most one '.') digit string to the field's integer and
 * decimal digit limits, and collapses a leading run of zeros in the integer
 * part ('007' -> '7', '00' -> '0'), never eating the last digit of an
 * all-zero run so '0.5' and '0' still read as themselves rather than '.5'
 * and ''.
 */
function capDigits(s: string): string {
  const dotIndex = s.indexOf('.');
  const intPart = dotIndex === -1 ? s : s.slice(0, dotIndex);
  const rest = dotIndex === -1 ? '' : s.slice(dotIndex); // '.' plus decimals

  const trimmedInt = intPart.replace(/^0+(?=\d)/, '').slice(0, MAX_INTEGER_DIGITS);

  const decimals = rest.length > 0 ? rest.slice(1, 1 + MAX_DECIMAL_DIGITS) : '';
  const cappedRest = rest.length > 0 ? `.${decimals}` : '';

  return trimmedInt + cappedRest;
}

/**
 * Keystroke path (progressive typing, one character at a time): comma
 * normalizes to '.' as the decimal key, every other non-digit character is
 * dropped, only the first '.' survives, and digit counts are capped. This is
 * the original, unchanged behavior so typing never jumps mid-entry.
 */
function sanitizeKeystrokeAmount(raw: string): string {
  let s = raw.replace(/,/g, '.');
  s = s.replace(/[^0-9.]/g, '');

  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }

  return capDigits(s);
}

/**
 * Paste path: a whole formatted number arrived at once, so a single
 * separator character can no longer be assumed to be the decimal point.
 * Instead, whichever separator (comma or dot) occurs LAST in the string is
 * the decimal separator, but only when exactly 1 or 2 digits trail it
 * ("1,234.56" -> the '.' is decimal; "12,345" -> the ',' has 3 trailing
 * digits, so it's a thousands mark instead, giving 12345). Every other
 * separator character, of either kind, is a thousands mark and is dropped.
 */
function sanitizePastedAmount(raw: string): string {
  // Keep digits and both separator characters so the decimal separator can
  // be inferred before anything is collapsed. Everything else ($, spaces,
  // a stray '-') is dropped, same as the keystroke path.
  const cleaned = raw.replace(/[^0-9.,]/g, '');

  let lastSepIndex = -1;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    if (cleaned[i] === '.' || cleaned[i] === ',') {
      lastSepIndex = i;
      break;
    }
  }

  if (lastSepIndex === -1) {
    return capDigits(cleaned);
  }

  const trailingDigits = cleaned.length - lastSepIndex - 1;
  let normalized: string;
  if (trailingDigits === 1 || trailingDigits === 2) {
    // The last separator is the decimal point; strip every earlier
    // separator (any kind) as a thousands mark.
    const intPart = cleaned.slice(0, lastSepIndex).replace(/[.,]/g, '');
    const decPart = cleaned.slice(lastSepIndex + 1);
    normalized = `${intPart}.${decPart}`;
  } else {
    // No separator qualifies as a decimal point; they're all thousands
    // marks.
    normalized = cleaned.replace(/[.,]/g, '');
  }

  return capDigits(normalized);
}

/**
 * Turn a raw TextInput value into a canonical decimal string.
 *
 * `previousText`, when the caller supplies it, is the field's text just
 * before this change. A length delta greater than 1 means more than one
 * character landed in a single change, i.e. a paste, so the paste-aware
 * separator inference runs instead of the keystroke rules. Omitting
 * `previousText` (the default) always takes the keystroke path, which keeps
 * every pre-existing single-argument call, direct or from a test, behaved
 * exactly as before.
 */
export function sanitizeAmountInput(raw: string, previousText?: string): string {
  const isPaste = previousText !== undefined && raw.length - previousText.length > 1;
  return isPaste ? sanitizePastedAmount(raw) : sanitizeKeystrokeAmount(raw);
}

/** Sanitize then convert straight to integer cents, rounding half to even cent. */
export function amountInputToCents(raw: string, previousText?: string): number {
  return keypadValueToCents(sanitizeAmountInput(raw, previousText));
}
