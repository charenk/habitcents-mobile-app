/**
 * Share card screen (app/share-card.tsx, roadmap P4-3): "share sheet exports
 * a branded card; PostHog tracks shares." Covers the empty state (no honest
 * card to show yet), the populated headline, and the capture + share + track
 * wiring, all through mocked native seams (expo-sharing, react-native-
 * view-shot never run for real in Jest).
 *
 * Provider wiring mirrors __tests__/habitDetailPaywallPlacement.test.tsx.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
}));

const mockCaptureRef = jest.fn();
jest.mock('react-native-view-shot', () => ({
  captureRef: (...args: unknown[]) => mockCaptureRef(...args),
}));

const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();
jest.mock('expo-sharing', () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

const mockTrack = jest.fn();
jest.mock('@/utils/analytics', () => ({ track: (...args: unknown[]) => mockTrack(...args) }));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ToastProvider } from '@/components/ui/Toast';
import ShareCardScreen from '@/app/share-card';
import { saveHabitGoals } from '@/utils/storage';
import { strings } from '@/constants/strings';
import type { HabitChangeGoal } from '@/types/habit';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <HabitsProvider>
            <ToastProvider>{children}</ToastProvider>
          </HabitsProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function goal(overrides: Partial<HabitChangeGoal> = {}): HabitChangeGoal {
  return {
    id: 'g1',
    habitId: 'h1',
    targetType: 'eliminate',
    startDate: new Date('2026-08-01'),
    currentStreak: 0,
    longestStreak: 0,
    savingsGoal: 0,
    actualSavings: 0,
    milestones: [],
    logs: [],
    skipValue: 500,
    kept: 0,
    totalSkips: 0,
    highestMilestoneReached: 0,
    trackingStart: new Date('2026-08-01'),
    dayLogs: [],
    firstRun: false,
    backfillUsed: false,
    ...overrides,
  };
}

async function renderScreen(): Promise<Awaited<ReturnType<typeof render>>> {
  const view = await render(
    <Providers>
      <ShareCardScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

beforeEach(() => {
  mockBack.mockClear();
  mockCaptureRef.mockReset().mockResolvedValue('file:///tmp/kept-card.png');
  mockIsAvailableAsync.mockReset().mockResolvedValue(true);
  mockShareAsync.mockReset().mockResolvedValue(undefined);
  mockTrack.mockClear();
});

afterEach(cleanup);

describe('Share card screen', () => {
  it('shows the empty state when no habit has ever kept anything', async () => {
    await saveHabitGoals([]);
    const view = await renderScreen();
    expect(view.getByText(strings.shareCard.emptyTitle)).toBeTruthy();
  });

  it('renders the honest headline for a real kept total', async () => {
    await saveHabitGoals([goal({ kept: 1200, trackingStart: new Date('2026-08-01') })]);
    const view = await renderScreen();
    // Days between trackingStart and "now" is not pinned in this test (real
    // Date.now()), so only the amount half of the headline is asserted here;
    // __tests__/shareCard.test.ts pins the day math precisely.
    expect(view.getByText(/^I kept \$12\.00 in \d+ days?\.$/)).toBeTruthy();
  });

  it('fires share_card_opened on mount', async () => {
    await saveHabitGoals([goal({ kept: 500 })]);
    await renderScreen();
    expect(mockTrack).toHaveBeenCalledWith('share_card_opened', {});
  });

  it('captures the card, invokes the native share sheet, and tracks share_card_shared', async () => {
    await saveHabitGoals([goal({ kept: 500 })]);
    const view = await renderScreen();

    await act(async () => {
      fireEvent.press(view.getByText(strings.shareCard.shareCta));
    });

    expect(mockCaptureRef).toHaveBeenCalled();
    expect(mockShareAsync).toHaveBeenCalledWith('file:///tmp/kept-card.png');
    expect(mockTrack).toHaveBeenCalledWith('share_card_shared', {});
  });

  it('shows a toast and never tracks a share when the share sheet is unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    await saveHabitGoals([goal({ kept: 500 })]);
    const view = await renderScreen();

    await act(async () => {
      fireEvent.press(view.getByText(strings.shareCard.shareCta));
    });

    expect(view.getByText(strings.shareCard.shareFailed)).toBeTruthy();
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalledWith('share_card_shared', {});
  });

  it('shows a toast when the capture itself throws', async () => {
    mockCaptureRef.mockRejectedValue(new Error('capture failed'));
    await saveHabitGoals([goal({ kept: 500 })]);
    const view = await renderScreen();

    await act(async () => {
      fireEvent.press(view.getByText(strings.shareCard.shareCta));
    });

    expect(view.getByText(strings.shareCard.shareFailed)).toBeTruthy();
    expect(mockTrack).not.toHaveBeenCalledWith('share_card_shared', {});
  });
});
