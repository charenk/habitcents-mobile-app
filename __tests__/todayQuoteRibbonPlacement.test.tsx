/**
 * Today: zero-state composition plus the per-view FirstRunRibbon split.
 *
 * The quote system this file was written for is RETIRED (ADR 0037). What was
 * "the quote sits here" is now "no pane renders a quote in any state", which
 * is worth pinning: ViewQuote and useViewQuote are kept unreferenced as the
 * documented revert path, so an accidental re-import would be silent.
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
import { contentColumnStyle, layout } from '@/constants/theme';
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

function flattenStyle(style: unknown): Record<string, unknown> {
  const styles = Array.isArray(style) ? style.flat(Infinity) : [style];
  return Object.assign({}, ...styles.filter((s): s is Record<string, unknown> => !!s && typeof s === 'object'));
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

describe('Today: zero-state composition (quotes retired, ADR 0037)', () => {
  it('Kept opens straight on the KeptHero band once kept content exists', async () => {
    mockHabits = [makeHabit({ id: 'h1' })];
    const view = await renderToday();

    const keptPane = within(view.getByTestId('kept-pane'));
    // "keptSoFar" is KeptHero's own eyebrow text (components/habit-logging/
    // KeptHero.tsx).
    expect(keptPane.getByText(strings.habitLogging.keptSoFar)).toBeTruthy();
    expect(keptPane.queryByTestId('kept-quote')).toBeNull();
  });

  it('Kept first run is the hook alone, no hero band', async () => {
    const view = await renderToday();

    const keptPane = within(view.getByTestId('kept-pane'));
    expect(keptPane.getByText(strings.today.keptEmptyTitle)).toBeTruthy();
    expect(keptPane.queryByText(strings.habitLogging.keptSoFar)).toBeNull();
  });

  it('Spent shows the logged-today block once any expense exists', async () => {
    mockExpenses = [makeExpense({ id: 'e1' })];
    const view = await renderToday();

    const spentPane = within(view.getByTestId('spent-pane'));
    // UX-060: sentence case in the tree, uppercased by the style.
    expect(spentPane.getByText(strings.today.loggedTodayEyebrow)).toBeTruthy();
  });

  // The replacement for the old "each pane shows only its own quote" test.
  // Zero is the state that used to carry one, so it is the state worth
  // checking: if the quote ever comes back by accident, it comes back here.
  it('neither pane renders a quote in its Zero state', async () => {
    const view = await renderToday();

    expect(view.queryByTestId('spent-quote')).toBeNull();
    expect(view.queryByTestId('kept-quote')).toBeNull();
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
  it("door1's saved ribbon renders in the Spent pane only, under the log card, never Kept", async () => {
    // The InfoRibbon sits inside the logged-today block (Charen's Today
    // annotations, 2026-09-04), so a pending saved record plus one logged
    // row is the quickest way to the placement without driving the sheet.
    await AsyncStorage.setItem(
      '@habitcents_first_run_ribbon',
      JSON.stringify({ door: 'door1', messageKey: 'door1_saved', dismissed: false })
    );
    mockExpenses = [makeExpense({ id: 'e1' })];
    const view = await renderToday();

    const spentPane = within(view.getByTestId('spent-pane'));
    const keptPane = within(view.getByTestId('kept-pane'));

    expect(spentPane.getByText(strings.today.firstRunRibbonSaved)).toBeTruthy();
    expect(keptPane.queryByText(strings.today.firstRunRibbonSaved)).toBeNull();
    // Receipt under the card: the eyebrow row precedes the ribbon in the tree.
    expect(spentPane.getByText(strings.today.loggedTodayEyebrow)).toBeTruthy();
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

describe('Today: Kept pane chrome tablet cap (routine/ipad item 2e)', () => {
  // The door3 ribbon and KeptHero render directly in the Kept pane, above
  // and outside the ScrollView/SectionList content that plan item 2b/2d
  // already capped, so they needed their own cap. This file already has the
  // provider wiring and fixtures to get both to render; jest cannot run RN's
  // real flexbox layout engine, so this pins the style contract (same as
  // __tests__/tabletLayout.test.tsx), not a measured pixel width.
  it("caps and centers KeptHero's wrapper at the shared content column width", async () => {
    mockHabits = [makeHabit({ id: 'h1' })];
    const view = await renderToday();

    const wrap = view.getByTestId('kept-hero-cap-wrap');
    const flat = flattenStyle(wrap.props.style);

    expect(flat.width).toBe('100%');
    expect(flat.maxWidth).toBe(layout.contentMaxWidth);
    expect(flat.alignSelf).toBe('center');
  });

  it('caps and centers the door3 ribbon wrapper at the shared content column width', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    const view = await renderToday();
    await tap(view.getByLabelText('Close'));

    const wrap = view.getByTestId('door3-ribbon-wrap');
    const flat = flattenStyle(wrap.props.style);

    expect(flat.width).toBe('100%');
    expect(flat.maxWidth).toBe(layout.contentMaxWidth);
    expect(flat.alignSelf).toBe('center');
  });

  it('leaves the pane itself at window width (the pager\'s paging unit, not the readable column)', async () => {
    mockHabits = [makeHabit({ id: 'h1' })];
    const view = await renderToday();

    const keptPane = view.getByTestId('kept-pane');
    const flat = flattenStyle(keptPane.props.style);

    // Mirrors OnboardingCarousel's beat/beatContent split (__tests__/
    // tabletLayout.test.tsx): the pane stays window width so the pager's
    // screenWidth-driven paging math (app/(tabs)/index.tsx) is unaffected;
    // only the content inside it is capped via contentColumnStyle.
    expect(flat.maxWidth).not.toBe(layout.contentMaxWidth);
    expect(flat).not.toEqual(expect.objectContaining(contentColumnStyle));
  });
});
