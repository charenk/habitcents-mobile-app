/**
 * The silent write: a failed persist must not report success.
 *
 * Before the write policy in utils/storage.ts was inverted, ExpenseSheet did
 * `void addExpense(...)` and then, unconditionally and in the same tick, fired
 * the success haptic and showed "Logged." Because every save* in storage.ts
 * swallowed its own error, the promise resolved even on a full disk, so the
 * user got the full success moment for a row that was already gone.
 *
 * These tests drive the real sheet with a rejecting context and assert the
 * three things that made the bug invisible: no success haptic, no "Logged.",
 * and no onClose that would sweep the typed amount away. They fail on the
 * version of the code that swallowed.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockHapticSuccess = jest.fn();
const mockHapticError = jest.fn();

jest.mock('@/utils/motion', () => ({
  ...jest.requireActual('@/utils/motion'),
  hapticSuccess: () => mockHapticSuccess(),
  hapticError: () => mockHapticError(),
}));

const mockAddExpense = jest.fn(async (_input: AddExpenseInput) => undefined);
const mockUpdateExpense = jest.fn(
  async (_id: string, _updates: Partial<Omit<Expense, 'id'>>) => undefined
);
const mockDeleteExpense = jest.fn(async (_id: string) => undefined);
const mockRestoreExpense = jest.fn(async (_expense: Expense, _index: number) => undefined);

jest.setTimeout(20000);

jest.mock('@/contexts/ExpensesContext', () => ({
  useExpenses: () => ({
    expenses: [],
    addExpense: mockAddExpense,
    updateExpense: mockUpdateExpense,
    deleteExpense: mockDeleteExpense,
    restoreExpense: mockRestoreExpense,
  }),
}));

jest.mock('@/contexts/CategoriesContext', () => ({
  useCategories: () => ({ getVisibleCategories: () => mockCategories }),
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ExpenseSheet } from '@/components/money/ExpenseSheet';
import { strings } from '@/constants/strings';
import type { Category } from '@/types/category';
import type { AddExpenseInput, Expense } from '@/types/expense';

const mockCategories: Category[] = [
  {
    id: 'cat-food',
    name: 'Food',
    icon: 'fast-food-outline',
    color: '#66BB6A',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
];

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>{children}</ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const onClose = jest.fn();

async function renderLogSheet() {
  const view = await render(
    <Providers>
      <ExpenseSheet mode="log" visible onClose={onClose} />
    </Providers>
  );
  await act(async () => {});
  return view;
}

type View = Awaited<ReturnType<typeof render>>;

async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

async function typeAmount(view: View, amount: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(view.getByLabelText(/^Amount,/), amount);
  });
}

beforeEach(() => {
  mockAddExpense.mockReset();
  mockAddExpense.mockResolvedValue(undefined);
  mockHapticSuccess.mockClear();
  mockHapticError.mockClear();
  onClose.mockClear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  cleanup();
});

describe('a failed expense save never reports success', () => {
  it('fires no success haptic when the write rejects', async () => {
    mockAddExpense.mockRejectedValue(new Error('Could not save to @habitcents_expenses'));
    const view = await renderLogSheet();
    await typeAmount(view, '6.50');

    await tap(view.getByText(strings.expenseSheet.saveExpense));

    expect(mockAddExpense).toHaveBeenCalledTimes(1);
    expect(mockHapticSuccess).not.toHaveBeenCalled();
    expect(mockHapticError).toHaveBeenCalledTimes(1);
  });

  it('does not say "Logged." when the write rejects, and says what happened instead', async () => {
    mockAddExpense.mockRejectedValue(new Error('Could not save to @habitcents_expenses'));
    const view = await renderLogSheet();
    await typeAmount(view, '6.50');

    await tap(view.getByText(strings.expenseSheet.saveExpense));

    expect(view.queryByText(strings.toasts.logged)).toBeNull();
    expect(view.getByText(strings.toasts.logFailed)).toBeTruthy();
  });

  it('keeps the sheet open so the typed amount survives for a retry', async () => {
    mockAddExpense.mockRejectedValue(new Error('Could not save to @habitcents_expenses'));
    const view = await renderLogSheet();
    await typeAmount(view, '6.50');

    await tap(view.getByText(strings.expenseSheet.saveExpense));

    expect(onClose).not.toHaveBeenCalled();
    expect(view.getByLabelText(/^Amount,/).props.value).toContain('6.50');
  });

  it('still reports success normally when the write lands', async () => {
    const view = await renderLogSheet();
    await typeAmount(view, '6.50');

    await tap(view.getByText(strings.expenseSheet.saveExpense));

    expect(mockHapticSuccess).toHaveBeenCalledTimes(1);
    expect(mockHapticError).not.toHaveBeenCalled();
    expect(view.getByText(strings.toasts.logged)).toBeTruthy();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('waits for the write before celebrating, rather than firing on tap', async () => {
    let release: (() => void) | undefined;
    mockAddExpense.mockImplementation(
      () => new Promise<undefined>((resolve) => { release = () => resolve(undefined); })
    );

    const view = await renderLogSheet();
    await typeAmount(view, '6.50');

    await act(async () => {
      fireEvent.press(view.getByText(strings.expenseSheet.saveExpense));
    });
    // The write is still in the air: nothing has been claimed yet.
    expect(mockHapticSuccess).not.toHaveBeenCalled();
    expect(view.queryByText(strings.toasts.logged)).toBeNull();

    await act(async () => {
      release?.();
    });
    expect(mockHapticSuccess).toHaveBeenCalledTimes(1);
  });

  it('records one expense when Save is double-tapped mid-write', async () => {
    let release: (() => void) | undefined;
    mockAddExpense.mockImplementation(
      () => new Promise<undefined>((resolve) => { release = () => resolve(undefined); })
    );

    const view = await renderLogSheet();
    await typeAmount(view, '6.50');
    const save = view.getByText(strings.expenseSheet.saveExpense);

    await act(async () => {
      fireEvent.press(save);
      fireEvent.press(save);
    });
    await act(async () => {
      release?.();
    });

    expect(mockAddExpense).toHaveBeenCalledTimes(1);
  });
});
