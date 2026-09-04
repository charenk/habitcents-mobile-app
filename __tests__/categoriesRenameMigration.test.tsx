/**
 * One-time display rename of persisted default categories (Charen,
 * 2026-09-04): stored category rows keep their seeded names forever, so
 * renaming DEFAULT_CATEGORIES ('Mortgage/Rent' -> 'Home',
 * 'Software & Subscriptions' -> 'Subscriptions') only reaches fresh installs
 * on its own. CategoriesContext.loadCategories renames already-persisted
 * DEFAULT rows once at load and persists the result.
 *
 * Pins: default rows with old names (including a pre-taxonomy-v2 'Mortgage'
 * seed) load renamed AND are written back to storage; a CUSTOM category the
 * user happened to name 'Mortgage/Rent' is never touched; ids and every
 * other field survive.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoriesProvider, useCategories } from '@/contexts/CategoriesContext';
import { expenseBelongsToCategory, toExpenseCategory } from '@/utils/expenseCategory';
import type { Category } from '@/types/category';

const CATEGORIES_KEY = '@habitcents_categories';

function storedCategory(overrides: Partial<Category> & { id: string; name: string }): Category {
  return {
    icon: 'home-outline',
    color: '#7E57C2',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-07-01T00:00:00'),
    ...overrides,
  } as Category;
}

let latest: Category[] = [];
function Probe(): null {
  const { categories } = useCategories();
  latest = categories;
  return null;
}

async function renderWithStored(stored: Category[]): Promise<void> {
  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(stored));
  await render(
    <CategoriesProvider>
      <Probe />
    </CategoriesProvider>
  );
  await act(async () => {});
}

afterEach(async () => {
  cleanup();
  await AsyncStorage.clear();
});

describe('default category rename migration', () => {
  it('renames stored default rows to Home and Subscriptions, and persists it', async () => {
    await renderWithStored([
      storedCategory({ id: 'default-0', name: 'Mortgage/Rent' }),
      storedCategory({ id: 'default-8', name: 'Software & Subscriptions', icon: 'card-outline', color: '#26A69A' }),
      storedCategory({ id: 'default-3', name: 'Food', icon: 'fast-food-outline', color: '#66BB6A' }),
    ]);

    const byId = new Map(latest.map((c) => [c.id, c]));
    expect(byId.get('default-0')?.name).toBe('Home');
    expect(byId.get('default-8')?.name).toBe('Subscriptions');
    // Untouched rows keep their names and every renamed row keeps its identity.
    expect(byId.get('default-3')?.name).toBe('Food');
    expect(byId.get('default-0')?.color).toBe('#7E57C2');

    // The rename persisted, so the next launch loads the new names directly.
    const persisted = JSON.parse((await AsyncStorage.getItem(CATEGORIES_KEY)) as string);
    const names = persisted.map((c: Category) => c.name);
    expect(names).toContain('Home');
    expect(names).toContain('Subscriptions');
    expect(names).not.toContain('Mortgage/Rent');
    expect(names).not.toContain('Software & Subscriptions');
  });

  it('renames a pre-taxonomy-v2 Mortgage default seed too', async () => {
    await renderWithStored([storedCategory({ id: 'default-0', name: 'Mortgage' })]);
    expect(latest[0]?.name).toBe('Home');
  });

  it('maps the display names back to the frozen stored values on write', () => {
    // Expenses keep storing the ADR 0006 values; only the labels moved.
    expect(toExpenseCategory('Home')).toBe('Mortgage');
    expect(toExpenseCategory('Subscriptions')).toBe('Software & Subscriptions');
    // The retired display name stays accepted (a stored default row could
    // load before its one-time rename has persisted).
    expect(toExpenseCategory('Mortgage/Rent')).toBe('Mortgage');
  });

  it('matches stored expenses to renamed defaults, and never leaks onto customs', () => {
    const home = { id: 'default-0', name: 'Home', isDefault: true };
    // A Home default owns rows stored as 'Mortgage' (the frozen value)...
    expect(expenseBelongsToCategory({ category: 'Mortgage' }, home)).toBe(true);
    // ...and Subscriptions owns 'Software & Subscriptions' rows.
    expect(
      expenseBelongsToCategory(
        { category: 'Software & Subscriptions' },
        { id: 'default-8', name: 'Subscriptions', isDefault: true }
      )
    ).toBe(true);
    // Exact-name and id matches still work.
    expect(
      expenseBelongsToCategory({ category: 'Food' }, { id: 'default-3', name: 'Food', isDefault: true })
    ).toBe(true);
    expect(
      expenseBelongsToCategory(
        { category: 'Other', categoryId: 'cat-x' },
        { id: 'cat-x', name: 'Streaming', isDefault: false }
      )
    ).toBe(true);
    // A custom category must NOT claim the Other bucket via the
    // toExpenseCategory fallback, and a custom named like a default's
    // display name (or a retired alias) must not claim the default's rows.
    expect(
      expenseBelongsToCategory({ category: 'Other' }, { id: 'cat-y', name: 'Streaming', isDefault: false })
    ).toBe(false);
    expect(
      expenseBelongsToCategory({ category: 'Mortgage' }, { id: 'cat-z', name: 'Mortgage/Rent', isDefault: false })
    ).toBe(false);
    expect(
      expenseBelongsToCategory({ category: 'Mortgage' }, { id: 'cat-w', name: 'Home', isDefault: false })
    ).toBe(false);
  });

  it('never touches a custom category that shares an old default name', async () => {
    await renderWithStored([
      storedCategory({ id: 'default-0', name: 'Mortgage/Rent' }),
      storedCategory({ id: 'cat-custom-1', name: 'Mortgage/Rent', isDefault: false }),
    ]);

    const byId = new Map(latest.map((c) => [c.id, c]));
    expect(byId.get('default-0')?.name).toBe('Home');
    expect(byId.get('cat-custom-1')?.name).toBe('Mortgage/Rent');
  });
});
