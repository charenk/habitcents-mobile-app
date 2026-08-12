/**
 * Locale-aware date and time formatting (ADA-008).
 *
 * Every user-facing date goes through these helpers so no screen hardcodes a
 * locale: passing undefined lets Intl use the device locale, matching how
 * currency already respects the user's region (utils/currency.ts). Grep guard:
 * 'en-US' must not appear in UI code outside currency metadata.
 */

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString(undefined, options);
}

export function formatTime(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString(undefined, options);
}

/**
 * Parses a date-only key ('yyyy-mm-dd' or 'yyyy-mm') as LOCAL midnight.
 *
 * `new Date('2026-08-01')` is specified to parse as UTC midnight, which
 * `formatDate` then renders in the device timezone: west of UTC that prints
 * "Jul 31", and a month key prints the previous month entirely. Scan keys are
 * calendar labels, not instants, so they must be built field by field the way
 * utils/leakScan/rows.ts already builds its dates. Returns null for anything
 * unparseable so callers can fall back to the raw key rather than render
 * "Invalid Date".
 */
export function parseDateOnly(key: string): Date | null {
  const parts = key.split('-');
  if (parts.length < 2 || parts.length > 3) return null;
  const [year, month, day] = parts.map((p) => Number(p));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (parts.length === 3 && !Number.isFinite(day)) return null;
  const parsed = new Date(year, month - 1, parts.length === 3 ? day : 1);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
