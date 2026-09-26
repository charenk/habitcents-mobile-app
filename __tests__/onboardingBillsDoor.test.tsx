/**
 * Bills door (arc v2, 2026-09-18): the carousel's third beat lands Money on
 * ?view=upcoming&billsEntry=1 and opens the real AddUpcomingSheet, the same
 * shape as Today's firstLog/breakEntry doors and pinned the same way
 * door1FirstRun/door3BreakSheet pin those.
 *
 * Harness: real data providers (the moneyPager harness), expo-router mocked
 * for params, OnboardingContext mocked with directly observable mutators
 * (the door3 pattern), because the contract under test is exactly what Money
 * calls on it: the isOnboardingComplete() guard in, completeOnboarding() out.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

let mockParams: { view?: string; billsEntry?: string } = {};
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useLocalSearchParams: () => mockParams,
}));

let mockOnboardingComplete = false;
const mockCompleteOnboarding = jest.fn(async () => {});
jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    onboardingState: { doorChosen: 'fresh' },
    isLoading: false,
    isOnboardingComplete: () => mockOnboardingComplete,
    completeOnboarding: mockCompleteOnboarding,
  }),
}));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { RemindersProvider } from '@/contexts/RemindersContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ToastProvider } from '@/components/ui/Toast';
import MoneyScreen from '@/app/(tabs)/money';
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
          <CategoriesProvider>
            <ExpensesProvider>
            <RemindersProvider>
              <HabitsProvider>
                <ToastProvider>{children}</ToastProvider>
              </HabitsProvider>
            </RemindersProvider>
            </ExpensesProvider>
          </CategoriesProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderMoney() {
  const view = await render(
    <Providers>
      <MoneyScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockParams = {};
  mockOnboardingComplete = false;
  mockCompleteOnboarding.mockClear();
  mockRouterPush.mockClear();
  trackMock.mockClear();
});

afterEach(cleanup);

describe('the bills door', () => {
  it('opens the real add-bill sheet from the carousel deep link', async () => {
    mockParams = { view: 'upcoming', billsEntry: '1' };
    const view = await renderMoney();

    expect(view.getByText(strings.addUpcoming.title)).toBeTruthy();
  });

  it('completes onboarding exactly once when the sheet closes, saved or not', async () => {
    mockParams = { view: 'upcoming', billsEntry: '1' };
    const view = await renderMoney();

    // The Sheet's scrim/backdrop dismiss (components/ui/Sheet.tsx), the same
    // path a swipe-down or tap-outside takes. Closing WITHOUT saving still
    // completes: the user is in the app, and onboarding must not trap them.
    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.common.close));
    });

    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });

  // The same guard the other two doors carry: a stale param in history must
  // never reopen a coach flow once onboarding is actually done.
  it('a stale billsEntry never reopens the door once onboarding is done', async () => {
    mockOnboardingComplete = true;
    mockParams = { view: 'upcoming', billsEntry: '1' };
    const view = await renderMoney();

    expect(view.queryByText(strings.addUpcoming.title)).toBeNull();
    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });

  // A deep link is not a user switch: it selects the pane but neither marks
  // the pager interacted nor reports money_view_switched.
  it('the view param selects the pane without reporting a user switch', async () => {
    mockParams = { view: 'upcoming' };
    await renderMoney();

    const switches = trackMock.mock.calls.filter(([e]) => e === 'money_view_switched');
    expect(switches).toHaveLength(0);
  });
});
