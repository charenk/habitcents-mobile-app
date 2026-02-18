import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useReports } from '@/contexts/ReportsContext';
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
import type { AppTheme } from '@/constants/theme';
import type { TimeRange } from '@/types/report';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isEditing, setIsEditing] = useState(false);

  const {
    config,
    isLoading,
    reorderWidgets,
    toggleWidgetVisibility,
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

  const handleToggleVisibility = useCallback(async (widgetId: string) => {
    await toggleWidgetVisibility(widgetId);
  }, [toggleWidgetVisibility]);

  const handleMoveUp = useCallback(async (index: number) => {
    if (index > 0) {
      await reorderWidgets(index, index - 1);
    }
  }, [reorderWidgets]);

  const handleMoveDown = useCallback(async (index: number) => {
    if (index < sortedWidgets.length - 1) {
      await reorderWidgets(index, index + 1);
    }
  }, [reorderWidgets, sortedWidgets.length]);

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
            currentStreak: goal?.currentStreak || 0,
            longestStreak: goal?.longestStreak || 0,
          };
        });
        return <HabitStreaksContent data={data} />;
      }

      case 'monthly_projection': {
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
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Ionicons
            name={isEditing ? 'checkmark' : 'options-outline'}
            size={22}
            color={isEditing ? theme.primary : theme.text}
          />
        </TouchableOpacity>
      </View>

      {/* Subtitle with last updated */}
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitle}>
          {isEditing ? 'Drag to reorder, tap eye to hide' : 'Your financial insights'}
        </Text>
      </View>

      {/* Widgets */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedWidgets.map((widget, index) => (
          <View key={widget.id}>
            {isEditing && (
              <View style={styles.reorderControls}>
                <TouchableOpacity
                  style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                  onPress={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <Ionicons
                    name="chevron-up"
                    size={20}
                    color={index === 0 ? theme.textTertiary : theme.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reorderButton,
                    index === sortedWidgets.length - 1 && styles.reorderButtonDisabled,
                  ]}
                  onPress={() => handleMoveDown(index)}
                  disabled={index === sortedWidgets.length - 1}
                >
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={index === sortedWidgets.length - 1 ? theme.textTertiary : theme.text}
                  />
                </TouchableOpacity>
              </View>
            )}
            <WidgetCard
              widget={widget}
              onTimeRangeChange={(range) => handleTimeRangeChange(widget.id, range)}
              onToggleVisibility={() => handleToggleVisibility(widget.id)}
              isEditing={isEditing}
            >
              {renderWidgetContent(widget)}
            </WidgetCard>
          </View>
        ))}

        {/* Empty state */}
        {sortedWidgets.filter(w => w.isVisible).length === 0 && !isEditing && (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={theme.textTertiary} />
            <Text style={styles.emptyTitle}>All widgets hidden</Text>
            <Text style={styles.emptySubtitle}>
              Tap the options button to show widgets
            </Text>
          </View>
        )}
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
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
    },
    editButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
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
    reorderControls: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 4,
      gap: 4,
    },
    reorderButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reorderButtonDisabled: {
      opacity: 0.5,
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
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
  });
}
