/**
 * Rendered accessibility-tree tests (ADA-024).
 *
 * a11y.test.ts pins the exact wording of label builders; these tests pin what
 * actually mounts: roles and names on the core habit-logging surfaces, and a
 * Dynamic Type guard asserting no Text opts out of font scaling. Fixtures are
 * typed against types/habit.ts so schema drift fails compilation, not runtime.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { LeakCard } from '@/components/habit-logging/LeakCard';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';

function makeHabit(overrides: Partial<DetectedHabit> = {}): DetectedHabit {
  return {
    id: 'h1',
    name: 'Coffee runs',
    description: 'Weekday coffee habit',
    categoryId: 'food',
    averageAmount: 600,
    frequency: 'daily',
    occurrencesPerPeriod: 5,
    totalMonthlySpend: 12000,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status: 'changing',
    sentiment: 'neutral',
    discoveredAt: new Date('2026-07-01T12:00:00Z'),
    ...overrides,
  };
}

function makeGoal(overrides: Partial<HabitChangeGoal> = {}): HabitChangeGoal {
  return {
    id: 'g1',
    habitId: 'h1',
    targetType: 'eliminate',
    startDate: new Date('2026-07-10T12:00:00Z'),
    currentStreak: 0,
    longestStreak: 0,
    savingsGoal: 0,
    actualSavings: 0,
    milestones: [],
    logs: [],
    skipValue: 600,
    kept: 0,
    totalSkips: 0,
    highestMilestoneReached: 0,
    trackingStart: new Date('2026-07-10T12:00:00Z'),
    dayLogs: [],
    firstRun: true,
    backfillUsed: false,
    ...overrides,
  };
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}

const noop = () => {};

function renderCheckInCard() {
  // RTL v14: render is async and must be awaited.
  return render(
    <Providers>
      <CheckInCard
        habit={makeHabit()}
        goal={makeGoal()}
        milestoneJustHit={null}
        onSkip={noop}
        onSlip={noop}
        onChangeAnswer={noop}
        onBackfill={noop}
        onOpenPartial={noop}
      />
    </Providers>
  );
}

/** Depth-first walk of the rendered JSON tree. */
function walk(node: unknown, visit: (n: { type?: string; props?: Record<string, unknown> }) => void): void {
  if (node == null || typeof node !== 'object') return;
  const n = node as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
  visit(n);
  for (const child of n.children ?? []) walk(child, visit);
}

describe('rendered accessibility tree (ADA-024)', () => {
  it('check-in card exposes skip and slip as buttons with spoken names', async () => {
    const view = await renderCheckInCard();
    // Skip button carries the formatted skip value; slip is "Bought it".
    const skip = await view.findByRole('button', { name: /skip/i });
    expect(skip).toBeTruthy();
    expect(view.getByRole('button', { name: /bought it/i })).toBeTruthy();
  });

  it('leak card exposes Break it and dismiss as buttons and names the habit', async () => {
    const view = await render(
      <Providers>
        <LeakCard habit={makeHabit()} onBreak={noop} onDismiss={noop} />
      </Providers>
    );
    expect(await view.findByRole('button', { name: /break it/i })).toBeTruthy();
    expect(view.getAllByText(/coffee runs/i).length).toBeGreaterThan(0);
  });

  it('no rendered Text opts out of Dynamic Type via allowFontScaling false', async () => {
    const view = await renderCheckInCard();
    await view.findByRole('button', { name: /skip/i });
    const offenders: string[] = [];
    walk(view.toJSON(), (n) => {
      if (n.props && n.props.allowFontScaling === false) {
        offenders.push(String(n.type));
      }
    });
    expect(offenders).toEqual([]);
  });
});
