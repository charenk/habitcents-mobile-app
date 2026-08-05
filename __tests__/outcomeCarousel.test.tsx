/**
 * OutcomeCarousel (OB-5, ADR 0020): the three composed vignette cards that
 * replace welcome.tsx's static value-prop list and How-it-works sheet.
 * Covers the accessibility contract (one label per card, no fake-UI
 * internals exposed as their own node), dots tracking the page after a
 * momentum scroll, and that auto-advance never starts under reduced motion.
 * Timers are faked throughout (mirrors __tests__/toast.test.tsx) so the
 * auto-advance interval is deterministic.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { Dimensions } from 'react-native';
import { render, fireEvent, act, cleanup } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OutcomeCarousel } from '@/components/onboarding/OutcomeCarousel';
import { strings } from '@/constants/strings';

// Mirrors OutcomeCarousel's own CONTENT_GUTTER (24pt each side of
// welcome.tsx's content column) so scroll offsets in this test land on the
// same page boundaries the component computes internally.
const CONTENT_GUTTER = 24;
const { width: windowWidth } = Dimensions.get('window');
const PAGE_WIDTH = windowWidth - CONTENT_GUTTER * 2;

const mockUseReducedMotion = jest.fn(() => false);
jest.mock('@/utils/motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

type RenderApi = Awaited<ReturnType<typeof render>>;

/** Flushes the AccessibilityInfo promise the mount effect kicks off. */
async function renderCarousel(): Promise<RenderApi> {
  let view!: RenderApi;
  await act(async () => {
    view = await render(
      <Providers>
        <OutcomeCarousel />
      </Providers>
    );
  });
  return view;
}

async function momentumScrollTo(view: RenderApi, pageIndex: number) {
  const scrollView = view.getByTestId('outcome-carousel-scroll');
  await act(async () => {
    fireEvent(scrollView, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: pageIndex * PAGE_WIDTH } },
    });
    // The state update this schedules needs a microtask flush to commit
    // before the next query reads the tree.
    await Promise.resolve();
  });
}

/** Advances the faked auto-advance interval and flushes the resulting commit. */
async function advanceBy(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

/** [{backgroundColor}, false | {backgroundColor}] -> one merged style object. */
function flattenStyle(style: unknown): Record<string, unknown> {
  const arr = Array.isArray(style) ? style : [style];
  return Object.assign({}, ...arr.filter(Boolean));
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  mockUseReducedMotion.mockReturnValue(false);
});

describe('OutcomeCarousel', () => {
  it('renders three cards, each carrying exactly one accessible sentence', async () => {
    const view = await renderCarousel();

    // Cards 2 and 3 start off-screen (only page 0 is on screen at rest) and
    // are hidden from assistive tech until scrolled to, per
    // design/PATTERN_VOCABULARY.md's pager rule; includeHiddenElements
    // reaches them here to assert the content exists at all.
    const opts = { includeHiddenElements: true };
    expect(view.getByLabelText(strings.onboarding.valuePropLog, opts)).toBeTruthy();
    expect(view.getByLabelText(strings.onboarding.outcomeSpotLeak, opts)).toBeTruthy();
    expect(view.getByLabelText(strings.onboarding.outcomeKeptCounts, opts)).toBeTruthy();

    // The fake-UI internals (decorative mockup copy) never surface as their
    // own accessible node; only the card's single sentence does.
    expect(view.queryByLabelText(strings.onboarding.outcomeLeakMerchant, opts)).toBeNull();
  });

  it('moves the active dot to match the page after a momentum scroll', async () => {
    const view = await renderCarousel();

    // At rest on page 0, dot 0 is the only active (sage) dot.
    expect(flattenStyle(view.getByTestId('outcome-dot-0').props.style).backgroundColor).not.toEqual(
      flattenStyle(view.getByTestId('outcome-dot-1').props.style).backgroundColor
    );

    await momentumScrollTo(view, 1);

    const dot0 = flattenStyle(view.getByTestId('outcome-dot-0').props.style);
    const dot1 = flattenStyle(view.getByTestId('outcome-dot-1').props.style);
    const dot2 = flattenStyle(view.getByTestId('outcome-dot-2').props.style);
    // Active now moved off dot 0 and onto dot 1; dot 2 stays at rest with dot 0.
    expect(dot1.backgroundColor).not.toEqual(dot0.backgroundColor);
    expect(dot1.backgroundColor).not.toEqual(dot2.backgroundColor);
    expect(dot0.backgroundColor).toEqual(dot2.backgroundColor);
  });

  it('does not start the auto-advance interval when reduced motion is on', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const view = await renderCarousel();

    const before = flattenStyle(view.getByTestId('outcome-dot-0').props.style);

    // Well past several would-be 4s auto-advance ticks.
    await advanceBy(4000 * 4);

    const after = flattenStyle(view.getByTestId('outcome-dot-0').props.style);
    expect(after).toEqual(before);
    // The page never moved, so dots 1 and 2 are both still at rest.
    expect(flattenStyle(view.getByTestId('outcome-dot-1').props.style)).toEqual(
      flattenStyle(view.getByTestId('outcome-dot-2').props.style)
    );
  });

  it('starts the auto-advance interval when motion is not reduced', async () => {
    const view = await renderCarousel();

    await advanceBy(4000);

    // One tick in, the carousel has moved itself to page 1.
    const dot1 = flattenStyle(view.getByTestId('outcome-dot-1').props.style);
    const dot0 = flattenStyle(view.getByTestId('outcome-dot-0').props.style);
    expect(dot1.backgroundColor).not.toEqual(dot0.backgroundColor);
  });
});
