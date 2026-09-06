/**
 * Insights "Leak finder" segment (W5, OB-6 Insights half, ADR 0020: summary
 * shown until replaced, no expiry; decision 0009: the scan itself is dormant
 * behind SCAN_FLOW_ENABLED and the segment carries a coming soon teaser).
 *
 * Three things pinned here:
 * - No persisted ScanSummary: the segmented control is always present
 *   (empty-state unification pass), defaulting to This month with its usual
 *   cards; switching to Leak finder shows the teaser, whose CTA records
 *   co-build interest on device rather than opening a flow that is walled off.
 * - The opt-in survives: a stored interest record renders the confirmed state
 *   on mount with no CTA, and a double tap reports once.
 * - A persisted ScanSummary: the segmented control appears, defaults to This
 *   month, and switching to Leak finder renders the summary verbatim (dated
 *   eyebrow, KPI numbers, category rows, capped leaks with the evidence-
 *   honesty branching) with the dormant-flow footer.
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
// insights_month's empty CTA (handleMonthEmptyLog, app/(tabs)/insights.tsx)
// routes through router.navigate, same as insights_leaks' existing
// handleEmptyLog; previously unexercised in this file since no test pressed
// either CTA.
const mockNavigate = jest.fn();
jest.mock('expo-router', () => {
  const react = require('react');
  return {
    useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
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
// The leak finder opt-in (decision 0009) rides the same seam: only these two
// reads are overridden, so every context in the tree still goes through the
// real storage layer over mocked AsyncStorage.
const mockGetLeakFinderInterest = jest.fn();
const mockSaveLeakFinderInterest = jest.fn();
jest.mock('@/utils/storage', () => {
  const actual = jest.requireActual('@/utils/storage');
  return {
    ...actual,
    getScanSummary: (...args: unknown[]) => mockGetScanSummary(...args),
    getLeakFinderInterest: (...args: unknown[]) => mockGetLeakFinderInterest(...args),
    saveLeakFinderInterest: (...args: unknown[]) => mockSaveLeakFinderInterest(...args),
  };
});

const mockTrack = jest.fn();
jest.mock('@/utils/analytics', () => {
  const actual = jest.requireActual('@/utils/analytics');
  return { ...actual, track: (...args: unknown[]) => mockTrack(...args) };
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
import { saveExpenses, saveHabits } from '@/utils/storage';
import type { ScanSummary } from '@/types/scanSummary';
import type { DetectedHabit, HabitStatus } from '@/types/habit';
import type { Expense } from '@/types/expense';

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

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    title: 'Coffee',
    amount: 500,
    category: 'Food',
    date: new Date(),
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'green',
    ...overrides,
  };
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

// The segment's spoken label carries the coming soon badge (decision 0009),
// so every query for it goes through this rather than the bare label.
function scanSegmentLabel(selected: boolean): string {
  return selectableLabel(
    `${strings.insights.scanSegment}, ${strings.insights.scanSegmentBadgeSpoken}`,
    selected
  );
}

beforeEach(() => {
  mockPush.mockClear();
  mockNavigate.mockClear();
  mockGetScanSummary.mockClear();
  mockTrack.mockClear();
  mockSaveLeakFinderInterest.mockClear();
  mockSaveLeakFinderInterest.mockResolvedValue(undefined);
  mockGetLeakFinderInterest.mockClear();
  // Not opted in unless a test says otherwise.
  mockGetLeakFinderInterest.mockResolvedValue(null);
});

afterEach(cleanup);

describe('Insights leak finder segment', () => {
  it('shows the segmented control and the three usual cards when there is no scan summary', async () => {
    mockGetScanSummary.mockResolvedValue(null);
    // This month needs at least one expense to clear monthHasData and render
    // the three-card stack instead of its own fill empty state; that gate is
    // this test's own scope in the "This month segment" describe below.
    await saveExpenses([expense()]);
    const view = await renderInsights();

    // The control is always present now, even before any scan exists (empty-
    // state unification pass): First scan is a real destination with its own
    // fill empty state, not a segment that only appears once earned.
    expect(view.getByLabelText(strings.insights.scanSegmentControlLabel)).toBeTruthy();
    expect(view.getByLabelText(selectableLabel(strings.insights.monthSegment, true))).toBeTruthy();
    expect(view.getByLabelText(scanSegmentLabel(false))).toBeTruthy();

    expect(view.getByText(strings.insights.leaksTitle)).toBeTruthy();
    expect(view.getByText(strings.insights.whereItWentTitle)).toBeTruthy();
    const monthLabel = formatDate(new Date(), { month: 'long' });
    expect(view.getByText(strings.insights.paceTitle(monthLabel))).toBeTruthy();
  });

  it('the segment is labelled Leak finder and carries the coming soon badge', async () => {
    mockGetScanSummary.mockResolvedValue(null);
    const view = await renderInsights();

    expect(view.getByText(strings.insights.scanSegment)).toBeTruthy();
    // The pill is deliberately hidden from assistive tech (its meaning rides
    // in the tab's own spoken label, so VoiceOver hears "Leak finder, coming
    // soon, not selected" rather than stopping on it twice), which is why the
    // visible word needs includeHiddenElements to be found at all.
    expect(
      view.getByText(strings.insights.scanSegmentBadge, { includeHiddenElements: true })
    ).toBeTruthy();
    expect(view.getByLabelText(scanSegmentLabel(false))).toBeTruthy();
  });

  it('pre-scan, selecting Leak finder shows the coming soon teaser and no scan CTA', async () => {
    mockGetScanSummary.mockResolvedValue(null);
    const view = await renderInsights();

    await act(async () => {
      fireEvent.press(view.getByLabelText(scanSegmentLabel(false)));
    });

    // The hook survives the rework unchanged: the promise is the same, only
    // the timing moved.
    expect(view.getByText(strings.insights.scanEmptyTitle)).toBeTruthy();
    expect(view.getByText(strings.insights.leakFinderBody)).toBeTruthy();
    expect(view.getByText(strings.insights.leakFinderReward)).toBeTruthy();
    expect(view.getByRole('button', { name: strings.insights.leakFinderCta })).toBeTruthy();

    // The old scan CTA is gone with the flow it opened; nothing offers a route
    // that now redirects straight back to this tab.
    expect(view.queryByText(strings.insights.scanEmptyCta)).toBeNull();
    expect(mockPush).not.toHaveBeenCalledWith('/leak-scan');
  });

  it('recording interest persists it, reports it once, and flips to the confirmed state', async () => {
    mockGetScanSummary.mockResolvedValue(null);
    const view = await renderInsights();

    await act(async () => {
      fireEvent.press(view.getByLabelText(scanSegmentLabel(false)));
    });

    const cta = view.getByRole('button', { name: strings.insights.leakFinderCta });
    // Two presses in one tick: the in-flight guard has to hold, or a fast
    // double tap would double-count the research signal.
    await act(async () => {
      fireEvent.press(cta);
      fireEvent.press(cta);
    });

    expect(mockSaveLeakFinderInterest).toHaveBeenCalledTimes(1);
    // Counted by name: other events fire on this screen for their own reasons,
    // and the property under test is that the research signal is one per
    // person, not that nothing else was reported.
    const interestCalls = mockTrack.mock.calls.filter(
      ([event]) => event === 'leak_finder_interest_recorded'
    );
    expect(interestCalls).toEqual([['leak_finder_interest_recorded', {}]]);

    expect(view.getByText(strings.insights.leakFinderConfirmedTitle)).toBeTruthy();
    expect(view.getByText(strings.insights.leakFinderConfirmedBody)).toBeTruthy();
    expect(view.queryByText(strings.insights.leakFinderCta)).toBeNull();
    // The invitation goes with the CTA. Leaving it up would ask someone who
    // just joined to join again, and it is the receipt that carries the offer
    // from here on.
    expect(view.queryByText(strings.insights.leakFinderReward)).toBeNull();
  });

  it('a stored opt-in renders confirmed on mount, so the ask is never repeated', async () => {
    mockGetScanSummary.mockResolvedValue(null);
    mockGetLeakFinderInterest.mockResolvedValue({ recordedAt: new Date('2026-09-05T10:00:00.000Z') });
    const view = await renderInsights();

    await act(async () => {
      fireEvent.press(view.getByLabelText(scanSegmentLabel(false)));
    });

    // What a returning user reads: that they are in, and what they are owed.
    expect(view.getByText(strings.insights.leakFinderConfirmedTitle)).toBeTruthy();
    expect(view.getByText(strings.insights.leakFinderConfirmedBody)).toBeTruthy();
    expect(view.queryByText(strings.insights.leakFinderCta)).toBeNull();
    expect(view.queryByText(strings.insights.leakFinderReward)).toBeNull();
    // Reading a stored opt-in is not a new one.
    expect(mockTrack).not.toHaveBeenCalledWith('leak_finder_interest_recorded', {});
  });

  it('shows the segmented control, defaults to This month, and switches to Leak finder with the summary rendered verbatim', async () => {
    const summary = syntheticSummary();
    mockGetScanSummary.mockResolvedValue(summary);
    // This month needs data to clear monthHasData; see the note above.
    await saveExpenses([expense()]);
    const view = await renderInsights();

    // Segmented control present, This month selected by default.
    expect(view.getByLabelText(strings.insights.scanSegmentControlLabel)).toBeTruthy();
    expect(view.getByLabelText(selectableLabel(strings.insights.monthSegment, true))).toBeTruthy();
    expect(view.getByLabelText(scanSegmentLabel(false))).toBeTruthy();

    // This month's usual cards still render by default.
    expect(view.getByText(strings.insights.leaksTitle)).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByLabelText(scanSegmentLabel(false)));
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

    // Dormant-flow footer (decision 0009): the figures are still the user's,
    // so they stay; "updated when you run a new scan" would not be true while
    // there is no new scan to run.
    expect(view.getByText(strings.insights.scanSavedCaption)).toBeTruthy();
    expect(view.queryByText(strings.insights.scanUpdatedCaption)).toBeNull();
  });

  // Build 12's re-scan entry is gated, not deleted: with the flow dormant the
  // route redirects to this very tab, so a visible button would do nothing.
  it('offers no re-scan action while the scan flow is dormant', async () => {
    const summary = syntheticSummary();
    mockGetScanSummary.mockResolvedValue(summary);
    const view = await renderInsights();

    await act(async () => {
      fireEvent.press(view.getByLabelText(scanSegmentLabel(false)));
    });

    expect(view.queryByText(strings.insights.scanRerunAction)).toBeNull();
    expect(mockPush).not.toHaveBeenCalledWith('/leak-scan');
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
      fireEvent.press(view.getByLabelText(scanSegmentLabel(false)));
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
      fireEvent.press(view.getByLabelText(scanSegmentLabel(false)));
    });

    expect(view.getByText(strings.insights.leakSummary(money(12000), 18))).toBeTruthy();
    expect(view.queryByText(strings.insights.leakSummaryObserved(money(11000), 18))).toBeNull();
  });
});

// Empty-state unification pass (design/empty-state-unification): This
// month's true zero state (no expenses AND no leak rows) replaces the
// three-card stack (LeaksCard / WhereItWentCard / PaceCard) with a single
// fill EmptyState, rather than showing three empty cards stacked on top of
// each other.
describe('Insights This month segment: true zero state', () => {
  it('shows the fill empty state and none of the three cards when there is no data at all', async () => {
    mockGetScanSummary.mockResolvedValue(null);
    // AsyncStorage is not cleared between tests in this file (matches this
    // file's existing convention); reset both sources monthHasData reads
    // explicitly so this test does not depend on run order.
    await saveExpenses([]);
    await saveHabits([]);
    const view = await renderInsights();

    expect(view.getByText(strings.insights.monthEmptyTitle)).toBeTruthy();
    // One hook line, no body (ADR 0037).
    expect(view.queryByText(strings.insights.monthEmptyBody)).toBeNull();
    expect(view.queryByText(strings.insights.leaksTitle)).toBeNull();
    expect(view.queryByText(strings.insights.whereItWentTitle)).toBeNull();
    const monthLabel = formatDate(new Date(), { month: 'long' });
    expect(view.queryByText(strings.insights.paceTitle(monthLabel))).toBeNull();
  });

  it('returns the three-card stack once a single expense exists', async () => {
    mockGetScanSummary.mockResolvedValue(null);
    await saveExpenses([expense()]);
    const view = await renderInsights();

    expect(view.queryByText(strings.insights.monthEmptyTitle)).toBeNull();
    expect(view.getByText(strings.insights.leaksTitle)).toBeTruthy();
    expect(view.getByText(strings.insights.whereItWentTitle)).toBeTruthy();
    const monthLabel = formatDate(new Date(), { month: 'long' });
    expect(view.getByText(strings.insights.paceTitle(monthLabel))).toBeTruthy();
  });

  it("the fill empty state's CTA navigates to Today's log sheet", async () => {
    mockGetScanSummary.mockResolvedValue(null);
    await saveExpenses([]);
    await saveHabits([]);
    const view = await renderInsights();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.insights.monthEmptyCta }));
    });

    // Same destination as insights_leaks' existing handleEmptyLog.
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)?view=spent&sheet=log');
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
