import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getDashboardConfig, saveDashboardConfig } from '@/utils/storage';
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

function getDateRangeForTimeRange(timeRange: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (timeRange) {
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setMonth(end.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(end.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
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
    setConfig(updated);
    await saveDashboardConfig(updated);
  }, [config]);

  const toggleWidgetVisibility = useCallback(async (widgetId: string): Promise<void> => {
    const updated: DashboardConfig = {
      widgets: config.widgets.map(w =>
        w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
      ),
      lastUpdated: new Date(),
    };
    setConfig(updated);
    await saveDashboardConfig(updated);
  }, [config]);

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
    setConfig(updated);
    await saveDashboardConfig(updated);
  }, [config]);

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
    setConfig(updated);
    await saveDashboardConfig(updated);
    return newWidget;
  }, [config]);

  const removeWidget = useCallback(async (widgetId: string): Promise<void> => {
    const filtered = config.widgets.filter(w => w.id !== widgetId);
    const reordered = filtered.map((w, i) => ({ ...w, order: i }));
    const updated: DashboardConfig = {
      widgets: reordered,
      lastUpdated: new Date(),
    };
    setConfig(updated);
    await saveDashboardConfig(updated);
  }, [config]);

  const resetToDefaults = useCallback(async (): Promise<void> => {
    const defaultConfig = getDefaultConfig();
    setConfig(defaultConfig);
    await saveDashboardConfig(defaultConfig);
  }, []);

  const calculateSpendingByCategory = useCallback((
    expenses: Expense[],
    categories: Category[],
    timeRange: TimeRange
  ): SpendingByCategory[] => {
    const { start, end } = getDateRangeForTimeRange(timeRange);
    const filtered = expenses.filter(e => e.date >= start && e.date <= end);

    const totalSpent = filtered.reduce((sum, e) => sum + e.amount, 0);
    if (totalSpent === 0) return [];

    // Group by category
    const byCategory = new Map<string, number>();
    for (const expense of filtered) {
      const key = expense.category;
      byCategory.set(key, (byCategory.get(key) || 0) + expense.amount);
    }

    // Build result
    const result: SpendingByCategory[] = [];
    for (const [categoryName, amount] of byCategory) {
      const category = categories.find(c => c.name === categoryName);
      result.push({
        categoryId: category?.id || categoryName,
        categoryName,
        categoryColor: category?.color || '#9E9E9E',
        amount,
        percentage: Math.round((amount / totalSpent) * 100),
      });
    }

    // Sort by amount descending
    result.sort((a, b) => b.amount - a.amount);
    return result;
  }, []);

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
          key = date.toISOString().split('T')[0];
          label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case 'week':
          // Get week start
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
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

  const calculateMonthlyProjection = useCallback((expenses: Expense[]): MonthlyProjection => {
    const now = new Date();
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
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthExpenses = expenses.filter(e => e.date >= lastMonthStart && e.date <= lastMonthEnd);
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
    };
  }, []);

  return (
    <ReportsContext.Provider
      value={{
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
      }}
    >
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports(): ReportsContextValue {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports must be used within ReportsProvider');
  return ctx;
}
