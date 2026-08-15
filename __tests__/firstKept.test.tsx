/**
 * first_kept (PRD v3.1 sect 7.5 / sect 11, phase 4).
 *
 * Activation certifies that a habit was SET UP. This is the engagement metric
 * the scan and habit routes are actually compared on, so its meaning has to be
 * identical on both: the user's own first skip, counted exactly once per
 * install, whatever route or cadence produced it.
 *
 * It also has to NAME that route. Sect 11's headline criterion compares
 * scan-route first-kept against habit-route first-kept, which is not computable
 * unless the event says which one it was, so the route assertions below are the
 * criterion itself rather than incidental coverage.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { HabitsProvider, useHabits } from '@/contexts/HabitsContext';
import { track } from '@/utils/analytics';
import { saveHabits, saveHabitGoals } from '@/utils/storage';

const trackMock = track as jest.MockedFunction<typeof track>;

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <HabitsProvider>{children}</HabitsProvider>
    </CurrencyProvider>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  trackMock.mockClear();
});

function firstKeptCalls() {
  return trackMock.mock.calls.filter(([event]) => event === 'first_kept');
}

/** A started habit, the shape every route produces before any check-in. */
async function startedHabit(
  frequency: 'daily' | 'weekly' = 'daily',
  source: 'detection' | 'scan' | 'onboarding' = 'scan'
) {
  // RTL v14: renderHook, like render, is async here.
  const { result } = await renderHook(() => useHabits(), { wrapper: Providers });
  await act(async () => {});

  await act(async () => {
    await result.current.seedDiscoveredHabit({
      merchantPattern: 'coffee',
      name: 'Coffee',
      description: '',
      categoryId: 'Food',
      averageAmount: 600,
      frequency,
      occurrencesPerPeriod: 1,
      totalMonthlySpend: 18000,
    });
  });

  const habit = result.current.habits[0];
  await act(async () => {
    await result.current.startBreakingHabit(habit.id, 600, false, source);
  });

  return result;
}

/**
 * The same habit, but tracking started `daysAgo` days back, so paths gated on
 * the tracking window (the one-time backfill) are reachable. Patches storage
 * and remounts rather than reaching into context internals.
 */
async function habitTrackedSince(daysAgo: number) {
  const seeded = await startedHabit();
  const goal = seeded.current.goals[0];
  const habit = seeded.current.habits[0];
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);

  const aged = { ...goal, startDate: start, trackingStart: start };
  await saveHabitGoals([aged]);
  await saveHabits([{ ...habit, changeGoal: aged }]);

  const { result } = await renderHook(() => useHabits(), { wrapper: Providers });
  await act(async () => {});
  return result;
}

describe('first_kept', () => {
  it('does not fire on activation, only on a real skip', async () => {
    const result = await startedHabit();

    // A habit exists and carries a value, which is activation. Nothing has
    // been kept yet.
    expect(firstKeptCalls()).toHaveLength(0);

    const goal = result.current.goals[0];
    await act(async () => {
      await result.current.answerToday(goal.id, 'skipped');
    });

    expect(firstKeptCalls()).toHaveLength(1);
  });

  it('does not fire on a slip', async () => {
    const result = await startedHabit();
    const goal = result.current.goals[0];

    await act(async () => {
      await result.current.answerToday(goal.id, 'slipped');
    });

    expect(firstKeptCalls()).toHaveLength(0);
  });

  it('fires exactly once, however many skips follow', async () => {
    const result = await startedHabit();
    const goal = result.current.goals[0];

    await act(async () => {
      await result.current.answerToday(goal.id, 'skipped');
    });
    // Change the answer and put it back: the counter moves, the first does not.
    await act(async () => {
      await result.current.changeTodayAnswer(goal.id);
    });
    await act(async () => {
      await result.current.answerToday(goal.id, 'skipped');
    });

    expect(firstKeptCalls()).toHaveLength(1);
  });

  it('fires for a weekly cadence, which answers through a different path', async () => {
    const result = await startedHabit('weekly');
    const goal = result.current.goals[0];

    await act(async () => {
      await result.current.answerEvent(goal.id, 'skipped');
    });

    expect(firstKeptCalls()).toHaveLength(1);
  });

  it('fires when the first skip arrives as a backfill', async () => {
    // Backfill is refused before tracking began (canBackfillYesterday), which
    // is correct and makes it unreachable on a habit started today. Age the
    // goal so the path is actually exercised rather than silently skipped.
    const result = await habitTrackedSince(3);
    const goal = result.current.goals[0];

    await act(async () => {
      await result.current.backfillYesterday(goal.id, 'skipped');
    });

    expect(firstKeptCalls()).toHaveLength(1);
  });

  it('stays fired across a fresh provider, because it is per install', async () => {
    const first = await startedHabit();
    await act(async () => {
      await first.current.answerToday(first.current.goals[0].id, 'skipped');
    });
    expect(firstKeptCalls()).toHaveLength(1);

    // A relaunch: new provider, same storage. A "first" that fires again on
    // every cold start is not a first.
    trackMock.mockClear();
    const { result: second } = await renderHook(() => useHabits(), { wrapper: Providers });
    await act(async () => {});
    await act(async () => {
      await second.current.answerToday(second.current.goals[0].id, 'slipped');
    });
    await act(async () => {
      await second.current.answerToday(second.current.goals[0].id, 'skipped');
    });

    expect(firstKeptCalls()).toHaveLength(0);
  });
});


