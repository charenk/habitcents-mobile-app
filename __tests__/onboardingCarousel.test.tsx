/**
 * Onboarding carousel (PRD v3.1 sect 4, ADR 0026).
 *
 * Replaces __tests__/intentPicker.test.tsx and __tests__/welcomeHero.test.tsx:
 * the picker's cards became the carousel's beats and the splash was folded
 * into it, so every behavioural contract those suites pinned is carried here
 * rather than dropped. That contract is the acquisition metric for the whole
 * redesign, which is why it survives the screen it was written against.
 *
 * Three beats since arc v2 (2026-09-18, onboarding story arc canvas), in
 * hook-first order: break, track, bills. The scan beat stays out while the
 * leak scan is dormant behind SCAN_FLOW_ENABLED (decision 0009), because a
 * beat whose CTA cannot start its real workflow is the one thing ADR 0026
 * forbids; bills passes that rule by opening the real add-bill sheet on
 * Money > Upcoming. Nothing routing to /leak-scan is still pinned below, and
 * the counts the pager derives all follow beats.length.
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
import { Dimensions } from 'react-native';
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

describe('the beats', () => {
  it('offers all three, each with its own CTA', async () => {
    const view = await renderCarousel();

    expect(view.getByText(strings.onboarding.beatBreakHeadline)).toBeTruthy();
    expect(view.getByText(strings.onboarding.beatTrackHeadline)).toBeTruthy();
    expect(view.getByText(strings.onboarding.beatBillsHeadline)).toBeTruthy();
    expect(view.getByRole('button', { name: strings.onboarding.beatBreakCta })).toBeTruthy();
    expect(view.getByRole('button', { name: strings.onboarding.beatTrackCta })).toBeTruthy();
    expect(view.getByRole('button', { name: strings.onboarding.beatBillsCta })).toBeTruthy();
  });

  // Carried from the retired welcomeHero suite: each beat headline is a
  // heading, not just text.
  it('marks every beat headline as a header', async () => {
    const view = await renderCarousel();

    const headers = view.getAllByRole('header').map((h) => h.props.children);
    expect(headers).toEqual(
      expect.arrayContaining([
        strings.onboarding.beatBreakHeadline,
        strings.onboarding.beatTrackHeadline,
        strings.onboarding.beatBillsHeadline,
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

  // Arc v2's third door: the one beat that lands somewhere other than Today,
  // because the add-bill sheet's real home is Money > Upcoming.
  it('sends the bills beat into Money with the billsEntry param, replacing not pushing', async () => {
    const view = await renderCarousel();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.onboarding.beatBillsCta }));
    });

    expect(selectedIntents()).toEqual(['bills']);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/money?view=upcoming&billsEntry=1');
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

/**
 * The funnel's top (audit, 2026-09-17).
 *
 * `onboarding_started` fires inside completeStep('welcome'), which only runs
 * once a beat is PICKED, so it lands at the same instant as
 * onboarding_intent_selected and there was no event at all for the carousel
 * being seen. That left the pick rate without a denominator and made the second
 * beat, which sits entirely below the fold behind an unprompted swipe,
 * impossible to tell apart from one nobody wanted.
 */
describe('the funnel has a top', () => {
  function events(name: string) {
    return trackMock.mock.calls.filter(([e]) => e === name);
  }

  // Page the horizontal pager by offset. The x is deliberately far past the
  // last beat rather than a computed width: the component clamps to
  // beats.length - 1, so this selects the final beat without the test needing
  // to know the window width.
  // momentumScrollEnd, not scroll: the pager settles on a beat rather than
  // reporting every frame of the drag, which is the whole reason a mid-swipe
  // pixel offset never counts as a view.
  function pageTo(view: Awaited<ReturnType<typeof render>>, x: number) {
    fireEvent(view.getByTestId('onboarding-pager'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x, y: 0 } },
    });
  }

  it('reports the carousel being shown, before anything is picked', async () => {
    await renderCarousel();

    expect(events('onboarding_carousel_shown')).toHaveLength(1);
    expect(events('onboarding_carousel_shown')[0][1]).toEqual({});
    // The distinction the event exists for: nothing has been chosen yet.
    expect(events('onboarding_started')).toHaveLength(0);
    expect(events('onboarding_intent_selected')).toHaveLength(0);
  });

  // The denominator has to survive the outcome it is measuring, including the
  // one where the user leaves immediately.
  it('reports it even when the user skips straight out', async () => {
    const view = await renderCarousel();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.onboarding.skipForNow }));
    });

    expect(events('onboarding_carousel_shown')).toHaveLength(1);
  });

  it('counts the first beat as viewed on arrival, not on a swipe', async () => {
    await renderCarousel();

    const viewed = events('onboarding_beat_viewed');
    expect(viewed).toHaveLength(1);
    expect(viewed[0][1]).toEqual({ intent: 'break', index: 0 });
  });

  it('counts the later beats only once each is actually paged to', async () => {
    const view = await renderCarousel();
    const { width } = Dimensions.get('window');

    expect(events('onboarding_beat_viewed')).toHaveLength(1);

    await act(async () => {
      pageTo(view, width);
      pageTo(view, 100000);
    });

    expect(events('onboarding_beat_viewed').map(([, p]) => p)).toEqual([
      { intent: 'break', index: 0 },
      { intent: 'track', index: 1 },
      { intent: 'bills', index: 2 },
    ]);
  });

  // "Seen once" is the funnel question, so swiping back and forth must not
  // inflate any beat's count.
  it('counts each beat once however often it is paged back to', async () => {
    const view = await renderCarousel();
    const { width } = Dimensions.get('window');

    await act(async () => {
      pageTo(view, width);
      pageTo(view, 0);
      pageTo(view, width);
      pageTo(view, 100000);
      pageTo(view, 0);
    });

    expect(events('onboarding_beat_viewed')).toHaveLength(3);
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

      expect(view.getByLabelText(strings.onboarding.beatProgress(1, 3))).toBeTruthy();
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

    expect(view.getAllByTestId('beat-media-pending')).toHaveLength(3);
    expect(view.getAllByText(strings.onboarding.beatMediaPending)).toHaveLength(3);
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
