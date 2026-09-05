/**
 * Habit deck screen (PRD v3.1 sect 7.3, phase 3).
 *
 * The deck's job is to turn the results dashboard into a decision. Each card
 * offers exactly two answers, the impression analytics have to be countable
 * (the position-1 track rate is the success criterion for the whole ranking
 * signal), and there is always a way out that is not a dismissal.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/utils/analytics', () => {
  const actual = jest.requireActual('@/utils/analytics');
  return { track: jest.fn(), bucketCents: actual.bucketCents };
});

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { DeckScreen } from '@/components/leak-scan/DeckScreen';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';
import type { HabitCandidate } from '@/utils/leakScan/types';

const trackMock = track as jest.MockedFunction<typeof track>;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function candidate(overrides: Partial<HabitCandidate> = {}): HabitCandidate {
  return {
    merchantStem: 'starbucks',
    merchantDisplay: 'Starbucks',
    category: 'Food',
    governClass: 'govern',
    tier: 'solid',
    occurrences: 14,
    activeDays: 12,
    totalCents: 8400,
    annualizedLeakCents: 100800,
    rankScore: 100800,
    topMerchants: ['Starbucks'],
    isBehavioral: true,
    isSubscription: false,
    ...overrides,
  };
}

async function renderDeck(overrides: Partial<React.ComponentProps<typeof DeckScreen>> = {}) {
  const props = {
    candidates: [candidate()],
    spanDays: 30,
    onDismiss: jest.fn(),
    onSeeEverything: jest.fn(),
    onActivated: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  };
  // RTL v14: render() is itself async (matches resultsScreenLadder.test.tsx).
  const view = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <LocaleProvider>
        <CurrencyProvider>
          <ToastProvider>
            <ExpensesProvider>
              <OnboardingProvider>
                <HabitsProvider>
                  <DeckScreen {...props} />
                </HabitsProvider>
              </OnboardingProvider>
            </ExpensesProvider>
          </ToastProvider>
        </CurrencyProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  await act(async () => {});
  return { view, props };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  trackMock.mockClear();
  mockPush.mockClear();
});

afterEach(cleanup);

function shownCalls() {
  return trackMock.mock.calls.filter(([event]) => event === 'deck_card_shown');
}

describe('deck screen', () => {
  it('renders one card per candidate, each with both answers', async () => {
    const { view } = await renderDeck({
      candidates: [
        candidate({ merchantStem: 'a', merchantDisplay: 'Coffee' }),
        candidate({ merchantStem: 'b', merchantDisplay: 'Delivery' }),
      ],
    });

    expect(view.getByText('Coffee.')).toBeTruthy();
    expect(view.getByText('Delivery.')).toBeTruthy();
    expect(view.getAllByRole('button', { name: strings.habitLogging.breakIt })).toHaveLength(2);
    expect(view.getAllByRole('button', { name: strings.habitLogging.notThisOne })).toHaveLength(2);
  });

  it('calls only the first card the biggest leak', async () => {
    const { view } = await renderDeck({
      candidates: [candidate({ merchantStem: 'a' }), candidate({ merchantStem: 'b' })],
    });

    expect(view.getAllByText(strings.leakScan.biggestLeakEyebrow)).toHaveLength(1);
    expect(view.getAllByText(strings.leakScan.deckAlsoEyebrow)).toHaveLength(1);
  });

  it('counts one impression per card, not one per render', async () => {
    const { view } = await renderDeck({
      candidates: [candidate({ merchantStem: 'a' }), candidate({ merchantStem: 'b' })],
    });

    expect(shownCalls()).toHaveLength(2);
    expect(shownCalls()[0][1]).toMatchObject({ position: 1, merchant_category: 'Food', instances: 14 });
    expect(shownCalls()[1][1]).toMatchObject({ position: 2 });

    // A re-render must not inflate the denominator of the position-1 track rate.
    await act(async () => {
      view.rerender(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <ThemeProvider>
            <LocaleProvider>
              <CurrencyProvider>
                <ToastProvider>
                  <ExpensesProvider>
                    <OnboardingProvider>
                      <HabitsProvider>
                        <DeckScreen
                          candidates={[candidate({ merchantStem: 'a' }), candidate({ merchantStem: 'b' })]}
                          spanDays={30}
                          onDismiss={jest.fn()}
                          onSeeEverything={jest.fn()}
                          onActivated={jest.fn()}
                          onBack={jest.fn()}
                        />
                      </HabitsProvider>
                    </OnboardingProvider>
                  </ExpensesProvider>
                </ToastProvider>
              </CurrencyProvider>
            </LocaleProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });

    expect(shownCalls()).toHaveLength(2);
  });

  it('sends a bucketed total, never a raw amount', async () => {
    await renderDeck();
    // D-9: amounts are coarse-bucketed before they leave the device.
    const props = shownCalls()[0][1] as { total_cents_bucket: string };
    expect(typeof props.total_cents_bucket).toBe('string');
    expect(props.total_cents_bucket).not.toBe('8400');
  });

  it('reports and raises a dismissal', async () => {
    const { view, props } = await renderDeck();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitLogging.notThisOne }));
    });

    expect(props.onDismiss).toHaveBeenCalledWith(expect.objectContaining({ merchantStem: 'starbucks' }));
    const results = trackMock.mock.calls.filter(([event]) => event === 'deck_card_result');
    expect(results).toHaveLength(1);
    expect(results[0][1]).toEqual({ position: 1, result: 'dismissed' });
  });

  it('opens the confirm sheet WITHOUT reporting a track', async () => {
    const { view } = await renderDeck();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitLogging.breakIt }));
    });

    // The same Decision-1 sheet the results ladder opens, not a deck-only one.
    expect(view.getByText(strings.habitLogging.startBreakingIt)).toBeTruthy();
    // 'tracked' means a STARTED habit, not an opened sheet: a cancel or a
    // paywall bounce must not count toward the position-1 track rate the
    // ranking criterion is computed from (review round 3, P2-c). The full
    // press-Start-and-report path is covered by the activation flow suite.
    const results = trackMock.mock.calls.filter(([event]) => event === 'deck_card_result');
    expect(results).toHaveLength(0);
  });

  it('cancelling the sheet reports nothing', async () => {
    const { view } = await renderDeck();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitLogging.breakIt }));
    });
    await act(async () => {
      // The sheet's own cancel shares the card's "Not this one" label; the
      // sheet's is mounted last.
      const cancels = view.getAllByRole('button', { name: strings.habitLogging.notThisOne });
      fireEvent.press(cancels[cancels.length - 1]);
    });

    const results = trackMock.mock.calls.filter(([event]) => event === 'deck_card_result');
    expect(results).toHaveLength(0);
  });

  it('always offers a way out that is not a dismissal', async () => {
    const { view, props } = await renderDeck();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.deckSeeEverything }));
    });

    expect(props.onSeeEverything).toHaveBeenCalledTimes(1);
    // Leaving is a choice, so it must not be reported as a rejection.
    expect(trackMock.mock.calls.filter(([e]) => e === 'deck_card_result')).toHaveLength(0);
  });
});
