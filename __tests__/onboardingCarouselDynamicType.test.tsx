/**
 * The carousel under Dynamic Type (audit, 2026-09-17).
 *
 * WHAT BROKE. Each beat was a fixed View that centred its children, and the
 * media frame was a hard 9:16 card capped at 380pt. So the only element able to
 * absorb larger text was the text, and it pushed everything below it off the
 * bottom: at AX1 the CTA was sliced in half by the footer, and from AX3 up it
 * was not on the screen at all. The one control the screen exists to offer
 * could not be tapped, which force-skipped every accessibility-text user
 * through onboarding. The hook was sliced mid-word at the same sizes, by the
 * same overflow rather than by anything of its own.
 *
 * WHAT IS PINNED HERE. Three things, each load-bearing on its own:
 *  1. The frame gives up its portrait ratio above the accessibility threshold
 *     (a height-limited 9:16 card also NARROWS, to about 90pt at AX3, which is
 *     a sliver rather than a preview).
 *  2. Line heights are NOT multiplied by fontScale. React Native already
 *     scales lineHeight alongside fontSize, so doing it here applied the scale
 *     twice and the hook's leading came out near double its own text (caught
 *     on the simulator at AX1, after the first pass at this fix).
 *  3. The pending label caps, because it is chrome (utils/textScale rule 1).
 *
 * NOT a substitute for looking, exactly as utils/textScale.ts says of itself.
 * Jest computes no layout, so none of this can prove the CTA is on screen; it
 * pins the properties the fix turns on. The carousel was walked on the iPhone
 * 16 simulator at accessibility-medium through
 * accessibility-extra-extra-extra-large before this landed.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Same seam __tests__/dynamicType.test.tsx uses, and for the same reason: one
// mock drives both the components' own fontScale and the threshold inside
// useAccessibilityTextSize, which reads the identical hook.
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockFontScale }),
}));

import React from 'react';
import { StyleSheet } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingCarousel, BEATS } from '@/components/onboarding/OnboardingCarousel';
import { strings } from '@/constants/strings';
import { CHROME_MAX_FONT_SCALE } from '@/utils/textScale';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * iOS text sizes, by the multiplier they actually apply. XXXL is the largest
 * NON-accessibility size and must keep the portrait card; AX1 is the first
 * accessibility size and is where the CTA used to start being cut.
 */
const SCALES = { default: 1, xxxl: 1.35, ax1: 1.64, ax3: 2.35, ax5: 3.12 };

function setFontScale(fontScale: number) {
  mockFontScale = fontScale;
}

async function renderCarousel() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <OnboardingCarousel onPick={jest.fn()} onSkip={jest.fn()} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type View = Awaited<ReturnType<typeof renderCarousel>>;

function frameStyle(view: View) {
  return StyleSheet.flatten(view.getAllByTestId('beat-media-pending')[0].props.style);
}

function textStyle(view: View, text: string) {
  return StyleSheet.flatten(view.getByText(text).props.style);
}

beforeEach(() => {
  mockFontScale = SCALES.default;
});

afterEach(cleanup);

describe('the media frame', () => {
  it.each([
    ['default', SCALES.default],
    ['XXXL, the largest non-accessibility size', SCALES.xxxl],
  ])('is a portrait card at %s', async (_label, fontScale) => {
    setFontScale(fontScale);
    const view = await renderCarousel();

    const style = frameStyle(view);
    expect(style.aspectRatio).toBeCloseTo(9 / 16);
    expect(style.maxHeight).toBe(380);
  });

  // The ratio is DROPPED rather than shrunk, because width is derived from
  // height here: a frame short enough to leave the CTA on screen at AX3 would
  // be about 90pt wide, too narrow to hold its own label, let alone a
  // recording of a phone screen.
  it('gives up the portrait ratio for a full-width band at accessibility sizes', async () => {
    setFontScale(SCALES.ax1);
    const view = await renderCarousel();

    const style = frameStyle(view);
    expect(style.aspectRatio).toBeUndefined();
    expect(style.width).toBe('100%');
    expect(style.height).toBeLessThan(380);
  });

  // One height across the whole accessibility range, not a shrink curve. What
  // the number buys is room under the hook for the CTA at AX1; a proportional
  // shrink left it about 90pt short there, and no curve makes AX4 or AX5 fit
  // anyway. Each size gets its own case because a manual cleanup() between two
  // renders in one test leaves this suite unable to render again.
  it.each([
    ['AX1', SCALES.ax1],
    ['AX3', SCALES.ax3],
    ['AX5', SCALES.ax5],
  ])('holds one band height at %s', async (_label, fontScale) => {
    setFontScale(fontScale);
    const view = await renderCarousel();

    // A frame that collapsed to nothing would be a layout accident reading as
    // a design decision. If the media should ever disappear at AX sizes, that
    // is a call to make on purpose, with real captures in hand.
    expect(frameStyle(view).height).toBe(120);
  });

  // Chrome, not content: uncapped, this line is what pushed itself out of its
  // own frame once the frame started shrinking.
  it('caps the pending label rather than letting it outgrow the frame', async () => {
    setFontScale(SCALES.ax3);
    const view = await renderCarousel();

    const label = view.getAllByText(strings.onboarding.beatMediaPending)[0];
    expect(label.props.maxFontSizeMultiplier).toBe(CHROME_MAX_FONT_SCALE);
  });
});

describe('the beat copy', () => {
  /**
   * The line heights stay at their 1x values at every text size, and that is
   * the assertion, not an oversight.
   *
   * React Native scales `lineHeight` by the system font scale alongside
   * `fontSize` whenever allowFontScaling is on. A pass at this fix multiplied
   * them here as well, which applied the scale twice: at AX1 the hook's leading
   * came out near double its own text and the copy read as a list of lines
   * rather than a sentence. Written here so the next reader who notices a
   * "missing" scale does not add it back.
   */
  it.each([
    ['default', SCALES.default],
    ['AX1', SCALES.ax1],
    ['AX5', SCALES.ax5],
  ])('leaves both line heights for the platform to scale at %s', async (_label, fontScale) => {
    setFontScale(fontScale);
    const view = await renderCarousel();

    expect(textStyle(view, BEATS[0].headline).lineHeight).toBe(34);
    expect(textStyle(view, BEATS[0].hook).lineHeight).toBe(20);
  });

  // Rule 1 the other way round: the headline and the hook are what the user
  // came to read, so neither may cap. Only chrome caps.
  it('caps neither the headline nor the hook', async () => {
    setFontScale(SCALES.ax3);
    const view = await renderCarousel();

    expect(view.getByText(BEATS[0].headline).props.maxFontSizeMultiplier).toBeUndefined();
    expect(view.getByText(BEATS[0].hook).props.maxFontSizeMultiplier).toBeUndefined();
  });
});
