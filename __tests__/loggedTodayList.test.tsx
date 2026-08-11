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
  it("renders the eyebrow as TODAY'S LOG, not LOGGED TODAY", async () => {
    const view = await renderList();
    expect(view.getByText(strings.today.loggedTodayEyebrow.toUpperCase())).toBeTruthy();
    expect(view.getByText("TODAY'S LOG")).toBeTruthy();
    expect(view.queryByText('LOGGED TODAY')).toBeNull();
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
