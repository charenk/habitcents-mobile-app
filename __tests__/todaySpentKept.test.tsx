/**
 * Today: Spent/Kept chip views (redesign U5, ADR 0019, DI-5) plus the DI-7
 * swipe pager between them.
 *
 * Provider wiring mirrors __tests__/profile.test.tsx (SafeAreaProvider with
 * initialMetrics + ThemeProvider + CurrencyProvider + ToastProvider), plus
 * expo-router mocked the same way. HabitsContext, ExpensesContext and
 * CategoriesContext are module-mocked (the pattern __tests__/logExpenseSheet.
 * test.tsx uses for the same two data contexts): the real HabitsContext hits
 * AsyncStorage and coach-moment selection, neither of which this suite needs,
 * and a direct mock lets each test seed goals/habits/expenses synchronously.
 *
 * DI-7 note: both panes stay mounted at all times now (the pager scrolls
 * between them rather than swapping which one exists), so a plain
 * getByText/getByLabelText presence check against pane content no longer
 * proves which view is selected, and getByLabelText(/^Kept /) started
 * matching two things at once (the chip and KeptHero's always-mounted "Kept
 * so far, ..." label). Selection is verified two ways below instead: the
 * chips' own testID (spent-chip / kept-chip, added alongside the pager) plus
 * their accessibilityState, and, for the swipe path, by invoking the
 * pager's onMomentumScrollEnd handler directly with a synthetic event
 * (testID today-pager) and checking the resulting chip state and analytics
 * call, the same way a real swipe would drive it.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const ReactActual = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    // Polyfilled with a plain mount-time effect: the real hook needs a
    // navigation context this unit test does not have, and the screen only
    // uses it to clear coach-moment/milestone state on blur, which none of
    // these tests exercise.
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => callback(), []);
    },
    useLocalSearchParams: () => ({}),
  };
});

let mockGoals: HabitChangeGoal[] = [];
let mockHabits: DetectedHabit[] = [];

jest.mock('@/contexts/HabitsContext', () => ({
  useHabits: () => ({
    goals: mockGoals,
    isLoading: false,
    refreshHabits: jest.fn(async () => {}),
    dismissHabit: jest.fn(async () => {}),
    startBreakingHabit: jest.fn(async () => mockGoals[0]),
    answerToday: jest.fn(async () => {}),
    answerEvent: jest.fn(async () => {}),
    changeTodayAnswer: jest.fn(async () => {}),
    backfillYesterday: jest.fn(async () => {}),
    savePartialSlip: jest.fn(async () => {}),
    getActiveHabits: () => mockHabits.filter((h) => h.status === 'tracking' || h.status === 'changing'),
    getDiscoveredHabits: () => mockHabits.filter((h) => h.status === 'discovered' && !h.dismissedAt),
    getGoalByHabitId: (habitId: string) => mockGoals.find((g) => g.habitId === habitId),
    getHabitById: (id: string) => mockHabits.find((h) => h.id === id),
    lastMilestone: null,
    clearLastMilestone: jest.fn(),
    lastCoachMoment: null,
    clearLastCoachMoment: jest.fn(),
    maybeShowDetectionMoment: jest.fn(async () => null),
    maybeShowFirstLogMoment: jest.fn(async () => null),
  }),
}));

let mockExpenses: Expense[] = [];
jest.mock('@/contexts/ExpensesContext', () => ({
  useExpenses: () => ({ expenses: mockExpenses }),
}));

jest.mock('@/contexts/CategoriesContext', () => ({
  useCategories: () => ({ getVisibleCategories: () => [] }),
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import TodayScreen from '@/app/(tabs)/index';
import { strings } from '@/constants/strings';
import { lightTheme } from '@/constants/theme';
import { formatMoney } from '@/utils/currency';
import { track } from '@/utils/analytics';
import type { Expense } from '@/types/expense';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';

const mockTrack = track as jest.Mock;
// Same source useWindowDimensions() reads from, so a synthetic
// onMomentumScrollEnd offset of exactly one window width lands on page 1
// (Kept) the same way the real pager's paging math would.
const windowWidth = Dimensions.get('window').width;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>{children}</ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderToday() {
  const view = await render(
    <Providers>
      <TodayScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  const base: Expense = {
    id: overrides.id,
    title: 'Food',
    amount: 500,
    category: 'Food',
    date: new Date(),
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
  return { ...base, ...overrides } as Expense;
}

function makeGoal(overrides: Partial<HabitChangeGoal> & { id: string; habitId: string }): HabitChangeGoal {
  const base: HabitChangeGoal = {
    id: overrides.id,
    habitId: overrides.habitId,
    targetType: 'reduce_amount',
    startDate: new Date('2026-06-01T00:00:00'),
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
    trackingStart: new Date('2026-06-01T00:00:00'),
    dayLogs: [],
    firstRun: false,
    backfillUsed: false,
  };
  return { ...base, ...overrides };
}

function makeHabit(overrides: Partial<DetectedHabit> & { id: string }): DetectedHabit {
  const base: DetectedHabit = {
    id: overrides.id,
    name: 'Coffee shop',
    description: 'A daily coffee run',
    categoryId: 'cat-food',
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
    discoveredAt: new Date('2026-06-01T00:00:00'),
  };
  return { ...base, ...overrides };
}

beforeEach(() => {
  mockGoals = [];
  mockHabits = [];
  mockExpenses = [];
  mockPush.mockClear();
  mockTrack.mockClear();
});

afterEach(cleanup);

describe('Today: Spent/Kept chips', () => {
  it('renders both the spent and kept amounts', async () => {
    mockExpenses = [makeExpense({ id: 'e1', amount: 500, class: 'spend' })];
    mockGoals = [makeGoal({ id: 'g1', habitId: 'h1', skipValue: 700, dayLogs: [{ date: new Date(), state: 'skipped' }] })];

    const view = await renderToday();

    expect(view.getByText(formatMoney(500))).toBeTruthy();
    expect(view.getByText(formatMoney(700))).toBeTruthy();
  });

  it('defaults to the Spent view with the quick-log control open', async () => {
    const view = await renderToday();

    expect(view.getByLabelText(/^Spent .*, selected/)).toBeTruthy();
    expect(view.getByLabelText(/^Kept .*, not selected/)).toBeTruthy();
    expect(view.getAllByLabelText(strings.today.quickLogOpenLabel).length).toBeGreaterThan(0);
  });

  it('carries selection as the segmented scoreboard thumb, not just accessibilityState', async () => {
    const view = await renderToday();

    // accessibilityState.selected stays the source of truth for a11y and for
    // the other tests in this file; this test additionally proves selection
    // is visibly rendered as the SegmentedControl-style white thumb fill
    // (theme.white plus the card shadow), same as the spec's "fill, not
    // ring" language, by flattening the Pressable's own style prop rather
    // than relying on a snapshot.
    const spentChip = view.getByTestId('spent-chip');
    const keptChip = view.getByTestId('kept-chip');

    expect(StyleSheet.flatten(spentChip.props.style).backgroundColor).toBe(lightTheme.white);
    expect(StyleSheet.flatten(keptChip.props.style).backgroundColor).toBeUndefined();

    await tap(keptChip);

    expect(StyleSheet.flatten(keptChip.props.style).backgroundColor).toBe(lightTheme.white);
    expect(StyleSheet.flatten(spentChip.props.style).backgroundColor).toBeUndefined();
  });

  it('tapping Kept swaps to habit content', async () => {
    const view = await renderToday();

    await tap(view.getByTestId('kept-chip'));

    // Both panes stay mounted (DI-7), so selection is proved by which chip
    // reports selected, not by pane content existing (keptSoFar is always
    // in the tree now). The tap also fires the existing tap analytics event
    // unchanged.
    expect(view.getByLabelText(/^Kept .*, selected/)).toBeTruthy();
    expect(view.getByLabelText(/^Spent .*, not selected/)).toBeTruthy();
    expect(mockTrack).toHaveBeenCalledWith('today_view_switched', { to: 'kept', method: 'tap' });
  });

  it('tapping Spent swaps back', async () => {
    const view = await renderToday();

    await tap(view.getByTestId('kept-chip'));
    expect(view.getByLabelText(/^Kept .*, selected/)).toBeTruthy();

    await tap(view.getByTestId('spent-chip'));

    expect(view.getByLabelText(/^Spent .*, selected/)).toBeTruthy();
    expect(view.getByLabelText(/^Kept .*, not selected/)).toBeTruthy();
    expect(mockTrack).toHaveBeenLastCalledWith('today_view_switched', { to: 'spent', method: 'tap' });
  });

  it('a synthetic pager swipe to page 1 switches to Kept and fires the swipe analytics event', async () => {
    const view = await renderToday();
    const pager = view.getByTestId('today-pager');

    // Mirrors what a real swipe delivers: onMomentumScrollEnd firing once
    // the pager has already physically settled on the next page's offset.
    await act(async () => {
      fireEvent(pager, 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: windowWidth } },
      });
    });

    expect(view.getByLabelText(/^Kept .*, selected/)).toBeTruthy();
    expect(view.getByLabelText(/^Spent .*, not selected/)).toBeTruthy();
    expect(mockTrack).toHaveBeenCalledWith('today_view_switched', { to: 'kept', method: 'swipe' });
  });

  it('a momentum end that settles back on the current page does not re-fire analytics', async () => {
    const view = await renderToday();
    const pager = view.getByTestId('today-pager');

    // A momentum end landing on the page that is already selected (e.g. the
    // settle after a chip-tap-triggered programmatic scroll) must not double
    // count as a swipe.
    await act(async () => {
      fireEvent(pager, 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 0 } },
      });
    });

    expect(view.getByLabelText(/^Spent .*, selected/)).toBeTruthy();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('a seeded today expense of class spend moves the Spent chip, a transfer does not', async () => {
    mockExpenses = [
      makeExpense({ id: 'e1', amount: 500, class: 'spend' }),
      makeExpense({ id: 'e2', amount: 300, class: 'transfer' }),
    ];

    const view = await renderToday();

    // Only the spend row counts: 500, not 800.
    expect(view.getByText(formatMoney(500))).toBeTruthy();
    expect(view.queryByText(formatMoney(800))).toBeNull();
  });

  it('a seeded skip today moves the Kept chip', async () => {
    mockGoals = [
      makeGoal({
        id: 'g1',
        habitId: 'h1',
        skipValue: 700,
        dayLogs: [{ date: new Date(), state: 'skipped' }],
      }),
    ];

    const view = await renderToday();

    expect(view.getByText(formatMoney(700))).toBeTruthy();
  });

  it('shows the pending-dot a11y text when a daily goal is unanswered today', async () => {
    mockHabits = [makeHabit({ id: 'h1', frequency: 'daily', status: 'changing' })];
    mockGoals = [makeGoal({ id: 'g1', habitId: 'h1', dayLogs: [] })];

    const view = await renderToday();

    expect(view.getByLabelText(new RegExp(strings.today.checkInPendingA11y))).toBeTruthy();
  });
});

describe('Today: break-another affordance (DI-6)', () => {
  // Both panes stay mounted (DI-7), so the affordance's presence in the tree
  // no longer depends on the Kept tap; the tap here is kept for realism and
  // to prove the chip actually reaches selected, which the DI-6 assertions
  // below now check alongside the affordance text.
  it('renders in the empty Kept view', async () => {
    const view = await renderToday();

    await tap(view.getByTestId('kept-chip'));

    expect(view.getByLabelText(/^Kept .*, selected/)).toBeTruthy();
    expect(view.getByText(strings.today.breakAnotherHabitCta)).toBeTruthy();
    expect(view.getByText(strings.habitLogging.freeTierNote)).toBeTruthy();
  });

  it('renders in the populated Kept view', async () => {
    mockHabits = [makeHabit({ id: 'h1', frequency: 'daily', status: 'changing' })];
    mockGoals = [makeGoal({ id: 'g1', habitId: 'h1', dayLogs: [] })];

    const view = await renderToday();

    await tap(view.getByTestId('kept-chip'));

    expect(view.getByLabelText(/^Kept .*, selected/)).toBeTruthy();
    expect(view.getByText(strings.today.breakAnotherHabitCta)).toBeTruthy();
    expect(view.getByText(strings.habitLogging.freeTierNote)).toBeTruthy();
  });

  it('under the free limit (zero active habits), press navigates to the re-audit entry', async () => {
    const view = await renderToday();

    await tap(view.getByTestId('kept-chip'));
    await tap(view.getByLabelText(new RegExp(`^${strings.today.breakAnotherHabitCta}`)));

    expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome');
  });

  it('at the free limit (one active habit), press navigates to the paywall gate', async () => {
    mockHabits = [makeHabit({ id: 'h1', frequency: 'daily', status: 'changing' })];
    mockGoals = [makeGoal({ id: 'g1', habitId: 'h1', dayLogs: [] })];

    const view = await renderToday();

    await tap(view.getByTestId('kept-chip'));
    await tap(view.getByLabelText(new RegExp(`^${strings.today.breakAnotherHabitCta}`)));

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=habit_gate');
  });
});
