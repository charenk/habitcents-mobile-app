/**
 * Onboarding carousel (PRD v3.1 sect 4, ADR 0026).
 *
 * Replaces __tests__/intentPicker.test.tsx and __tests__/welcomeHero.test.tsx:
 * the picker's cards became the carousel's beats and the splash was folded
 * into it, so every behavioural contract those suites pinned is carried here
 * rather than dropped. That contract is the acquisition metric for the whole
 * redesign, which is why it survives the screen it was written against.
 *
 * Two beats since decision 0009, not three: the scan beat is out while the
 * leak scan is dormant behind SCAN_FLOW_ENABLED, because a beat whose CTA
 * cannot start its real workflow is the one thing ADR 0026 forbids. What that
 * removal must not break is pinned below: nothing routes to /leak-scan, no
 * scan copy renders, and the counts the pager derives all follow.
 *
 * Carried over: each intent is reachable by accessible name, fires
 * onboarding_intent_selected with its own intent, REPLACES into Today with its
 * deep-link params rather than pushing, and skip fires
 * onboarding_intent_skipped and lands on Today.
 *
 * New here: no auto-advance, back never steps between beats, and the media
 * frame never renders a mock-up of the app.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import OnboardingWelcomeScreen from '@/app/onboarding/welcome';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';

const trackMock = track as jest.MockedFunction<typeof track>;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <LocaleProvider>
          <CurrencyProvider>
            <OnboardingProvider>{children}</OnboardingProvider>
          </CurrencyProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Async render + async act: the provider loads stored state in a passive
// effect, and the press handlers await context writes before calling router.
async function renderCarousel() {
  const view = await render(
    <Providers>
      <OnboardingWelcomeScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  trackMock.mockClear();
  mockPush.mockClear();
  mockReplace.mockClear();
  mockBack.mockClear();
});

afterEach(cleanup);

function selectedIntents() {
  return trackMock.mock.calls
    .filter(([event]) => event === 'onboarding_intent_selected')
    .map(([, props]) => (props as { intent: string }).intent);
}

describe('the beats', () => {
  it('offers both at once, each with its own CTA', async () => {
    const view = await renderCarousel();

    expect(view.getByText(strings.onboarding.beatTrackHeadline)).toBeTruthy();
    expect(view.getByText(strings.onboarding.beatBreakHeadline)).toBeTruthy();
    expect(view.getByRole('button', { name: strings.onboarding.beatTrackCta })).toBeTruthy();
    expect(view.getByRole('button', { name: strings.onboarding.beatBreakCta })).toBeTruthy();
  });

  // Carried from the retired welcomeHero suite: each beat headline is a
  // heading, not just text.
  it('marks every beat headline as a header', async () => {
    const view = await renderCarousel();

    const headers = view.getAllByRole('header').map((h) => h.props.children);
    expect(headers).toEqual(
      expect.arrayContaining([
        strings.onboarding.beatTrackHeadline,
        strings.onboarding.beatBreakHeadline,
      ])
    );
  });

  it('sends the track beat into Today with the firstLog param, replacing not pushing', async () => {
    const view = await renderCarousel();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.onboarding.beatTrackCta }));
    });

    expect(selectedIntents()).toEqual(['track']);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)?view=spent&firstLog=1');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sends the break beat into Today with the breakEntry param, replacing not pushing', async () => {
    const view = await renderCarousel();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.onboarding.beatBreakCta }));
    });

    expect(selectedIntents()).toEqual(['break']);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)?view=kept&breakEntry=1');
    expect(mockPush).not.toHaveBeenCalled();
  });

  // Decision 0009: the scan beat is gone while the flow is dormant, and the
  // route it used to open now redirects straight back to the app. Onboarding
  // must offer no path to it at all, by CTA or by the cold-start resume that
  // a persisted statements door used to trigger.
  it('offers no route into the dormant scan flow', async () => {
    const view = await renderCarousel();

    expect(view.queryByText(strings.onboarding.beatScanHeadline)).toBeNull();
    expect(view.queryByText(strings.onboarding.beatScanHook)).toBeNull();
    expect(view.queryByText(strings.onboarding.beatScanCta)).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith('/leak-scan');
  });

  it('guards a double tap from starting two workflows', async () => {
    const view = await renderCarousel();
    const cta = view.getByRole('button', { name: strings.onboarding.beatTrackCta });

    await act(async () => {
      fireEvent.press(cta);
      fireEvent.press(cta);
    });

    expect(selectedIntents()).toEqual(['track']);
  });
});

describe('the ghost exit', () => {
  it('reports the skip and lands on Today', async () => {
    const view = await renderCarousel();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.onboarding.skipForNow }));
    });

    const skips = trackMock.mock.calls.filter(([e]) => e === 'onboarding_intent_skipped');
    expect(skips).toHaveLength(1);
    // Payload asserted exactly, not just the event name (carried from the
    // retired intentPicker suite).
    expect(skips[0][1]).toEqual({});
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});

describe('the ghost exit is also the Android back handler', () => {
  // One handler behind two affordances, and completeOnboarding has no
  // idempotency of its own, so an unguarded double press completed onboarding
  // twice (review round 3, P2-4).
  it('completes onboarding once however fast it is pressed twice', async () => {
    const view = await renderCarousel();
    const ghost = view.getByRole('button', { name: strings.onboarding.skipForNow });

    await act(async () => {
      fireEvent.press(ghost);
      fireEvent.press(ghost);
    });

    expect(trackMock.mock.calls.filter(([e]) => e === 'onboarding_intent_skipped')).toHaveLength(1);
    expect(trackMock.mock.calls.filter(([e]) => e === 'onboarding_completed')).toHaveLength(1);
    expect(trackMock.mock.calls.filter(([e]) => e === 'door_chosen')).toHaveLength(1);
  });
});

describe('the rules that do not bend', () => {
  it('never auto-advances', async () => {
    // Fake timers BEFORE the render, not after. Installed afterwards, any
    // interval scheduled during mount (exactly what an auto-advance
    // regression would add) stays bound to real timers, so advancing fake
    // time could not move it and the test could not fail (review round 3,
    // P2-i).
    jest.useFakeTimers();
    try {
      const view = await renderCarousel();

      // No timer moves the pager: the user moves it or it does not move
      // (PRD sect 10). Advancing time must change nothing.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(30000);
      });

      expect(view.getByLabelText(strings.onboarding.beatProgress(1, 2))).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('offers no back affordance, because back never steps between beats', async () => {
    const view = await renderCarousel();

    expect(view.queryByRole('button', { name: strings.common.back })).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
  });

  // ADR 0026's whole point: beats show the real app recorded, or they show
  // nothing. A hand-built scene would drift silently with every redesign.
  it('shows an honest empty frame rather than a mock-up until captures land', async () => {
    const view = await renderCarousel();

    expect(view.getAllByTestId('beat-media-pending')).toHaveLength(2);
    expect(view.getAllByText(strings.onboarding.beatMediaPending)).toHaveLength(2);
  });

  it('invents no totals on the way in', async () => {
    const view = await renderCarousel();
    // ADR 0022 still stands: nothing here may show an accumulated figure.
    // The space-tolerant form is deliberate, it catches "$ 12" too (the
    // narrower /\$\d/ was a weakening carried over from welcomeHero).
    expect(view.queryByText(/\$\s?\d/)).toBeNull();
  });

  // Also carried from welcomeHero: the surfaces the carousel REPLACED must
  // not quietly come back. Their strings all still exist in strings.ts, so
  // nothing else stops them being rendered here again.
  it('renders none of the retired welcome surfaces', async () => {
    const view = await renderCarousel();

    expect(view.queryByText(strings.habitLogging.keptZeroCaption)).toBeNull();
    expect(view.queryByText(strings.onboarding.valuePropLog)).toBeNull();
    expect(view.queryByText(strings.onboarding.outcomeKeptCounts)).toBeNull();
    expect(view.queryByText(strings.onboarding.welcomeHeadline)).toBeNull();
    expect(view.queryByText(strings.onboarding.intentTitle)).toBeNull();
  });
});
