/**
 * LoggedTodayList (U6, decided fixes b and c): the "Today's log" rename and
 * the optional trailing "View all" link. Isolated component test; Today's
 * own wiring (onViewAll -> Money's Spent segment) is covered in
 * __tests__/todayQuoteRibbonPlacement.test.tsx.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LoggedTodayList } from '@/components/money/LoggedTodayList';
import { strings } from '@/constants/strings';
import type { Expense } from '@/types/expense';

function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  const base: Expense = {
    id: overrides.id,
    title: 'Food',
    amount: 500,
    category: 'Food',
    date: new Date(),
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
  return { ...base, ...overrides } as Expense;
}

// render() returns a promise in this RTL version; an async wrapper that
// simply returns it flattens automatically, so callers `await renderList(...)`
// for the resolved query object (same trick __tests__/spentList.test.tsx's
// renderSpent uses).
async function renderList(props: Partial<React.ComponentProps<typeof LoggedTodayList>> = {}) {
  return render(
    <ThemeProvider>
      <CurrencyProvider>
        <LoggedTodayList
          expenses={props.expenses ?? []}
          onEditExpense={props.onEditExpense ?? jest.fn()}
          onViewAll={props.onViewAll}
        />
      </CurrencyProvider>
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe('LoggedTodayList: rename (decision D3)', () => {
  // UX-060: the eyebrow still reads TODAY'S LOG on screen, but the uppercase
  // now comes from the style, so the text node keeps the sentence-case string
  // a screen reader can speak as words. Both halves are asserted.
  it("renders the eyebrow as Today's log, not Logged today, uppercased by style", async () => {
    const view = await renderList();
    const eyebrow = view.getByText(strings.today.loggedTodayEyebrow);
    expect(eyebrow).toBeTruthy();
    expect(StyleSheet.flatten(eyebrow.props.style).textTransform).toBe('uppercase');
    expect(view.getByText("Today's log")).toBeTruthy();
    expect(view.queryByText('Logged today')).toBeNull();
    // The pre-uppercased string must not be what lands in the tree.
    expect(view.queryByText("TODAY'S LOG")).toBeNull();
  });
});

describe('LoggedTodayList: View all link', () => {
  it('renders and navigates when at least one expense exists and onViewAll is supplied', async () => {
    const onViewAll = jest.fn();
    const view = await renderList({ expenses: [makeExpense({ id: 'e1' })], onViewAll });

    const link = view.getByText(strings.today.loggedTodayViewAll);
    fireEvent.press(link);

    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('hides when there are no expenses today, even with onViewAll supplied', async () => {
    const onViewAll = jest.fn();
    const view = await renderList({ expenses: [], onViewAll });

    expect(view.queryByText(strings.today.loggedTodayViewAll)).toBeNull();
  });

  it('hides when onViewAll is not supplied, even with expenses present', async () => {
    const view = await renderList({ expenses: [makeExpense({ id: 'e1' })] });

    expect(view.queryByText(strings.today.loggedTodayViewAll)).toBeNull();
  });
});

describe('LoggedTodayList: quiet day (InfoRibbon, persistent variant)', () => {
  // Charen's Today annotations (2026-09-04): "nothing yet" is the same sage
  // band the first-run line uses, inside the list section, but with no X,
  // because a dismissible placeholder would leave an empty section behind.
  it('renders the quiet-day line as a persistent ribbon with no dismiss control', async () => {
    const view = await renderList({ expenses: [] });

    expect(view.getByTestId('logged-today-quiet')).toBeTruthy();
    expect(view.getByText(strings.today.loggedTodayEmpty)).toBeTruthy();
    expect(view.queryByLabelText(strings.common.dismiss)).toBeNull();
  });

  it('does not render the ribbon once a row exists', async () => {
    const view = await renderList({ expenses: [makeExpense({ id: 'e1' })] });

    expect(view.queryByTestId('logged-today-quiet')).toBeNull();
    expect(view.queryByText(strings.today.loggedTodayEmpty)).toBeNull();
  });
});
