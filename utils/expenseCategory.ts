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
 * expense.category is compared against the category's name AND, for DEFAULT
 * categories only, its mapped stored value, because two defaults display
 * under names that are not their stored value (Home, Subscriptions).
 * Deliberately NOT toExpenseCategory(name) === expense.category: that helper
 * falls back to 'Other' for unknown names, which would make every custom
 * category claim the whole Other bucket, and the isDefault gate keeps a
 * custom category someone names "Home" or "Mortgage/Rent" from claiming the
 * default's rows. Fixes a latent miss where "Mortgage/Rent" detail screens
 * matched nothing stored as 'Mortgage'.
 *
 * MEMBERSHIP ONLY. This is an OR ladder, so one expense can satisfy several
 * categories at once, and calling it inside a per-category filter double
 * counts. To put each expense in exactly one bucket use
 * resolveExpenseCategory below.
 */
export function expenseBelongsToCategory(
  expense: { category: string; categoryId?: string },
  category: Pick<Category, 'id' | 'name' | 'isDefault'>
): boolean {
  return (
    expense.categoryId === category.id ||
    expense.category === category.name ||
    (category.isDefault && DISPLAY_TO_STORED[category.name] === expense.category)
  );
}

/**
 * The one category an expense belongs to, or undefined when none matches.
 *
 * Use this, not `expenseBelongsToCategory`, whenever a list of expenses is
 * PARTITIONED across categories. That helper is an OR ladder, so a row can
 * satisfy more than one category at once and a per-category `.filter()` counts
 * it in every bucket it matches. That is exactly what happened on Categories
 * and category detail: every custom category stores 'Other' as the row's
 * stored value, so a custom-category expense matched its own category by id
 * AND the default 'Other' by name, and its dollars landed in both.
 *
 * An explicit categoryId is tried across the whole list BEFORE the name rungs.
 * `toExpenseCategory` falls back to 'Other' for any name it does not know, and
 * the default 'Other' sits ahead of every custom category in the list, so a
 * plain find-first over the ladder would bank all custom-category spend under
 * Other. The id is a foreign key; the shared stored value is a coincidence.
 */
export function resolveExpenseCategory<C extends Pick<Category, 'id' | 'name' | 'isDefault'>>(
  expense: { category: string; categoryId?: string },
  categories: C[]
): C | undefined {
  return (
    (expense.categoryId ? categories.find(c => c.id === expense.categoryId) : undefined) ??
    categories.find(c => expenseBelongsToCategory(expense, c))
  );
}

/** True when a Category is the one currently selected on the sheet. */
export function isCategorySelected(category: Category, selected: ExpenseCategory | null): boolean {
  return selected != null && toExpenseCategory(category.name) === selected;
}
