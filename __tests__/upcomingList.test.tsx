/**
 * UpcomingList (U8: Money Upcoming redesign).
 *
 * Covers the four behavioral decisions the redesign made: the summary block
 * is left-aligned (style assertion on the text block, matching Spent's and
 * Habits' left-aligned eyebrows), the window picker calls back with the
 * preset tapped, the count line agrees with what the total actually sums
 * (payments, not distinct bills -- U8's fix for the two numbers disagreeing),
 * and a row press opens edit rather than doing nothing.
 *
 * Items are built directly as UpcomingItem fixtures rather than routed
 * through computeUpcoming, since this component is presentational and takes
 * the projection as a prop; the projection math itself is covered in
 * recurring.test.ts / recurrenceRule.test.ts.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { UpcomingList } from '@/components/money/UpcomingList';
import { strings } from '@/constants/strings';
import type { Expense } from '@/types/expense';
import type { UpcomingItem } from '@/utils/recurring';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}

function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  return {
    title: 'Rent',
    amount: 500,
    category: 'Mortgage',
    date: new Date('2026-08-15T00:00:00'),
    time: '9:00 AM',
    isRecurring: true,
    recurrence: 'weekly',
    recurrenceRule: { type: 'weekly', weekday: 6 },
    reminderEnabled: false,
    iconVariant: 'green',
    ...overrides,
  };
}

/** One occurrence per day starting `from`, ascending. */
function occurrences(from: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i * 7);
    return d;
  });
}

function itemFor(expense: Expense, occurrenceCount: number): UpcomingItem {
  const occ = occurrences(expense.date, occurrenceCount);
  return {
    expense,
    nextDate: occ[0],
    daysUntil: 3,
    occurrencesInWindow: occ,
  };
}

// One item due once, one due twice: total sums 1 + 2 = 3 payments across 2 bills.
const singleItem = itemFor(makeExpense({ id: 'rent', amount: 50000 }), 1);
const doubleItem = itemFor(
  makeExpense({ id: 'gym', title: 'Gym', amount: 3000, category: 'Entertainment' }),
  2
);
const items: UpcomingItem[] = [singleItem, doubleItem];

const noop = () => {};

async function renderList(overrides: Partial<React.ComponentProps<typeof UpcomingList>> = {}) {
  const view = render(
    <Providers>
      <UpcomingList
        items={items}
        windowDays={14}
        onWindowDaysChange={noop}
        onAdd={noop}
        onEditItem={noop}
        // Every fixture here has at least one recurring expense somewhere
        // (the window-empty case below is "no items in THIS window", not
        // "nothing recurs at all"); override to false to hit the true-zero
        // fill state instead.
        hasAnyRecurring={true}
        {...overrides}
      />
    </Providers>
  );
  return view;
}

afterEach(cleanup);

describe('UpcomingList summary block', () => {
  it('left-aligns the eyebrow/total/count text block', async () => {
    const view = await renderList();
    const block = view.getByTestId('upcoming-total-text');
    expect(StyleSheet.flatten(block.props.style).alignItems).toBe('flex-start');
  });

  it('shows the window eyebrow for the selected preset', async () => {
    const view = await renderList({ windowDays: 30 });
    expect(view.getByText(strings.money.upcomingWindowEyebrow(30))).toBeTruthy();
  });

  it('total sums every occurrence, and the count line agrees (payments, not bills)', async () => {
    const view = await renderList();
    // 500.00 (1x) + 30.00*2 = 560.00
    expect(view.getByText('$560.00')).toBeTruthy();
    expect(view.getByText(strings.money.upcomingPaymentsCount(3, 2))).toBeTruthy();
    expect(view.getByText('3 payments from 2 bills')).toBeTruthy();
  });

  it('drops the "from N bills" clause when payments and bills agree', async () => {
    const view = await renderList({ items: [singleItem] });
    expect(view.getByText('1 payment')).toBeTruthy();
  });
});

describe('UpcomingList window picker', () => {
  it('renders the three presets and calls back with the one tapped', async () => {
    const onWindowDaysChange = jest.fn();
    const view = await renderList({ onWindowDaysChange });

    expect(view.getByRole('tab', { name: /2 weeks/ })).toBeTruthy();
    expect(view.getByRole('tab', { name: /1 month/ })).toBeTruthy();
    expect(view.getByRole('tab', { name: /3 months/ })).toBeTruthy();

    fireEvent.press(view.getByRole('tab', { name: /3 months/ }));
    expect(onWindowDaysChange).toHaveBeenCalledWith(90);
  });
});

describe('UpcomingList add affordance', () => {
  it('calls onAdd when the compact add control is tapped', async () => {
    const onAdd = jest.fn();
    const view = await renderList({ onAdd });
    fireEvent.press(view.getByLabelText(strings.money.upcomingAddAffordance));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('still shows the add control and window picker when there are no items', async () => {
    const view = await renderList({ items: [] });
    expect(view.getByLabelText(strings.money.upcomingAddAffordance)).toBeTruthy();
    expect(view.getByRole('tab', { name: /2 weeks/ })).toBeTruthy();
    expect(view.getByText(strings.money.upcomingEmptyBody)).toBeTruthy();
  });
});

describe('UpcomingList rows', () => {
  it('opens edit for the row that was pressed', async () => {
    const onEditItem = jest.fn();
    const view = await renderList({ onEditItem });

    fireEvent.press(view.getByLabelText(/^Gym,/));
    expect(onEditItem).toHaveBeenCalledWith(doubleItem.expense);
  });
});
