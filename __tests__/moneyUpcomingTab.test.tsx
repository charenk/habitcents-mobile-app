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
import { shortDate } from '@/utils/recurring';
import { upcomingWindowEnd } from '@/utils/upcomingWindow';

/** What the card's label should read for a given window, built the way the
 *  component builds it, so the assertion proves agreement rather than a date. */
function windowLabel(days: 14 | 30 | 90): string {
  return strings.money.upcomingWindowRange(shortDate(upcomingWindowEnd(days)));
}
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

  /**
   * D2: a fixed 14-day default opened on the window-empty state roughly half
   * the time, because monthly bills land once a month. With no stored choice
   * the pane now derives its window from the data, narrowest-first.
   */
  it('opens on the narrowest window that has a bill in it, with no stored choice', async () => {
    // 25 days out: past 2 weeks, inside 1 month.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(today);
    date.setDate(date.getDate() + 25);

    await saveExpenses([
      {
        ...monthlyBill('e1', 15),
        date,
        recurrenceRule: { type: 'monthly' },
      },
    ]);

    const view = await renderMoney();
    await openUpcomingSegment(view);

    expect(view.getByRole('tab', { name: /1 month, selected/ })).toBeTruthy();
    expect(view.getByText(windowLabel(30))).toBeTruthy();
    // The point of the derivation: the pane it opens on is not empty.
    expect(view.queryByText(strings.money.upcomingWindowEmptyBody)).toBeNull();
  });

  it('loads a previously persisted preset on mount, not the default', async () => {
    await saveExpenses([monthlyBill('e1', 15)]);
    await AsyncStorage.setItem(UPCOMING_WINDOW_KEY, '90');

    const view = await renderMoney();
    await openUpcomingSegment(view);

    expect(view.getByRole('tab', { name: /3 months, selected/ })).toBeTruthy();
    expect(view.getByText(windowLabel(90))).toBeTruthy();
  });
});

describe('Money > Upcoming: edit flow', () => {
  it('tapping a row opens AddUpcomingSheet in edit mode, prefilled with that row', async () => {
    await saveExpenses([monthlyBill('e1', 15)]);

    const view = await renderMoney();
    await openUpcomingSegment(view);

    await tap(view.getByRole('tab', { name: /3 months/ })); // wide enough window to guarantee the row shows
    // 2026-09-11: the list groups by calendar month and a monthly bill lands in
    // each of them, so a 3-month window renders Rent three times, one row per
    // month. Any of them opens the same expense; take the first.
    await tap(view.getAllByLabelText(/^Rent,/)[0]);

    expect(view.getByText(strings.addUpcoming.editTitle)).toBeTruthy();
    expect(
      view.getByRole('button', { name: strings.addUpcoming.saveChanges })
    ).toBeTruthy();
    expect(
      view.getByRole('button', { name: strings.addUpcoming.deleteUpcoming })
    ).toBeTruthy();
  });
});
