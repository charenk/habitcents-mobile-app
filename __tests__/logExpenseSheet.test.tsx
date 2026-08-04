/**
 * Log and edit sheet merchant capture (device feedback, 2026-08-04).
 *
 * The sheets are the only place the app itself can write `expense.merchant`,
 * and detection groups strictly on that field, so these tests pin the write
 * contract rather than the layout: what lands in addExpense with and without a
 * typed place, that the recent chips come back unique and newest first, and
 * that four sheet-shaped rows WITH a merchant do reach detectHabits while the
 * same four without one still do not.
 *
 * Provider wiring mirrors __tests__/settingsSheet.test.tsx (SafeAreaProvider
 * with initialMetrics + ThemeProvider + CurrencyProvider + ToastProvider). The
 * two data contexts are module-mocked so a fixture list of expenses can be fed
 * in directly, which storage seeding cannot do synchronously.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockAddExpense = jest.fn(async (_input: AddExpenseInput) => undefined);
const mockUpdateExpense = jest.fn(
  async (_id: string, _updates: Partial<Omit<Expense, 'id'>>) => undefined
);
let mockExpenses: Expense[] = [];

jest.mock('@/contexts/ExpensesContext', () => ({
  useExpenses: () => ({
    expenses: mockExpenses,
    addExpense: mockAddExpense,
    updateExpense: mockUpdateExpense,
    deleteExpense: jest.fn(async () => {}),
    restoreExpense: jest.fn(async () => {}),
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
import { LogExpenseSheet } from '@/components/money/LogExpenseSheet';
import { EditExpenseSheet } from '@/components/money/EditExpenseSheet';
import { strings } from '@/constants/strings';
import type { Category } from '@/types/category';
import type { AddExpenseInput, Expense } from '@/types/expense';
import { detectHabits } from '@/utils/habitDetection';

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
  {
    id: 'cat-shopping',
    name: 'Shopping',
    icon: 'cart-outline',
    color: '#EC407A',
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

/**
 * One stored expense, shaped the way the log sheet writes them: title equal to
 * the merchant when there is one, category name when there is not.
 */
function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  const base: Expense = {
    id: overrides.id,
    title: 'Food',
    amount: 500,
    category: 'Food',
    categoryId: 'cat-food',
    date: new Date(),
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
  return { ...base, ...overrides } as Expense;
}

const onClose = jest.fn();

async function renderLogSheet() {
  const view = await render(
    <Providers>
      <LogExpenseSheet visible onClose={onClose} />
    </Providers>
  );
  // Flush the provider load effects and the sheet's enter animation.
  await act(async () => {});
  return view;
}

type View = Awaited<ReturnType<typeof render>>;

/**
 * One tap. Wrapped in act because the sheet's state updates land inside a
 * Modal, which React 18 does not flush from a bare fireEvent here.
 */
async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

/** Types an amount on the keypad the same way a finger would. */
async function pressKeypad(view: View, digits: string): Promise<void> {
  for (const digit of digits) {
    await tap(view.getByLabelText(digit));
  }
}

/** Types into the merchant field. */
async function typeMerchant(view: View, text: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(view.getByLabelText(strings.expenses.merchantFieldLabel), text);
  });
}

beforeEach(() => {
  mockExpenses = [];
  mockAddExpense.mockClear();
  mockUpdateExpense.mockClear();
  onClose.mockClear();
});

afterEach(cleanup);

