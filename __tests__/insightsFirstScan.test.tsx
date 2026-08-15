/**
 * Insights "First scan" segment (W5, OB-6 Insights half, ADR 0020: summary
 * shown until replaced, no expiry).
 *
 * Two things pinned here:
 * - No persisted ScanSummary: the screen renders EXACTLY as it did before
 *   this feature, with no segmented control at all.
 * - A persisted ScanSummary: the segmented control appears, defaults to This
 *   month, and switching to First scan renders the summary verbatim (dated
 *   eyebrow, KPI numbers, category rows, capped leaks with the evidence-
 *   honesty branching, and the updated caption).
 *
 * Provider wiring mirrors __tests__/settingsSheet.test.tsx and
 * __tests__/pickOneSheet.test.tsx: full context tree, AsyncStorage mocked,
 * expo-router mocked (no navigator in a unit test). utils/storage is mocked
 * with jest.requireActual so only getScanSummary is overridden; every other
 * context still reads/writes through the real (mocked-AsyncStorage) storage
 * layer, matching how those two tests isolate a single seam.
 */
// Full-provider renders exceed jest's 5s default under CI worker load.
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const react = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    // No navigator in a unit test, so this stands in for the real
    // useFocusEffect: run the effect once on mount, which is enough to cover
    // both "on mount" and "on focus" for this screen's re-read of the summary.
    useFocusEffect: (callback: () => void | (() => void)) => {
      react.useEffect(() => {
        return callback();
      }, []);
    },
  };
});

const mockGetScanSummary = jest.fn();
jest.mock('@/utils/storage', () => {
  const actual = jest.requireActual('@/utils/storage');
  return { ...actual, getScanSummary: (...args: unknown[]) => mockGetScanSummary(...args) };
});

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import InsightsScreen from '@/app/(tabs)/insights';
import { strings } from '@/constants/strings';
import { formatDate } from '@/utils/dates';
import { selectableLabel } from '@/utils/a11y';
import { formatMoney } from '@/utils/currency';
import { DEFAULT_CURRENCY } from '@/utils/currency';
import { saveHabits } from '@/utils/storage';
import type { ScanSummary } from '@/types/scanSummary';
import type { DetectedHabit, HabitStatus } from '@/types/habit';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>
            <CategoriesProvider>
              <ExpensesProvider>
                <HabitsProvider>
                  <ReportsProvider><OnboardingProvider>{children}</OnboardingProvider></ReportsProvider>
                </HabitsProvider>
              </ExpensesProvider>
            </CategoriesProvider>
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function money(cents: number): string {
  return formatMoney(cents, DEFAULT_CURRENCY);
}

async function renderInsights() {
  const view = await render(
    <Providers>
      <InsightsScreen />
    </Providers>
  );
  // Flush every provider's load effect plus the screen's own scan-summary read.
  await act(async () => {});
  return view;
}

const CREATED_AT = new Date('2026-07-15T12:00:00.000Z');

function syntheticSummary(): ScanSummary {
  return {
    schemaVersion: 1,
    createdAt: CREATED_AT,
    evidence: {
      windowStart: new Date('2026-06-01T00:00:00.000Z'),
      windowEnd: new Date('2026-06-30T00:00:00.000Z'),
      fileCount: 2,
      rowCount: 148,
    },
    kpis: {
      totalSpentCents: 245000,
      totalSpentTier: 'solid',
      perDayCents: 8166,
      transactionCount: 62,
      purchasesPerDay: 2.1,
      spanDays: 30,
      // 30 days clears MIN_SPAN_DAYS_FOR_RATE (14), so leak rows below use the
      // monthly rate line, not the observed-so-far line.
      coveredDays: 30,
      nAccounts: 2,
    },
    categories: [
      { name: 'Food', totalCents: 120000, share: 0.49 },
      { name: 'Shopping', totalCents: 80000, share: 0.33 },
      { name: 'Utilities', totalCents: 45000, share: 0.18 },
    ],
    topLeaks: [
      { name: 'Starbucks', monthlyCents: 12000, observedCents: 11000, buys: 18, cadence: 'daily', tier: 'solid' },
      { name: 'Uber Eats', monthlyCents: 9000, observedCents: 8200, buys: 6, cadence: 'weekly', tier: 'likely' },
      { name: 'Spotify', monthlyCents: 1099, observedCents: 1099, buys: 1, cadence: 'monthly', tier: 'solid' },
    ],
    projection: { nextMonthCents: 250000, lockedInCents: 90000 },
  };
}

