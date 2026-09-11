/**
 * Value parsers shared by Stage 3 (column inference) and Stage 4 (sign).
 *
 * Date parsing races multiple formats (ISO, US, EU, textual, compact). Amount
 * parsing strips currency symbols, thousands separators, parentheses negatives,
 * trailing minus, and CR/DR suffixes. A cell carrying both separators decides
 * the decimal point by which appears last (1,234.56 vs 1.234,56); a cell
 * carrying only one decides by the shape of the digit groups, so a
 * thousands-grouped whole dollar amount (1,234) is not read as a decimal. See
 * parseAmount for the full ladder. All amounts return integer cents.
 */

import type { DateOrder } from './types';

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** A parsed calendar date with the raw day/month fields, before order resolution. */
export type DateParts = {
  year: number;
  /** First numeric field (month under MDY, day under DMY). */
  a: number;
  /** Second numeric field (day under MDY, month under DMY). */
  b: number;
  /** True when the format itself fixes the order (ISO, textual month). */
  orderFixed: boolean;
  /** For orderFixed dates, the resolved month/day. */
  month?: number;
  day?: number;
};

/**
 * Parse a raw date cell into DateParts, or null if unparseable. Does NOT resolve
 * DD/MM ambiguity for numeric MM/DD vs DD/MM; that is Stage 3's decision.
 */
export function parseDateParts(raw: string): DateParts | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO 8601: yyyy-mm-dd (order fixed).
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return { year: +m[1], a: +m[2], b: +m[3], orderFixed: true, month: +m[2], day: +m[3] };
  }

  // Compact YYYYMMDD (order fixed).
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    return { year: +m[1], a: +m[2], b: +m[3], orderFixed: true, month: +m[2], day: +m[3] };
  }

  // Textual month: DD-MMM-YYYY or MMM DD, YYYY (order fixed).
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon) {
      return {
        year: normalizeYear(+m[3]),
        a: mon,
        b: +m[1],
        orderFixed: true,
        month: mon,
        day: +m[1],
      };
    }
  }
  m = s.match(/^([A-Za-z]{3,})[-\s](\d{1,2}),?[-\s](\d{2,4})/);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon) {
      return {
        year: normalizeYear(+m[3]),
        a: mon,
        b: +m[2],
        orderFixed: true,
        month: mon,
        day: +m[2],
      };
    }
  }

  // Numeric slash/dash: A/B/YYYY where A and B order is ambiguous (Stage 3 resolves).
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    return { year: normalizeYear(+m[3]), a: +m[1], b: +m[2], orderFixed: false };
  }

  // yyyy/mm/dd with slashes (order fixed like ISO).
  m = s.match(/^(\d{4})[/\.](\d{1,2})[/\.](\d{1,2})/);
  if (m) {
    return { year: +m[1], a: +m[2], b: +m[3], orderFixed: true, month: +m[2], day: +m[3] };
  }

  return null;
}

function normalizeYear(y: number): number {
  if (y < 100) return y >= 70 ? 1900 + y : 2000 + y;
  return y;
}

/** Resolve DateParts into a concrete {year,month,day} under a given order. */
export function resolveDate(parts: DateParts, order: DateOrder): { y: number; mo: number; d: number } {
  if (parts.orderFixed) {
    return { y: parts.year, mo: parts.month!, d: parts.day! };
  }
  if (order === 'MDY') return { y: parts.year, mo: parts.a, d: parts.b };
  return { y: parts.year, mo: parts.b, d: parts.a };
}

