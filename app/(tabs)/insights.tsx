import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useReports } from '@/contexts/ReportsContext';
import { hasFullMonthOfData } from '@/utils/recurring';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useHabits } from '@/contexts/HabitsContext';
import {
  WidgetCard,
  SpendingByCategoryContent,
  SpendingOverTimeContent,
  HabitStreaksContent,
  ProjectionContent,
} from '@/components/WidgetCard';
import { typeScale, type AppTheme } from '@/constants/theme';
import type { TimeRange } from '@/types/report';
import { strings } from '@/constants/strings';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    config,
    isLoading,
    updateWidgetTimeRange,
    calculateSpendingByCategory,
    calculateSpendingOverTime,
    calculateMonthlyProjection,
  } = useReports();

  const { expenses } = useExpenses();
  const { categories } = useCategories();
  const { getActiveHabits, getGoalByHabitId } = useHabits();

  const sortedWidgets = useMemo(() => {
    return [...config.widgets].sort((a, b) => a.order - b.order);
  }, [config.widgets]);

  const handleTimeRangeChange = useCallback(async (widgetId: string, timeRange: TimeRange) => {
    await updateWidgetTimeRange(widgetId, timeRange);
  }, [updateWidgetTimeRange]);

  const renderWidgetContent = useCallback((widget: typeof sortedWidgets[0]) => {
    switch (widget.type) {
      case 'spending_by_category': {
        const data = calculateSpendingByCategory(expenses, categories, widget.timeRange);
        const total = data.reduce((sum, d) => sum + d.amount, 0);
        return <SpendingByCategoryContent data={data} total={total} />;
      }

      case 'spending_over_time': {
        const data = calculateSpendingOverTime(expenses, widget.timeRange);
        return (
          <SpendingOverTimeContent
            data={data.map(d => ({ label: d.label, amount: d.amount }))}
          />
        );
      }

      case 'habit_streaks': {
        const activeHabits = getActiveHabits();
        const data = activeHabits.map(habit => {
          const goal = getGoalByHabitId(habit.id);
          return {
            habitName: habit.name,
            totalSkips: goal?.totalSkips || 0,
          };
        });
        return <HabitStreaksContent data={data} />;
      }

      case 'monthly_projection': {
        // Pre-coverage placeholder (spec 05 section 5.3): before a full
        // calendar month of data exists, an extrapolated projection is a
        // fabricated number. Show the honest placeholder instead.
        if (!hasFullMonthOfData(expenses)) {
          return (
            <View style={styles.projectionPlaceholder}>
              <Text style={styles.projectionPlaceholderText}>
                {strings.leakScan.projectionPlaceholder}
              </Text>
            </View>
          );
        }
        const projection = calculateMonthlyProjection(expenses);
        return (
          <ProjectionContent
            currentSpent={projection.currentSpent}
            projectedTotal={projection.projectedTotal}
            daysRemaining={projection.daysRemaining}
            comparedToLastMonth={projection.comparedToLastMonth}
          />
        );
      }

      default:
        return null;
    }
  }, [
    expenses,
    categories,
    calculateSpendingByCategory,
    calculateSpendingOverTime,
    calculateMonthlyProjection,
    getActiveHabits,
    getGoalByHabitId,
  ]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{strings.reports.loading}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: serif screen title. */}
      <View style={styles.header}>
        <Text style={styles.screenTitle} accessibilityRole="header">
          {strings.screenTitles.insights}
        </Text>
      </View>

      <View style={styles.subtitleRow}>
        <Text style={styles.subtitle}>{strings.reports.subtitle}</Text>
      </View>

      {/* Widgets */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedWidgets.filter(w => w.isVisible).map((widget) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            onTimeRangeChange={(range) => handleTimeRangeChange(widget.id, range)}
          >
            {renderWidgetContent(widget)}
          </WidgetCard>
        ))}
      </ScrollView>
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    screenTitle: {
      fontFamily: theme.fonts.display,
      fontSize: typeScale.screenTitle,
      lineHeight: 40,
      color: theme.ink,
      includeFontPadding: false,
    },
    subtitleRow: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 16,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    projectionPlaceholder: {
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    projectionPlaceholderText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
