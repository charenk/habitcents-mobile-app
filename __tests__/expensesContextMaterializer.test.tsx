/**
 * The recurring-money materializer wired into ExpensesContext (ADR 0024,
 * U11): hydration-time catch-up, the AppState foreground re-run, tombstone
 * persistence across a simulated relaunch, and delete-parent/delete-child
 * behavior. utils/materializer.ts's own planning logic is covered in
 * isolation by __tests__/materializer.test.ts; this file proves the wiring
 * (storage, AppState, ExpensesContext.deleteExpense) around it is correct.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import { AppState } from 'react-native';
import { Button, Text } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpensesProvider, useExpenses } from '@/contexts/ExpensesContext';
import { getExpenses, getRecurringTombstones, saveExpenses } from '@/utils/storage';
import type { AddExpenseInput, Expense } from '@/types/expense';

// The RN jest mock's AppState.currentState is a jest.fn(), not a string (see
// node_modules/react-native/jest/mocks/AppState.js); ExpensesContext reads it
// as a real AppStateStatus on the first render, so it needs a real value here
// before anything that triggers the 'change' listener runs.
beforeEach(async () => {
  await AsyncStorage.clear();
  (AppState as unknown as { currentState: string }).currentState = 'active';
});

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

const PARENT_ID = 'test-parent-weekly';

function weeklyParent(daysBack: number, overrides: Partial<Expense> = {}): Expense {
  return {
    id: PARENT_ID,
    title: 'Gym',
    amount: 2500,
    category: 'Entertainment',
    date: daysAgo(daysBack),
    time: '9:00 AM',
    isRecurring: true,
    recurrence: 'weekly',
    reminderEnabled: false,
    iconVariant: 'yellow',
    ...overrides,
  };
}

function Harness() {
  const { expenses, deleteExpense, addExpense, getTotalSpent } = useExpenses();
  const children = expenses.filter((e) => e.source === 'recurring');
  const parent = expenses.find((e) => e.id === PARENT_ID);

  const addOldWeeklyParent = () => {
    const input: AddExpenseInput = {
      title: 'Gym',
      amount: 2500,
      category: 'Entertainment',
      date: daysAgo(35),
      isRecurring: true,
      recurrence: 'weekly',
      reminderEnabled: false,
    };
    void addExpense(input);
  };

  return (
    <>
      <Text testID="count">{expenses.length}</Text>
      <Text testID="childCount">{children.length}</Text>
      <Text testID="total">{getTotalSpent()}</Text>
      <Text testID="hasParent">{parent ? 'yes' : 'no'}</Text>
      <Button title="add-old-weekly-parent" onPress={addOldWeeklyParent} />
      <Button
        title="delete-parent"
        onPress={() => {
          void deleteExpense(PARENT_ID);
        }}
      />
      <Button
        title="delete-newest-child"
        onPress={() => {
          const newest = children.reduce((a, b) => (a.date > b.date ? a : b));
          void deleteExpense(newest.id);
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

afterEach(cleanup);

describe('materializer at hydration', () => {
  it('catches up several missed weekly occurrences on first load', async () => {
    await saveExpenses([weeklyParent(35)]);

    const view = await renderHarness();

    // 35 days back, weekly: 5 occurrences strictly after the parent's own
    // date and not after today (day 35, 28, 21, 14, 7 back).
    expect(view.getByTestId('childCount').props.children).toBe(5);
    expect(view.getByTestId('count').props.children).toBe(6); // parent + 5 children

    const stored = await getExpenses();
    expect(stored.filter((e) => e.source === 'recurring')).toHaveLength(5);
  });

  it('a parent with nothing yet due materializes nothing', async () => {
    await saveExpenses([weeklyParent(3)]); // < 1 week old

    const view = await renderHarness();

    expect(view.getByTestId('childCount').props.children).toBe(0);
    expect(view.getByTestId('count').props.children).toBe(1);
  });

  it('totals in Money reflect the materialized history, not just the parent row', async () => {
    await saveExpenses([weeklyParent(21)]); // 3 missed occurrences

    const view = await renderHarness();

    expect(view.getByTestId('childCount').props.children).toBe(3);
    // parent (2500) + 3 materialized children (2500 each) = 10000.
    expect(view.getByTestId('total').props.children).toBe(10000);
  });

  it('relaunch idempotency: mounting a second provider against the same storage adds nothing new', async () => {
    await saveExpenses([weeklyParent(35)]);

    const first = await renderHarness();
    expect(first.getByTestId('childCount').props.children).toBe(5);
    // Unmounting outside act() left React's act-environment tracking corrupt
    // for every test that ran after this one in earlier iterations of this
    // file (an "overlapping act() calls" warning followed by an empty
    // re-render) -- wrapping it in act() is required, not decorative.
    await act(async () => {
      first.unmount();
    });

    // Simulates a cold relaunch: a brand-new ExpensesProvider instance
    // hydrating from whatever the first instance persisted.
    const second = await renderHarness();
    expect(second.getByTestId('childCount').props.children).toBe(5);
    expect(second.getByTestId('count').props.children).toBe(6);

    const stored = await getExpenses();
    expect(stored).toHaveLength(6); // never grew past the correct count
  });
});

describe('materializer on AppState foreground', () => {
  it('two foreground events fired back to back in the same tick never double-write the same backlog', async () => {
    const view = await renderHarness(); // empty storage, nothing to materialize yet

    const changeCalls = (AppState.addEventListener as jest.Mock).mock.calls.filter(
      ([event]) => event === 'change'
    );
    expect(changeCalls.length).toBeGreaterThan(0);
    const listener = changeCalls[changeCalls.length - 1][1] as (state: string) => void;

    await act(async () => {
      // Creates a 35-day-old weekly parent (5 missed occurrences), then fires
      // TWO background->active transitions with no await between them, so
      // both `void runMaterializer()` calls are queued before either has had
      // a chance to read/write expensesRef.current.
      fireEvent.press(view.getByText('add-old-weekly-parent'));
      listener('background');
      listener('active');
      listener('background');
      listener('active');
      await Promise.resolve();
    });
    await act(async () => {});

    // Exactly 5 children, never 10: the second run planned against the
    // first run's already-committed result, not a stale pre-commit snapshot.
    expect(view.getByTestId('childCount').props.children).toBe(5);
    const stored = await getExpenses();
    expect(stored.filter((e) => e.source === 'recurring')).toHaveLength(5);
  });
});

describe('delete-parent / delete-child', () => {
  it('deleting the parent leaves materialized children in place', async () => {
    await saveExpenses([weeklyParent(21)]);

    const view = await renderHarness();
    expect(view.getByTestId('childCount').props.children).toBe(3);

    await act(async () => {
      fireEvent.press(view.getByText('delete-parent'));
    });

    expect(view.getByTestId('hasParent').props.children).toBe('no');
    expect(view.getByTestId('childCount').props.children).toBe(3); // untouched
    expect(view.getByTestId('count').props.children).toBe(3); // parent gone, children stay
  });

  it('deleting a materialized child tombstones it, and a later relaunch does not resurrect it', async () => {
    await saveExpenses([weeklyParent(21)]);

    const first = await renderHarness();
    expect(first.getByTestId('childCount').props.children).toBe(3);

    await act(async () => {
      fireEvent.press(first.getByText('delete-newest-child'));
    });
    expect(first.getByTestId('childCount').props.children).toBe(2);

    const tombstonesAfterDelete = await getRecurringTombstones();
    expect(tombstonesAfterDelete).toHaveLength(1);

    // Unmounting outside act() left React's act-environment tracking corrupt
    // for every test that ran after this one in earlier iterations of this
    // file (an "overlapping act() calls" warning followed by an empty
    // re-render) -- wrapping it in act() is required, not decorative.
    await act(async () => {
      first.unmount();
    });

    // Relaunch: a fresh provider hydrating from the same storage (parent +
    // remaining 2 children + 1 tombstone) must not regenerate the deleted
    // occurrence, even though it's otherwise due.
    const second = await renderHarness();
    expect(second.getByTestId('childCount').props.children).toBe(2);

    const stored = await getExpenses();
    expect(stored.filter((e) => e.source === 'recurring')).toHaveLength(2);
  });
});
