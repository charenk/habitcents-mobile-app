/**
 * SpentList (U7: Money Spent ledger hierarchy).
 *
 * Covers the fix: Today always renders first (with or without rows), Yesterday
 * is skipped entirely when it has no rows, the single label pipeline runs
 * through the device locale (not a hardcoded 'en-US'), and every amount in the
 * ledger renders unsigned. Grouping itself (data/expensesMock.ts
 * groupExpensesByDate) is covered separately in expensesMock.test.ts.
 *
 * Dates are built relative to `new Date()` at test-run time rather than a
 * fixed fixture date, so the suite passes regardless of when it runs; SpentList
 * itself resolves "today" the same way (`new Date()` inside dayLabelFor).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { SpentList } from '@/components/money/SpentList';
import { strings } from '@/constants/strings';
import { formatDate } from '@/utils/dates';
import { formatMoney } from '@/utils/currency';
import type { Expense, ExpenseSection } from '@/types/expense';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function dateKeyFor(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function makeExpense(overrides: Partial<Expense> & { id: string; date: Date }): Expense {
  return {
    title: 'Coffee',
    amount: 450,
    category: 'Food',
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
    ...overrides,
  };
}

function sectionFor(expenses: Expense[]): ExpenseSection {
  return { title: dateKeyFor(expenses[0].date), data: expenses };
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}

async function renderSpent(sections: ExpenseSection[]) {
  const view = render(
    <Providers>
      <SpentList sections={sections} onEditExpense={() => {}} />
    </Providers>
  );
  return view;
}

afterEach(cleanup);

describe('SpentList: Today always first', () => {
  it('renders the Today section with the empty line and no total when nothing was logged today', async () => {
    // Only a two-days-ago section exists; Today has zero rows.
    const past = sectionFor([makeExpense({ id: 'p1', date: daysAgo(2) })]);
    const view = await renderSpent([past]);

    const todayDateLabel = formatDate(new Date(), { month: 'short', day: 'numeric' });
    const todayEyebrow = strings.money.spentDayLabel(strings.money.spentToday, todayDateLabel);

    // The bare label, no " · $total" appended.
    expect(view.getByText(todayEyebrow)).toBeTruthy();
    expect(view.getByText(strings.money.spentTodayEmpty)).toBeTruthy();
  });

  it('renders the Today section with rows and a total when something was logged today', async () => {
    const today = sectionFor([makeExpense({ id: 't1', date: new Date(), amount: 1200 })]);
    const view = await renderSpent([today]);

    const todayDateLabel = formatDate(new Date(), { month: 'short', day: 'numeric' });
    const expectedEyebrow = strings.money.spentGroupHeader(
      strings.money.spentDayLabel(strings.money.spentToday, todayDateLabel),
      formatMoney(1200)
    );

    expect(view.getByText(expectedEyebrow)).toBeTruthy();
    expect(view.queryByText(strings.money.spentTodayEmpty)).toBeNull();
  });

  // Empty-state unification pass (design/empty-state-unification): the
  // synthesized "Today, nothing logged yet" block used to render above the
  // whole-list EmptyState even when nothing had ever been logged. It no
  // longer does: a genuinely empty `sections` array now renders through
  // SectionList's ListEmptyComponent with no synthesized section (and so no
  // day header) at all, just the one fill EmptyState.
  it('renders only the fill EmptyState, no synthesized Today block, when nothing has ever been logged', async () => {
    const view = await renderSpent([]);

    expect(view.queryByText(strings.money.spentTodayEmpty)).toBeNull();
    expect(view.getByText(strings.money.spentEmptyTitle)).toBeTruthy();
    // One hook line, no body (ADR 0037). Pinned as an absence so a future
    // tidy-up cannot quietly reintroduce the second line.
    expect(view.queryByText(strings.money.spentEmptyBody)).toBeNull();
    // No tappable rows exist anywhere, so the edit hint does not render.
    expect(view.queryByText(strings.money.spentEditHint)).toBeNull();
  });
});

describe('SpentList: Yesterday is skipped when empty', () => {
  it('does not render a Yesterday section when only Today and an older day have rows', async () => {
    const today = sectionFor([makeExpense({ id: 't1', date: new Date() })]);
    const older = sectionFor([makeExpense({ id: 'o1', date: daysAgo(3) })]);
    const view = await renderSpent([today, older]);

    expect(view.queryByText(strings.money.spentYesterday, { exact: false })).toBeNull();
    expect(
      view.queryByText(new RegExp(`^${strings.money.spentYesterday} ·`))
    ).toBeNull();
  });

  it('renders Yesterday with its date and total when it does have rows', async () => {
    const yesterday = sectionFor([makeExpense({ id: 'y1', date: daysAgo(1), amount: 800 })]);
    const view = await renderSpent([yesterday]);

    const yesterdayDateLabel = formatDate(daysAgo(1), { month: 'short', day: 'numeric' });
    const expectedEyebrow = strings.money.spentGroupHeader(
      strings.money.spentDayLabel(strings.money.spentYesterday, yesterdayDateLabel),
      formatMoney(800)
    );

    expect(view.getByText(expectedEyebrow)).toBeTruthy();
  });
});

describe('SpentList: labels are locale-driven', () => {
  it('resolves the date label through Date.prototype.toLocaleDateString with the device locale (undefined), never a hardcoded locale', async () => {
    const spy = jest.spyOn(Date.prototype, 'toLocaleDateString');
    const older = sectionFor([makeExpense({ id: 'o1', date: daysAgo(5) })]);
    await renderSpent([older]);

    expect(spy).toHaveBeenCalled();
    for (const call of spy.mock.calls) {
      // The device-locale contract (ADA-008, utils/dates.ts): pass undefined,
      // never a fixed tag like 'en-US'.
      expect(call[0]).toBeUndefined();
    }
    spy.mockRestore();
  });

  it('renders whatever the locale-aware formatter returns, proving the label is not built from a separately hardcoded string', async () => {
    const spy = jest
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockImplementation(() => '10 ago');
    const older = sectionFor([makeExpense({ id: 'o1', date: daysAgo(5), amount: 300 })]);
    const view = await renderSpent([older]);

    expect(
      view.getByText(strings.money.spentGroupHeader('10 ago', formatMoney(300)))
    ).toBeTruthy();
    spy.mockRestore();
  });
});

describe('SpentList: one number language', () => {
  it('renders every row amount unsigned, never with a minus sign', async () => {
    const today = sectionFor([makeExpense({ id: 't1', date: new Date(), amount: 999 })]);
    const view = await renderSpent([today]);

    expect(view.getByText(formatMoney(999))).toBeTruthy();
    expect(view.queryByText(formatMoney(999, 'USD', { signed: true }))).toBeNull();
  });

  it('keeps the eyebrow total unsigned too', async () => {
    const today = sectionFor([
      makeExpense({ id: 't1', date: new Date(), amount: 500 }),
      makeExpense({ id: 't2', date: new Date(), amount: 300 }),
    ]);
    const view = await renderSpent([today]);

    const todayDateLabel = formatDate(new Date(), { month: 'short', day: 'numeric' });
    const expectedEyebrow = strings.money.spentGroupHeader(
      strings.money.spentDayLabel(strings.money.spentToday, todayDateLabel),
      formatMoney(800)
    );
    expect(view.getByText(expectedEyebrow)).toBeTruthy();
  });
});

describe('SpentList: recurring cycle indicator (ADR 0024, U11)', () => {
  it('appends "recurring" to a materialized child row\'s accessible label', async () => {
    const today = sectionFor([
      makeExpense({
        id: 'child-1',
        date: new Date(),
        source: 'recurring',
        parentId: 'parent-1',
      }),
    ]);
    const view = await renderSpent([today]);

    expect(view.getByLabelText(/^Edit Coffee,.*recurring$/)).toBeTruthy();
  });

  it('appends "recurring" to the parent\'s own historical-first-spend row too', async () => {
    const today = sectionFor([
      makeExpense({
        id: 'parent-1',
        date: new Date(),
        isRecurring: true,
        recurrence: 'monthly',
      }),
    ]);
    const view = await renderSpent([today]);

    expect(view.getByLabelText(/^Edit Coffee,.*recurring$/)).toBeTruthy();
  });

  it('never appends "recurring" to a plain manual (non-recurring) row', async () => {
    const today = sectionFor([makeExpense({ id: 'manual-1', date: new Date() })]);
    const view = await renderSpent([today]);

    expect(view.queryByLabelText(/recurring/)).toBeNull();
  });

  it("a 'once' schedule (a single upcoming item, not a repeating one) carries no indicator either", async () => {
    const today = sectionFor([
      makeExpense({
        id: 'once-1',
        date: new Date(),
        recurrenceRule: { type: 'once' },
      }),
    ]);
    const view = await renderSpent([today]);

    expect(view.queryByLabelText(/recurring/)).toBeNull();
  });
});
