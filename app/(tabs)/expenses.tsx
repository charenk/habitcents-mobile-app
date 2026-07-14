import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useCategories } from '@/contexts/CategoriesContext';
import type { AppTheme } from '@/constants/theme';
import { AddExpenseSection, type AddExpenseSectionHandle } from '@/components/AddExpenseSection';
import { TodayExpensesPanel } from '@/components/TodayExpensesPanel';
import { UpcomingPanel } from '@/components/UpcomingPanel';
import type { AddExpenseInput } from '@/types/expense';
import { groupExpensesByDate } from '@/data/expensesMock';
import { computeUpcoming } from '@/utils/recurring';
import { strings } from '@/constants/strings';
import { selectableLabel } from '@/utils/a11y';

const UPCOMING_WINDOW_DAYS = 60;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Matches the collapsed sheet peek (SNAP_COLLAPSED in TodayExpensesPanel) plus a
// buffer, so the form's Save button always scrolls clear of the sheet.
const FORM_BOTTOM_PADDING = SCREEN_HEIGHT * 0.18 + 32;

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [activeView, setActiveView] = useState<'recent' | 'upcoming'>('recent');
  const addExpenseRef = useRef<AddExpenseSectionHandle>(null);

  // Recompute the date pill when the app returns to the foreground, so it never
  // shows yesterday after being backgrounded overnight (M2).
  const [dateLabel, setDateLabel] = useState(todayLabel);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setDateLabel(todayLabel());
    });
    return () => sub.remove();
  }, []);

  const { expenses, addExpense } = useExpenses();
  const { getVisibleCategories } = useCategories();
  const categories = getVisibleCategories();

  const handleSaveExpense = useCallback(async (input: AddExpenseInput) => {
    await addExpense(input);
  }, [addExpense]);

  const handleCancelExpense = useCallback(() => {
    // No-op; the form resets itself.
  }, []);

  const filteredExpenses = useMemo(
    () => activeCategoryId === 'all'
      ? expenses
      : expenses.filter(e => e.categoryId === activeCategoryId),
    [expenses, activeCategoryId]
  );
  const sections = useMemo(
    () => groupExpensesByDate(filteredExpenses),
    [filteredExpenses]
  );

  const upcoming = useMemo(
    () => computeUpcoming(expenses, UPCOMING_WINDOW_DAYS),
    [expenses]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.datePill}>
          <Text style={styles.datePillText}>{dateLabel}</Text>
        </View>
        <View style={styles.viewTabs}>
          <TouchableOpacity
            onPress={() => setActiveView('recent')}
            accessibilityRole="button"
            accessibilityState={{ selected: activeView === 'recent' }}
            accessibilityLabel={selectableLabel(strings.expenses.recent, activeView === 'recent')}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Text style={[styles.viewTab, activeView === 'recent' ? styles.viewTabActive : styles.viewTabInactive]}>
              {strings.expenses.recent}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveView('upcoming')}
            accessibilityRole="button"
            accessibilityState={{ selected: activeView === 'upcoming' }}
            accessibilityLabel={selectableLabel(strings.expenses.upcoming, activeView === 'upcoming')}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Text style={[styles.viewTab, activeView === 'upcoming' ? styles.viewTabActive : styles.viewTabInactive]}>
              {strings.expenses.upcoming}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeView === 'recent' ? (
        <>
          {/* Add Expense form: scrollable so the Save button is always reachable
              above the collapsed expenses sheet. */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AddExpenseSection ref={addExpenseRef} onSave={handleSaveExpense} onCancel={handleCancelExpense} />
          </ScrollView>

          {/* Slidable Expenses Panel */}
          <View style={[styles.panelWrap, { pointerEvents: 'box-none' }]}>
            <TodayExpensesPanel
              sections={sections}
              categories={categories}
              activeCategoryId={activeCategoryId}
              onCategoryChange={setActiveCategoryId}
              emptyState={
                expenses.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>{strings.expenses.emptyTitle}</Text>
                    <Text style={styles.emptyBody}>{strings.expenses.emptyBody}</Text>
                    <TouchableOpacity
                      style={styles.emptyCta}
                      onPress={() => addExpenseRef.current?.focusAmount()}
                      accessibilityRole="button"
                    >
                      <Text style={styles.emptyCtaText}>{strings.expenses.emptyCta}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          </View>
        </>
      ) : (
        <UpcomingPanel items={upcoming} windowDays={UPCOMING_WINDOW_DAYS} />
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    formScroll: {
      flex: 1,
    },
    formScrollContent: {
      paddingBottom: FORM_BOTTOM_PADDING,
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
    viewTabs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    viewTab: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 34,
    },
    viewTabActive: {
      color: theme.primary,
    },
    viewTabInactive: {
      color: theme.textSecondary,
    },
    panelWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    emptyContainer: {
      paddingVertical: 28,
      paddingHorizontal: 32,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyCta: {
      marginTop: 16,
      minHeight: 44,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCtaText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.white,
    },
  });
}
