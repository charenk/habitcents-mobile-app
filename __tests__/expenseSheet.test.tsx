/**
 * ExpenseSheet (U2, the expense drawer rebuild): merchant capture, mode
 * parity, edit merchant pre-selection, and (expense-sheet workflow redesign,
 * Charen 2026-08-16) the pinned header's Save gating and the iOS Done bar.
 *
 * The sheets are the only place the app itself can write `expense.merchant`,
 * and detection groups strictly on that field, so several of these tests pin
 * the write contract rather than the layout: what lands in addExpense with
 * and without a typed place, that the recent chips come back unique and
 * newest first, and that four sheet-shaped rows WITH a merchant do reach
 * detectHabits while the same four without one still do not.
 *
 * Provider wiring mirrors __tests__/settingsSheet.test.tsx (SafeAreaProvider
 * with initialMetrics + ThemeProvider + CurrencyProvider + ToastProvider). The
 * two data contexts are module-mocked so a fixture list of expenses can be fed
 * in directly, which storage seeding cannot do synchronously.
 *
 * Amount entry (ADR 0023): the sheet's AmountField is a real TextInput on the
 * native decimal pad, so tests type a full amount string via changeText
 * rather than tapping digit-labeled Keypad buttons. It's found by its
 * "Amount, ..." accessibility label PREFIX (the suffix changes with the
 * current value as soon as typing starts).
 *
 * Done bar (below): components/ui/Sheet.tsx's avoidKeyboard wraps the panel
 * in a real KeyboardAvoidingView, which ALSO subscribes to 'keyboardWillShow'
 * on iOS to size its own padding. That listener and the sheet's own Done-bar
 * hook end up registered under the same event name, so the test tells them
 * apart by arity: the hook's is an inline, zero-argument
 * `() => setVisible(true)`; KeyboardAvoidingView's is a bound, one-argument
 * `_onKeyboardChange`. jest-expo's haste config defaults Platform.OS to
 * 'ios' for tests, so the bar's Platform.OS === 'ios' gate is satisfied here
 * without mocking Platform.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockAddExpense = jest.fn(async (_input: AddExpenseInput) => undefined);
const mockUpdateExpense = jest.fn(
  async (_id: string, _updates: Partial<Omit<Expense, 'id'>>) => undefined
);
const mockDeleteExpense = jest.fn(async (_id: string) => undefined);
const mockRestoreExpense = jest.fn(async (_expense: Expense, _index: number) => undefined);
let mockExpenses: Expense[] = [];

// Full-provider renders exceed jest's 5s default under CI worker load.
jest.setTimeout(20000);

jest.mock('@/contexts/ExpensesContext', () => ({
  useExpenses: () => ({
    expenses: mockExpenses,
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
import { Keyboard } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ExpenseSheet } from '@/components/money/ExpenseSheet';
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
 * One stored expense, shaped the way the sheet writes them: title equal to
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
      <ExpenseSheet mode="log" visible onClose={onClose} />
    </Providers>
  );
  // Flush the provider load effects and the sheet's enter animation.
  await act(async () => {});
  return view;
}

async function renderEditSheet(expense: Expense) {
  const view = await render(
    <Providers>
      <ExpenseSheet mode="edit" visible expense={expense} onClose={onClose} />
    </Providers>
  );
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

/** Types a full amount string into the native AmountField in one change,
 *  the way a decimal-pad keystroke stream ultimately resolves to a value. */
async function typeAmount(view: View, amount: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(view.getByLabelText(/^Amount,/), amount);
  });
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
  mockDeleteExpense.mockClear();
  mockRestoreExpense.mockClear();
  onClose.mockClear();
});

afterEach(cleanup);

