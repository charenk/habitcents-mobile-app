/**
 * Leak Scan results screen (components/leak-scan/ResultsScreen.tsx): pins the
 * paywall placement its free-tier gate routes to (U12b). Before U12b, seven
 * of the app's eight habit-gate entry points shared the bare 'habit_gate'
 * placement string, so the funnel could not tell one gate from another; each
 * now carries its own suffix (utils/analytics.ts PaywallPlacement). This
 * screen's biggest-leak "Break it" gate is habit_gate_scan.
 *
 * A dedicated file rather than an addition to
 * __tests__/resultsScreenLadder.test.tsx, whose fixtures/provider wiring this
 * mirrors: U12b's own instructions keep the ResultsScreen.tsx source diff to
 * the single placement string, since other in-flight units edit that file's
 * other parts; a new test file avoids adding to the same shared spec file.
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
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ResultsScreen } from '@/components/leak-scan/ResultsScreen';
import { saveHabits } from '@/utils/storage';
import { strings } from '@/constants/strings';
import type { HabitCandidate, ScanResult } from '@/utils/leakScan/types';
import type { DetectedHabit, HabitStatus } from '@/types/habit';

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
    merchantStem: 'merchant',
    merchantDisplay: 'Merchant',
    category: 'Food',
    governClass: 'govern',
    tier: 'solid',
    occurrences: 5,
    activeDays: 5,
    totalCents: 5000,
    annualizedLeakCents: 60000,
    rankScore: 60000,
    topMerchants: ['Merchant'],
    ...overrides,
  };
}

function makeScanResult(habits: HabitCandidate[], overrides: Partial<ScanResult> = {}): ScanResult {
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
    coverage: { startISO: '2026-01-01', endISO: '2026-01-30', coveredDays: 30 },
    tier: 'solid',
    gracefulFailure: false,
    ...overrides,
  };
}

// Same fixture shape __tests__/moneyHabitsTab.test.tsx uses for an already-
// active habit, so getActiveHabits() reports one and the free-tier limit
// (1) is already reached before this screen's own "Track this leak" habit is
// added.
function activeHabit(status: HabitStatus, overrides: Partial<DetectedHabit> = {}): DetectedHabit {
  return {
    id: 'h-active',
    name: 'Rideshare Habit',
    description: '$265 on rideshare across 12 buys so far',
    categoryId: 'default-3',
    merchantPattern: 'rideshare',
    averageAmount: 2200,
    frequency: 'daily',
    occurrencesPerPeriod: 1,
    totalMonthlySpend: 26500,
    observedTotal: 26500,
    observedCount: 12,
    spanDays: 60,
    hasReliableRate: true,
    medianAmount: 2200,
    minAmount: 1500,
    maxAmount: 3000,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status,
    sentiment: 'bad',
    discoveredAt: new Date('2026-06-01T12:00:00Z'),
    ...overrides,
  };
}

async function renderResults(result: ScanResult) {
  const view = await render(
    <Providers>
      <ResultsScreen result={result} files={[]} />
    </Providers>
  );
  await act(async () => {});
  return view;
}

beforeEach(() => {
  mockPush.mockClear();
});

afterEach(cleanup);

describe('Leak Scan results: free-tier paywall gate', () => {
  // U12b: pins this call site's placement value (habit_gate_scan), one of
  // five habit-gate placements that used to share the bare 'habit_gate'
  // string (utils/analytics.ts PaywallPlacement).
  it('at the free habit limit, the biggest-leak gate CTA routes to the scan placement', async () => {
    await saveHabits([activeHabit('changing')]);

    const result = makeScanResult([makeCandidate()]);
    const view = await renderResults(result);

    await act(async () => {
      fireEvent.press(view.getByText(strings.habitLogging.breakIt));
    });

    expect(view.getByText(strings.habitLogging.gateTitle)).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByText(strings.habitLogging.gateUpgradeCta));
    });

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=habit_gate_scan');
  });
});