/** A resolved date is valid when month 1..12 and day 1..31. */
export function isValidYMD(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** ISO yyyy-mm-dd string for a resolved date. */
export function toISO(y: number, mo: number, d: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** A local Date at midnight from a resolved y/m/d (no timezone drift for date math). */
export function toDate(y: number, mo: number, d: number): Date {
  return new Date(y, mo - 1, d);
}

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------

export type AmountResult = {
  /** Integer cents magnitude BEFORE sign convention is applied. */
  cents: number;
  /** Sign carried by the cell itself: parentheses / trailing minus / leading minus
   *  / CR-DR suffix. -1 if the cell signalled a negative, else +1. */
  cellSign: 1 | -1;
};

/**
 * Parse an amount cell into integer cents plus the sign the cell itself carried.
 * Returns null when there is no numeric content, and also when the separators
 * form a shape with no defensible reading.
 *
 * Separator handling, in the order the cases are decided:
 * - Both . and , present: whichever appears LAST is the decimal separator, so
 *   1,234.56 and 1.234,56 both give 123456 cents.
 * - Commas only: well-formed groups of three (1,234 / 1,234,567) are thousands
 *   separators; a single comma that is not such a group is an EU decimal point
 *   (4,00 / 12,5 / 0,99); anything else (1,23,45) returns null.
 * - Dots only: two or more well-formed groups (1.234.567) are thousands
 *   separators; a single dot is the decimal point.
 *
 * Rejected outright: scientific notation (1e5). The character strip would
 * otherwise delete the exponent marker before Number() ever saw it, turning
 * 1e5 into $15 silently.
 *
 * Cents come from the digits of the normalized string, not from
 * Math.round(value * 100), because that product lands on the wrong side of the
 * halfway point for amounts like 0.145. See decimalStringToCents.
 *
 * Two residual ambiguities a single cell cannot settle, both resolved the way
 * the app's default (dot-decimal, US exports) points:
 * - `1.234` is read as 123 cents, not as EU one thousand two hundred thirty
 *   four. Only a whole-column pass could tell those apart.
 * - `0,999` matches the grouping shape and is read as $999. A real grouped
 *   amount never starts with a zero group, but the pattern is deliberately kept
 *   simple; the shape does not occur in any fixture.
 */
export function parseAmount(raw: string): AmountResult | null {
  let s = raw.trim();
  if (!s) return null;
  // A neutralized formula cell (leading ') is not an amount.
  if (s.startsWith("'")) return null;

  let cellSign: 1 | -1 = 1;

  // Parentheses negative: (123.45)
  if (/^\(.*\)$/.test(s)) {
    cellSign = -1;
    s = s.slice(1, -1);
  }

  // CR/DR suffix (credit/debit): DR is a debit (outflow) hint but we only record the
  // sign the cell asserts; Stage 4 owns the outflow convention. Treat trailing DR as
  // negative and CR as positive here, matching common bank exports.
  const crdr = s.match(/(CR|DR)\s*$/i);
  if (crdr) {
    s = s.slice(0, crdr.index).trim();
    if (crdr[1].toUpperCase() === 'DR') cellSign = -1;
  }

  // Leading or trailing minus.
  if (/^-/.test(s)) {
    cellSign = -1;
    s = s.slice(1);
  }
  if (/-\s*$/.test(s)) {
    cellSign = -1;
    s = s.replace(/-\s*$/, '');
  }
  // Leading plus (explicit positive).
  s = s.replace(/^\+/, '');

  // Scientific notation is not an amount, and this has to be decided BEFORE the
  // strip below: that strip deletes the exponent marker along with the currency
  // symbols, so 1e5 would arrive as "15" and parse as $15 with Number.isFinite
  // never seeing anything wrong. No bank export writes exponents, so a cell
  // shaped this way is corrupt rather than very large, and saying so lets
  // looksLikeAmount answer honestly instead of scoring a junk column.
  if (/\d\s*[eE]\s*[+-]?\d/.test(s)) return null;

  // Strip currency symbols and any remaining non-numeric-separator chars.
  s = s.replace(/[^\d.,]/g, '');
  if (!s || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const hasDot = lastDot !== -1;
  const hasComma = lastComma !== -1;
  let normalized: string;

  if (!hasDot && !hasComma) {
    normalized = s;
  } else if (hasDot && hasComma) {
    // Both separators present: the last one is the decimal point. This is the
    // only case the shape is unambiguous from the cell alone, and it is the
    // case the original rule got right.
    if (lastComma > lastDot) {
      // 1.234,56: remove dots (thousands), swap comma to dot.
      normalized = s.replace(/\./g, '').replace(',', '.');
      // Any remaining commas were thousands separators mid-string; strip them.
      normalized = normalized.replace(/,/g, '');
    } else {
      // 1,234.56: remove commas (thousands).
      normalized = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Commas only. The digit groups decide, because the last-separator rule
    // read every lone comma as a decimal point and turned 1,234 into 123 cents.
    if (/^\d{1,3}(,\d{3})+$/.test(s)) {
      // Every comma separates a well-formed group of three: thousands.
      normalized = s.replace(/,/g, '');
    } else if (s.indexOf(',') === lastComma) {
      // A single comma that is not a thousands group: EU decimal (4,00 / 12,5).
      normalized = s.replace(',', '.');
    } else {
      // Several commas that do not form valid groups (1,23,45). Neither reading
      // is defensible, so say so rather than return a number nobody can trust.
      return null;
    }
  } else {
    // Dots only. Two or more well-formed groups can only be thousands
    // separators (1.234.567), which the old rule turned into NaN and dropped.
    if (/^\d{1,3}(\.\d{3}){2,}$/.test(s)) {
      normalized = s.replace(/\./g, '');
    } else {
      // A single dot stays the decimal point. Anything malformed (1.23.45)
      // falls through to the isFinite guard below and is rejected there.
      normalized = s;
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = decimalStringToCents(normalized);
  if (cents === null) return null;
  return { cents, cellSign };
}

/**
 * Integer cents from a normalized decimal string: digits, with at most one dot
 * as the decimal point and no sign.
 *
 * Done on the string rather than Math.round(value * 100) because that product
 * is not always on the side of the halfway point the decimal is: 0.145 * 100 is
 * 14.499999999999998, so Math.round gives 14 cents for an amount whose written
 * form says 15. Reading the digits directly has no float step to be wrong about.
 *
 * Rounds half away from zero on the third fractional digit, matching how a
 * written amount reads. Returns null for a shape with more than one dot, which
 * the caller's isFinite guard also rejects.
 */
function decimalStringToCents(normalized: string): number | null {
  const parts = normalized.match(/^(\d*)(?:\.(\d*))?$/);
  if (!parts) return null;
  const whole = parts[1] ?? '';
  const frac = parts[2] ?? '';
  if (!whole && !frac) return null;

  const wholeCents = whole ? Number(whole) * 100 : 0;
  if (!Number.isFinite(wholeCents)) return null;

  // First two fractional digits are the cents; the third decides the rounding.
  const centDigits = Number((frac + '00').slice(0, 2));
  const roundUp = frac.length > 2 && frac.charCodeAt(2) - 48 >= 5;
  return wholeCents + centDigits + (roundUp ? 1 : 0);
}

/** Convenience: does this cell parse as any amount at all? */
export function looksLikeAmount(raw: string): boolean {
  return parseAmount(raw) !== null;
}

/** Convenience: does this cell parse as any date at all? */
export function looksLikeDate(raw: string): boolean {
  return parseDateParts(raw) !== null;
}
