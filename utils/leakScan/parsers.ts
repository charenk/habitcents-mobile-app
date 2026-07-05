/**
 * Value parsers shared by Stage 3 (column inference) and Stage 4 (sign).
 *
 * Date parsing races multiple formats (ISO, US, EU, textual, compact). Amount
 * parsing strips currency symbols, thousands separators, parentheses negatives,
 * trailing minus, and CR/DR suffixes, deciding the decimal separator by which
 * separator appears last (1,234.56 vs 1.234,56). All amounts return integer cents.
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
 * Returns null when there is no numeric content. Handles both 1,234.56 and
 * 1.234,56 by treating whichever of . or , appears LAST as the decimal separator.
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

  // Strip currency symbols and any remaining non-numeric-separator chars.
  s = s.replace(/[^\d.,]/g, '');
  if (!s || !/\d/.test(s)) return null;

  // Decide decimal separator by whichever of . or , appears last.
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    normalized = s;
  } else if (lastComma > lastDot) {
    // Comma is the decimal separator: remove dots (thousands), swap comma to dot.
    normalized = s.replace(/\./g, '').replace(',', '.');
    // Any remaining commas were thousands separators mid-string; strip them.
    normalized = normalized.replace(/,/g, '');
  } else {
    // Dot is the decimal separator: remove commas (thousands).
    normalized = s.replace(/,/g, '');
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return { cents, cellSign };
}

/** Convenience: does this cell parse as any amount at all? */
export function looksLikeAmount(raw: string): boolean {
  return parseAmount(raw) !== null;
}

/** Convenience: does this cell parse as any date at all? */
export function looksLikeDate(raw: string): boolean {
  return parseDateParts(raw) !== null;
}
