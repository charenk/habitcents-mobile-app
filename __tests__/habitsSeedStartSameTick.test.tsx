/**
 * Regression: seed a habit and start breaking it in the SAME handler tick.
 *
 * The Door 3 break sheet does exactly this (app/(tabs)/index.tsx
 * handleBreakSheetStart), and the release smoke caught startBreakingHabit
 * throwing "Habit not found": the seeded habit had not reached the `habits`
 * render state yet, and the lookup read the stale closure. The fix reads
 * through habitsRef, which seedDiscoveredHabit updates synchronously.
 *
 * The harness presses one button that runs both calls back to back with no
 * intermediate render, which is the exact shape jest's per-await act flushing
 * previously hid in the door3 flow tests.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import { Button, Text } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { HabitsProvider, useHabits } from '@/contexts/HabitsContext';

function Harness() {
  const { seedDiscoveredHabit, startBreakingHabit, getGoalByHabitId, getActiveHabits } = useHabits();
  const [outcome, setOutcome] = React.useState<'pending' | 'ok' | 'threw'>('pending');
  const [habitId, setHabitId] = React.useState<string | null>(null);

  const run = async () => {
    try {
      const habit = await seedDiscoveredHabit({
        merchantPattern: 'coffee',
        name: 'Coffee or tea out',
        description: '',
        categoryId: 'Food',
        averageAmount: 600,
        frequency: 'daily',
        occurrencesPerPeriod: 1,
        totalMonthlySpend: 18000,
      });
      await startBreakingHabit(habit.id, 600, false, 'onboarding');
      setHabitId(habit.id);
      setOutcome('ok');
    } catch {
      setOutcome('threw');
    }
  };

  const goal = habitId ? getGoalByHabitId(habitId) : undefined;
  const active = habitId ? getActiveHabits().find((h) => h.id === habitId) : undefined;
  return (
    <>
      <Button title="run" onPress={run} />
      <Text testID="outcome">{outcome}</Text>
      <Text testID="goal">{goal ? 'goal-created' : 'no-goal'}</Text>
      <Text testID="habit">{active ? `habit-${active.status}` : 'habit-gone'}</Text>
    </>
  );
}

afterEach(cleanup);

it('seed then start in one handler tick creates the goal without throwing', async () => {
  const view = await render(
    <CurrencyProvider>
      <HabitsProvider>
        <Harness />
      </HabitsProvider>
    </CurrencyProvider>
  );
  await act(async () => {});

  await act(async () => {
    fireEvent.press(view.getByText('run'));
    // Both context calls run inside this single act pass, no re-render between.
    await Promise.resolve();
  });

  expect(view.getByTestId('outcome').props.children).toBe('ok');
  expect(view.getByTestId('goal').props.children).toBe('goal-created');
  // The sharper half of the regression (device find, 2026-09-10): the FIRST
  // fix made the lookup read through habitsRef, but the status-flip map still
  // ran over the stale closure, so the commit dropped the seeded habit
  // entirely - a goal with no habit behind it, no Breaking now card, and the
  // detection meter back on screen. The habit must survive as 'changing'.
  expect(view.getByTestId('habit').props.children).toBe('habit-changing');
});
