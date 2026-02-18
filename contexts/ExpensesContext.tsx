import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getExpenses, saveExpenses } from '@/utils/storage';
import type { Expense, AddExpenseInput, ExpenseCategory } from '@/types/expense';
import { formatAmount } from '@/data/expensesMock';

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
    reminderEnabled: input.reminderEnabled,
    reminderTime: input.reminderTime,
    iconVariant,
  };
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadExpenses() {
      const stored = await getExpenses();
      setExpenses(stored);
      setIsLoading(false);
    }
    loadExpenses();
  }, []);

  const addExpense = useCallback(async (input: AddExpenseInput): Promise<Expense> => {
    const newExpense = createExpense(input);
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    await saveExpenses(updated);
    return newExpense;
  }, [expenses]);

  const updateExpense = useCallback(async (
    id: string,
    updates: Partial<Omit<Expense, 'id'>>
  ): Promise<void> => {
    const updated = expenses.map(exp => {
      if (exp.id !== id) return exp;
      const updatedExp = { ...exp, ...updates };
      // Recalculate display amount if amount changed
      if (updates.amount !== undefined) {
        updatedExp.amountDisplay = formatAmount(updates.amount);
      }
      return updatedExp;
    });
    setExpenses(updated);
    await saveExpenses(updated);
  }, [expenses]);

  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    const updated = expenses.filter(exp => exp.id !== id);
    setExpenses(updated);
    await saveExpenses(updated);
  }, [expenses]);

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

  return (
    <ExpensesContext.Provider
      value={{
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
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used within ExpensesProvider');
  return ctx;
}
