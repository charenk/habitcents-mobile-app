/**
 * Today: Spent/Kept chip views (redesign U5, ADR 0019, DI-5).
 *
 * Provider wiring mirrors __tests__/profile.test.tsx (SafeAreaProvider with
 * initialMetrics + ThemeProvider + CurrencyProvider + ToastProvider), plus
 * expo-router mocked the same way. HabitsContext, ExpensesContext and
 * CategoriesContext are module-mocked (the pattern __tests__/logExpenseSheet.
 * test.tsx uses for the same two data contexts): the real HabitsContext hits
 * AsyncStorage and coach-moment selection, neither of which this suite needs,
 * and a direct mock lets each test seed goals/habits/expenses synchronously.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import TodayScreen from '@/app/(tabs)/index';
import { strings } from '@/constants/strings';
import { formatMoney } from '@/utils/currency';
import type { Expense } from '@/types/expense';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';

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

  it('tapping Kept swaps to habit content', async () => {
    const view = await renderToday();

    await tap(view.getByLabelText(/^Kept /));

    expect(view.getByLabelText(/^Kept .*, selected/)).toBeTruthy();
    expect(view.getByText(strings.habitLogging.keptSoFar)).toBeTruthy();
  });

  it('tapping Spent swaps back', async () => {
    const view = await renderToday();

    await tap(view.getByLabelText(/^Kept /));
    expect(view.getByText(strings.habitLogging.keptSoFar)).toBeTruthy();

    await tap(view.getByLabelText(/^Spent /));

    expect(view.getByLabelText(/^Spent .*, selected/)).toBeTruthy();
    expect(view.getAllByLabelText(strings.today.quickLogOpenLabel).length).toBeGreaterThan(0);
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
  it('renders in the empty Kept view', async () => {
    const view = await renderToday();

    await tap(view.getByLabelText(/^Kept /));

    expect(view.getByText(strings.today.breakAnotherHabitCta)).toBeTruthy();
    expect(view.getByText(strings.habitLogging.freeTierNote)).toBeTruthy();
  });

  it('renders in the populated Kept view', async () => {
    mockHabits = [makeHabit({ id: 'h1', frequency: 'daily', status: 'changing' })];
    mockGoals = [makeGoal({ id: 'g1', habitId: 'h1', dayLogs: [] })];

    const view = await renderToday();

    await tap(view.getByLabelText(/^Kept /));

    expect(view.getByText(strings.today.breakAnotherHabitCta)).toBeTruthy();
    expect(view.getByText(strings.habitLogging.freeTierNote)).toBeTruthy();
  });

  it('under the free limit (zero active habits), press navigates to the re-audit entry', async () => {
    const view = await renderToday();

    await tap(view.getByLabelText(/^Kept /));
    await tap(view.getByLabelText(new RegExp(`^${strings.today.breakAnotherHabitCta}`)));

    expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome');
  });

  it('at the free limit (one active habit), press navigates to the paywall gate', async () => {
    mockHabits = [makeHabit({ id: 'h1', frequency: 'daily', status: 'changing' })];
    mockGoals = [makeGoal({ id: 'g1', habitId: 'h1', dayLogs: [] })];

    const view = await renderToday();

    await tap(view.getByLabelText(/^Kept /));
    await tap(view.getByLabelText(new RegExp(`^${strings.today.breakAnotherHabitCta}`)));

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=habit_gate');
  });
});
