import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import type { AppTheme } from '@/constants/theme';
import { AddExpenseSection } from '@/components/AddExpenseSection';
import { TodayExpensesPanel } from '@/components/TodayExpensesPanel';
import type { AddExpenseInput } from '@/types/expense';
import {
  groupExpensesByDate,
  filterExpensesByCategory,
  type CategoryFilter,
} from '@/data/expensesMock';

const now = new Date();
const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');

  const { expenses, addExpense } = useExpenses();

  const handleSaveExpense = useCallback(async (input: AddExpenseInput) => {
    await addExpense(input);
  }, [addExpense]);

  const handleCancelExpense = useCallback(() => {
    // No-op; the form resets itself.
  }, []);

  const filteredExpenses = useMemo(
    () => filterExpensesByCategory(expenses, activeCategory),
    [expenses, activeCategory]
  );
  const sections = useMemo(
    () => groupExpensesByDate(filteredExpenses),
    [filteredExpenses]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.datePill}>
          <Text style={styles.datePillText}>{dateLabel}</Text>
        </View>
        <Text style={styles.title}>Expenses</Text>
      </View>

      {/* Add Expense Section (always visible) */}
      <AddExpenseSection onSave={handleSaveExpense} onCancel={handleCancelExpense} />

      {/* Slidable Expenses Panel */}
      <View style={[styles.panelWrap, { pointerEvents: 'box-none' }]}>
        <TodayExpensesPanel
          sections={sections}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    datePill: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primaryMuted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 8,
    },
    datePillText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.primary,
      lineHeight: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      lineHeight: 34,
    },
    panelWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
  });
}
