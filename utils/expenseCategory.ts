/**
 * Stored-category helpers shared by CategoryChipRow (components/money/
 * CategoryChipRow.tsx) and AddUpcomingSheet (components/money/
 * AddUpcomingSheet.tsx). Previously lived on CategoryTilePicker, the emoji-
 * tile grid component; that component was never rendered anywhere in the
 * app (git grep confirmed no `<CategoryTilePicker` usage) and was deleted,
 * but both sheets still need the identical stored-name normalization, so it
 * moved here rather than being duplicated. No React, no theme, no side
 * effects.
 */
import type { Category } from '@/types/category';
import type { ExpenseCategory } from '@/types/expense';

/**
 * Every ExpenseCategory value, as stored. Display names diverge from two of
 * them (types/category.ts DEFAULT_CATEGORIES): 'Home' renders the stored
 * 'Mortgage' value, 'Subscriptions' renders the stored
 * 'Software & Subscriptions' value, so a Category.name has to be mapped back
 * before it is written to an expense. 'Mortgage/Rent' was the 2026-07..09
 * display name and is kept as an accepted alias in case a stored default row
 * loads before its one-time rename has persisted.
 */
const STORED_CATEGORIES: readonly ExpenseCategory[] = [
  'Mortgage',
  'Car',
  'Entertainment',
  'Food',
  'Shopping',
  'Utilities',
  'Healthcare',
  'Transportation',
  'Software & Subscriptions',
  'Other',
];

/** Display names whose stored value differs (current names and retired aliases). */
const DISPLAY_TO_STORED: Record<string, ExpenseCategory> = {
  Home: 'Mortgage',
  'Mortgage/Rent': 'Mortgage',
  Subscriptions: 'Software & Subscriptions',
};

/** Map a Category.name onto the ExpenseCategory that gets stored on the row. */
export function toExpenseCategory(name: string): ExpenseCategory {
  const mapped = DISPLAY_TO_STORED[name];
  if (mapped) return mapped;
  const match = STORED_CATEGORIES.find((c) => c === name);
  return match ?? 'Other';
}

/**
 * True when an expense row belongs to the category. The stored
 * expense.category is compared against the category's name AND its mapped
 * stored value, because two default categories display under names that are
 * not their stored value (Home, Subscriptions). Deliberately NOT
 * toExpenseCategory(name) === expense.category: that helper falls back to
 * 'Other' for unknown names, which would make every custom category claim
 * the whole Other bucket. Fixes a latent miss where "Mortgage/Rent" detail
 * screens matched nothing stored as 'Mortgage'.
 */
export function expenseBelongsToCategory(
  expense: { category: string; categoryId?: string },
  category: Pick<Category, 'id' | 'name'>
): boolean {
  return (
    expense.categoryId === category.id ||
    expense.category === category.name ||
    DISPLAY_TO_STORED[category.name] === expense.category
  );
}

/** True when a Category is the one currently selected on the sheet. */
export function isCategorySelected(category: Category, selected: ExpenseCategory | null): boolean {
  return selected != null && toExpenseCategory(category.name) === selected;
}
