/**
 * One expense belongs to exactly one category.
 *
 * QA 2026-09-11. `expenseBelongsToCategory` is an OR ladder, so a row can
 * satisfy several categories at once: every custom category stores 'Other' as
 * the row's stored value, so a custom-category expense matched its own
 * category by id AND the default 'Other' by name. Categories and category
 * detail both called it inside a per-category filter, so the same dollars were
 * counted twice, and Insights (fixed in PR #161) disagreed with both.
 *
 * These pin the resolver the three surfaces now share. The partition property
 * at the bottom is the one that would have caught the original bug.
 */
import { resolveExpenseCategory, expenseBelongsToCategory } from '@/utils/expenseCategory';
import type { Category } from '@/types/category';

type Cat = Pick<Category, 'id' | 'name' | 'isDefault'>;

const OTHER: Cat = { id: 'cat-other', name: 'Other', isDefault: true };
const HOME: Cat = { id: 'cat-rent', name: 'Home', isDefault: true };
const SUBS: Cat = { id: 'cat-subs', name: 'Subscriptions', isDefault: true };
const FOOD: Cat = { id: 'cat-food', name: 'Food', isDefault: true };
const STREAMING: Cat = { id: 'cat-stream', name: 'Streaming', isDefault: false };

// Defaults come first, and 'Other' ahead of every custom category, which is
// what made a plain find-first over the ladder bank custom spend under Other.
const CATEGORIES: Cat[] = [HOME, FOOD, SUBS, OTHER, STREAMING];

describe('resolveExpenseCategory', () => {
  it('gives a custom-category row its own category, not the bucket it stores under', () => {
    const expense = { category: 'Other', categoryId: 'cat-stream' };

    expect(resolveExpenseCategory(expense, CATEGORIES)).toBe(STREAMING);
  });

  it('resolves a default whose display name is not its stored value', () => {
    expect(resolveExpenseCategory({ category: 'Mortgage' }, CATEGORIES)).toBe(HOME);
    expect(resolveExpenseCategory({ category: 'Software & Subscriptions' }, CATEGORIES)).toBe(SUBS);
  });

  it('still resolves a genuine Other row to Other', () => {
    expect(resolveExpenseCategory({ category: 'Other' }, CATEGORIES)).toBe(OTHER);
  });

  it('prefers an explicit categoryId over a name that matches something else', () => {
    // The id is a foreign key; the stored value is a coincidence.
    const expense = { category: 'Food', categoryId: 'cat-stream' };

    expect(resolveExpenseCategory(expense, CATEGORIES)).toBe(STREAMING);
  });

  it('returns undefined for an orphan whose category no longer exists', () => {
    expect(resolveExpenseCategory({ category: 'Gone' }, CATEGORIES)).toBeUndefined();
  });

  it('falls back to the name rungs when the categoryId points at nothing', () => {
    const expense = { category: 'Food', categoryId: 'cat-deleted' };

    expect(resolveExpenseCategory(expense, CATEGORIES)).toBe(FOOD);
  });
});

describe('the partition property', () => {
  const rows = [
    { category: 'Other', categoryId: 'cat-stream' },
    { category: 'Other' },
    { category: 'Mortgage' },
    { category: 'Food', categoryId: 'cat-food' },
    { category: 'Software & Subscriptions' },
  ];

  it('puts every expense in exactly one category', () => {
    for (const row of rows) {
      const owners = CATEGORIES.filter(c => resolveExpenseCategory(row, CATEGORIES)?.id === c.id);

      expect(owners).toHaveLength(1);
    }
  });

  it('adds up to the same total however the rows are bucketed', () => {
    const amounts = [5000, 1200, 180000, 650, 1599];
    const grand = amounts.reduce((a, b) => a + b, 0);

    const perCategory = CATEGORIES.map(c =>
      rows.reduce(
        (sum, row, i) =>
          resolveExpenseCategory(row, CATEGORIES)?.id === c.id ? sum + amounts[i] : sum,
        0
      )
    );

    // Double counting showed up here: the old filter made this exceed the sum.
    expect(perCategory.reduce((a, b) => a + b, 0)).toBe(grand);
  });

  it('shows why the membership helper cannot be used to partition', () => {
    // The trap, pinned so nobody reintroduces it: this row is a member of two
    // categories at once, which is correct for a membership question and wrong
    // for bucketing.
    const expense = { category: 'Other', categoryId: 'cat-stream' };
    const members = CATEGORIES.filter(c => expenseBelongsToCategory(expense, c));

    expect(members).toHaveLength(2);
    expect(members.map(c => c.id).sort()).toEqual(['cat-other', 'cat-stream']);
  });
});
