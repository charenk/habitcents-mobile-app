/**
 * Money tab, end to end with the recurring materializer wired in (ADR 0024,
 * U11). Covers the two behaviors that only show up once ExpensesContext,
 * money.tsx, SpentList, and UpcomingList are all wired together:
 *
 * 1. same-day due: a weekly bill's occurrence due exactly today materializes
 *    into a real Spent row before this screen ever renders (the materializer
 *    runs at ExpensesProvider hydration), and Upcoming advances past it
 *    instead of showing the pre-ADR-0024 "same row in both tabs" duplicate.
 * 2. the cycle indicator (Repeat glyph, spelled out as "recurring" in the
 *    accessible label) shows on both the materialized child AND the parent's
 *    own historical-first-spend row in Spent.
 *
 * utils/materializer.ts's planning logic and the ExpensesContext wiring
 * (idempotency, tombstones, relaunch) are covered in isolation elsewhere
 * (__tests__/materializer.test.ts, __tests__/expensesContextMaterializer.test.tsx);
 * this file is the "does the actual screen show the right thing" check.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
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
import { daysUntilLabel } from '@/utils/recurring';
import type { Expense } from '@/types/expense';

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

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

/** Weekly, first occurrence exactly 7 days ago: today's occurrence is its
 *  SECOND, which the materializer must write as a real child row (the parent
 *  row itself only accounts for the first occurrence, 7 days back). */
function weeklyGymParent(): Expense {
  return {
    id: 'gym-parent',
    title: 'Gym',
    amount: 2500,
    category: 'Entertainment',
    date: daysAgo(7),
    time: '9:00 AM',
    isRecurring: true,
    recurrence: 'weekly',
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
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

async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

async function openUpcomingSegment(view: Awaited<ReturnType<typeof renderMoney>>): Promise<void> {
  const tab = view.getByRole('tab', { name: new RegExp(`^${strings.money.segmentUpcoming},`) });
  await tap(tab);
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(cleanup);

describe('Money: same-day materialization (ADR 0024, U11)', () => {
  it('a due-today occurrence appears in Spent, tagged recurring, and Upcoming advances past it', async () => {
    await saveExpenses([weeklyGymParent()]);

    const view = await renderMoney();

    // Spent (default view): both the materialized child (today) and the
    // parent's own historical row (7 days back) carry the cycle indicator,
    // spelled out in words for VoiceOver.
    const recurringRows = view.getAllByLabelText(/^Edit Gym,.*recurring$/);
    expect(recurringRows).toHaveLength(2);

    // Upcoming: the due-today occurrence must NOT still show there (that's
    // the pre-ADR-0024 "same row in both tabs" bug this unit fixes).
    await openUpcomingSegment(view);
    expect(view.queryByText(daysUntilLabel(0))).toBeNull(); // "Today"

    // The next occurrence (7 days from now) is what Upcoming shows instead.
    expect(view.getByText(daysUntilLabel(7))).toBeTruthy();
  });

  it('a bill with nothing due yet (first occurrence still ahead) shows nothing extra in Spent', async () => {
    const parent: Expense = {
      id: 'future-parent',
      title: 'Rent',
      amount: 200000,
      category: 'Mortgage',
      date: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 10);
        return d;
      })(),
      time: '9:00 AM',
      isRecurring: true,
      recurrence: 'monthly',
      reminderEnabled: false,
      iconVariant: 'green',
    };
    await saveExpenses([parent]);

    const view = await renderMoney();

    // Nothing logged today yet: the future-dated parent belongs in Upcoming
    // only, so Spent's Today block stays the compact empty state.
    expect(view.getByText(strings.money.spentTodayEmpty)).toBeTruthy();
  });
});
