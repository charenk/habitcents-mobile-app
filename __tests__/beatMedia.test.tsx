/**
 * Beat media (ADR 0026, phase 6).
 *
 * The ADR's fourth condition is that reduced motion renders a static poster
 * frame per beat. Neither the poster branch nor the reduced-motion branch was
 * reachable from any test: no captures exist yet, so every render took the
 * pending-frame path, and the `beats` seam built on OnboardingCarousel for
 * exactly this purpose went unused (review round 3, P2-l). The condition was an
 * unverified claim.
 *
 * These tests supply assets through that seam, so the branches are exercised
 * before any real capture lands.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

let mockReduceMotion = false;
jest.mock('@/utils/motion', () => ({
  ...jest.requireActual('@/utils/motion'),
  useReducedMotion: () => mockReduceMotion,
}));

import React from 'react';
import { cleanup, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingCarousel, BEATS, type Beat } from '@/components/onboarding/OnboardingCarousel';
import { strings } from '@/constants/strings';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The real beats, with a capture attached to each. */
const CAPTURED: Beat[] = BEATS.map((b) => ({
  ...b,
  asset: { poster: { uri: `${b.intent}-poster.png` } },
}));

async function renderCarousel(beats?: Beat[]) {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <OnboardingCarousel onPick={jest.fn()} onSkip={jest.fn()} beats={beats} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  mockReduceMotion = false;
});
afterEach(cleanup);

describe('before any capture exists', () => {
  it('shows an honest empty frame, never a mock-up of the app', async () => {
    const view = await renderCarousel();

    expect(view.getAllByTestId('beat-media-pending')).toHaveLength(3);
    expect(view.getAllByText(strings.onboarding.beatMediaPending)).toHaveLength(3);
  });
});

describe('once captures land', () => {
  it('renders the poster for every beat and drops the pending frame', async () => {
    const view = await renderCarousel(CAPTURED);

    expect(view.getAllByTestId('beat-media-poster')).toHaveLength(3);
    expect(view.queryAllByTestId('beat-media-pending')).toHaveLength(0);
    expect(view.queryByText(strings.onboarding.beatMediaPending)).toBeNull();
  });

  it('names each poster with its beat headline for VoiceOver', async () => {
    const view = await renderCarousel(CAPTURED);

    expect(view.getByLabelText(strings.onboarding.beatTrackHeadline)).toBeTruthy();
    expect(view.getByLabelText(strings.onboarding.beatScanHeadline)).toBeTruthy();
    expect(view.getByLabelText(strings.onboarding.beatBreakHeadline)).toBeTruthy();
  });

  // ADR 0026 condition 4. The poster is not a placeholder for the video, it IS
  // the reduced-motion rendering, which is why a beat without one cannot ship.
  it('renders the static frame under reduced motion', async () => {
    mockReduceMotion = true;
    const view = await renderCarousel(CAPTURED);

    expect(view.getAllByTestId('beat-media-static')).toHaveLength(3);
    expect(view.queryAllByTestId('beat-media-poster')).toHaveLength(0);
  });
});
