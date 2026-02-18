import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { AppTheme } from '@/constants/theme';
import { UpcomingView } from '@/components/UpcomingView';
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

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [activeDay, setActiveDay] = useState<'recent' | 'upcoming'>('recent');

  const { expenses, addExpense } = useExpenses();
  const { incrementExpenseCount } = useOnboarding();

  const handleSaveExpense = useCallback(async (input: AddExpenseInput) => {
    await addExpense(input);
    await incrementExpenseCount();
  }, [addExpense, incrementExpenseCount]);

  const handleCancelExpense = useCallback(() => {
    // No-op for now, form handles its own reset
  }, []);

  // Filter and group expenses
  const filteredExpenses = useMemo(
    () => filterExpensesByCategory(expenses, activeCategory),
    [expenses, activeCategory]
  );
  const sections = useMemo(
    () => groupExpensesByDate(filteredExpenses),
    [filteredExpenses]
  );

  if (activeDay === 'upcoming') {
    return (
      <UpcomingView onRecentPress={() => setActiveDay('recent')} />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateRow}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{dateLabel}</Text>
          </View>
        </View>
        <View style={styles.dayTabs}>
          <TouchableOpacity onPress={() => setActiveDay('recent')}>
            <Text style={[styles.dayTabText, styles.dayTabActive]}>
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveDay('upcoming')}>
            <Text style={[styles.dayTabText, styles.dayTabInactive]}>
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>
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

      {/* FAB (reserved for voice) */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.fabGradientStart, theme.fabGradientEnd]}
          style={styles.fabGradient}
        >
          <Ionicons name="mic" size={28} color={theme.text} />
        </LinearGradient>
      </TouchableOpacity>
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
    dateRow: {
      marginBottom: 8,
    },
    datePill: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primaryMuted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    datePillText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.primary,
      lineHeight: 16,
    },
    dayTabs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
      height: 40,
    },
    dayTabText: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 34,
    },
    dayTabActive: {
      color: theme.primary,
    },
    dayTabInactive: {
      color: theme.textTertiary,
    },
    panelWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    fab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    fabGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
