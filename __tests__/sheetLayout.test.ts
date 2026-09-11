/**
 * Pins the sheet height rule (utils/sheetLayout.ts): never past 80% of the
 * window, clamped to the visible strip above the keyboard, floored so
 * landscape plus keyboard cannot collapse the panel.
 */
import {
  SHEET_KEYBOARD_TOP_MARGIN,
  SHEET_MAX_FRACTION,
  SHEET_MIN_HEIGHT,
  sheetMaxHeight,
} from '@/utils/sheetLayout';
import { keyboardOverlap } from '@/utils/keyboard';

describe('sheetMaxHeight', () => {
  it('caps at 80% of the window with no keyboard', () => {
    expect(sheetMaxHeight(852, 59, 0)).toBe(Math.round(852 * SHEET_MAX_FRACTION));
    expect(sheetMaxHeight(852, 0, 0)).toBe(Math.round(852 * SHEET_MAX_FRACTION));
  });

  it('clamps to the strip above the keyboard when that is tighter than 80%', () => {
    // iPhone 16-ish: 852pt window, 59pt top inset, 336pt keyboard.
    const expected = 852 - 336 - 59 - SHEET_KEYBOARD_TOP_MARGIN;
    expect(sheetMaxHeight(852, 59, 336)).toBe(expected);
    expect(expected).toBeLessThan(852 * SHEET_MAX_FRACTION);
  });

  it('keeps the 80% cap when a short keyboard leaves more room than the cap', () => {
    expect(sheetMaxHeight(1000, 0, 50)).toBe(Math.round(1000 * SHEET_MAX_FRACTION));
  });

  it('never drops under the floor in landscape with the keyboard up', () => {
    expect(sheetMaxHeight(390, 0, 260)).toBe(SHEET_MIN_HEIGHT);
  });

  it('treats a zero-inset device as having a minimum 12pt top margin', () => {
    const withoutInset = sheetMaxHeight(800, 0, 300);
    const withTinyInset = sheetMaxHeight(800, 12, 300);
    expect(withoutInset).toBe(withTinyInset);
  });
});

describe('keyboardOverlap', () => {
  it('is the window height minus the keyboard top', () => {
    expect(keyboardOverlap(852, 516)).toBe(336);
  });

  it('is zero when the keyboard sits at or below the window bottom', () => {
    expect(keyboardOverlap(852, 852)).toBe(0);
    expect(keyboardOverlap(852, 900)).toBe(0);
  });
});
