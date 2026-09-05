/**
 * Door 1 real-app first run (W2, "the app is the onboarding" redesign,
 * Charen 2026-08-04). intent.tsx's track card now lands straight on Today
 * with ?view=spent&firstLog=1 instead of pushing the retired guided-log
 * screen; Today opens the real ExpenseSheet (mode="log") itself and
 * completes onboarding once that sheet is saved or dismissed.
 *
 * Provider wiring mirrors __tests__/todaySpentKept.test.tsx (HabitsContext,
 * ExpensesContext, CategoriesContext module-mocked). OnboardingContext is
 * additionally mocked here (unlike that file, which stubs it as always
 * complete) so isOnboardingComplete/completeStep/skipStep/completeOnboarding
 * are directly observable per test. ExpenseSheet (mode="log") itself is the
 * real component, not mocked: these tests drive it the same way
 * __tests__/expenseSheet.test.tsx does (typing into the native AmountField,
 * the merchant field, Save button, and the Sheet backdrop's "Close" for a
 * dismiss-without-save).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

let mockParams: { view?: string; firstLog?: string; sheet?: string } = {};
const mockRouterPush = jest.fn();
const mockSetParams = jest.fn();
jest.mock('expo-router', () => {
  const ReactActual = require('react');
  return {
    useRouter: () => ({ push: mockRouterPush, setParams: mockSetParams }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => callback(), []);
    },
    useLocalSearchParams: () => mockParams,
  };
});

let mockHabits: DetectedHabit[] = [];
const mockSeedDiscoveredHabit = jest.fn(async (input: Record<string, unknown>) => {
  const habit = { id: 'seeded-habit', ...input } as unknown as DetectedHabit;
  mockHabits = [...mockHabits, habit];
  return habit;
});

jest.mock('@/contexts/HabitsContext', () => ({
  useHabits: () => ({
    goals: [],
    isLoading: false,
    refreshHabits: jest.fn(async () => {}),
    dismissHabit: jest.fn(async () => {}),
    seedDiscoveredHabit: mockSeedDiscoveredHabit,
    startBreakingHabit: jest.fn(async () => ({})),
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

// mockExpenses is mutable, mirroring the mockHabits pattern above: the
// Spent pane's true-zero state (empty-state unification pass) now reads
// expenses.length, so a saved log has to actually land in this array for
// the tests below (which save one, then check what renders next) to see
// the real app's post-save state rather than a permanently-empty stub.
let mockExpenses: Expense[] = [];
const mockAddExpense = jest.fn(async (input: Partial<Expense>) => {
  const saved: Expense = {
    id: `mock-expense-${mockExpenses.length}`,
    title: '',
    amount: 0,
    category: 'Other',
    date: new Date(),
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'green',
    ...input,
  };
  mockExpenses = [...mockExpenses, saved];
  return saved;
});
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
    // useEmptyStateAction (components/onboarding/useEmptyStateAction.ts)
    // reads onboardingState.doorChosen; 'fresh' (not 'skip') keeps this
    // file's existing assertions untouched by the skip_activation event.
    onboardingState: { doorChosen: 'fresh' },
  }),
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ToastProvider } from '@/components/ui/Toast';
import TodayScreen from '@/app/(tabs)/index';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';
import type { Category } from '@/types/category';
import type { DetectedHabit } from '@/types/habit';
import type { Expense } from '@/types/expense';

const mockTrack = track as jest.Mock;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <LocaleProvider>
          <CurrencyProvider>
            <ToastProvider>{children}</ToastProvider>
          </CurrencyProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type View = Awaited<ReturnType<typeof render>>;

async function renderToday(): Promise<View> {
  const view = await render(
    <Providers>
      <TodayScreen />
    </Providers>
  );
  // Flush the door1 mount effect, storage loads, and the sheet's enter animation.
  await act(async () => {});
  return view;
}

async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

/** Types an amount into the native AmountField (ADR 0023), found by its
 *  stable "Amount, ..." accessibility label prefix (the suffix changes with
 *  the current value, so only the prefix is matched). */
async function typeAmount(view: View, amount: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(view.getByLabelText(/^Amount,/), amount);
  });
}

async function typeMerchant(view: View, text: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(view.getByLabelText(strings.expenses.merchantFieldLabel), text);
  });
}

