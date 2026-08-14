/**
 * Money > Habits tab (ADR 0019 DI-8). Money gets a third segment that manages
 * every leak and habit, next to Spent and Upcoming: same rows Insights shows
 * in "Your leaks" (components/insights/LeaksCard.tsx), reused via the shared
 * HabitLeakRow, with the identical pick-one sheet and free-tier gate wired at
 * the screen level.
 *
 * Provider wiring mirrors __tests__/profile.test.tsx (SafeAreaProvider with
 * initialMetrics + ThemeProvider + CurrencyProvider), plus CategoriesProvider,
 * ExpensesProvider and HabitsProvider because the screen reads all three, and
 * ToastProvider because EditExpenseSheet (mounted unconditionally by the
 * screen for the Spent tab) calls useToast().
 * Habits are seeded straight into AsyncStorage via utils/storage.saveHabits
 * before render, the same seam HabitsContext itself reads on mount.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ToastProvider } from '@/components/ui/Toast';
import MoneyScreen from '@/app/(tabs)/money';
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
          <CategoriesProvider>
            <ExpensesProvider>
              <HabitsProvider>
                <ToastProvider><OnboardingProvider>{children}</OnboardingProvider></ToastProvider>
              </HabitsProvider>
            </ExpensesProvider>
          </CategoriesProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// categoryId 'default-3' is Food's id under CategoriesContext's
// initializeDefaultCategories (DEFAULT_CATEGORIES index 3), so the Habits
// tab resolves a real category name/emoji the same way Insights does.
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

type View = Awaited<ReturnType<typeof render>>;

async function renderMoney(): Promise<View> {
  const view = await render(
    <Providers>
      <MoneyScreen />
    </Providers>
  );
  // Flush the providers' storage-load effects.
  await act(async () => {});
  return view;
}

/**
 * One tap. Wrapped in act because the sheet's state updates land inside a
 * Modal, which React 18 does not flush from a bare fireEvent here (same
 * pattern as __tests__/logExpenseSheet.test.tsx's `tap`).
 */
async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

async function openHabitsSegment(view: View): Promise<void> {
  const tab = view.getByRole('tab', {
    name: new RegExp(`^${strings.money.segmentHabits},`),
  });
  await tap(tab);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
});

afterEach(cleanup);

describe('Money > Habits tab', () => {
  it('renders a discovered and a changing habit with their correct actions', async () => {
    const discovered = habit('discovered', { id: 'h-discovered', name: 'Coffee Habit' });
    const changing = habit('changing', {
      id: 'h-changing',
      name: 'Rideshare Habit',
      totalMonthlySpend: 26500,
    });
    await saveHabits([discovered, changing]);

    const view = await renderMoney();
    await openHabitsSegment(view);

    expect(view.getByText('Coffee Habit')).toBeTruthy();
    expect(view.getByText('Rideshare Habit')).toBeTruthy();
    expect(
      view.getByRole('button', { name: `${strings.insights.leakActionBreak}, Coffee Habit` })
    ).toBeTruthy();
    expect(
      view.getByRole('button', { name: `${strings.insights.leakActionBreaking}, Rideshare Habit` })
    ).toBeTruthy();

    // Managed count is active habits only (tracking/changing): the discovered
    // leak never counts toward "managed" or the total.
    expect(view.getByText(strings.money.habitsManagedSummary(1, '$265.00'))).toBeTruthy();
  });

  it('opens the pick-one sheet when Break it is tapped', async () => {
    const discovered = habit('discovered', { id: 'h-discovered', name: 'Coffee Habit' });
    await saveHabits([discovered]);

    const view = await renderMoney();
    await openHabitsSegment(view);

    const breakButton = view.getByRole('button', {
      name: `${strings.insights.leakActionBreak}, Coffee Habit`,
    });
    await tap(breakButton);

    expect(view.getByText(strings.habitLogging.pickOneNewLeak, { exact: false })).toBeTruthy();
    expect(view.getByRole('button', { name: strings.habitLogging.startBreakingIt })).toBeTruthy();
  });

  // U12b: pins this call site's placement value (habit_gate_money), one of
  // five habit-gate placements that used to share the bare 'habit_gate'
  // string (utils/analytics.ts PaywallPlacement).
  it('at the free habit limit, the gate CTA routes to the money placement', async () => {
    const active = habit('changing', { id: 'h-active', name: 'Rideshare Habit' });
    const discovered = habit('discovered', { id: 'h-discovered', name: 'Coffee Habit' });
    await saveHabits([active, discovered]);

    const view = await renderMoney();
    await openHabitsSegment(view);

    const breakButton = view.getByRole('button', {
      name: `${strings.insights.leakActionBreak}, Coffee Habit`,
    });
    await tap(breakButton);

    expect(view.getByText(strings.habitLogging.gateTitle)).toBeTruthy();
    await tap(view.getByText(strings.habitLogging.gateUpgradeCta));

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=habit_gate_money');
  });

  it('pushes the habit detail route when Breaking is tapped', async () => {
    const changing = habit('changing', { id: 'h-changing', name: 'Rideshare Habit' });
    await saveHabits([changing]);

    const view = await renderMoney();
    await openHabitsSegment(view);

    const breakingChip = view.getByRole('button', {
      name: `${strings.insights.leakActionBreaking}, Rideshare Habit`,
    });
    await tap(breakingChip);

    expect(mockPush).toHaveBeenCalledWith('/habit/h-changing');
  });

  it('shows the reused Insights empty copy when there are no habits', async () => {
    const view = await renderMoney();
    await openHabitsSegment(view);

    expect(view.getByText(strings.insights.leaksEmptyTitle)).toBeTruthy();
    expect(view.getByText(strings.insights.leaksEmptyBody)).toBeTruthy();
  });
});
