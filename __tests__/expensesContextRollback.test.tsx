/**
 * ExpensesContext's write funnel under a failing disk.
 *
 * The list a user is looking at must never contain a row that is not on disk:
 * these contexts rehydrate from storage on the next cold start, so an
 * optimistic row that failed to persist does not stay wrong, it silently
 * disappears. `commit` therefore rolls state back and rethrows, which is what
 * lets the sheets above it report the failure instead of a save.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import { AppState, Button, Text } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpensesProvider, useExpenses } from '@/contexts/ExpensesContext';
import { getExpenses } from '@/utils/storage';
import type { AddExpenseInput } from '@/types/expense';

beforeEach(async () => {
  await AsyncStorage.clear();
  (AppState as unknown as { currentState: string }).currentState = 'active';
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  cleanup();
});

const coffee: AddExpenseInput = {
  title: 'Coffee',
  amount: 650,
  category: 'Food',
  date: new Date(),
  isRecurring: false,
  reminderEnabled: false,
};

let lastError: unknown = null;

function Harness() {
  const { expenses, addExpense, addExpenses } = useExpenses();
  return (
    <>
      <Text testID="count">{String(expenses.length)}</Text>
      <Button
        title="add"
        onPress={() => {
          void addExpense(coffee).catch((error) => { lastError = error; });
        }}
      />
      <Button
        title="addMany"
        onPress={() => {
          void addExpenses([coffee, coffee, coffee]).catch((error) => { lastError = error; });
        }}
      />
    </>
  );
}

async function renderHarness() {
  const view = await render(
    <ExpensesProvider>
      <Harness />
    </ExpensesProvider>
  );
  await act(async () => {});
  return view;
}

describe('a failed persist leaves no phantom row on screen', () => {
  it('rolls the list back and rejects when the write fails', async () => {
    lastError = null;
    const view = await renderHarness();
    expect(view.getByTestId('count').props.children).toBe('0');

    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await act(async () => {
      fireEvent.press(view.getByText('add'));
    });

    expect(lastError).toBeInstanceOf(Error);
    expect(view.getByTestId('count').props.children).toBe('0');
    expect(await getExpenses()).toEqual([]);
  });

  it('keeps the row when the write lands', async () => {
    lastError = null;
    const view = await renderHarness();

    await act(async () => {
      fireEvent.press(view.getByText('add'));
    });

    expect(lastError).toBeNull();
    expect(view.getByTestId('count').props.children).toBe('1');
    expect(await getExpenses()).toHaveLength(1);
  });

  it('imports many rows in a single write, so a bulk import cannot land half-done', async () => {
    lastError = null;
    const view = await renderHarness();
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    // Scope the count to this press: hydration and any still-settling effect
    // from an earlier render also write this key.
    setItem.mockClear();

    await act(async () => {
      fireEvent.press(view.getByText('addMany'));
    });

    expect(view.getByTestId('count').props.children).toBe('3');
    const expenseWrites = setItem.mock.calls.filter(([key]) => key === '@habitcents_expenses');
    expect(expenseWrites).toHaveLength(1);
    // ...and that one write carries all three rows, not the last one only.
    expect(JSON.parse(String(expenseWrites[0][1]))).toHaveLength(3);
  });

  it('rolls a failed bulk import back whole, leaving nothing behind', async () => {
    lastError = null;
    const view = await renderHarness();

    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await act(async () => {
      fireEvent.press(view.getByText('addMany'));
    });

    expect(lastError).toBeInstanceOf(Error);
    expect(view.getByTestId('count').props.children).toBe('0');
    expect(await getExpenses()).toEqual([]);
  });
});
