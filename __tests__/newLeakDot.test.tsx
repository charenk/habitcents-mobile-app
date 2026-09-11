/**
 * The Kept chip's dot: "a leak was detected since you last looked".
 *
 * Charen, 2026-09-11. The dot used to mean "today's check-in is unanswered",
 * which showed it almost permanently for anyone who does not check in daily,
 * and a dot that is always on says nothing. People use habitcents for more
 * than one thing, so the dot belongs to the event that is genuinely new.
 *
 * These exercise the real HabitsContext against real storage, because the
 * whole mechanism is the comparison between a persisted marker and each
 * habit's discoveredAt; mocking either half would test nothing.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { HabitsProvider, useHabits } from '@/contexts/HabitsContext';
import { saveHabits, setLeaksSeenAt } from '@/utils/storage';
import type { DetectedHabit } from '@/types/habit';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <HabitsProvider>{children}</HabitsProvider>
    </CurrencyProvider>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

const HOUR = 60 * 60 * 1000;

function makeLeak(overrides: Partial<DetectedHabit> & { id: string }): DetectedHabit {
  return {
    name: 'Coffee shop',
    description: 'A daily coffee run',
    categoryId: 'cat-food',
    merchantPattern: overrides.id,
    averageAmount: 500,
    frequency: 'daily',
    occurrencesPerPeriod: 1,
    totalMonthlySpend: 15000,
    observedTotal: 15000,
    observedCount: 4,
    spanDays: 30,
    hasReliableRate: true,
    medianAmount: 500,
    minAmount: 400,
    maxAmount: 600,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status: 'discovered',
    sentiment: 'bad',
    discoveredAt: new Date(),
    ...overrides,
  } as DetectedHabit;
}

async function mount() {
  // RTL v14: renderHook, like render, is async here.
  const view = await renderHook(() => useHabits(), { wrapper: Providers });
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

describe('hasNewLeak', () => {
  it('is false on an install that has never looked, whatever it has found', async () => {
    // The upgrade case. Someone arriving into this feature with leaks found
    // weeks ago should not be told they are new; no marker means "already
    // seen", not "show everything".
    await saveHabits([makeLeak({ id: 'old', discoveredAt: new Date(Date.now() - 30 * 24 * HOUR) })]);

    const { result } = await mount();

    expect(result.current.hasNewLeak).toBe(false);
  });

  it('is true for a leak discovered after the last look', async () => {
    await setLeaksSeenAt(new Date(Date.now() - 2 * HOUR));
    await saveHabits([makeLeak({ id: 'fresh', discoveredAt: new Date(Date.now() - HOUR) })]);

    const { result } = await mount();

    expect(result.current.hasNewLeak).toBe(true);
  });

  it('is false for a leak that was already there at the last look', async () => {
    await saveHabits([makeLeak({ id: 'seen', discoveredAt: new Date(Date.now() - 2 * HOUR) })]);
    await setLeaksSeenAt(new Date(Date.now() - HOUR));

    const { result } = await mount();

    expect(result.current.hasNewLeak).toBe(false);
  });

  it('ignores a leak the user dismissed, however new it is', async () => {
    await setLeaksSeenAt(new Date(Date.now() - 2 * HOUR));
    await saveHabits([
      makeLeak({ id: 'nope', discoveredAt: new Date(), dismissedAt: new Date() }),
    ]);

    const { result } = await mount();

    expect(result.current.hasNewLeak).toBe(false);
  });

  it('ignores a habit already being broken, which is not a new leak', async () => {
    await setLeaksSeenAt(new Date(Date.now() - 2 * HOUR));
    await saveHabits([makeLeak({ id: 'breaking', status: 'changing', discoveredAt: new Date() })]);

    const { result } = await mount();

    expect(result.current.hasNewLeak).toBe(false);
  });

  it('clears once the leaks are marked seen, and stays clear across a reload', async () => {
    await setLeaksSeenAt(new Date(Date.now() - 2 * HOUR));
    await saveHabits([makeLeak({ id: 'fresh', discoveredAt: new Date(Date.now() - HOUR) })]);

    const first = await mount();
    expect(first.result.current.hasNewLeak).toBe(true);

    await act(async () => {
      await first.result.current.markLeaksSeen();
    });
    expect(first.result.current.hasNewLeak).toBe(false);

    // The marker is persisted, not just held in memory, so a relaunch does not
    // re-announce the same leak.
    const second = await mount();
    expect(second.result.current.hasNewLeak).toBe(false);
  });

  it('lights up again for a leak found after that', async () => {
    await setLeaksSeenAt(new Date(Date.now() - 2 * HOUR));
    await saveHabits([makeLeak({ id: 'first', discoveredAt: new Date(Date.now() - HOUR) })]);

    const first = await mount();
    await act(async () => {
      await first.result.current.markLeaksSeen();
    });
    expect(first.result.current.hasNewLeak).toBe(false);

    await saveHabits([
      makeLeak({ id: 'first', discoveredAt: new Date(Date.now() - HOUR) }),
      makeLeak({ id: 'second', discoveredAt: new Date(Date.now() + HOUR) }),
    ]);

    const second = await mount();
    expect(second.result.current.hasNewLeak).toBe(true);
  });
});
