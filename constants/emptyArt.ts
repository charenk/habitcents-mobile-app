/**
 * The zero-state illustration registry (ADR 0036).
 *
 * Every pane-level zero state names one piece of art from here. The lookup is
 * a closed record rather than a raw ImageSourcePropType on the prop so that
 * call sites stay declarative ("this pane is the kept pane"), every require()
 * lives in one file, and a typo is a type error instead of a blank frame.
 *
 * The same reasoning as components/ui/Icon.tsx's GLYPHS whitelist: art that
 * can only be named, never constructed at a call site.
 *
 * Sizing: the PNGs are 288px square, which is 3x the 96pt EMPTY_ART_SIZE below.
 * They are downscaled exports of 1000px originals; the originals are not
 * committed. Re-export with:
 *   sips -z 288 288 <source>.png --out assets/empty-states/<slug>.png
 *
 * Three of the seven are placeholders standing in for art that has not been
 * sourced yet, recorded in ADR 0036 and in design/decisions/components/
 * EmptyState.md: 'money-upcoming' wants a calendar or clock rather than a
 * calculator, 'money-habits' wants a dripping tap (the product's own word is
 * "leak") rather than a dartboard, and 'insights-month' wants a pie or bar
 * chart rather than a book. Swapping one is a single file replacement here;
 * no call site changes.
 */

/** Rendered edge length in points. One scale for every zero state. */
export const EMPTY_ART_SIZE = 96;

export const EMPTY_ART = {
  'today-spent': require('@/assets/empty-states/today-spent.png'),
  'today-kept': require('@/assets/empty-states/today-kept.png'),
  'money-spent': require('@/assets/empty-states/money-spent.png'),
  'money-upcoming': require('@/assets/empty-states/money-upcoming.png'),
  'money-habits': require('@/assets/empty-states/money-habits.png'),
  'insights-month': require('@/assets/empty-states/insights-month.png'),
  'insights-scan': require('@/assets/empty-states/insights-scan.png'),
} as const;

export type EmptyArtName = keyof typeof EMPTY_ART;
