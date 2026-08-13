/**
 * UX-050 regression guard.
 *
 * Scan keys ('yyyy-mm-dd', 'yyyy-mm') are calendar labels, not instants.
 * `new Date('2026-08-01')` parses as UTC midnight per spec, so formatting it
 * in a timezone west of UTC renders the day before, and a month key renders
 * the previous month entirely over real spend figures. These tests pin the
 * local-parse behaviour so the UTC form cannot creep back in.
 */
import { formatDate, parseDateOnly } from '@/utils/dates';

describe('parseDateOnly', () => {
  it('parses a day key as local midnight, not UTC midnight', () => {
    const parsed = parseDateOnly('2026-08-01');
    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(2026);
    expect(parsed!.getMonth()).toBe(7); // August, zero-indexed
    expect(parsed!.getDate()).toBe(1);
  });

  it('parses a month key to the first of that month', () => {
    const parsed = parseDateOnly('2026-08');
    expect(parsed).not.toBeNull();
    expect(parsed!.getMonth()).toBe(7);
    expect(parsed!.getDate()).toBe(1);
  });

  it('does not slip a day when formatted, unlike new Date(iso)', () => {
    const local = parseDateOnly('2026-08-01')!;
    expect(formatDate(local, { month: 'short', day: 'numeric' })).toBe(
      formatDate(new Date(2026, 7, 1), { month: 'short', day: 'numeric' })
    );
  });

  it('does not slip a month when formatted', () => {
    const local = parseDateOnly('2026-08')!;
    expect(formatDate(local, { month: 'long', year: 'numeric' })).toBe(
      formatDate(new Date(2026, 7, 1), { month: 'long', year: 'numeric' })
    );
  });

  it('handles a year boundary without rolling back to the previous year', () => {
    const local = parseDateOnly('2026-01-01')!;
    expect(local.getFullYear()).toBe(2026);
    expect(local.getMonth()).toBe(0);
    expect(local.getDate()).toBe(1);
  });

  it('returns null for unparseable input so callers can fall back to the raw key', () => {
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly('2026')).toBeNull();
    expect(parseDateOnly('not-a-date')).toBeNull();
    expect(parseDateOnly('2026-08-01-extra')).toBeNull();
  });
});
