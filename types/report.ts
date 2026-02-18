/**
 * Type definitions for reports and dashboard system.
 */

export type WidgetType =
  | 'spending_by_category'
  | 'spending_over_time'
  | 'habit_streaks'
  | 'monthly_projection';

export type TimeRange = 'week' | 'month' | 'quarter' | 'year';

export type ReportWidget = {
  id: string;
  type: WidgetType;
  title: string;
  order: number;
  isVisible: boolean;
  timeRange: TimeRange;
};

export type DashboardConfig = {
  widgets: ReportWidget[];
  lastUpdated: Date;
};

export type SpendingByCategory = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentage: number;
};

export type SpendingOverTime = {
  date: Date;
  amount: number;
  label: string;
};

export type HabitStreakSummary = {
  habitId: string;
  habitName: string;
  currentStreak: number;
  longestStreak: number;
  totalSavings: number;
};

export type MonthlyProjection = {
  currentSpent: number;
  projectedTotal: number;
  averageDaily: number;
  daysRemaining: number;
  comparedToLastMonth: number;
};

export const DEFAULT_WIDGETS: ReportWidget[] = [
  {
    id: 'widget-1',
    type: 'spending_by_category',
    title: 'Spending by Category',
    order: 0,
    isVisible: true,
    timeRange: 'month',
  },
  {
    id: 'widget-2',
    type: 'spending_over_time',
    title: 'Spending Over Time',
    order: 1,
    isVisible: true,
    timeRange: 'month',
  },
  {
    id: 'widget-3',
    type: 'habit_streaks',
    title: 'Habit Streaks',
    order: 2,
    isVisible: true,
    timeRange: 'month',
  },
  {
    id: 'widget-4',
    type: 'monthly_projection',
    title: 'Monthly Projection',
    order: 3,
    isVisible: true,
    timeRange: 'month',
  },
];