describe('LogExpenseSheet merchant capture', () => {
  it('saves no merchant and a category title when the field is left empty', async () => {
    const view = await renderLogSheet();

    await pressKeypad(view, '450');
    await tap(view.getByLabelText('Food, not selected'));
    await tap(view.getByRole('button', { name: strings.expenseSheet.saveExpense }));

    expect(mockAddExpense).toHaveBeenCalledTimes(1);
    const saved = mockAddExpense.mock.calls[0][0];
    expect(saved.merchant).toBeUndefined();
    expect(saved.title).toBe('Food');
    // '4', '5', '0' on the keypad is 450 major units, not 450 cents.
    expect(saved.amount).toBe(45000);
    expect(saved.category).toBe('Food');
  });

  it('saves the typed place as both merchant and title', async () => {
    const view = await renderLogSheet();

    await pressKeypad(view, '450');
    await tap(view.getByLabelText('Food, not selected'));
    await typeMerchant(view, '  Starbucks  ');
    await tap(view.getByRole('button', { name: strings.expenseSheet.saveExpense }));

    const saved = mockAddExpense.mock.calls[0][0];
    expect(saved.merchant).toBe('Starbucks');
    expect(saved.title).toBe('Starbucks');
  });

  it('offers recent places as chips, newest first and one per spelling', async () => {
    mockExpenses = [
      makeExpense({ id: '1', merchant: 'Starbucks', title: 'Starbucks' }),
      makeExpense({ id: '2', merchant: 'starbucks', title: 'starbucks' }),
      makeExpense({ id: '3', merchant: 'Chipotle', title: 'Chipotle' }),
      makeExpense({ id: '4' }),
    ];

    const view = await renderLogSheet();

    // One chip per place: the second Starbucks spelling does not get its own.
    expect(view.getAllByLabelText(/^Starbucks, /)).toHaveLength(1);
    expect(view.getByLabelText(/^Chipotle, /)).toBeTruthy();

    // Tapping a chip fills the field, so the next save reuses the exact
    // spelling detection already groups on.
    await tap(view.getByLabelText('Starbucks, not selected'));
    expect(view.getByLabelText(strings.expenses.merchantFieldLabel).props.value).toBe(
      'Starbucks'
    );
    expect(view.getByLabelText('Starbucks, selected')).toBeTruthy();

    await pressKeypad(view, '450');
    await tap(view.getByRole('button', { name: strings.expenseSheet.saveExpense }));

    const saved = mockAddExpense.mock.calls[0][0];
    expect(saved.merchant).toBe('Starbucks');
  });
});

describe('detection reachability from the log sheet', () => {
  /** Four rows shaped exactly the way the sheet writes them. */
  function sheetRows(withMerchant: boolean): Expense[] {
    return [0, 1, 2, 3].map((i) => {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      return makeExpense({
        id: `row-${i}`,
        amount: 1200,
        date,
        merchant: withMerchant ? 'Starbucks' : undefined,
        title: withMerchant ? 'Starbucks' : 'Food',
      });
    });
  }

  it('finds a habit from four sheet-shaped logs with a merchant', () => {
    const habits = detectHabits(sheetRows(true));
    expect(habits).toHaveLength(1);
    expect(habits[0].name.toLowerCase()).toContain('starbucks');
  });

  it('finds nothing from the same four logs without one', () => {
    expect(detectHabits(sheetRows(false))).toHaveLength(0);
  });
});

describe('EditExpenseSheet merchant editing', () => {
  async function renderEditSheet(expense: Expense) {
    const view = await render(
      <Providers>
        <EditExpenseSheet visible expense={expense} onClose={onClose} />
      </Providers>
    );
    await act(async () => {});
    return view;
  }

  it('prefills the stored place and clearing it writes undefined', async () => {
    const expense = makeExpense({
      id: 'e1',
      amount: 1200,
      merchant: 'Starbucks',
      title: 'Starbucks',
    });
    const view = await renderEditSheet(expense);

    const field = view.getByLabelText(strings.expenses.merchantFieldLabel);
    expect(field.props.value).toBe('Starbucks');

    await typeMerchant(view, '');
    await tap(view.getByRole('button', { name: strings.expenseSheet.saveChanges }));

    expect(mockUpdateExpense).toHaveBeenCalledTimes(1);
    const [id, updates] = mockUpdateExpense.mock.calls[0];
    expect(id).toBe('e1');
    expect(updates.merchant).toBeUndefined();
    // The title was the merchant, so it is auto-derived and falls back to the
    // category name rather than keeping a place the row no longer has.
    expect(updates.title).toBe('Food');
  });
});

