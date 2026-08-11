/**
 * AddUpcomingSheet (U8: added edit mode, mirroring ExpenseSheet's log/edit
 * split -- see __tests__/expenseSheet.test.tsx for the sibling pattern this
 * borrows, including the delete-with-undo shape).
 *
 * The behavior worth pinning: editing amount or name alone must NOT silently
 * reschedule the bill (the sheet always recomputes a schedule from "today" in
 * add mode, which would be wrong to apply on every edit-save too), while
 * actually changing a schedule control must take effect. Also: the sheet's
 * own frequency chips didn't offer 'annual' before U8, so an item Leak Scan
 * imported with an annual rule could never be edited without losing its
 * cadence; this pins that round-trip too.
 *
 * Amount entry (ADR 0023): the sheet's AmountField is a real TextInput on the
 * native decimal pad, so tests type a full amount string via changeText
 * rather than tapping digit-labeled Keypad buttons (see
 * __tests__/expenseSheet.test.tsx, the sibling pattern this borrows).
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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AddUpcomingSheet } from '@/components/money/AddUpcomingSheet';
import { strings } from '@/constants/strings';
import type { Category } from '@/types/category';
import type { AddExpenseInput, Expense } from '@/types/expense';

const mockCategories: Category[] = [
  {
    id: 'cat-housing',
    name: 'Mortgage/Rent',
    icon: 'home-outline',
    color: '#B39DDB',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'cat-entertainment',
    name: 'Entertainment',
    icon: 'film-outline',
    color: '#FFB74D',
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

function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  const base: Expense = {
    id: overrides.id,
    title: 'Gym',
    amount: 4500,
    category: 'Entertainment',
    categoryId: 'cat-entertainment',
    date: new Date('2026-08-15T00:00:00'),
    time: '9:00 AM',
    isRecurring: true,
    recurrence: 'monthly',
    recurrenceRule: { type: 'monthly', monthDay: '15' },
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
  return { ...base, ...overrides } as Expense;
}

const onClose = jest.fn();

type View = Awaited<ReturnType<typeof render>>;

async function renderAdd(): Promise<View> {
  const view = await render(
    <Providers>
      <AddUpcomingSheet mode="add" visible onClose={onClose} />
    </Providers>
  );
  await act(async () => {});
  return view;
}

async function renderEdit(expense: Expense): Promise<View> {
  const view = await render(
    <Providers>
      <AddUpcomingSheet mode="edit" visible expense={expense} onClose={onClose} />
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

/** Types a full amount string into the native AmountField in one change,
 *  the way a decimal-pad keystroke stream ultimately resolves to a value. */
