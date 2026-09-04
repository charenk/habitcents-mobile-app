/**
 * Today (U6, Charen-approved live preview placements): the quote system's
 * placement plus the per-view FirstRunRibbon split.
 *
 * - Kept opens with its quote, above KeptHero.
 * - Spent closes with its quote, below the logged-today block.
 * - door1's ribbon renders only in the Spent pane; door3's only in Kept.
 * - The View all link (LoggedTodayList's onViewAll) routes to Money's Spent
 *   segment and only when today has at least one logged expense.
 *
 * Provider wiring and door1/door3 mocks mirror __tests__/door1FirstRun.
 * test.tsx and __tests__/door3BreakSheet.test.tsx (the two flows this file
 * exercises to get each ribbon pending). Both panes stay mounted (DI-7), so
 * "renders only in X pane" is proved by scoping queries to the spent-pane /
 * kept-pane testIDs (app/(tabs)/index.tsx), not by presence in the tree
 * alone.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

let mockParams: { view?: string; firstLog?: string; breakEntry?: string } = {};
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => {
  const ReactActual = require('react');
  return {
    useRouter: () => ({ push: mockRouterPush }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => callback(), []);
    },
    useLocalSearchParams: () => mockParams,
  };
});

let mockGoals: HabitChangeGoal[] = [];
let mockHabits: DetectedHabit[] = [];
const mockSeedDiscoveredHabit = jest.fn(async (input: Record<string, unknown>) => {
  const habit = { id: 'seeded-habit', status: 'discovered', ...input } as unknown as DetectedHabit;
  mockHabits = [...mockHabits, habit];
  return habit;
});
const mockStartBreakingHabit = jest.fn(async () => ({}));

jest.mock('@/contexts/HabitsContext', () => ({
  useHabits: () => ({
    goals: mockGoals,
    isLoading: false,
    refreshHabits: jest.fn(async () => {}),
    dismissHabit: jest.fn(async () => {}),
    seedDiscoveredHabit: mockSeedDiscoveredHabit,
    startBreakingHabit: mockStartBreakingHabit,
    answerToday: jest.fn(async () => {}),
    answerEvent: jest.fn(async () => {}),
    changeTodayAnswer: jest.fn(async () => {}),
    backfillYesterday: jest.fn(async () => {}),
    savePartialSlip: jest.fn(async () => {}),
    getActiveHabits: () => mockHabits.filter((h) => h.status === 'tracking' || h.status === 'changing'),
    getDiscoveredHabits: () => mockHabits.filter((h) => h.status === 'discovered' && !h.dismissedAt),
    getGoalByHabitId: () => undefined,
    getHabitById: () => undefined,
    lastMilestone: null,
    clearLastMilestone: jest.fn(),
    lastCoachMoment: null,
    clearLastCoachMoment: jest.fn(),
    maybeShowDetectionMoment: jest.fn(async () => null),
    maybeShowFirstLogMoment: jest.fn(async () => null),
  }),
}));

let mockExpenses: Expense[] = [];
const mockAddExpense = jest.fn(async () => undefined);
jest.mock('@/contexts/ExpensesContext', () => ({
  useExpenses: () => ({ expenses: mockExpenses, addExpense: mockAddExpense }),
}));

const mockCategories: Category[] = [
  {
    id: 'cat-food',
    name: 'Food',
    icon: 'fast-food-outline',
    color: '#66BB6A',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'cat-other',
    name: 'Other',
    icon: 'ellipsis-horizontal-outline',
    color: '#9E9E9E',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
];
jest.mock('@/contexts/CategoriesContext', () => ({
  useCategories: () => ({
    getVisibleCategories: () => mockCategories,
    getCategoryByName: (name: string) => mockCategories.find((c) => c.name.toLowerCase() === name.toLowerCase()),
  }),
}));

let mockOnboardingComplete = false;
jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    isLoading: false,
    isOnboardingComplete: () => mockOnboardingComplete,
    completeStep: jest.fn(async () => {}),
    skipStep: jest.fn(async () => {}),
    completeOnboarding: jest.fn(async () => {}),
    // useEmptyStateAction (components/onboarding/useEmptyStateAction.ts)
    // reads onboardingState.doorChosen; 'fresh' (not 'skip') keeps this
    // file's existing assertions untouched by the skip_activation event.
    onboardingState: { doorChosen: 'fresh' },
  }),
}));

import React from 'react';
import { act, cleanup, configure, fireEvent, render, resetToDefaults, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import TodayScreen from '@/app/(tabs)/index';
import { strings } from '@/constants/strings';
import type { Expense } from '@/types/expense';
import type { Category } from '@/types/category';
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

type View = Awaited<ReturnType<typeof render>>;

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

// Mirrors door3BreakSheet.test.tsx's fixture: the minimum shape LeakCard can
// render, used to populate the Kept pane so KeptHero mounts (FTE pass: the
// hero only exists once a leak or breaking habit does).
function makeHabit(overrides: Partial<DetectedHabit> & { id: string }): DetectedHabit {
  const base: DetectedHabit = {
    id: overrides.id,
    name: 'Existing habit',
    description: '',
    categoryId: 'cat-other',
    averageAmount: 500,
    frequency: 'daily',
    occurrencesPerPeriod: 1,
    totalMonthlySpend: 15000,
    observedTotal: 500,
    observedCount: 1,
    spanDays: 0,
    hasReliableRate: true,
    medianAmount: 500,
    minAmount: 500,
    maxAmount: 500,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status: 'discovered',
    sentiment: 'bad',
    discoveredAt: new Date('2026-06-01T00:00:00'),
  };
  return { ...base, ...overrides };
}

async function renderToday(): Promise<View> {
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

// DI-7 keeps both panes permanently mounted, but RTL only queries elements
// that are accessible by default (accessibilityElementsHidden /
// importantForAccessibility on the inactive pane excludes it). This file's
// whole point is proving something ISN'T in the inactive pane's subtree, not
// just that it isn't currently reachable by VoiceOver, so hidden elements
// are included globally rather than threading `{ includeHiddenElements: true }`
// through every query.
beforeAll(() => {
  configure({ defaultIncludeHiddenElements: true });
});

afterAll(() => {
  resetToDefaults();
});

beforeEach(async () => {
  mockParams = {};
  mockOnboardingComplete = false;
  mockGoals = [];
  mockHabits = [];
  mockExpenses = [];
  mockRouterPush.mockClear();
  mockAddExpense.mockClear();
  mockSeedDiscoveredHabit.mockClear();
  mockStartBreakingHabit.mockClear();
  // The FirstRunRibbon record and the quote-sequence counters are real
  // AsyncStorage keys; cleared between tests so one test's ribbon or
  // rotation state can never leak into the next.
  await AsyncStorage.clear();
});

afterEach(cleanup);

describe('Today: quote placement', () => {
  it('Kept opens with a quote, above the KeptHero band, once kept content exists', async () => {
    // FTE pass (TodayFteKept artboard, 2026-09-03): the hero band only
    // mounts once a leak or breaking habit exists, so this placement test
    // populates the pane with a discovered habit first.
    mockHabits = [makeHabit({ id: 'h1' })];
    const view = await renderToday();

    const keptPane = within(view.getByTestId('kept-pane'));
    const quote = keptPane.getByTestId('kept-quote');
    // "keptSoFar" is KeptHero's own eyebrow text (components/habit-logging/
    // KeptHero.tsx); its presence in the same pane, after the quote in
    // render order, is the placement this test protects.
    expect(quote).toBeTruthy();
    expect(keptPane.getByText(strings.habitLogging.keptSoFar)).toBeTruthy();
  });

  it('Kept first run has the quote in the centered zero block and no KeptHero band', async () => {
    // FTE pass: with nothing logged and no habits, the artboard shows quote
    // plus the leaks-will-show-up hook, and explicitly no hero band.
    const view = await renderToday();

    const keptPane = within(view.getByTestId('kept-pane'));
    expect(keptPane.getByTestId('kept-quote')).toBeTruthy();
    expect(keptPane.getByText(strings.today.keptEmptyTitle)).toBeTruthy();
    expect(keptPane.queryByText(strings.habitLogging.keptSoFar)).toBeNull();
  });

  it('Spent closes with a quote, below the logged-today block', async () => {
    mockExpenses = [makeExpense({ id: 'e1' })];
    const view = await renderToday();

    const spentPane = within(view.getByTestId('spent-pane'));
    expect(spentPane.getByTestId('spent-quote')).toBeTruthy();
    // UX-060: sentence case in the tree, uppercased by the style.
    expect(spentPane.getByText(strings.today.loggedTodayEyebrow)).toBeTruthy();
  });

  it('each pane shows only its own quote, never the other view\'s array', async () => {
    const view = await renderToday();

    const spentQuoteLabel = view.getByTestId('spent-quote').props.accessibilityLabel as string;
    const keptQuoteLabel = view.getByTestId('kept-quote').props.accessibilityLabel as string;

    const spentTexts = strings.today.spentQuotes.map((q) => (q.by ? `${q.text}, ${q.by}` : q.text));
    const keptTexts = strings.today.keptQuotes.map((q) => (q.by ? `${q.text}, ${q.by}` : q.text));

    expect(spentTexts).toContain(spentQuoteLabel);
    expect(keptTexts).not.toContain(spentQuoteLabel);
    expect(keptTexts).toContain(keptQuoteLabel);
    expect(spentTexts).not.toContain(keptQuoteLabel);
  });
});

describe('Today: rename (decision D3)', () => {
  // UX-060: still uppercase on screen, but transformed by the style, so the
  // text node carries the sentence-case string.
  it("the logged-list eyebrow reads Today's log, not Logged today", async () => {
    // Empty-state unification pass: the logged-today list (and its eyebrow)
    // only renders once at least one expense exists at all; with none, the
    // Spent pane's true-zero fill EmptyState renders instead.
    mockExpenses = [makeExpense({ id: 'e1' })];
    const view = await renderToday();

    expect(view.getByText("Today's log")).toBeTruthy();
    expect(view.queryByText('Logged today')).toBeNull();
  });
});

describe('Today: View all', () => {
  it('navigates to the Money tab when pressed', async () => {
    mockExpenses = [makeExpense({ id: 'e1' })];
    const view = await renderToday();

    await tap(view.getByText(strings.today.loggedTodayViewAll));

    expect(mockRouterPush).toHaveBeenCalledWith('/(tabs)/money');
  });

  it('is hidden when nothing has been logged today', async () => {
    const view = await renderToday();

    expect(view.queryByText(strings.today.loggedTodayViewAll)).toBeNull();
  });
});

describe('Today: per-view FirstRunRibbon (door1 -> Spent, door3 -> Kept)', () => {
  it("door1's gentle ribbon renders in the Spent pane only, never Kept", async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    const view = await renderToday();

    // Dismiss the auto-opened ExpenseSheet without saving (Sheet's own
    // backdrop close), the same path door1FirstRun.test.tsx uses to reach
    // the gentle ribbon quickly.
    await tap(view.getByLabelText('Close'));

    const spentPane = within(view.getByTestId('spent-pane'));
    const keptPane = within(view.getByTestId('kept-pane'));

    expect(spentPane.getByText(strings.today.firstRunRibbonGentle)).toBeTruthy();
    expect(keptPane.queryByText(strings.today.firstRunRibbonGentle)).toBeNull();
  });

  it("door3's gentle ribbon renders in the Kept pane only, never Spent", async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    const view = await renderToday();

    // Close the auto-opened BreakHabitSheet without starting, the same path
    // door3BreakSheet.test.tsx uses to reach the gentle ribbon quickly.
    await tap(view.getByLabelText('Close'));

    const spentPane = within(view.getByTestId('spent-pane'));
    const keptPane = within(view.getByTestId('kept-pane'));

    expect(keptPane.getByText(strings.today.door3RibbonGentle)).toBeTruthy();
    expect(spentPane.queryByText(strings.today.door3RibbonGentle)).toBeNull();
  });
});
