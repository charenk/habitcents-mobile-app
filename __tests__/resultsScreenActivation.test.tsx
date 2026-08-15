/**
 * Scan-route activation (PRD v3.1 sect 7.5, phase 1).
 *
 * Door 2 could complete onboarding only from "Bring in your last 30 days" or
 * the graceful-failure hand-log exit. A user who scanned a statement, tapped
 * Break it on their biggest leak, started the habit, and then left was still
 * mid-onboarding: @habitcents_onboarded stayed unset, so the next cold start
 * bounced them from app/index.tsx back to /onboarding/welcome and on into an
 * empty /leak-scan. That is exactly the relaunch loop useCompleteScanOnboarding
 * was written to prevent, reached through a path it did not cover.
 *
 * Starting a habit is the strongest activation the scan route has (a habit
 * exists and carries a skip value), so it completes onboarding too.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ResultsScreen } from '@/components/leak-scan/ResultsScreen';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';
import { saveHabits } from '@/utils/storage';
import type { DetectedHabit } from '@/types/habit';
import type { HabitCandidate, ScanResult } from '@/utils/leakScan/types';

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
          <ToastProvider>
            <ExpensesProvider>
              <OnboardingProvider>
                <HabitsProvider>{children}</HabitsProvider>
              </OnboardingProvider>
            </ExpensesProvider>
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function makeCandidate(overrides: Partial<HabitCandidate> = {}): HabitCandidate {
  return {
    merchantStem: 'starbucks',
    merchantDisplay: 'Starbucks',
    category: 'Food',
    governClass: 'govern',
    tier: 'solid',
    occurrences: 5,
    activeDays: 5,
    totalCents: 5000,
    annualizedLeakCents: 60000,
    rankScore: 60000,
    topMerchants: ['Starbucks'],
    // Default fixture is an ordinary behavioral leak, the deck's own shape.
    isBehavioral: true,
    isSubscription: false,
    ...overrides,
  };
}

function makeScanResult(habits: HabitCandidate[]): ScanResult {
  return {
    importId: 'imp-1',
    status: 'ok',
    files: [],
    rows: [],
    questions: [],
    transfers: [],
    refunds: [],
    duplicatesMerged: 0,
    recurring: [],
    habits,
    coverage: { startISO: '2026-01-01', endISO: '2026-01-30', spanDays: 30, coveredDays: 30 },
    tier: 'solid',
    gracefulFailure: false,
  };
}

async function renderResults(result: ScanResult) {
  // RTL v14: render() is itself async (matches resultsScreenLadder.test.tsx).
  const view = await render(
    <Providers>
      <ResultsScreen result={result} files={[]} />
    </Providers>
  );
  // Flush the providers' passive storage-load effects (rules, expenses, habits).
  await act(async () => {});
  return view;
}

type ResultsView = Awaited<ReturnType<typeof renderResults>>;

/** Break it on the hero, then Start breaking it on the pick-one sheet. */
async function trackTheLeak(view: ResultsView) {
  await act(async () => {
    fireEvent.press(view.getByRole('button', { name: strings.habitLogging.breakIt }));
  });
  await act(async () => {
    fireEvent.press(view.getByText(strings.habitLogging.startBreakingIt));
  });
}

function completedCalls() {
  return trackMock.mock.calls.filter(([event]) => event === 'onboarding_completed');
}

describe('results screen: starting a habit completes onboarding', () => {
  beforeEach(async () => {
    // The providers persist through the AsyncStorage mock, which is module
    // state shared across tests in this file. Without a wipe, the habit
    // started by the first test survives into the next one, trips the
    // free-tier ceiling, and the pick-one sheet renders its gated variant.
    await AsyncStorage.clear();
    trackMock.mockClear();
    mockPush.mockClear();
  });

  afterEach(cleanup);

  it('completes onboarding when the user starts breaking their biggest leak', async () => {
    const view = await renderResults(makeScanResult([makeCandidate()]));

    expect(completedCalls()).toHaveLength(0);

    await trackTheLeak(view);

    expect(completedCalls()).toHaveLength(1);
  });

  it('reports habitStarted on the completion event', async () => {
    const view = await renderResults(makeScanResult([makeCandidate()]));

    await trackTheLeak(view);

    // markHabitStarted has to land before completeOnboarding reads it off the
    // context ref, otherwise this silently reports false forever.
    const [, props] = completedCalls()[0];
    expect(props).toMatchObject({ habitStarted: true });
  });

  // Both scan exits now complete onboarding, so a user who starts a habit AND
  // then imports must still be counted once. The guard is
  // useCompleteScanOnboarding's own isOnboardingComplete check; without it the
  // funnel would double-count every thorough user.
  it('fires the completion once when a habit start is followed by the import', async () => {
    const view = await renderResults(makeScanResult([makeCandidate()]));

    await trackTheLeak(view);
    expect(completedCalls()).toHaveLength(1);

    await act(async () => {
      fireEvent.press(view.getByText(strings.leakScan.bringInLastDays(30)));
    });

    expect(completedCalls()).toHaveLength(1);
  });

  // The reverse order, which was the only working path before this change.
  it('fires the completion once when the import comes first', async () => {
    const view = await renderResults(makeScanResult([makeCandidate()]));

    await act(async () => {
      fireEvent.press(view.getByText(strings.leakScan.bringInLastDays(30)));
    });
    expect(completedCalls()).toHaveLength(1);

    await trackTheLeak(view);

    expect(completedCalls()).toHaveLength(1);
  });
});


