import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { getDashboardConfig, saveDashboardConfig } from '@/utils/storage';
import { strings } from '@/constants/strings';
import { formatDate } from '@/utils/dates';
import { resolveExpenseCategory } from '@/utils/expenseCategory';
import type {
  DashboardConfig,
  ReportWidget,
  WidgetType,
  TimeRange,
  SpendingByCategory,
  SpendingOverTime,
  MonthlyProjection,
} from '@/types/report';
import { DEFAULT_WIDGETS } from '@/types/report';
import type { Expense } from '@/types/expense';
import type { Category } from '@/types/category';

type ReportsContextValue = {
  config: DashboardConfig;
  isLoading: boolean;
  reorderWidgets: (fromIndex: number, toIndex: number) => Promise<void>;
  toggleWidgetVisibility: (widgetId: string) => Promise<void>;
  updateWidgetTimeRange: (widgetId: string, timeRange: TimeRange) => Promise<void>;
  addWidget: (type: WidgetType, title: string) => Promise<ReportWidget>;
  removeWidget: (widgetId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  calculateSpendingByCategory: (expenses: Expense[], categories: Category[], timeRange: TimeRange) => SpendingByCategory[];
  calculateSpendingOverTime: (expenses: Expense[], timeRange: TimeRange) => SpendingOverTime[];
  calculateMonthlyProjection: (expenses: Expense[]) => MonthlyProjection;
};

const ReportsContext = createContext<ReportsContextValue | null>(null);

function generateId(): string {
  return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultConfig(): DashboardConfig {
  return {
    widgets: DEFAULT_WIDGETS,
    lastUpdated: new Date(),
  };
}

/**
 * How many calendar days the 'week' window covers, counting today. 7 calendar
 * days ending today, the convention `merchantDays7` uses in
 * utils/habitDetection.ts (`daysAgo <= 6`), so the reports rollup and the habit
 * detector answer "the last 7 days" with the same set of days. Insights imports
 * this for its range label, so the window and the label can never drift.
 */
export const WEEK_WINDOW_DAYS = 7;

/**
 * The window a TimeRange covers, floored to local midnight at the start and
 * extended to the end of today. `now` is injectable so the pure calculators
 * below can be tested against a pinned clock.
 *
 * Only 'week' has a caller (app/(tabs)/insights.tsx). The other three cases are
 * dead paths left from the retired widget dashboard; they keep their original
 * "step back one unit" semantics rather than being quietly redefined here.
 */
export function getDateRangeForTimeRange(
  timeRange: TimeRange,
  now: Date = new Date()
): { start: Date; end: Date } {
  const end = new Date(now);
  const start = new Date(now);

  switch (timeRange) {
    case 'week':
      // Inclusive of today, so today plus the six days before it.
      start.setDate(now.getDate() - (WEEK_WINDOW_DAYS - 1));
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Spending grouped by category over a TimeRange. Pure, so it can be exercised
 * without mounting the provider; the context method below delegates to it.
 *
 * Each row is resolved to exactly one Category through `resolveExpenseCategory`
 * before it is grouped, the same helper Categories and category detail use. A
 * name match alone missed the two defaults whose display name is not their
 * stored value ('Subscriptions' stores 'Software & Subscriptions', 'Home'
 * stores 'Mortgage'), so Insights rendered the stored value and named one
 * category two different things on two screens. Grouping on the resolved id
 * also merges rows one category matches by two different rungs (its current
 * stored value and its retired display name) into a single row. The stored
 * value survives only as the fallback for an orphan row whose category no
 * longer exists.
 *
 * The precedence (explicit categoryId before the name rungs) lives on
 * resolveExpenseCategory, which Categories and category detail share, so all
 * three surfaces bucket an expense the same way.
 */
export function computeSpendingByCategory(
  expenses: Expense[],
  categories: Category[],
  timeRange: TimeRange,
  now: Date = new Date()
): SpendingByCategory[] {
  const { start, end } = getDateRangeForTimeRange(timeRange, now);
  const filtered = expenses.filter(e => e.date >= start && e.date <= end);

  const totalSpent = filtered.reduce((sum, e) => sum + e.amount, 0);
  if (totalSpent === 0) return [];

  // Group by resolved category, falling back to the stored value for an orphan.
  const byCategory = new Map<string, { name: string; color: string; amount: number }>();
  for (const expense of filtered) {
    const match = resolveExpenseCategory(expense, categories);
    const key = match?.id ?? expense.category;
    const existing = byCategory.get(key);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      byCategory.set(key, {
        name: match?.name ?? expense.category,
        color: match?.color ?? '#9E9E9E',
        amount: expense.amount,
      });
    }
  }

  // Build result
  const result: SpendingByCategory[] = [];
  for (const [categoryId, { name, color, amount }] of byCategory) {
    result.push({
      categoryId,
      categoryName: name,
      categoryColor: color,
      amount,
      percentage: Math.round((amount / totalSpent) * 100),
    });
  }

  // Sort by amount descending
  result.sort((a, b) => b.amount - a.amount);
  return result;
}

/**
 * This month's pace against last month. Pure, same reasoning as above.
 *
 * Both month windows use an exclusive upper bound, so no expense can fall in
 * the gap between "the last day at 00:00" and the end of that day. Last month
 * is [lastMonthStart, monthStart), matching `hasFullMonthOfData`'s
 * `e.date < monthStart` in utils/recurring.ts.
 */
export function computeMonthlyProjection(
  expenses: Expense[],
  now: Date = new Date()
): MonthlyProjection {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  // Current month spending
  const currentMonthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= now);
  const currentSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Average daily spending
  const averageDaily = dayOfMonth > 0 ? currentSpent / dayOfMonth : 0;

  // Projected total
  const projectedTotal = currentSpent + (averageDaily * daysRemaining);

  // Last month comparison
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthExpenses = expenses.filter(e => e.date >= lastMonthStart && e.date < monthStart);
  const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const comparedToLastMonth = lastMonthTotal > 0
    ? Math.round(((projectedTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : 0;

  return {
    currentSpent,
    projectedTotal: Math.round(projectedTotal),
    averageDaily: Math.round(averageDaily),
    daysRemaining,
    comparedToLastMonth,
    lastMonthTotal,
  };
}

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<DashboardConfig>(getDefaultConfig());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      const stored = await getDashboardConfig();
      if (stored) {
        setConfig(stored);
      }
      setIsLoading(false);
    }
    loadConfig();
  }, []);

  /**
   * The single dashboard write. Optimistic, then honest: a failed persist puts
   * the previous layout back and rethrows, so the widgets on screen always
   * match the widgets on disk (utils/storage.ts write policy).
   */
  const commitConfig = useCallback(async (next: DashboardConfig): Promise<void> => {
    let previous: DashboardConfig = next;
    setConfig((current) => {
      previous = current;
      return next;
    });
    try {
      await saveDashboardConfig(next);
    } catch (error) {
      setConfig(previous);
      throw error;
    }
  }, []);

  const reorderWidgets = useCallback(async (fromIndex: number, toIndex: number): Promise<void> => {
    const widgets = [...config.widgets];
    const [moved] = widgets.splice(fromIndex, 1);
    widgets.splice(toIndex, 0, moved);

    // Update order values
    const reordered = widgets.map((w, i) => ({ ...w, order: i }));
    const updated: DashboardConfig = {
      widgets: reordered,
      lastUpdated: new Date(),
    };
    await commitConfig(updated);
  }, [config, commitConfig]);

  const toggleWidgetVisibility = useCallback(async (widgetId: string): Promise<void> => {
    const updated: DashboardConfig = {
      widgets: config.widgets.map(w =>
        w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
      ),
      lastUpdated: new Date(),
    };
    await commitConfig(updated);
  }, [config, commitConfig]);

  const updateWidgetTimeRange = useCallback(async (
    widgetId: string,
    timeRange: TimeRange
  ): Promise<void> => {
    const updated: DashboardConfig = {
      widgets: config.widgets.map(w =>
        w.id === widgetId ? { ...w, timeRange } : w
      ),
      lastUpdated: new Date(),
    };
    await commitConfig(updated);
  }, [config, commitConfig]);

  const addWidget = useCallback(async (
    type: WidgetType,
    title: string
  ): Promise<ReportWidget> => {
    const newWidget: ReportWidget = {
      id: generateId(),
      type,
      title,
      order: config.widgets.length,
      isVisible: true,
      timeRange: 'month',
    };
    const updated: DashboardConfig = {
      widgets: [...config.widgets, newWidget],
      lastUpdated: new Date(),
    };
    await commitConfig(updated);
    return newWidget;
  }, [config, commitConfig]);

  const removeWidget = useCallback(async (widgetId: string): Promise<void> => {
    const filtered = config.widgets.filter(w => w.id !== widgetId);
    const reordered = filtered.map((w, i) => ({ ...w, order: i }));
    const updated: DashboardConfig = {
      widgets: reordered,
      lastUpdated: new Date(),
    };
    await commitConfig(updated);
  }, [config, commitConfig]);

  const resetToDefaults = useCallback(async (): Promise<void> => {
    const defaultConfig = getDefaultConfig();
    await commitConfig(defaultConfig);
  }, [commitConfig]);

  const calculateSpendingByCategory = useCallback((
    expenses: Expense[],
    categories: Category[],
    timeRange: TimeRange
  ): SpendingByCategory[] => computeSpendingByCategory(expenses, categories, timeRange), []);

  const calculateSpendingOverTime = useCallback((
    expenses: Expense[],
    timeRange: TimeRange
  ): SpendingOverTime[] => {
    const { start, end } = getDateRangeForTimeRange(timeRange);
    const filtered = expenses.filter(e => e.date >= start && e.date <= end);

    // Determine grouping granularity
    let groupFormat: 'day' | 'week' | 'month';
    switch (timeRange) {
      case 'week':
        groupFormat = 'day';
        break;
      case 'month':
        groupFormat = 'day';
        break;
      case 'quarter':
        groupFormat = 'week';
        break;
      case 'year':
        groupFormat = 'month';
        break;
    }

    // Group expenses
    const groups = new Map<string, { date: Date; amount: number; label: string }>();

    for (const expense of filtered) {
      let key: string;
      let label: string;
      const date = new Date(expense.date);

      switch (groupFormat) {
        case 'day':
          // Local-day key (not UTC) so evening spends land on the right day (H4).
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          label = formatDate(date, { month: 'short', day: 'numeric' });
          break;
        case 'week':
          // Get week start
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          label = strings.reports.weekOf(formatDate(weekStart, { month: 'short', day: 'numeric' }));
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          label = formatDate(date, { month: 'short', year: '2-digit' });
          break;
      }

      const existing = groups.get(key);
      if (existing) {
        existing.amount += expense.amount;
      } else {
        groups.set(key, { date, amount: expense.amount, label });
      }
    }

    // Sort by date and convert to array
    return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, []);

  const calculateMonthlyProjection = useCallback(
    (expenses: Expense[]): MonthlyProjection => computeMonthlyProjection(expenses),
    []
  );

  // Every field is either plain state (config, isLoading) or a useCallback
  // already listed here, so this deps list is exhaustive.
  const value = useMemo(() => ({
    config,
    isLoading,
    reorderWidgets,
    toggleWidgetVisibility,
    updateWidgetTimeRange,
    addWidget,
    removeWidget,
    resetToDefaults,
    calculateSpendingByCategory,
    calculateSpendingOverTime,
    calculateMonthlyProjection,
  }), [
    config, isLoading, reorderWidgets, toggleWidgetVisibility, updateWidgetTimeRange,
    addWidget, removeWidget, resetToDefaults, calculateSpendingByCategory,
    calculateSpendingOverTime, calculateMonthlyProjection,
  ]);

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports(): ReportsContextValue {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports must be used within ReportsProvider');
  return ctx;
}