beforeEach(() => {
  mockParams = {};
  mockOnboardingComplete = false;
  mockHabits = [];
  mockExpenses = [];
  mockRouterPush.mockClear();
  mockSetParams.mockClear();
  mockTrack.mockClear();
  mockAddExpense.mockClear();
  mockSeedDiscoveredHabit.mockClear();
  mockCompleteStep.mockClear();
  mockSkipStep.mockClear();
  mockCompleteOnboarding.mockClear();
});

afterEach(cleanup);

describe('Door 1 real-app first run: sheet auto-open', () => {
  it('opens the LogExpenseSheet with the coach line when firstLog=1 and onboarding is incomplete', async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    const view = await renderToday();

    expect(view.getByText(strings.today.firstLogCoachLine)).toBeTruthy();
    expect(view.getByText(strings.expenseSheet.logEyebrow)).toBeTruthy();
  });

  it('does not auto-open when onboarding is already complete', async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    mockOnboardingComplete = true;
    const view = await renderToday();

    expect(view.queryByText(strings.today.firstLogCoachLine)).toBeNull();
  });

  it('does not auto-open without the firstLog param', async () => {
    const view = await renderToday();
    expect(view.queryByText(strings.today.firstLogCoachLine)).toBeNull();
  });
});

describe('Door 1 real-app first run: save completes onboarding', () => {
  it('a successful save fires first_log_saved, completes the guided_log step and onboarding exactly once, and shows the saved ribbon', async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    const view = await renderToday();

    await typeAmount(view, '5');
    await tap(view.getByText(strings.expenseSheet.saveExpense));

    expect(mockTrack).toHaveBeenCalledWith('first_log_saved', { guided: true });
    expect(mockCompleteStep).toHaveBeenCalledTimes(1);
    expect(mockCompleteStep).toHaveBeenCalledWith('guided_log');
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    expect(mockSkipStep).not.toHaveBeenCalled();

    expect(view.getByText(strings.today.firstRunRibbonSaved)).toBeTruthy();
    // The coach line only ever belongs to the auto-opened first-run sheet;
    // once handled, a normal quick-log open must not carry it.
    expect(view.queryByText(strings.today.firstLogCoachLine)).toBeNull();
  });
});

describe('Door 1 real-app first run: close without saving', () => {
  it('dismissing the sheet without saving still completes onboarding, with the gentler ribbon line', async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    const view = await renderToday();

    // The Sheet's scrim/backdrop dismiss (components/ui/Sheet.tsx), the same
    // path a swipe-down or tap-outside takes.
    await tap(view.getByLabelText('Close'));

    expect(mockAddExpense).not.toHaveBeenCalled();
    expect(mockSkipStep).toHaveBeenCalledTimes(1);
    expect(mockSkipStep).toHaveBeenCalledWith('guided_log');
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    expect(mockCompleteStep).not.toHaveBeenCalledWith('guided_log');

    // The InfoRibbon lives inside the logged-today block (Charen's Today
    // annotations, 2026-09-04), and in the Zero state that block does not
    // exist: the zero hook ("Start with what you just spent") already says
    // what the gentle line used to say above the quick-log field, so the
    // gentle line shows nowhere. The record is still written, and resolves
    // itself once a real log exists (next describe).
    expect(view.queryByText(strings.today.firstRunRibbonGentle)).toBeNull();
    expect(view.getByText(strings.today.spentEmptyTitle)).toBeTruthy();
  });

  it('the saved ribbon dismiss (X) hides it permanently', async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    const view = await renderToday();
    await typeAmount(view, '5');
    await tap(view.getByText(strings.expenseSheet.saveExpense));

    expect(view.getByText(strings.today.firstRunRibbonSaved)).toBeTruthy();
    await tap(view.getByLabelText(strings.common.dismiss));
    expect(view.queryByText(strings.today.firstRunRibbonSaved)).toBeNull();
  });
});

describe('Door 1 real-app first run: a gentle line resolves itself', () => {
  it('a pending gentle record is dismissed as soon as any expense exists', async () => {
    // 2026-09-04 walk: the gentle line ("whenever you're ready") was still
    // up after four real logs, because only the X ever set `dismissed`.
    const storageModule = require('@react-native-async-storage/async-storage');
    const AsyncStorage = storageModule.default ?? storageModule;
    await AsyncStorage.setItem(
      '@habitcents_first_run_ribbon',
      JSON.stringify({ door: 'door1', messageKey: 'door1_gentle', dismissed: false })
    );
    mockExpenses = [
      {
        id: 'e1',
        title: 'Blue Bottle',
        amount: 575,
        category: 'Food',
        date: new Date(),
        time: '9:00 AM',
        isRecurring: false,
        reminderEnabled: false,
        iconVariant: 'green',
      },
    ];
    const view = await renderToday();
    await act(async () => {});

    expect(view.queryByText(strings.today.firstRunRibbonGentle)).toBeNull();
    const raw = await AsyncStorage.getItem('@habitcents_first_run_ribbon');
    expect(JSON.parse(raw as string)).toMatchObject({ door: 'door1', dismissed: true });
  });
});

