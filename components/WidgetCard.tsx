import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import type { ReportWidget, TimeRange } from '@/types/report';
import { strings } from '@/constants/strings';
import { selectableLabel } from '@/utils/a11y';

const TIME_RANGE_SPOKEN: Record<TimeRange, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

type WidgetCardProps = {
  widget: ReportWidget;
  children: React.ReactNode;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  week: strings.reports.timeRangeWeek,
  month: strings.reports.timeRangeMonth,
  quarter: strings.reports.timeRangeQuarter,
  year: strings.reports.timeRangeYear,
};

export function WidgetCard({
  widget,
  children,
  onTimeRangeChange,
}: WidgetCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const timeRanges: TimeRange[] = ['week', 'month', 'quarter', 'year'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{widget.title}</Text>
        </View>

        <View style={styles.headerRight}>
          {onTimeRangeChange && (
            <View style={styles.timeRangeSelector}>
              {timeRanges.map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.timeRangeButton,
                    widget.timeRange === range && styles.timeRangeButtonActive,
                  ]}
                  onPress={() => onTimeRangeChange(range)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: widget.timeRange === range }}
                  accessibilityLabel={selectableLabel(TIME_RANGE_SPOKEN[range], widget.timeRange === range)}
                  hitSlop={{ top: 11, bottom: 11 }}
                >
                  <Text
                    style={[
                      styles.timeRangeText,
                      widget.timeRange === range && styles.timeRangeTextActive,
                    ]}
                  >
                    {TIME_RANGE_LABELS[range]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

// Spending by Category Widget Content
type SpendingByCategoryContentProps = {
  data: Array<{
    categoryName: string;
    categoryColor: string;
    amount: number;
    percentage: number;
  }>;
  total: number;
};

export function SpendingByCategoryContent({ data, total }: SpendingByCategoryContentProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createContentStyles(theme), [theme]);

  return (
    <View style={styles.categoryContent}>
      {/* Simple horizontal bar chart */}
      <View style={styles.barChart}>
        {data.slice(0, 5).map((item, index) => (
          <View key={index} style={styles.barItem}>
            <View style={styles.barLabel}>
              <View style={[styles.barDot, { backgroundColor: item.categoryColor }]} />
              <Text style={styles.barLabelText} numberOfLines={1}>
                {item.categoryName}
              </Text>
              <Text style={styles.barValue}>{format(item.amount, { compact: true })}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${item.percentage}%`,
                    backgroundColor: item.categoryColor,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{strings.reports.total}</Text>
        <Text style={styles.totalValue}>{format(total, { compact: true })}</Text>
      </View>
    </View>
  );
}

// Spending Over Time Widget Content
type SpendingOverTimeContentProps = {
  data: Array<{
    label: string;
    amount: number;
  }>;
};

export function SpendingOverTimeContent({ data }: SpendingOverTimeContentProps) {
  const theme = useTheme();
  const styles = useMemo(() => createContentStyles(theme), [theme]);

  if (data.length === 0) {
    return (
      <View style={styles.emptyContent}>
        <Text style={styles.emptyText}>{strings.reports.noSpendingData}</Text>
      </View>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <View style={styles.timeContent}>
      <View style={styles.sparklineContainer}>
        {data.map((point, index) => (
          <View key={index} style={styles.sparklineBar}>
            <View
              style={[
                styles.sparklineBarFill,
                {
                  height: `${(point.amount / maxAmount) * 100}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.sparklineLabels}>
        {data.length <= 7 ? (
          data.map((point, index) => (
            <Text key={index} style={styles.sparklineLabel}>
              {point.label}
            </Text>
          ))
        ) : (
          <>
            <Text style={styles.sparklineLabel}>{data[0].label}</Text>
            <Text style={styles.sparklineLabel}>{data[data.length - 1].label}</Text>
          </>
        )}
      </View>
    </View>
  );
}

// Habit Streaks Widget Content. Rewired to habit-logging v2 (P2-4 cleanup):
// the legacy currentStreak/longestStreak fields on HabitChangeGoal are never
// populated by the v2 skip/slip flow (contexts/HabitsContext.tsx), so a habit
// tracked entirely through v2 showed an empty/zero badge here. totalSkips is
// the real, always-current v2 count (never decremented except a same-day
// correction) and is the right "how much progress" number for this widget.
type HabitStreaksContentProps = {
  data: Array<{
    habitName: string;
    totalSkips: number;
  }>;
};

export function HabitStreaksContent({ data }: HabitStreaksContentProps) {
  const theme = useTheme();
  const styles = useMemo(() => createContentStyles(theme), [theme]);

  if (data.length === 0) {
    return (
      <View style={styles.emptyContent}>
        <Text style={styles.emptyText}>{strings.reports.noActiveHabits}</Text>
      </View>
    );
  }

  return (
    <View style={styles.streaksContent}>
      {data.slice(0, 4).map((habit, index) => (
        <View key={index} style={styles.streakRow}>
          <Text style={styles.streakName} numberOfLines={1}>
            {habit.habitName}
          </Text>
          <View style={styles.streakBadge}>
            <Ionicons name="checkmark-circle" size={14} color={theme.primary} />
            <Text style={styles.streakCount}>{habit.totalSkips}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Monthly Projection Widget Content
type ProjectionContentProps = {
  currentSpent: number;
  projectedTotal: number;
  daysRemaining: number;
  comparedToLastMonth: number;
};

export function ProjectionContent({
  currentSpent,
  projectedTotal,
  daysRemaining,
  comparedToLastMonth,
}: ProjectionContentProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createContentStyles(theme), [theme]);

  const progress = projectedTotal > 0
    ? Math.round((currentSpent / projectedTotal) * 100)
    : 0;

  const isUp = comparedToLastMonth > 0;

  return (
    <View style={styles.projectionContent}>
      <View style={styles.projectionMain}>
        <View style={styles.projectionAmount}>
          <Text style={styles.projectionValue}>{format(projectedTotal, { compact: true })}</Text>
          <Text style={styles.projectionLabel}>{strings.reports.projectedThisMonth}</Text>
        </View>
        <View style={styles.projectionComparison}>
          <Ionicons
            name={isUp ? 'trending-up' : 'trending-down'}
            size={16}
            color={isUp ? theme.danger : theme.primary}
          />
          <Text
            style={[
              styles.projectionChange,
              { color: isUp ? theme.danger : theme.primary },
            ]}
          >
            {Math.abs(comparedToLastMonth)}%
          </Text>
        </View>
      </View>

      <View style={styles.projectionProgress}>
        <View style={styles.projectionBar}>
          <View
            style={[
              styles.projectionBarFill,
              { width: `${Math.min(progress, 100)}%` },
            ]}
          />
        </View>
        <View style={styles.projectionStats}>
          <Text style={styles.projectionStat}>
            {strings.reports.spent(format(currentSpent, { compact: true }))}
          </Text>
          <Text style={styles.projectionStat}>
            {strings.reports.daysLeft(daysRemaining)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
    },
    containerHidden: {
      opacity: 0.6,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    dragHandle: {
      padding: 4,
      marginRight: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    timeRangeSelector: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: 2,
    },
    timeRangeButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    timeRangeButtonActive: {
      backgroundColor: theme.surface,
    },
    timeRangeText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    timeRangeTextActive: {
      color: theme.primary,
      fontWeight: '600',
    },
    visibilityButton: {
      padding: 4,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    hiddenContent: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    hiddenText: {
      fontSize: 13,
      color: theme.textTertiary,
      marginTop: 8,
    },
  });
}

function createContentStyles(theme: AppTheme) {
  return StyleSheet.create({
    // Category content
    categoryContent: {},
    barChart: {
      marginBottom: 12,
    },
    barItem: {
      marginBottom: 10,
    },
    barLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    barDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    barLabelText: {
      flex: 1,
      fontSize: 13,
      color: theme.text,
    },
    barValue: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    barTrack: {
      height: 6,
      backgroundColor: theme.background,
      borderRadius: 3,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 3,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    totalLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    totalValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },

    // Time content
    timeContent: {},
    sparklineContainer: {
      flexDirection: 'row',
      height: 80,
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    sparklineBar: {
      flex: 1,
      marginHorizontal: 2,
      height: '100%',
      justifyContent: 'flex-end',
    },
    sparklineBarFill: {
      borderRadius: 2,
      minHeight: 4,
    },
    sparklineLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    sparklineLabel: {
      fontSize: 10,
      // Informational axis labels: textSecondary for the 4.5:1 contrast
      // floor, not textTertiary (spec 09 section 1.5).
      color: theme.textSecondary,
    },

    // Streaks content
    streaksContent: {},
    streakRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    streakName: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    streakCount: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 4,
    },

    // Projection content
    projectionContent: {},
    projectionMain: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    projectionAmount: {},
    projectionValue: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
    },
    projectionLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    projectionComparison: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    projectionChange: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
    projectionProgress: {},
    projectionBar: {
      height: 8,
      backgroundColor: theme.background,
      borderRadius: 4,
      overflow: 'hidden',
    },
    projectionBarFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    projectionStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    projectionStat: {
      fontSize: 12,
      color: theme.textSecondary,
    },

    // Empty state
    emptyContent: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
  });
}
