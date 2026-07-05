import { hasFullMonthOfData } from '@/utils/recurring';
import type { Expense } from '@/types/expense';

function makeExpense(date: Date): Expense {
  return {
    id: `e-${date.getTime()}`,
    title: 'Coffee',
    amount: 500,
    amountDisplay: '-$5.00',
    category: 'Food',
    categoryId: 'food',
    date,
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
}

describe('hasFullMonthOfData (P2-4, spec 05 section 5.3 pre-coverage placeholder)', () => {
  it('is false with no expenses', () => {
    expect(hasFullMonthOfData([])).toBe(false);
  });

  it('is false when every expense is within the current calendar month', () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    expect(hasFullMonthOfData([makeExpense(thisMonth), makeExpense(now)])).toBe(false);
  });

  it('is true once an expense predates the start of the current calendar month', () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    expect(hasFullMonthOfData([makeExpense(lastMonth)])).toBe(true);
  });

  it('is true when any one of several expenses predates this month, even if others are recent', () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    expect(hasFullMonthOfData([makeExpense(now), makeExpense(lastMonth)])).toBe(true);
  });
});