describe('ExpenseSheet log mode: merchant capture', () => {
  it('saves no merchant and a category title when the field is left empty', async () => {
    const view = await renderLogSheet();

    await typeAmount(view, '450');
    await tap(view.getByLabelText('Food, not selected'));
    await tap(view.getByRole('button', { name: strings.expenseSheet.saveExpense }));

    expect(mockAddExpense).toHaveBeenCalledTimes(1);
    const saved = mockAddExpense.mock.calls[0][0];
    expect(saved.merchant).toBeUndefined();
    expect(saved.title).toBe('Food');
    expect(saved.amount).toBe(45000);
    expect(saved.category).toBe('Food');
  });

  it('saves the typed place as both merchant and title', async () => {
    const view = await renderLogSheet();

    await typeAmount(view, '450');
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

    await typeAmount(view, '450');
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

describe('ExpenseSheet edit mode: merchant editing', () => {
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

  it('pre-selects the current merchant among the chips when it is already in the recent list', async () => {
    // The edited row itself supplies its own merchant into the natural
    // recency list built from `expenses`, so no prepend is needed here.
    const expense = makeExpense({
      id: 'e1',
      merchant: 'Starbucks',
      title: 'Starbucks',
    });
    mockExpenses = [
      expense,
      makeExpense({ id: 'e2', merchant: 'Chipotle', title: 'Chipotle' }),
    ];
    const view = await renderEditSheet(expense);

    expect(view.getByLabelText('Starbucks, selected')).toBeTruthy();
    expect(view.getByLabelText('Chipotle, not selected')).toBeTruthy();
  });

  it('prepends the current merchant when older logs pushed it out of the recent list', async () => {
    const expense = makeExpense({ id: 'e1', merchant: 'Old Favorite', title: 'Old Favorite' });
    // Six newer, unrelated merchants fill the recency list ahead of the
    // edited row, which the natural iteration order would otherwise drop.
    const newer = Array.from({ length: 6 }, (_, i) =>
      makeExpense({ id: `newer-${i}`, merchant: `Place ${i}`, title: `Place ${i}` })
    );
    mockExpenses = [...newer, expense];

    const view = await renderEditSheet(expense);

    expect(view.getByLabelText('Old Favorite, selected')).toBeTruthy();
  });

  it('deletes with no confirmation and offers an undo toast', async () => {
    const expense = makeExpense({ id: 'e1', merchant: 'Starbucks', title: 'Starbucks' });
    mockExpenses = [expense];
    const view = await renderEditSheet(expense);

    await tap(view.getByRole('button', { name: strings.expenseSheet.deleteExpense }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDeleteExpense).toHaveBeenCalledWith('e1');
    expect(view.getByText(strings.toasts.deleted)).toBeTruthy();

    await tap(view.getByText(strings.toasts.undo));
    expect(mockRestoreExpense).toHaveBeenCalledWith(expense, 0);
  });
});

describe('ExpenseSheet mode parity', () => {
  it('log and edit render the same category chips and merchant section', async () => {
    mockExpenses = [makeExpense({ id: 'r1', merchant: 'Chipotle', title: 'Chipotle' })];

    // Both sheets rendered at once (no cleanup between them): RNTL scopes
    // each render()'s queries to its own tree, so this is the simplest way
    // to compare the two side by side within one test.
    const logView = await renderLogSheet();
    const editView = await renderEditSheet(
      makeExpense({ id: 'e1', merchant: 'Chipotle', title: 'Chipotle' })
    );

    for (const category of mockCategories) {
      expect(logView.getByText(category.name)).toBeTruthy();
      expect(editView.getByText(category.name)).toBeTruthy();
    }

    expect(logView.getByLabelText(strings.expenses.merchantFieldLabel)).toBeTruthy();
    expect(editView.getByLabelText(strings.expenses.merchantFieldLabel)).toBeTruthy();
    expect(logView.getByLabelText(/^Chipotle, /)).toBeTruthy();
    expect(editView.getByLabelText(/^Chipotle, /)).toBeTruthy();
  });

  it('only edit mode renders the delete row', async () => {
    const logView = await renderLogSheet();
    expect(logView.queryByRole('button', { name: strings.expenseSheet.deleteExpense })).toBeNull();

    const editView = await renderEditSheet(makeExpense({ id: 'e1' }));
    expect(
      editView.getByRole('button', { name: strings.expenseSheet.deleteExpense })
    ).toBeTruthy();
  });

  it('neither mode renders a coach line by default, but a passed coachLine still renders in log mode', async () => {
    const logView = await renderLogSheet();
    const editView = await renderEditSheet(makeExpense({ id: 'e1' }));

    const CUSTOM_LINE = 'Amount first, custom copy.';
    expect(logView.queryByText(CUSTOM_LINE)).toBeNull();
    expect(editView.queryByText(CUSTOM_LINE)).toBeNull();

    const customView = await render(
      <Providers>
        <ExpenseSheet mode="log" visible onClose={onClose} coachLine={CUSTOM_LINE} />
      </Providers>
    );
    await act(async () => {});
    expect(customView.getByText(CUSTOM_LINE)).toBeTruthy();
  });
});

describe('ExpenseSheet: Save gating (expense-sheet workflow redesign, 2026-08-16)', () => {
  it('disables Save in log mode until an amount is entered, then saves on press', async () => {
    const view = await renderLogSheet();

    const disabledSave = view.getByRole('button', { name: strings.expenseSheet.saveExpense });
    expect(disabledSave.props.accessibilityState?.disabled).toBe(true);

    // A press on a disabled Button never reaches onPress (Button.tsx passes
    // `disabled` straight to Pressable), so this is pinning that the control
    // itself blocks the save, not just that nobody happened to press it.
    await tap(disabledSave);
    expect(mockAddExpense).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await typeAmount(view, '450');

    const enabledSave = view.getByRole('button', { name: strings.expenseSheet.saveExpense });
    expect(enabledSave.props.accessibilityState?.disabled).toBe(false);

    await tap(enabledSave);
    expect(mockAddExpense).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders Save already enabled in edit mode, where the amount is prefilled', async () => {
    const expense = makeExpense({ id: 'e1', amount: 1200 });
    const view = await renderEditSheet(expense);

    const save = view.getByRole('button', { name: strings.expenseSheet.saveChanges });
    expect(save.props.accessibilityState?.disabled).toBe(false);
  });

  // ADR 0028: disabling is only half the convention. A dimmed button with no
  // hint tells a VoiceOver user nothing about why, and this sheet shipped that
  // way through build 16 while AddUpcomingSheet (whose own test pins the same
  // three assertions) already carried the hint.
  it('names the missing amount in a VoiceOver hint while Save is disabled', async () => {
    const view = await renderLogSheet();

    const disabledSave = view.getByRole('button', { name: strings.expenseSheet.saveExpense });
    expect(disabledSave.props.accessibilityState?.disabled).toBe(true);
    expect(disabledSave.props.accessibilityHint).toBe(strings.sheets.saveHintAmount);

    await typeAmount(view, '450');

    // Once the amount is real the hint goes away rather than lingering as a
    // stale instruction on an enabled control.
    const enabledSave = view.getByRole('button', { name: strings.expenseSheet.saveExpense });
    expect(enabledSave.props.accessibilityHint).toBeUndefined();
  });

  it('carries no hint in edit mode, where the amount is never missing', async () => {
    const view = await renderEditSheet(makeExpense({ id: 'e1', amount: 1200 }));

    const save = view.getByRole('button', { name: strings.expenseSheet.saveChanges });
    expect(save.props.accessibilityHint).toBeUndefined();
  });
});

describe('ExpenseSheet: iOS Done bar', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pressing Done dismisses the keyboard', async () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    const addListenerSpy = jest.spyOn(Keyboard, 'addListener');

    const view = await renderLogSheet();

    // Both the sheet's Done-bar hook and Sheet.tsx's own KeyboardAvoidingView
    // register a 'keyboardWillShow' listener (see the file header comment);
    // pick out the hook's zero-argument one specifically.
    const showCall = addListenerSpy.mock.calls.find(
      ([eventName, listener]) =>
        eventName === 'keyboardWillShow' && (listener as (...args: unknown[]) => void).length === 0
    );
    expect(showCall).toBeTruthy();
    const showListener = showCall![1] as () => void;

    await act(async () => {
      showListener();
    });

    const doneButton = view.getByRole('button', { name: strings.expenseSheet.keyboardDone });
    await tap(doneButton);

    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });
});