async function typeAmount(view: View, amount: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(view.getByLabelText(/^Amount,/), amount);
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

describe('AddUpcomingSheet add mode (regression)', () => {
  it('still writes a fresh monthly schedule the way it did before U8', async () => {
    const view = await renderAdd();

    await typeAmount(view, '12');
    await tap(view.getByLabelText('Gym, not selected'));
    await tap(view.getByRole('button', { name: strings.addUpcoming.save }));

    expect(mockAddExpense).toHaveBeenCalledTimes(1);
    const saved = mockAddExpense.mock.calls[0][0];
    expect(saved.amount).toBe(1200);
    expect(saved.title).toBe('Gym');
    expect(saved.recurrenceRule).toEqual({ type: 'monthly', monthDay: '1' });
  });

  it('offers a Yearly frequency chip that writes an annual rule', async () => {
    const view = await renderAdd();

    await typeAmount(view, '5');
    await tap(view.getByLabelText('Yearly, not selected'));
    await tap(view.getByRole('button', { name: strings.addUpcoming.save }));

    const saved = mockAddExpense.mock.calls[0][0];
    expect(saved.recurrenceRule).toEqual({ type: 'annual' });
    expect(saved.recurrence).toBe('annual');
    expect(saved.isRecurring).toBe(true);
  });
});

describe('AddUpcomingSheet edit mode: prefill and untouched-schedule round trip', () => {
  it('prefills amount, name and schedule, and Save alone leaves the schedule untouched', async () => {
    const expense = makeExpense({ id: 'e1' });
    const view = await renderEdit(expense);

    // The monthly/15th chip is prefilled selected from the stored rule.
    expect(view.getByLabelText('Monthly, selected')).toBeTruthy();
    expect(view.getByLabelText('15th, selected')).toBeTruthy();
    expect(view.getByDisplayValue('Gym')).toBeTruthy();

    await tap(view.getByRole('button', { name: strings.addUpcoming.saveChanges }));

    expect(mockUpdateExpense).toHaveBeenCalledTimes(1);
    const [id, updates] = mockUpdateExpense.mock.calls[0];
    expect(id).toBe('e1');
    // Nothing about the schedule changed, so the ORIGINAL date and rule are
    // written back unchanged rather than a freshly computed one.
    expect(updates.date).toEqual(expense.date);
    expect(updates.recurrenceRule).toEqual({ type: 'monthly', monthDay: '15' });
    expect(updates.amount).toBe(4500);
    expect(updates.title).toBe('Gym');
  });

  it('editing the amount alone does not touch the schedule', async () => {
    const expense = makeExpense({ id: 'e1', amount: 1200 }); // "12.00"
    const view = await renderEdit(expense);

    // Replaces the prefilled "12.00" with a freshly typed amount.
    await typeAmount(view, '99');

    await tap(view.getByRole('button', { name: strings.addUpcoming.saveChanges }));

    const updates = mockUpdateExpense.mock.calls[0][1];
    expect(updates.amount).toBe(9900);
    expect(updates.date).toEqual(expense.date);
    expect(updates.recurrenceRule).toEqual({ type: 'monthly', monthDay: '15' });
  });

  it('keeps the row\'s own category when no name chip matches, rather than falling back to Other', async () => {
    const expense = makeExpense({ id: 'e1', title: 'Custom Bill', category: 'Entertainment' });
    const view = await renderEdit(expense);

    await tap(view.getByRole('button', { name: strings.addUpcoming.saveChanges }));

    const updates = mockUpdateExpense.mock.calls[0][1];
    expect(updates.category).toBe('Entertainment');
  });

  it('round-trips an annual rule through the (previously missing) Yearly chip', async () => {
    const expense = makeExpense({
      id: 'e1',
      recurrence: 'annual',
      recurrenceRule: { type: 'annual' },
    });
    const view = await renderEdit(expense);

    expect(view.getByLabelText('Yearly, selected')).toBeTruthy();

    await tap(view.getByRole('button', { name: strings.addUpcoming.saveChanges }));

    const updates = mockUpdateExpense.mock.calls[0][1];
    expect(updates.recurrenceRule).toEqual({ type: 'annual' });
  });
});

describe('AddUpcomingSheet edit mode: actually changing the schedule', () => {
  it('rebuilds the rule when the user picks a different frequency', async () => {
    const expense = makeExpense({ id: 'e1' }); // starts monthly/15th
    const view = await renderEdit(expense);

    await tap(view.getByLabelText('Weekly, not selected'));
    await tap(view.getByRole('button', { name: strings.addUpcoming.saveChanges }));

    const updates = mockUpdateExpense.mock.calls[0][1];
    expect(updates.recurrenceRule!.type).toBe('weekly');
    // A freshly built schedule, not the original monthly one.
    expect(updates.recurrenceRule).not.toEqual({ type: 'monthly', monthDay: '15' });
  });
});

describe('AddUpcomingSheet edit mode: materialized-child collision (queue2 review P1)', () => {
  // The reviewer's repro: a schedule rebuild anchors at today, and when the
  // materializer has already written a child for today, saving the parent
  // onto the same day would double-count that occurrence. The first test
  // captures the date a rebuild naturally produces (sequential on purpose:
  // a mid-test cleanup() corrupts act tracking, see U11's RTL note); the
  // second plants a child on exactly that day and proves the save advances.
  let capturedNaturalDate: Date | null = null;

  it('captures the natural rebuilt date with no children present', async () => {
    const parent = makeExpense({ id: 'e1' });
    const view = await renderEdit(parent);

    await tap(view.getByLabelText('Weekly, not selected'));
    await tap(view.getByRole('button', { name: strings.addUpcoming.saveChanges }));

    capturedNaturalDate = mockUpdateExpense.mock.calls[0][1].date as Date;
    expect(capturedNaturalDate).toBeInstanceOf(Date);
  });

  it('never writes the parent onto a day owned by one of its children', async () => {
    expect(capturedNaturalDate).not.toBeNull();
    const parent = makeExpense({ id: 'e1' });
    const child = makeExpense({
      id: 'c1',
      date: new Date(capturedNaturalDate as Date),
      isRecurring: false,
      recurrence: undefined,
      recurrenceRule: undefined,
      source: 'recurring',
      parentId: 'e1',
    });
    mockExpenses = [parent, child];

    const view = await renderEdit(parent);
    await tap(view.getByLabelText('Weekly, not selected'));
    await tap(view.getByRole('button', { name: strings.addUpcoming.saveChanges }));

    const updates = mockUpdateExpense.mock.calls[0][1];
    const saved = updates.date as Date;
    const natural = capturedNaturalDate as Date;
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    expect(sameDay(saved, natural)).toBe(false);
    expect(saved.getTime()).toBeGreaterThan(natural.getTime());
    expect(updates.recurrenceRule!.type).toBe('weekly');
  });

  it('re-selecting the already-active schedule value is not a reschedule', async () => {
    const parent = makeExpense({ id: 'e1' }); // monthly, the 15th
    const view = await renderEdit(parent);

    await tap(view.getByLabelText('Monthly, selected'));
    await tap(view.getByRole('button', { name: strings.addUpcoming.saveChanges }));

    const updates = mockUpdateExpense.mock.calls[0][1];
    expect(updates.date).toEqual(parent.date);
    expect(updates.recurrenceRule).toEqual({ type: 'monthly', monthDay: '15' });
  });
});

describe('AddUpcomingSheet edit mode: delete with undo', () => {
  it('deletes with no confirmation and offers an undo toast', async () => {
    const expense = makeExpense({ id: 'e1' });
    mockExpenses = [expense];
    const view = await renderEdit(expense);

    await tap(view.getByRole('button', { name: strings.addUpcoming.deleteUpcoming }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDeleteExpense).toHaveBeenCalledWith('e1');
    expect(view.getByText(strings.toasts.deleted)).toBeTruthy();

    await tap(view.getByText(strings.toasts.undo));
    expect(mockRestoreExpense).toHaveBeenCalledWith(expense, 0);
  });
});
