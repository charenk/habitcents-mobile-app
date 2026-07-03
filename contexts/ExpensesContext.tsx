import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getExpenses, saveExpenses } from '@/utils/storage';
import type { Expense, AddExpenseInput, ExpenseCategory } from '@/types/expense';
import { formatAmount } from '@/data/expensesMock';
import { track } from '@/utils/analytics';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

type ExpensesContextValue = {
  expenses: Expense[];
  isLoading: boolean;
  addExpense: (input: AddExpenseInput) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id'>>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getExpenseById: (id: string) => Expense | undefined;
  getExpensesByCategory: (category: ExpenseCategory | 'All') => Expense[];
  getExpensesByDateRange: (start: Date, end: Date) => Expense[];
  getTotalByCategory: (category: ExpenseCategory) => number;
  getTotalSpent: (startDate?: Date, endDate?: Date) => number;
  getExpenseCount: () => number;
};

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function createExpense(input: AddExpenseInput): Expense {
  const iconVariant = ['Mortgage', 'Utilities', 'Healthcare'].includes(input.category)
    ? 'green'
    : 'yellow';

  return {
    id: generateId(),
    title: input.title,
    amount: input.amount,
    amountDisplay: formatAmount(input.amount),
    category: input.category,
    categoryId: input.categoryId,
    merchant: input.merchant,
    date: input.date,
    time: formatTime(input.date),
    isRecurring: input.isRecurring,
    recurrence: input.recurrence,
    reminderEnabled: input.reminderEnabled,
    reminderTime: input.reminderTime,
    iconVariant,
  };
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mutations read/write through this ref (always the latest committed list)
  // rather than the render closure, so rapid successive edits (double-tap Save,
  // edit-then-delete) each build on the previous result, not a stale copy.
  const expensesRef = useRef<Expense[]>([]);
  const loadedRef = useRef(false);

  const commit = useCallback(async (next: Expense[]): Promise<void> => {
    expensesRef.current = next;
    setExpenses(next);
    await saveExpenses(next);
  }, []);

  useEffect(() => {
    async function loadExpenses() {
      const stored = await getExpenses();
      expensesRef.current = stored;
      setExpenses(stored);
      loadedRef.current = true;
      setIsLoading(false);
    }
    loadExpenses();
  }, []);

  const addExpense = useCallback(async (input: AddExpenseInput): Promise<Expense> => {
    const newExpense = createExpense(input);
    // Guard against adding before hydration finished, which would persist a
    // 1-item array over the user's stored history.
    if (!loadedRef.current) {
      expensesRef.current = await getExpenses();
      loadedRef.current = true;
    }
    await commit([newExpense, ...expensesRef.current]);
    track('expense_logged', {
      category: newExpense.category,
      has_merchant: !!newExpense.merchant,
      is_recurring: !!newExpense.isRecurring,
    });
    return newExpense;
  }, [commit]);

  const updateExpense = useCallback(async (
    id: string,
    updates: Partial<Omit<Expense, 'id'>>
  ): Promise<void> => {
    const updated = expensesRef.current.map(exp => {
      if (exp.id !== id) return exp;
      const updatedExp = { ...exp, ...updates };
      if (updates.amount !== undefined) {
        updatedExp.amountDisplay = formatAmount(updates.amount);
      }
      return updatedExp;
    });
    await commit(updated);
    track('expense_edited', { fields_changed: Object.keys(updates).length });
  }, [commit]);

  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    await commit(expensesRef.current.filter(exp => exp.id !== id));
    track('expense_deleted', {});
  }, [commit]);

  const getExpenseById = useCallback((id: string): Expense | undefined => {
    return expenses.find(e => e.id === id);
  }, [expenses]);

  const getExpensesByCategory = useCallback((category: ExpenseCategory | 'All'): Expense[] => {
    if (category === 'All') return expenses;
    return expenses.filter(e => e.category === category);
  }, [expenses]);

  const getExpensesByDateRange = useCallback((start: Date, end: Date): Expense[] => {
    return expenses.filter(e => e.date >= start && e.date <= end);
  }, [expenses]);

  const getTotalByCategory = useCallback((category: ExpenseCategory): number => {
    return expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const getTotalSpent = useCallback((startDate?: Date, endDate?: Date): number => {
    let filtered = expenses;
    if (startDate) {
      filtered = filtered.filter(e => e.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(e => e.date <= endDate);
    }
    return filtered.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const getExpenseCount = useCallback((): number => {
    return expenses.length;
  }, [expenses]);

  const value = useMemo(() => ({
    expenses,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpenseById,
    getExpensesByCategory,
    getExpensesByDateRange,
    getTotalByCategory,
    getTotalSpent,
    getExpenseCount,
  }), [
    expenses, isLoading, addExpense, updateExpense, deleteExpense,
    getExpenseById, getExpensesByCategory, getExpensesByDateRange,
    getTotalByCategory, getTotalSpent, getExpenseCount,
  ]);

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used within ExpensesProvider');
  return ctx;
}
