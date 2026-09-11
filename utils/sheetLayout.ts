/**
 * Sheet height rule (Charen, 2026-09-10): a drawer never takes the full
 * screen or extends past 80% of the window, and with the software keyboard up
 * it is clamped to the visible strip above the keyboard instead of being
 * pushed off the top. Pure math, kept out of the component so Jest can pin it
 * without rendering.
 *
 * Reading chosen for the keyboard case: clamp to the remaining visible area
 * minus a fixed top margin, still never above the 80% cap. A proportional
 * "80% of what's left" would waste scarce space when the keyboard already
 * owns a third of the screen; the fixed margin is what keeps the handle
 * visibly reachable and says "not fullscreen".
 */

export const SHEET_MAX_FRACTION = 0.8;

/** Breathing room kept below the status bar / island when the keyboard is up. */
export const SHEET_KEYBOARD_TOP_MARGIN = 24;

/**
 * Floor so landscape plus keyboard never collapses the panel into a sliver.
 * A sheet this short scrolls its body; that is the intended failure mode.
 */
export const SHEET_MIN_HEIGHT = 220;

export function sheetMaxHeight(
  windowHeight: number,
  topInset: number,
  keyboardHeight: number
): number {
  const cap = SHEET_MAX_FRACTION * windowHeight;
  if (keyboardHeight <= 0) return Math.round(cap);
  const remaining =
    windowHeight - keyboardHeight - Math.max(topInset, 12) - SHEET_KEYBOARD_TOP_MARGIN;
  return Math.round(Math.max(SHEET_MIN_HEIGHT, Math.min(cap, remaining)));
}
