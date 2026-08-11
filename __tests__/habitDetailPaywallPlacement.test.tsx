/**
 * Habit detail screen (app/habit/[id].tsx): pins the paywall placement its
 * free-tier gate routes to (U12b). Before U12b, seven of the app's eight
 * habit-gate entry points shared the bare 'habit_gate' placement string, so
 * the funnel could not tell one gate from another; each now carries its own
 * suffix (utils/analytics.ts PaywallPlacement). This screen's "Start
 * breaking it" gate is habit_gate_detail.
 *
 * Provider wiring mirrors __tests__/insightsFirstScan.test.tsx: HabitsContext
 * only depends on CurrencyContext (no Expenses/Categories needed here), plus
 * ToastProvider because the screen calls useToast().
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
let mockParams: { id: string } = { id: 'h-detail' };
jest.mock('expo-router', () => {
  const react = require('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    useLocalSearchParams: () => mockParams,
    // No navigator in a unit test: run the focus effect once on mount, the
    // same stand-in __tests__/insightsFirstScan.test.tsx uses.
    useFocusEffect: (callback: () => void | (() => void)) => {
      react.useEffect(() => {
        return callback();
      }, []);
    },
  };
});

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ToastProvider } from '@/components/ui/Toast';
import HabitDetailScreen from '@/app/habit/[id]';
import { saveHabits } from '@/utils/storage';
import { strings } from '@/constants/strings';
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
          <HabitsProvider>
            <ToastProvider>{children}</ToastProvider>
          </HabitsProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Same fixture shape __tests__/moneyHabitsTab.test.tsx and
// __tests__/insightsFirstScan.test.tsx use for the identical leak row.
function habit(status: HabitStatus, overrides: Partial<DetectedHabit> = {}): DetectedHabit {
  return {
    id: 'h1',
    name: 'Coffee Habit',
    description: '$87 on coffee across 5 buys so far',
    categoryId: 'default-3',
    merchantPattern: 'coffee',
    averageAmount: 900,
    frequency: 'daily',
    occurrencesPerPeriod: 1,
    totalMonthlySpend: 4500,
    observedTotal: 8700,
    observedCount: 5,
    spanDays: 39,
    hasReliableRate: true,
    medianAmount: 900,
    minAmount: 400,
    maxAmount: 1200,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status,
    sentiment: 'bad',
    discoveredAt: new Date('2026-08-04T12:00:00Z'),
    ...overrides,
  };
}

async function renderDetail(): Promise<Awaited<ReturnType<typeof render>>> {
  const view = await render(
    <Providers>
      <HabitDetailScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

beforeEach(() => {
  mockPush.mockClear();
});

afterEach(cleanup);

describe('Habit detail: free-tier paywall gate', () => {
  // U12b: pins this call site's placement value (habit_gate_detail), one of
  // five habit-gate placements that used to share the bare 'habit_gate'
  // string (utils/analytics.ts PaywallPlacement).
  it('at the free habit limit, the gate CTA routes to the detail placement', async () => {
    const active = habit('changing', { id: 'h-active', name: 'Rideshare Habit' });
    const discovered = habit('discovered', { id: 'h-detail', name: 'Coffee Habit' });
    mockParams = { id: 'h-detail' };
    await saveHabits([active, discovered]);

    const view = await renderDetail();

    const startBreaking = view.getByText(strings.habitLogging.startBreakingIt);
    await act(async () => {
      fireEvent.press(startBreaking);
    });

    expect(view.getByText(strings.habitLogging.gateTitle)).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByText(strings.habitLogging.gateUpgradeCta));
    });

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=habit_gate_detail');
  });
});