describe('the scan route against an existing habit (review round 3, P1-2/P1-3)', () => {
  // Same reset the first describe carries: the AsyncStorage mock is module
  // state, so without this the previous test's started habit and completed
  // onboarding leak into these.
  beforeEach(async () => {
    await AsyncStorage.clear();
    trackMock.mockClear();
    mockPush.mockClear();
  });
  afterEach(cleanup);

  /** A habit already mid-break for the fixture merchant, stored under a
   *  DETECTION id, not the scan id the bridge would derive. */
  async function seedBreakingHabit(): Promise<void> {
    const habit = {
      id: 'habit-legacy-1',
      name: 'Starbucks',
      description: '',
      categoryId: 'Food',
      merchantPattern: 'starbucks',
      averageAmount: 600,
      frequency: 'daily',
      occurrencesPerPeriod: 1,
      totalMonthlySpend: 18000,
      observedTotal: 5000,
      observedCount: 5,
      spanDays: 30,
      hasReliableRate: true,
      medianAmount: 600,
      minAmount: 600,
      maxAmount: 600,
      trend: 'stable',
      trendPercentage: 0,
      triggers: [],
      status: 'changing',
      sentiment: 'neutral',
      discoveredAt: new Date('2026-08-01'),
    } as unknown as DetectedHabit;
    await saveHabits([habit]);
  }

  it('toasts instead of dead-ending when the merchant is already being broken', async () => {
    await seedBreakingHabit();
    const view = await renderResults(makeScanResult([makeCandidate()]));

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitLogging.breakIt }));
    });

    // addScanHabit resolves to the EXISTING habit (different id, already
    // changing). The old code discarded that return value and asked
    // startBreakingHabit for 'scan-habit-starbucks', which does not exist:
    // an unhandled throw with the sheet stuck open. Now: the same toast and
    // the same refusal to append a second goal as Today's break sheet.
    expect(view.getByText(strings.today.alreadyBreakingToast)).toBeTruthy();
    expect(view.queryByText(strings.habitLogging.startBreakingIt)).toBeNull();
    const started = trackMock.mock.calls.filter(([e]) => e === 'habit_tracking_started');
    expect(started).toHaveLength(0);
  });
});

describe('double-tapping Start (review round 3, P1-1)', () => {
  // Same reset the first describe carries: the AsyncStorage mock is module
  // state, so without this the previous test's started habit and completed
  // onboarding leak into these.
  beforeEach(async () => {
    await AsyncStorage.clear();
    trackMock.mockClear();
    mockPush.mockClear();
  });
  afterEach(cleanup);

  it('starts exactly one habit and completes onboarding exactly once', async () => {
    const view = await renderResults(makeScanResult([makeCandidate()]));

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitLogging.breakIt }));
    });
    const start = view.getByRole('button', { name: strings.habitLogging.startBreakingIt });
    await act(async () => {
      // Two presses in one commit: both land before the first write resolves,
      // which is exactly the race the in-flight ref exists for. Unguarded,
      // this raced two goal writes and double-fired onboarding_completed.
      fireEvent.press(start);
      fireEvent.press(start);
    });

    const started = trackMock.mock.calls.filter(([e]) => e === 'habit_tracking_started');
    expect(started).toHaveLength(1);
    const completed = trackMock.mock.calls.filter(([e]) => e === 'onboarding_completed');
    expect(completed).toHaveLength(1);
  });
});