describe('Door 1 real-app first run: watch-nudge', () => {
  it('appears under the logged row only when the saved expense carries a merchant', async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    const view = await renderToday();

    await typeAmount(view, '5');
    await typeMerchant(view, 'Blue Bottle');
    await tap(view.getByText(strings.expenseSheet.saveExpense));

    expect(view.getByText(strings.today.watchLeakNudgeLabel)).toBeTruthy();
  });

  it('does not appear when the saved expense has no merchant', async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    const view = await renderToday();

    await typeAmount(view, '5');
    await tap(view.getByText(strings.expenseSheet.saveExpense));

    expect(view.queryByText(strings.today.watchLeakNudgeLabel)).toBeNull();
  });

  it('accepting seeds a discovered habit from honest, observed-only evidence and never fabricates a monthly rate', async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    const view = await renderToday();

    await typeAmount(view, '5');
    await typeMerchant(view, 'Blue Bottle');
    await tap(view.getByText(strings.expenseSheet.saveExpense));

    await tap(view.getByText(strings.today.watchLeakNudgeLabel));

    expect(mockSeedDiscoveredHabit).toHaveBeenCalledTimes(1);
    const input = mockSeedDiscoveredHabit.mock.calls[0][0];
    expect(input).toMatchObject({
      merchantPattern: 'Blue Bottle',
      name: 'Blue Bottle',
      categoryId: 'cat-other',
      averageAmount: 500,
      occurrencesPerPeriod: 1,
      totalMonthlySpend: 500,
      observedOnly: true,
    });

    // One-shot: resolved after accepting, the nudge cannot be tapped twice.
    expect(view.queryByText(strings.today.watchLeakNudgeLabel)).toBeNull();
  });

  it('dismissing ("not now") hides the nudge permanently without seeding anything', async () => {
    mockParams = { view: 'spent', firstLog: '1' };
    const view = await renderToday();

    await typeAmount(view, '5');
    await typeMerchant(view, 'Blue Bottle');
    await tap(view.getByText(strings.expenseSheet.saveExpense));

    await tap(view.getByLabelText(strings.today.watchLeakNudgeDismiss));

    expect(mockSeedDiscoveredHabit).not.toHaveBeenCalled();
    expect(view.queryByText(strings.today.watchLeakNudgeLabel)).toBeNull();
  });
});


/**
 * The general-purpose ?sheet= entry (PRD v3.1 sect 5, phase 7).
 *
 * Deliberately NOT the same thing as firstLog above: that one carries
 * onboarding semantics and is guarded on isOnboardingComplete(), so it goes
 * inert exactly when an empty state needs it. This one has to keep working
 * forever, and keep working REPEATEDLY (review round 3, P2-2).
 */
describe('Today: the ?sheet= entry for empty-state CTAs', () => {
  it('opens the log sheet even after onboarding is complete', async () => {
    mockParams = { view: 'spent', sheet: 'log' };
    mockOnboardingComplete = true;
    const view = await renderToday();

    expect(view.getByText(strings.expenseSheet.logEyebrow)).toBeTruthy();
    // No coach line: this is not an onboarding path.
    expect(view.queryByText(strings.today.firstLogCoachLine)).toBeNull();
  });

  it('clears the param on close, so pressing the same CTA again re-opens it', async () => {
    mockParams = { view: 'spent', sheet: 'log' };
    mockOnboardingComplete = true;
    const view = await renderToday();

    await act(async () => {
      fireEvent.press(view.getByLabelText('Close'));
    });

    // Both halves of the re-arm: the one-shot ref is reset internally, and the
    // param itself is cleared so the next navigate() to the same href is a
    // real transition rather than a no-op that leaves the CTA dead.
    expect(mockSetParams).toHaveBeenCalledWith({ sheet: undefined });
  });
});
