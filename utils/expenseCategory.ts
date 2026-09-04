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

/** Map a Category.name onto the ExpenseCategory that gets stored on the row. */
export function toExpenseCategory(name: string): ExpenseCategory {
  if (name === 'Home' || name === 'Mortgage/Rent') return 'Mortgage';
  if (name === 'Subscriptions') return 'Software & Subscriptions';
  const match = STORED_CATEGORIES.find((c) => c === name);
  return match ?? 'Other';
}

/** True when a Category is the one currently selected on the sheet. */
export function isCategorySelected(category: Category, selected: ExpenseCategory | null): boolean {
  return selected != null && toExpenseCategory(category.name) === selected;
}
