/**
 * Logging an expense opens where you already are (Charen, 2026-09-10).
 *
 * Money > Spent and both of Insights' empty-state CTAs used to call
 * `router.navigate('/(tabs)?view=spent&sheet=log')`, which changed tab, pane
 * and sheet in one frame and left the user on Today holding a list they had
 * not asked for. `ExpenseSheet` owns `addExpense`, the haptic, the toast and
 * its own close, so it behaves identically wherever it is mounted; the jump
 * bought nothing and cost the user their place.
 *
 * What this file pins is exactly that: the CTA opens the sheet in place and
 * navigates nowhere. Insights' own coverage lives in insightsFirstScan; this
 * is Money's, which had none, plus the leaks CTA on Insights.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
  useFocusEffect: () => {},
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import { ToastProvider } from '@/components/ui/Toast';
import MoneyScreen from '@/app/(tabs)/money';
import InsightsScreen from '@/app/(tabs)/insights';
import { strings } from '@/constants/strings';

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
                <ReportsProvider>
                  <ToastProvider>
                    <OnboardingProvider>{children}</OnboardingProvider>
                  </ToastProvider>
                </ReportsProvider>
              </HabitsProvider>
            </ExpensesProvider>
          </CategoriesProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderScreen(screen: React.ReactElement) {
  const view = await render(<Providers>{screen}</Providers>);
  await act(async () => {});
  return view;
}

afterEach(() => {
  cleanup();
  mockPush.mockClear();
  mockNavigate.mockClear();
});

describe('logging opens in place, not on Today', () => {
  it('Money > Spent: the empty-state CTA opens the log sheet without navigating', async () => {
    const view = await renderScreen(<MoneyScreen />);

    // Spent is Money's first segment, so its empty state is on screen with
    // no expenses stored.
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.money.spentEmptyCta }));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(view.getByText(strings.expenseSheet.logEyebrow)).toBeTruthy();
  });

  it('Money > Habits: the break CTA opens the break sheet without navigating', async () => {
    const view = await renderScreen(<MoneyScreen />);

    // Habits is Money's third segment, so select it before reaching its
    // empty-state CTA.
    await act(async () => {
      fireEvent.press(view.getByText(strings.money.segmentHabits));
    });
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.money.habitsEmptyCta }));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(view.getByText(strings.onboarding.breakSheetTitle)).toBeTruthy();
  });

  it("Insights > leaks: the empty-state CTA opens the log sheet without navigating", async () => {
    const view = await renderScreen(<InsightsScreen />);

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.insights.leaksEmptyCta }));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(view.getByText(strings.expenseSheet.logEyebrow)).toBeTruthy();
  });
});
