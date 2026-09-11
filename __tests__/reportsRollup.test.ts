/**
 * Category resolution in the Insights rollup.
 *
 * The rollup used to group on the stored expense.category and look the display
 * name up with `categories.find(c => c.name === categoryName)`. That match
 * misses for the two defaults whose display name is not their stored value, so
 * Insights read "Software & Subscriptions" and "Mortgage" while Categories read
 * "Subscriptions" and "Home" for the same rows. Every case here pins a rung of
 * `expenseBelongsToCategory`'s ladder as the rollup now uses it.
 *
 * Window behaviour lives in reportsWindows.test.ts; these all sit well inside
 * the pinned window so only the grouping is under test.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { computeSpendingByCategory } from '@/contexts/ReportsContext';
import type { Expense } from '@/types/expense';
import type { Category } from '@/types/category';

const NOW = new Date(2026, 8, 10, 15, 0);
const IN_WINDOW = new Date(2026, 8, 8, 12, 0);

function makeExpense(
  stored: string,
  amount: number,
  categoryId?: string,
  date: Date = IN_WINDOW
): Expense {
  return {
    id: `e-${stored}-${amount}`,
    title: 'Something',
    amount,
    category: stored as Expense['category'],
    categoryId,
    date,
    time: '12:00 PM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
}

function makeCategory(over: Partial<Category> & Pick<Category, 'id' | 'name'>): Category {
  return {
    icon: 'ellipsis-horizontal-outline',
    color: '#111111',
    isDefault: true,
    isHidden: false,
    createdAt: new Date(2026, 0, 1),
    ...over,
  };
}

const SUBS = makeCategory({ id: 'cat-subs', name: 'Subscriptions', color: '#6366F1' });
const HOME = makeCategory({ id: 'cat-home', name: 'Home', color: '#0EA5E9' });
const OTHER = makeCategory({ id: 'cat-other', name: 'Other', color: '#64748B' });
const STREAMING = makeCategory({
  id: 'cat-x',
  name: 'Streaming',
  color: '#DB2777',
  isDefault: false,
});

describe('computeSpendingByCategory category resolution', () => {
  it("renders a default's display name, not its stored value", () => {
    const rows = computeSpendingByCategory(
      [makeExpense('Software & Subscriptions', 1599, 'cat-subs')],
      [SUBS],
      'week',
      NOW
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryName).toBe('Subscriptions');
    expect(rows[0].categoryId).toBe('cat-subs');
    expect(rows[0].categoryColor).toBe('#6366F1');
  });

  it("resolves a stored value with no categoryId through the default's alias map", () => {
    const rows = computeSpendingByCategory([makeExpense('Mortgage', 180000)], [HOME], 'week', NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryName).toBe('Home');
    expect(rows[0].categoryId).toBe('cat-home');
  });

  // Every custom category stores 'Other' on its rows, and the default 'Other'
  // precedes every custom category in the list, so this is the case that
  // decides whether custom spend gets its own row or vanishes into Other.
  it('matches a custom category by id without pulling in the bucket it stores under', () => {
    const rows = computeSpendingByCategory(
      [makeExpense('Other', 1299, 'cat-x'), makeExpense('Other', 400)],
      [OTHER, STREAMING],
      'week',
      NOW
    );
    const names = rows.map((r) => r.categoryName).sort();
    expect(names).toEqual(['Other', 'Streaming']);
    expect(rows.find((r) => r.categoryName === 'Streaming')!.amount).toBe(1299);
    expect(rows.find((r) => r.categoryName === 'Other')!.amount).toBe(400);
  });

  it('collapses two stored values one category matches into a single row', () => {
    // A persisted default row whose one-time rename to "Home" has not run yet
    // is still named "Mortgage/Rent". It matches rows stored under that name
    // directly and rows stored as 'Mortgage' through the alias map, which is
    // the case expenseBelongsToCategory exists for.
    const preRename = makeCategory({ id: 'cat-home', name: 'Mortgage/Rent', color: '#0EA5E9' });
    const rows = computeSpendingByCategory(
      [makeExpense('Mortgage', 180000), makeExpense('Mortgage/Rent', 20000)],
      [preRename],
      'week',
      NOW
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryId).toBe('cat-home');
    expect(rows[0].categoryName).toBe('Mortgage/Rent');
    expect(rows[0].amount).toBe(200000);
    expect(rows[0].percentage).toBe(100);
  });

  it('falls back to the stored value and grey for an orphan row', () => {
    const rows = computeSpendingByCategory(
      [makeExpense('Groceries', 5000)],
      [SUBS, HOME],
      'week',
      NOW
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryName).toBe('Groceries');
    expect(rows[0].categoryId).toBe('Groceries');
    expect(rows[0].categoryColor).toBe('#9E9E9E');
  });

  it('keeps a custom category named Home from claiming the default Mortgage rows', () => {
    const customHome = makeCategory({ id: 'cat-custom-home', name: 'Home', isDefault: false });
    const rows = computeSpendingByCategory(
      [makeExpense('Mortgage', 180000)],
      [customHome],
      'week',
      NOW
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryId).toBe('Mortgage');
    expect(rows[0].categoryName).toBe('Mortgage');
  });

  it('still sorts descending by amount and shares out percentages', () => {
    const rows = computeSpendingByCategory(
      [
        makeExpense('Software & Subscriptions', 1000, 'cat-subs'),
        makeExpense('Mortgage', 3000),
      ],
      [SUBS, HOME],
      'week',
      NOW
    );
    expect(rows.map((r) => r.categoryName)).toEqual(['Home', 'Subscriptions']);
    expect(rows.map((r) => r.percentage)).toEqual([75, 25]);
  });
});
