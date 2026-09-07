/**
 * HabitLeakRow render tests (design/leak-row-extraction). The row moved out of
 * LeaksCard into its own shared file so the Money > Habits tab can reuse it;
 * these cover the pure status -> action mapping the row is built around.
 *
 * Provider wiring mirrors __tests__/pickOneSheet.test.tsx.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { HabitLeakRow, type LeakRowData } from '@/components/habit-logging/HabitLeakRow';
import { strings } from '@/constants/strings';
import type { DetectedHabit, HabitStatus } from '@/types/habit';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

function habit(status: HabitStatus, overrides: Partial<DetectedHabit> = {}): DetectedHabit {
  return {
    id: 'h1',
    name: 'Pizzahut Spending',
    description: '$87 on pizzahut across 5 buys so far',
    categoryId: 'food',
    merchantPattern: 'pizzahut',
    averageAmount: 1740,
    frequency: 'daily',
    occurrencesPerPeriod: 1,
    totalMonthlySpend: 52200,
    observedTotal: 8700,
    observedCount: 5,
    spanDays: 39,
    hasReliableRate: true,
    medianAmount: 1200,
    minAmount: 400,
    maxAmount: 4400,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status,
    sentiment: 'bad',
    discoveredAt: new Date('2026-08-04T12:00:00Z'),
    ...overrides,
  };
}

function row(status: HabitStatus, overrides: Partial<DetectedHabit> = {}): LeakRowData {
  return { habit: habit(status, overrides), emoji: '🍕', tint: '#E4572E' };
}

afterEach(cleanup);

describe('HabitLeakRow', () => {
  it('shows the Break it button for a discovered habit and fires onBreak', async () => {
    const onBreak = jest.fn();
    const onOpenHabit = jest.fn();
    const data = row('discovered');
    const view = await render(
      <Providers>
        <HabitLeakRow row={data} onBreak={onBreak} onOpenHabit={onOpenHabit} />
      </Providers>
    );

    const button = view.getByRole('button', {
      name: `${strings.insights.leakActionBreak}, ${data.habit.name}`,
    });
    fireEvent.press(button);

    expect(onBreak).toHaveBeenCalledTimes(1);
    expect(onBreak).toHaveBeenCalledWith(data.habit);
    expect(onOpenHabit).not.toHaveBeenCalled();
    expect(view.queryByText(strings.insights.leakActionBreaking)).toBeNull();
    expect(view.queryByText(strings.insights.leakActionWatch)).toBeNull();
  });

  it('shows the Breaking chip for a changing habit and fires onOpenHabit', async () => {
    const onBreak = jest.fn();
    const onOpenHabit = jest.fn();
    const data = row('changing');
    const view = await render(
      <Providers>
        <HabitLeakRow row={data} onBreak={onBreak} onOpenHabit={onOpenHabit} />
      </Providers>
    );

    const chip = view.getByRole('button', {
      name: `${strings.insights.leakActionBreaking}, ${data.habit.name}`,
    });
    fireEvent.press(chip);

    expect(onOpenHabit).toHaveBeenCalledTimes(1);
    expect(onOpenHabit).toHaveBeenCalledWith(data.habit.id);
    expect(onBreak).not.toHaveBeenCalled();
    expect(view.queryByText(strings.insights.leakActionBreak)).toBeNull();
  });

  it('shows the inert Watch label for a tracking habit with no pressable action', async () => {
    const onBreak = jest.fn();
    const onOpenHabit = jest.fn();
    const data = row('tracking');
    const view = await render(
      <Providers>
        <HabitLeakRow row={data} onBreak={onBreak} onOpenHabit={onOpenHabit} />
      </Providers>
    );

    expect(view.getByText(strings.insights.leakActionWatch)).toBeTruthy();
    expect(view.queryByRole('button', { name: new RegExp(data.habit.name) })).toBeNull();
    expect(view.queryByText(strings.insights.leakActionBreak)).toBeNull();
    expect(view.queryByText(strings.insights.leakActionBreaking)).toBeNull();
  });
});
