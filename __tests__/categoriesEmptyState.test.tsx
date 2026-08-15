/**
 * Categories empty state as an onboarding surface (PRD v3.1 sect 5, phase 7).
 *
 * Replaces the tautology this used to be in emptyStateSurfaces.test.tsx, which
 * rendered a bare EmptyState with hand-supplied props and asserted that the
 * button it had just been given called the callback it had just been given
 * (review round 3, P2-j). The real wiring in app/(tabs)/categories.tsx, where
 * the CTA meets handleEmptyAddCategory, had no coverage: deleting that one line
 * left the suite green.
 *
 * CategoriesContext re-seeds the defaults whenever storage is empty, so the
 * emptiness has to come from the data source. Mocking it is not mocking the
 * thing under test: the screen, its CTA, and the modal it opens are all real.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/contexts/CategoriesContext', () => ({
  useCategories: () => ({
    categories: [],
    isLoading: false,
    addCategory: jest.fn(async () => {}),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(async () => {}),
    getDefaultCategories: () => [],
    getCustomCategories: () => [],
  }),
}));

jest.mock('@/contexts/ExpensesContext', () => ({
  useExpenses: () => ({ expenses: [] }),
}));

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ToastProvider } from '@/components/ui/Toast';
import CategoriesScreen from '@/app/(tabs)/categories';
import { strings } from '@/constants/strings';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderScreen() {
  const view = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <ToastProvider>
          <CurrencyProvider>
            <OnboardingProvider>
              <CategoriesScreen />
            </OnboardingProvider>
          </CurrencyProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  await act(async () => {});
  return view;
}

afterEach(cleanup);

describe('categories empty state', () => {
  it('offers a concrete first action, not just an explanation', async () => {
    const view = await renderScreen();

    expect(view.getByText(strings.categories.emptyTitle)).toBeTruthy();
    expect(view.getByRole('button', { name: strings.categories.emptyCta })).toBeTruthy();
  });

  it('opens the add-category modal when the CTA is pressed', async () => {
    const view = await renderScreen();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.categories.emptyCta }));
    });

    // The real modal, opened by the real handler.
    expect(view.getByText(strings.addCategoryModal.newCategory)).toBeTruthy();
  });

  // The copy stopped DESCRIBING an action ("Tap Add category at the top")
  // once the state started offering one; a body that narrates a control is
  // the shape sect 5 rules out.
  it('does not tell the user to go find a control elsewhere', async () => {
    const view = await renderScreen();

    expect(view.getByText(strings.categories.emptySubtitle)).toBeTruthy();
    expect(strings.categories.emptySubtitle).not.toMatch(/tap/i);
  });
});
