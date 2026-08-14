/**
 * Categories delete confirm (design/selection-sheets U3): the destructive
 * confirm at app/(tabs)/categories.tsx moved off Alert.alert onto the house
 * ConfirmSheet, matching the pattern app/habit/[id].tsx already used. This
 * pins the flow the alert used to cover: tapping delete on a custom category
 * opens a confirm sheet naming it, cancel leaves it untouched, and confirm
 * calls deleteCategory exactly once.
 *
 * Provider wiring: CategoriesContext and ExpensesContext are module-mocked
 * (same approach as __tests__/logExpenseSheet.test.tsx) so a fixture category
 * list can be fed in directly and deleteCategory is directly observable.
 */
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockDeleteCategory = jest.fn(async (_id: string) => {});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockCategories = [
  {
    id: 'default-0',
    name: 'Food',
    icon: 'fast-food-outline',
    color: '#66BB6A',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'cat-custom-1',
    name: 'Hobbies',
    icon: 'gamepad-outline',
    color: '#7E57C2',
    isDefault: false,
    isHidden: false,
    createdAt: new Date('2026-02-01T00:00:00Z'),
  },
];

jest.mock('@/contexts/CategoriesContext', () => ({
  useCategories: () => ({
    categories: mockCategories,
    isLoading: false,
    addCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: mockDeleteCategory,
    getDefaultCategories: () => mockCategories.filter((c) => c.isDefault),
    getCustomCategories: () => mockCategories.filter((c) => !c.isDefault),
  }),
}));

jest.mock('@/contexts/ExpensesContext', () => ({
  useExpenses: () => ({ expenses: [] }),
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import CategoriesScreen from '@/app/(tabs)/categories';
import { strings } from '@/constants/strings';
import { deleteCategoryLabel } from '@/utils/a11y';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <ToastProvider>
          <CurrencyProvider>
            <OnboardingProvider>{children}</OnboardingProvider>
          </CurrencyProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderScreen() {
  const view = await render(
    <Providers>
      <CategoriesScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

beforeEach(() => {
  mockDeleteCategory.mockClear();
});

afterEach(cleanup);

describe('Categories delete confirm', () => {
  it('opens the confirm sheet naming the category, not a native alert', async () => {
    const view = await renderScreen();

    await act(async () => {
      fireEvent.press(view.getByLabelText(deleteCategoryLabel('Hobbies')));
    });

    expect(view.getByText(strings.categories.deleteTitle('Hobbies'))).toBeTruthy();
    expect(view.getByText(strings.categories.deleteMessage)).toBeTruthy();
    expect(mockDeleteCategory).not.toHaveBeenCalled();
  });

  it('keep category (cancel) leaves the category untouched', async () => {
    const view = await renderScreen();

    await act(async () => {
      fireEvent.press(view.getByLabelText(deleteCategoryLabel('Hobbies')));
    });
    await act(async () => {
      fireEvent.press(view.getByText(strings.categories.deleteCancel));
    });

    expect(mockDeleteCategory).not.toHaveBeenCalled();
  });

  it('confirming delete calls deleteCategory exactly once', async () => {
    const view = await renderScreen();

    await act(async () => {
      fireEvent.press(view.getByLabelText(deleteCategoryLabel('Hobbies')));
    });
    await act(async () => {
      fireEvent.press(view.getByText(strings.categories.deleteConfirmCta));
    });

    expect(mockDeleteCategory).toHaveBeenCalledTimes(1);
    expect(mockDeleteCategory).toHaveBeenCalledWith('cat-custom-1');
  });
});
