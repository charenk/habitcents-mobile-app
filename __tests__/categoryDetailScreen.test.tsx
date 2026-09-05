/**
 * Category detail screen (app/category/[id].tsx). Two things pinned here,
 * both from U12b:
 *
 * - The "transactions" vocabulary rename to logs-family wording (house rule:
 *   the app says "expenses" or "logs", never "transactions") and the token
 *   migration off theme.surface/text/textSecondary/border.
 * - The always-drawn empty trend chart (minHeight stubs rendering a chart of
 *   nothing) now renders the house EmptyState primitive instead when the
 *   6-month window has zero spend.
 *
 * Also verifies the edit pencil (custom categories only) still opens
 * AddCategoryModal prefilled and saves through CategoriesContext.updateCategory
 * -- the path app/(tabs)/categories.tsx's own dead editingCategory state used
 * to shadow. Provider wiring mirrors __tests__/moneyHabitsTab.test.tsx.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockBack = jest.fn();
let mockParams: { id: string } = { id: 'cat-custom' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { ToastProvider } from '@/components/ui/Toast';
import CategoryDetailScreen from '@/app/category/[id]';
import { saveCategories, saveExpenses } from '@/utils/storage';
import { strings } from '@/constants/strings';
import type { Category } from '@/types/category';
import type { Expense } from '@/types/expense';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <LocaleProvider>
          <ToastProvider>
            <CurrencyProvider>
              <CategoriesProvider>
                <ExpensesProvider>{children}</ExpensesProvider>
              </CategoriesProvider>
            </CurrencyProvider>
          </ToastProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function customCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-custom',
    name: 'Hobbies',
    icon: 'game-controller-outline',
    color: '#8E7CF3',
    isDefault: false,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function defaultCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'default-0',
    name: 'Food',
    icon: 'fast-food-outline',
    color: '#FF6B6B',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    title: 'Board game night',
    amount: 3200,
    category: 'Other',
    categoryId: 'cat-custom',
    date: new Date(),
    time: '7:00 PM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'green',
    ...overrides,
  };
}

async function renderDetail(): Promise<Awaited<ReturnType<typeof render>>> {
  const view = await render(
    <Providers>
      <CategoryDetailScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

afterEach(cleanup);

describe('Category detail: logs vocabulary and stats', () => {
  it('labels the count and average stats with logs-family wording, off "transactions"', async () => {
    mockParams = { id: 'cat-custom' };
    await saveCategories([defaultCategory(), customCategory()]);
    await saveExpenses([
      expense({ id: 'e1', amount: 3200 }),
      expense({ id: 'e2', amount: 1800, title: 'Puzzle' }),
    ]);

    const view = await renderDetail();

    expect(view.getByText(strings.categoryDetail.logsStat)).toBeTruthy();
    expect(view.getByText(strings.categoryDetail.averageStat)).toBeTruthy();
    expect(view.getByText(strings.categoryDetail.sixMonthTrend)).toBeTruthy();
    expect(view.getByText(strings.categoryDetail.recentLogs)).toBeTruthy();
    // The old "transactions" wording is gone.
    expect(view.queryByText(/transaction/i)).toBeNull();
  });

  it('shows the top merchants section with logs-family counts, off "transactions"', async () => {
    mockParams = { id: 'cat-custom' };
    await saveCategories([defaultCategory(), customCategory()]);
    await saveExpenses([
      expense({ id: 'e1', merchant: 'Board Game Cafe', amount: 3200 }),
      expense({ id: 'e2', merchant: 'Board Game Cafe', amount: 2500, title: 'Second visit' }),
    ]);

    const view = await renderDetail();

    expect(view.getByText(strings.categoryDetail.topMerchants)).toBeTruthy();
    expect(view.getByText(strings.categoryDetail.logCount(2))).toBeTruthy();
  });

  it('shows the trend empty state instead of an empty chart when the category has no spend', async () => {
    mockParams = { id: 'cat-custom' };
    await saveCategories([defaultCategory(), customCategory()]);
    await saveExpenses([]);

    const view = await renderDetail();

    expect(view.getByText(strings.categoryDetail.trendEmpty)).toBeTruthy();
  });
});

describe('Category detail: edit pencil', () => {
  it('a custom category shows the edit pencil, which opens AddCategoryModal prefilled and saves the rename', async () => {
    mockParams = { id: 'cat-custom' };
    await saveCategories([defaultCategory(), customCategory({ name: 'Hobbies' })]);
    await saveExpenses([]);

    const view = await renderDetail();

    expect(view.getByText('Hobbies.')).toBeTruthy();

    const editButton = view.getByRole('button', { name: strings.categoryDetail.editCategoryLabel });
    await act(async () => {
      fireEvent.press(editButton);
    });

    // AddCategoryModal opens in edit mode, prefilled with the category's name.
    expect(view.getByText(strings.addCategoryModal.editCategory)).toBeTruthy();
    const nameInput = view.getByDisplayValue('Hobbies');
    await act(async () => {
      fireEvent.changeText(nameInput, 'Board Games');
    });

    await act(async () => {
      fireEvent.press(view.getByText(strings.common.save));
    });

    // The screen title reflects the rename, proving the edit path still
    // writes through CategoriesContext.updateCategory.
    expect(view.getByText('Board Games.')).toBeTruthy();
  });

  it('a default category shows no edit pencil', async () => {
    mockParams = { id: 'default-0' };
    await saveCategories([defaultCategory(), customCategory()]);
    await saveExpenses([]);

    const view = await renderDetail();

    expect(view.queryByRole('button', { name: strings.categoryDetail.editCategoryLabel })).toBeNull();
  });
});