describe('the route it names', () => {
  function routeOf(call: unknown[]) {
    return (call[1] as { route: string }).route;
  }

  it.each(['scan', 'onboarding', 'detection'] as const)(
    'reports the %s route the habit was started from',
    async (source) => {
      const result = await startedHabit('daily', source);
      const goal = result.current.goals[0];

      await act(async () => {
        await result.current.answerToday(goal.id, 'skipped');
      });

      expect(firstKeptCalls()).toHaveLength(1);
      expect(routeOf(firstKeptCalls()[0])).toBe(source);
    }
  );

  // A goal persisted before the source field existed must not be attributed to
  // a route it may never have come from; 'unknown' keeps that cohort separable
  // instead of quietly skewing the comparison.
  it('reports unknown for a goal stored before the route was recorded', async () => {
    const result = await startedHabit('daily', 'scan');
    const goal = result.current.goals[0];

    // Strip the field the way a pre-upgrade install would have stored it.
    const { source: _dropped, ...legacyGoal } = goal;
    await saveHabitGoals([legacyGoal as typeof goal]);

    const fresh = await renderHook(() => useHabits(), { wrapper: Providers });
    await act(async () => {});
    const revived = fresh.result.current.goals[0];

    await act(async () => {
      await fresh.result.current.answerToday(revived.id, 'skipped');
    });

    expect(firstKeptCalls()).toHaveLength(1);
    expect(routeOf(firstKeptCalls()[0])).toBe('unknown');
  });
});


describe('the kept-crediting edge paths (review round 3, P2-d)', () => {
  it('fires when the first kept dollar arrives via Change answer', async () => {
    const result = await startedHabit('daily', 'scan');
    const goal = result.current.goals[0];

    // First-ever check-in is a mis-tapped slip: no money kept, no event.
    await act(async () => {
      await result.current.answerToday(goal.id, 'slipped');
    });
    expect(firstKeptCalls()).toHaveLength(0);

    // The correction credits the skip value, which IS the first kept dollar.
    await act(async () => {
      await result.current.changeTodayAnswer(goal.id);
    });

    expect(firstKeptCalls()).toHaveLength(1);
  });

  it('does not fire when Change answer flips a skip INTO a slip', async () => {
    const result = await startedHabit('daily', 'scan');
    const goal = result.current.goals[0];

    await act(async () => {
      await result.current.answerToday(goal.id, 'skipped');
    });
    trackMock.mockClear();

    await act(async () => {
      await result.current.changeTodayAnswer(goal.id);
    });

    // The flag was already set by the skip; the point pinned here is that the
    // slip direction never calls the reporter at all.
    expect(firstKeptCalls()).toHaveLength(0);
  });

  it('fires when the first kept money is a partial-slip credit', async () => {
    const result = await startedHabit('daily', 'scan');
    const goal = result.current.goals[0];

    await act(async () => {
      await result.current.answerToday(goal.id, 'slipped');
    });
    expect(firstKeptCalls()).toHaveLength(0);

    // Spent less than usual: partialSlipCredit banks the difference, real
    // kept money on a slip day.
    await act(async () => {
      await result.current.savePartialSlip(goal.id, 200);
    });

    expect(firstKeptCalls()).toHaveLength(1);
    expect((firstKeptCalls()[0][1] as { route: string }).route).toBe('scan');
  });
});