beforeEach(() => {
  mockPush.mockClear();
  mockGetScanSummary.mockClear();
});

afterEach(cleanup);

describe('Insights first scan segment', () => {
  it('renders no segmented control and the three usual cards when there is no scan summary', async () => {
    mockGetScanSummary.mockResolvedValue(null);
    const view = await renderInsights();

    expect(view.queryByRole('tablist')).toBeNull();
    expect(view.queryByLabelText(strings.insights.scanSegmentControlLabel)).toBeNull();

    expect(view.getByText(strings.insights.leaksTitle)).toBeTruthy();
    expect(view.getByText(strings.insights.whereItWentTitle)).toBeTruthy();
    const monthLabel = formatDate(new Date(), { month: 'long' });
    expect(view.getByText(strings.insights.paceTitle(monthLabel))).toBeTruthy();
  });

  it('shows the segmented control, defaults to This month, and switches to First scan with the summary rendered verbatim', async () => {
    const summary = syntheticSummary();
    mockGetScanSummary.mockResolvedValue(summary);
    const view = await renderInsights();

    // Segmented control present, This month selected by default.
    expect(view.getByLabelText(strings.insights.scanSegmentControlLabel)).toBeTruthy();
    expect(view.getByLabelText(selectableLabel(strings.insights.monthSegment, true))).toBeTruthy();
    expect(view.getByLabelText(selectableLabel(strings.insights.scanSegment, false))).toBeTruthy();

    // This month's usual cards still render by default.
    expect(view.getByText(strings.insights.leaksTitle)).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByLabelText(selectableLabel(strings.insights.scanSegment, false)));
    });

    // Dated eyebrow: date revives from the persisted Date and formats correctly.
    const dateLabel = formatDate(CREATED_AT, { month: 'short', day: 'numeric' });
    expect(view.getByText(strings.insights.scanSnapshotEyebrow(dateLabel))).toBeTruthy();

    // Evidence line: file count, window, row count -- all from the summary, nothing invented.
    const windowLabel = `${formatDate(summary.evidence.windowStart!, { month: 'short', day: 'numeric' })} to ${formatDate(
      summary.evidence.windowEnd!,
      { month: 'short', day: 'numeric' }
    )}`;
    expect(
      view.getByText(
        strings.insights.scanEvidenceLine(summary.evidence.fileCount, summary.evidence.rowCount, windowLabel)
      )
    ).toBeTruthy();

    // KPI row numbers, verbatim from summary.kpis (reused KpiRow, no recompute).
    expect(view.getByText(money(summary.kpis.totalSpentCents))).toBeTruthy();
    expect(view.getByText(money(summary.kpis.perDayCents))).toBeTruthy();
    expect(view.getByText(String(summary.kpis.transactionCount))).toBeTruthy();

    // Category rows: name and amount for each.
    for (const category of summary.categories) {
      expect(view.getByLabelText(`${category.name}, ${money(category.totalCents)}`)).toBeTruthy();
    }

    // Top leaks: all 3 synthetic leaks render (under the 5-cap), reliable-rate
    // branch shows the monthly line (30 covered days clears the 14-day floor).
    expect(view.getByText(strings.insights.leakSummary(money(12000), 18))).toBeTruthy();
    expect(view.getByText(strings.insights.leakSummary(money(9000), 6))).toBeTruthy();
    expect(view.getByText(strings.insights.leakSummary(money(1099), 1))).toBeTruthy();
    expect(view.getByText(strings.insights.scanLeaksCaption)).toBeTruthy();

    // Projection: next month total and locked-in caption, both tabular from summary.projection.
    expect(view.getByText(money(summary.projection!.nextMonthCents))).toBeTruthy();
    expect(
      view.getByText(strings.insights.scanProjectionLockedInCaption(money(summary.projection!.lockedInCents)))
    ).toBeTruthy();

    // Until-replaced lifecycle caption (ADR 0020).
    expect(view.getByText(strings.insights.scanUpdatedCaption)).toBeTruthy();
  });

  it('the footer\'s "Run a new scan" action pushes to the leak-scan route (build 12 re-scan entry)', async () => {
    const summary = syntheticSummary();
    mockGetScanSummary.mockResolvedValue(summary);
    const view = await renderInsights();

    await act(async () => {
      fireEvent.press(view.getByLabelText(selectableLabel(strings.insights.scanSegment, false)));
    });

    const rerunButton = view.getByRole('button', { name: strings.insights.scanRerunAction });
    await act(async () => {
      fireEvent.press(rerunButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/leak-scan');
  });

  it('shows the observed-so-far leak line when the scan window is under the reliable-rate floor', async () => {
    const summary = syntheticSummary();
    // A five-day statement: too short a window to extrapolate a month from.
    // The floor is about elapsed time (MIN_SPAN_DAYS_FOR_RATE), so a span of
    // five days cannot carry more than five transacted days either.
    summary.kpis.spanDays = 5;
    summary.kpis.coveredDays = 5;
    mockGetScanSummary.mockResolvedValue(summary);
    const view = await renderInsights();

    await act(async () => {
      fireEvent.press(view.getByLabelText(selectableLabel(strings.insights.scanSegment, false)));
    });

    expect(view.getByText(strings.insights.leakSummaryObserved(money(11000), 18))).toBeTruthy();
    // The extrapolated monthly line must not appear when evidence is thin.
    expect(view.queryByText(strings.insights.leakSummary(money(12000), 18))).toBeNull();
  });

  // UX-073 regression. A long statement whose spending clusters on a handful of
  // days is still a long statement: reliability is a question about how much
  // time the evidence covers, not about how busy the user was inside it. Before
  // the fix this gate read the transacted-day count, so this scan (90 days of
  // history, spending on 5 of them) was wrongly called thin evidence.
  it('keeps the monthly rate line for a long window that is sparsely transacted', async () => {
    const summary = syntheticSummary();
    summary.kpis.spanDays = 90;
    summary.kpis.coveredDays = 5;
    mockGetScanSummary.mockResolvedValue(summary);
    const view = await renderInsights();

    await act(async () => {
      fireEvent.press(view.getByLabelText(selectableLabel(strings.insights.scanSegment, false)));
    });

    expect(view.getByText(strings.insights.leakSummary(money(12000), 18))).toBeTruthy();
    expect(view.queryByText(strings.insights.leakSummaryObserved(money(11000), 18))).toBeNull();
  });
});

// categoryId 'default-3' is Food's id under CategoriesContext's
// initializeDefaultCategories (DEFAULT_CATEGORIES index 3), matching the
// fixture __tests__/moneyHabitsTab.test.tsx uses for the identical leak row.
function habit(status: HabitStatus, overrides: Partial<DetectedHabit> = {}): DetectedHabit {
  return {
    id: 'h1',
    name: 'Coffee Habit',
    description: '$87 on coffee across 5 buys so far',
    categoryId: 'default-3',
    merchantPattern: 'coffee',
    averageAmount: 900,
    frequency: 'daily',
    occurrencesPerPeriod: 1,
    totalMonthlySpend: 4500,
    observedTotal: 8700,
    observedCount: 5,
    spanDays: 39,
    hasReliableRate: true,
    medianAmount: 900,
    minAmount: 400,
    maxAmount: 1200,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status,
    sentiment: 'bad',
    discoveredAt: new Date('2026-08-04T12:00:00Z'),
    ...overrides,
  };
}

describe('Insights leaks card: free-tier paywall gate', () => {
  // U12b: pins this call site's placement value (habit_gate_insights), one of
  // five habit-gate placements that used to share the bare 'habit_gate'
  // string (utils/analytics.ts PaywallPlacement).
  it('at the free habit limit, the gate CTA routes to the insights placement', async () => {
    mockGetScanSummary.mockResolvedValue(null);
    const active = habit('changing', { id: 'h-active', name: 'Rideshare Habit' });
    const discovered = habit('discovered', { id: 'h-discovered', name: 'Coffee Habit' });
    await saveHabits([active, discovered]);

    const view = await renderInsights();

    const breakButton = view.getByRole('button', {
      name: `${strings.insights.leakActionBreak}, Coffee Habit`,
    });
    await act(async () => {
      fireEvent.press(breakButton);
    });

    expect(view.getByText(strings.habitLogging.gateTitle)).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByText(strings.habitLogging.gateUpgradeCta));
    });

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=habit_gate_insights');
  });
});
