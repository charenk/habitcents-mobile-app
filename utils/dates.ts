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
