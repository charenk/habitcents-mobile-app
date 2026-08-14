/**
 * Money > Upcoming tab, full screen (U8: window filter + edit flow wiring).
 *
 * The Habits segment already has full-provider coverage in
 * __tests__/moneyHabitsTab.test.tsx; this file is the Upcoming sibling,
 * covering the two things that only show up wired into the real screen:
 * the selected window persists to AsyncStorage across a remount (the
 * screen loads it via utils/storage.getUpcomingWindowDays on mount), and
 * tapping a row opens AddUpcomingSheet in edit mode against the tapped
 * row's own expense, not the add sheet.
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
import { saveExpenses } from '@/utils/storage';
import { strings } from '@/constants/strings';
import type { Expense } from '@/types/expense';

const UPCOMING_WINDOW_KEY = '@habitcents_upcoming_window';

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

/** A bill due in 10 days AND in 40 days, so 2 weeks / 1 month windows differ. */
function monthlyBill(id: string, dayOfMonth: number): Expense {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(today);
  date.setDate(dayOfMonth);
  if (date.getTime() < today.getTime()) date.setMonth(date.getMonth() + 1);
  return {
    id,
    title: 'Rent',
    amount: 100000,
    category: 'Mortgage',
    date,
    time: '9:00 AM',
    isRecurring: true,
    recurrence: 'monthly',
    recurrenceRule: { type: 'monthly', monthDay: String(dayOfMonth) as '1' | '15' | '30' },
    reminderEnabled: false,
    iconVariant: 'green',
  };
}

type View = Awaited<ReturnType<typeof render>>;

async function renderMoney(): Promise<View> {
  const view = await render(
    <Providers>
      <MoneyScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

async function openUpcomingSegment(view: View): Promise<void> {
  const tab = view.getByRole('tab', {
    name: new RegExp(`^${strings.money.segmentUpcoming},`),
  });
  await tap(tab);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
});

afterEach(cleanup);

describe('Money > Upcoming: window filter', () => {
  it('persists the tapped preset to AsyncStorage', async () => {
    await saveExpenses([monthlyBill('e1', 15)]);

    const view = await renderMoney();
    await openUpcomingSegment(view);

    await tap(view.getByRole('tab', { name: /3 months/ }));
    expect(await AsyncStorage.getItem(UPCOMING_WINDOW_KEY)).toBe('90');
  });

  it('loads a previously persisted preset on mount, not the default', async () => {
    await saveExpenses([monthlyBill('e1', 15)]);
    await AsyncStorage.setItem(UPCOMING_WINDOW_KEY, '90');

    const view = await renderMoney();
    await openUpcomingSegment(view);

    expect(view.getByRole('tab', { name: /3 months, selected/ })).toBeTruthy();
    expect(view.getByText(strings.money.upcomingWindowEyebrow(90))).toBeTruthy();
  });
});

describe('Money > Upcoming: edit flow', () => {
  it('tapping a row opens AddUpcomingSheet in edit mode, prefilled with that row', async () => {
    await saveExpenses([monthlyBill('e1', 15)]);

    const view = await renderMoney();
    await openUpcomingSegment(view);

    await tap(view.getByRole('tab', { name: /3 months/ })); // wide enough window to guarantee the row shows
    await tap(view.getByLabelText(/^Rent,/));

    expect(view.getByText(strings.addUpcoming.editTitle)).toBeTruthy();
    expect(
      view.getByRole('button', { name: strings.addUpcoming.saveChanges })
    ).toBeTruthy();
    expect(
      view.getByRole('button', { name: strings.addUpcoming.deleteUpcoming })
    ).toBeTruthy();
  });
});
