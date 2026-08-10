/**
 * Mock data and helper functions for expenses.
 */

import type { Expense, ExpenseSection, ExpenseCategory, AddExpenseInput } from '@/types/expense';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Mortgage', 'Car', 'Entertainment', 'Other'];
export const ALL_CATEGORIES = ['All', ...EXPENSE_CATEGORIES] as const;
export type CategoryFilter = (typeof ALL_CATEGORIES)[number];

/**
 * Format amount in cents to display string.
 */
export function formatAmount(cents: number): string {
  return `-$${(cents / 100).toFixed(2)}`;
}

/**
 * Parse display amount string to cents.
 */
export function parseAmountToCents(display: string): number {
  const cleaned = display.replace(/[^0-9.]/g, '');
  return Math.round(parseFloat(cleaned || '0') * 100);
}

/**
 * Group expenses by date into sections.
 */
export function groupExpensesByDate(expenses: Expense[]): ExpenseSection[] {
  const grouped = new Map<string, Expense[]>();

  // Sort expenses by date (newest first) then by time
  const sorted = [...expenses].sort((a, b) => {
    const dateCompare = b.date.getTime() - a.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return 0; // Keep original order within same date
  });

  for (const expense of sorted) {
    // Key by LOCAL calendar day. Using toISOString() (UTC) bucketed evening
    // expenses west of UTC into "tomorrow", producing duplicate/mislabeled
    // day sections (H4).
    const d = expense.date;
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(expense);
  }

  const sections: ExpenseSection[] = [];
  for (const [dateKey, data] of grouped) {
    if (data.length > 0) {
      // title is a stable grouping key only, never display text: the one
      // label pipeline lives in SpentList (dayLabelFor), locale-aware via
      // utils/dates. No hardcoded locale here (ADA-008).
      sections.push({
        title: dateKey,
        data,
      });
    }
  }

  return sections;
}

/**
 * Filter expenses by category.
 */
export function filterExpensesByCategory(expenses: Expense[], category: CategoryFilter): Expense[] {
  if (category === 'All') return expenses;
  return expenses.filter((e) => e.category === category);
}

/**
 * Generate unique ID for new expense.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format current time for display.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Create a new expense from input.
 */
export function createExpense(input: AddExpenseInput): Expense {
  return {
    id: generateId(),
    title: input.title,
    amount: input.amount,
    amountDisplay: formatAmount(input.amount),
    category: input.category,
    date: input.date,
    time: formatTime(input.date),
    isRecurring: input.isRecurring,
    reminderEnabled: input.reminderEnabled,
    reminderTime: input.reminderTime,
    iconVariant: input.category === 'Car' || input.category === 'Entertainment' ? 'yellow' : 'green',
  };
}
