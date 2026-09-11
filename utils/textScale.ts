/**
 * Dynamic Type policy, in one place.
 *
 * iOS text scaling has two regimes and the app has to treat them differently.
 * Up to XXXL the user is asking for bigger text and everything can simply grow.
 * The five accessibility sizes above it (AX1 at about 1.64x through AX5 at
 * about 3.12x) are asking for something a phone-width row physically cannot
 * give: at AX3 a 15pt label renders near 43pt, so a row holding a name AND an
 * amount side by side has room for roughly two characters of each.
 *
 * Two rules follow, and both are load-bearing:
 *
 * 1. CHROME CAPS, CONTENT DOES NOT. Labels, counts, timestamps and other
 *    metadata cap at `CHROME_MAX_FONT_SCALE`. The thing the user actually came
 *    to read (the merchant, the amount) never caps: someone at AX5 set AX5 on
 *    purpose. 1.5 is not a new number; `components/ui/SegmentedControl.tsx`
 *    and the tab bar have capped there since P2-5.
 *
 * 2. ROWS REFLOW RATHER THAN COMPETE. Where two pieces of CONTENT share a row,
 *    capping either one would be rule 1 backwards. The row becomes a stack
 *    instead, which is what iOS itself does throughout Settings and Mail. That
 *    is what `useAccessibilityTextSize` is for.
 *
 * Why a hook and not a media query: React Native has no CSS, and `fontScale`
 * is per-window and changes live when the user drags the slider in Settings,
 * so it has to be read through `useWindowDimensions` to re-render.
 *
 * NOT a substitute for looking. A reflow that is never seen at AX3 on a device
 * is a guess; every surface using this was walked at
 * `accessibility-extra-extra-extra-large` before it shipped (2026-09-11).
 */
import { useWindowDimensions } from 'react-native';

/**
 * The ceiling for chrome text. Matches SegmentedControl's and the tab bar's
 * existing `maxFontSizeMultiplier`, so the app has one number, not three.
 */
export const CHROME_MAX_FONT_SCALE = 1.5;

/**
 * The boundary between "bigger text" and "accessibility text".
 *
 * iOS's non-accessibility sizes top out at XXXL, about 1.35x. The first
 * accessibility size, AX1, is about 1.64x. 1.5 sits in the gap between them,
 * so this flips exactly when the user crosses into the accessibility range and
 * never merely because they like large text.
 */
const ACCESSIBILITY_SCALE_THRESHOLD = 1.5;

/**
 * True when the user is in one of the five iOS accessibility text sizes.
 *
 * Use it to reflow a row into a stack, never to shrink or hide anything: the
 * point is to give the text the width it is asking for, not to take the
 * request back.
 */
export function useAccessibilityTextSize(): boolean {
  const { fontScale } = useWindowDimensions();
  return fontScale >= ACCESSIBILITY_SCALE_THRESHOLD;
}
