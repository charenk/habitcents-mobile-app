/**
 * Door 3 break sheet (W3, "the app is the onboarding" complete, ADR 0020 +
 * 0022). intent.tsx's break card now lands here with
 * ?view=kept&breakEntry=1 instead of pushing the retired audit-subs screen;
 * Today opens BreakHabitSheet itself and completes onboarding once the sheet
 * resolves (start or close-without-starting), the same split door1FirstRun.
 * test.tsx exercises for Door 1.
 *
 * Provider wiring mirrors __tests__/door1FirstRun.test.tsx (HabitsContext,
 * ExpensesContext, CategoriesContext module-mocked; OnboardingContext mocked
 * with directly observable mutators). BreakHabitSheet itself is the real
 * component, not mocked.
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

let mockHabits: DetectedHabit[] = [];
const mockSeedDiscoveredHabit = jest.fn(async (input: Record<string, unknown>) => {
  const habit = { id: 'seeded-habit', status: 'discovered', ...input } as unknown as DetectedHabit;
  mockHabits = [...mockHabits, habit];
  return habit;
});
const mockStartBreakingHabit = jest.fn(async () => ({}));

jest.mock('@/contexts/HabitsContext', () => ({
  useHabits: () => ({
    goals: [],
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

const mockAddExpense = jest.fn(async (_input: Record<string, unknown>) => undefined);
jest.mock('@/contexts/ExpensesContext', () => ({
  useExpenses: () => ({ expenses: [], addExpense: mockAddExpense }),
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
    id: 'cat-shopping',
    name: 'Shopping',
    icon: 'cart-outline',
    color: '#FFA726',
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
const mockCompleteStep = jest.fn(async () => {});
const mockSkipStep = jest.fn(async () => {});
const mockCompleteOnboarding = jest.fn(async () => {});
jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    isLoading: false,
    isOnboardingComplete: () => mockOnboardingComplete,
    completeStep: mockCompleteStep,
    skipStep: mockSkipStep,
    completeOnboarding: mockCompleteOnboarding,
  }),
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import TodayScreen from '@/app/(tabs)/index';
import { strings } from '@/constants/strings';
import { vicePresets } from '@/constants/onboardingPresets';
import { formatMoney } from '@/utils/currency';
import type { Category } from '@/types/category';
import type { DetectedHabit } from '@/types/habit';

const presets = vicePresets('USD');
const coffee = presets.find((p) => p.id === 'coffee')!;
const delivery = presets.find((p) => p.id === 'delivery')!;

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
    status: 'changing',
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
  // Flush the door1/door3 mount effects, storage loads, and the sheet's enter
  // animation.
  await act(async () => {});
  return view;
}

async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

beforeEach(() => {
  mockParams = {};
  mockOnboardingComplete = false;
  mockHabits = [];
  mockRouterPush.mockClear();
  mockAddExpense.mockClear();
  mockSeedDiscoveredHabit.mockClear();
  mockStartBreakingHabit.mockClear();
  mockCompleteStep.mockClear();
  mockSkipStep.mockClear();
  mockCompleteOnboarding.mockClear();
});

afterEach(cleanup);

describe('Door 3 break sheet: auto-open', () => {
  it('opens with the break sheet title when breakEntry=1 and onboarding is incomplete', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    const view = await renderToday();

    expect(view.getByText(strings.onboarding.breakSheetTitle)).toBeTruthy();
  });

  it('does not auto-open when onboarding is already complete', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    mockOnboardingComplete = true;
    const view = await renderToday();

    expect(view.queryByText(strings.onboarding.breakSheetTitle)).toBeNull();
  });

  it('does not auto-open without the breakEntry param', async () => {
    const view = await renderToday();
    expect(view.queryByText(strings.onboarding.breakSheetTitle)).toBeNull();
  });
});

describe('Door 3 break sheet: chip selection', () => {
  it('selecting a chip prefills the amount with its per-currency preset', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    const view = await renderToday();

    await tap(view.getByText(delivery.name));

    expect(
      view.getByLabelText(`${strings.habitLogging.pickOneFieldLabel}, ${formatMoney(delivery.perItemCents)}`)
    ).toBeTruthy();
  });
});

describe('Door 3 break sheet: honest yearly line', () => {
  it('recomputes exactly for each cadence from the entered amount (365/52/12)', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    const view = await renderToday();

    await tap(view.getByText(coffee.name));

    expect(
      view.getByText(strings.onboarding.breakSheetYearlyLineDaily(formatMoney(coffee.perItemCents * 365)))
    ).toBeTruthy();

    await tap(view.getByText(strings.onboarding.breakSheetCadenceWeekly));
    expect(
      view.getByText(strings.onboarding.breakSheetYearlyLineWeekly(formatMoney(coffee.perItemCents * 52)))
    ).toBeTruthy();

    await tap(view.getByText(strings.onboarding.breakSheetCadenceMonthly));
    expect(
      view.getByText(strings.onboarding.breakSheetYearlyLineMonthly(formatMoney(coffee.perItemCents * 12)))
    ).toBeTruthy();
  });
});

describe('Door 3 break sheet: Start, bought-today', () => {
  it('bought-today=yes starts the habit and writes an expense with the habit merchant', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    const view = await renderToday();

    await tap(view.getByText(coffee.name));
    await tap(view.getByText(strings.onboarding.breakSheetBoughtYes));
    await tap(view.getByText(strings.habitLogging.startBreakingIt));

    expect(mockSeedDiscoveredHabit).toHaveBeenCalledTimes(1);
    expect(mockSeedDiscoveredHabit.mock.calls[0][0]).toMatchObject({
      merchantPattern: 'coffee',
      name: coffee.name,
      averageAmount: coffee.perItemCents,
      frequency: 'daily',
      occurrencesPerPeriod: 1,
    });

    expect(mockStartBreakingHabit).toHaveBeenCalledWith('seeded-habit', coffee.perItemCents, false, 'onboarding');

    expect(mockAddExpense).toHaveBeenCalledTimes(1);
    expect(mockAddExpense.mock.calls[0][0]).toMatchObject({
      merchant: coffee.name,
      amount: coffee.perItemCents,
      category: 'Food',
    });

    // Exactly-once completion, with the "started" ribbon.
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    expect(view.getByText(strings.today.door3RibbonStarted)).toBeTruthy();
  });

  it('the default "Not today" starts the habit but writes no expense', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    const view = await renderToday();

    await tap(view.getByText(coffee.name));
    await tap(view.getByText(strings.habitLogging.startBreakingIt));

    expect(mockStartBreakingHabit).toHaveBeenCalledTimes(1);
    expect(mockAddExpense).not.toHaveBeenCalled();
  });
});

describe('Door 3 break sheet: close without starting', () => {
  it('completes onboarding exactly once with the gentler ribbon, and starts nothing', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    const view = await renderToday();

    // The Sheet's scrim/backdrop dismiss (components/ui/Sheet.tsx), the same
    // path a swipe-down or tap-outside takes.
    await tap(view.getByLabelText('Close'));

    expect(mockSeedDiscoveredHabit).not.toHaveBeenCalled();
    expect(mockStartBreakingHabit).not.toHaveBeenCalled();
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    expect(view.getByText(strings.today.door3RibbonGentle)).toBeTruthy();
  });
});

describe('Door 3 break sheet: free-tier gate', () => {
  it('renders the gate at the habit limit instead of the pick form, and routes to the paywall', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    mockHabits = [makeHabit({ id: 'h1' })];
    const view = await renderToday();

    expect(view.getByText(strings.habitLogging.gateTitle)).toBeTruthy();
    expect(view.queryByText(strings.habitLogging.startBreakingIt)).toBeNull();

    await tap(view.getByText(strings.habitLogging.gateUpgradeCta));

    expect(mockRouterPush).toHaveBeenCalledWith('/paywall?placement=habit_gate');
    // Leaving for the paywall is still leaving without starting a habit, so
    // it completes onboarding the same way "Maybe later" would.
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });
});

describe('Door 3 break sheet: stack review findings', () => {
  it('a scrim close while Start is in flight never shows the gentle ribbon (finding 1)', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };

    // Make the first awaited write hang until we release it, so the close
    // can race in exactly the window the review traced.
    let releaseSeed: (h: DetectedHabit) => void = () => {};
    mockSeedDiscoveredHabit.mockImplementationOnce(
      () => new Promise<DetectedHabit>((resolve) => { releaseSeed = resolve; })
    );

    const view = await renderToday();
    await tap(view.getByText(coffee.name));
    await tap(view.getByText(strings.habitLogging.startBreakingIt));

    // Mid-flight: the user taps the scrim.
    await tap(view.getByLabelText('Close'));

    // Release the write and let the handler finish.
    await act(async () => {
      releaseSeed({ id: 'seeded-habit', status: 'discovered' } as unknown as DetectedHabit);
      await Promise.resolve();
    });

    expect(mockStartBreakingHabit).toHaveBeenCalledTimes(1);
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    expect(view.getByText(strings.today.door3RibbonStarted)).toBeTruthy();
    expect(view.queryByText(strings.today.door3RibbonGentle)).toBeNull();
  });

  it('double-tapping Start creates exactly one habit (finding 1 guard)', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    const view = await renderToday();
    await tap(view.getByText(coffee.name));
    const start = view.getByText(strings.habitLogging.startBreakingIt);
    await act(async () => {
      fireEvent.press(start);
      fireEvent.press(start);
      await Promise.resolve();
    });
    expect(mockSeedDiscoveredHabit).toHaveBeenCalledTimes(1);
    expect(mockStartBreakingHabit).toHaveBeenCalledTimes(1);
  });

  it('re-picking an already-breaking preset never starts a second goal (finding 2)', async () => {
    mockParams = { view: 'kept', breakEntry: '1' };
    // seedDiscoveredHabit's protect-active guard returns the live habit
    // untouched; the screen must then refuse to start it again.
    mockSeedDiscoveredHabit.mockImplementationOnce(
      async () => ({ id: 'h-live', status: 'changing' } as unknown as DetectedHabit)
    );
    const view = await renderToday();
    await tap(view.getByText(coffee.name));
    await tap(view.getByText(strings.habitLogging.startBreakingIt));

    expect(mockStartBreakingHabit).not.toHaveBeenCalled();
    expect(view.getByText(strings.today.alreadyBreakingToast)).toBeTruthy();
  });
});
