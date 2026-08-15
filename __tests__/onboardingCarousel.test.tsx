/**
 * Onboarding carousel (PRD v3.1 sect 4, ADR 0026).
 *
 * Replaces __tests__/intentPicker.test.tsx and __tests__/welcomeHero.test.tsx:
 * the picker's three cards became the carousel's three beats and the splash was
 * folded into it, so every behavioural contract those suites pinned is carried
 * here rather than dropped. That contract is the acquisition metric for the
 * whole redesign, which is why it survives the screen it was written against.
 *
 * Carried over: the three intents are reachable by accessible name, each fires
 * onboarding_intent_selected with its own intent, track and break REPLACE into
 * Today with their deep-link params rather than pushing, scan pushes the scan
 * route, and skip fires onboarding_intent_skipped and lands on Today.
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
        <CurrencyProvider>
          <OnboardingProvider>{children}</OnboardingProvider>
        </CurrencyProvider>
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

describe('the three beats', () => {
  it('offers all three at once, each with its own CTA', async () => {
    const view = await renderCarousel();

    expect(view.getByText(strings.onboarding.beatTrackHeadline)).toBeTruthy();
    expect(view.getByText(strings.onboarding.beatScanHeadline)).toBeTruthy();
    expect(view.getByText(strings.onboarding.beatBreakHeadline)).toBeTruthy();
    expect(view.getByRole('button', { name: strings.onboarding.beatTrackCta })).toBeTruthy();
    expect(view.getByRole('button', { name: strings.onboarding.beatScanCta })).toBeTruthy();
    expect(view.getByRole('button', { name: strings.onboarding.beatBreakCta })).toBeTruthy();
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

  it('pushes the scan beat into the real scan flow exactly once', async () => {
    const view = await renderCarousel();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.onboarding.beatScanCta }));
    });

    expect(selectedIntents()).toEqual(['scan']);
    expect(mockPush).toHaveBeenCalledWith('/leak-scan');
    expect(mockPush).toHaveBeenCalledTimes(1);
    // The statements resume effect fires on exactly the doorChosen transition
    // this press causes; unguarded it issued a replace('/leak-scan') alongside
    // the push, double-entering the flow (review round 3, P1-h). The resume is
    // for a COLD START that finds a persisted statements door, and that path
    // is pinned in onboardingStepMachineRevive.test.tsx.
    expect(mockReplace).not.toHaveBeenCalled();
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

    expect(trackMock.mock.calls.filter(([e]) => e === 'onboarding_intent_skipped')).toHaveLength(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});

describe('the rules that do not bend', () => {
  it('never auto-advances', async () => {
    const view = await renderCarousel();

    // No timer moves the pager: the user moves it or it does not move
    // (PRD sect 10). Advancing time must change nothing.
    jest.useFakeTimers();
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    jest.useRealTimers();

    expect(view.getByLabelText(strings.onboarding.beatProgress(1, 3))).toBeTruthy();
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

    expect(view.getAllByTestId('beat-media-pending')).toHaveLength(3);
    expect(view.getAllByText(strings.onboarding.beatMediaPending)).toHaveLength(3);
  });

  it('invents no totals on the way in', async () => {
    const view = await renderCarousel();
    // ADR 0022 still stands: nothing here may show an accumulated figure.
    expect(view.queryByText(/\$\d/)).toBeNull();
  });
});
