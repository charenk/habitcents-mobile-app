/**
 * Results screen finding-first ladder (ADR 0020, W4 onboarding redesign,
 * Charen 2026-08-04). Pins the ratified shape: the results screen leads with
 * one BiggestLeakCard before the dashboard, the dashboard stays collapsed
 * behind a dashed expander until tapped, the ranked-leaks list below caps at
 * 5, and the post-scan CTA reads "Bring in your last 30 days".
 *
 * ScanResult fixtures are literal objects (not run through the real CSV
 * pipeline): resultsSummary/spendPulse/projection builders all degrade
 * gracefully on empty rows/files/coverage (verified by reading their source),
 * so a literal `habits` array is enough to drive the ladder deterministically
 * without coupling this suite to pipeline internals owned by
 * fix/leak-scan-quality.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ResultsScreen } from '@/components/leak-scan/ResultsScreen';
import { strings } from '@/constants/strings';
import type { HabitCandidate, ScanResult } from '@/utils/leakScan/types';

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
            <ExpensesProvider>
              {/* ResultsScreen calls useCompleteScanOnboarding (PR #59), so the
                  provider joined the wrapper at the merge. */}
              <OnboardingProvider>
                <HabitsProvider>{children}</HabitsProvider>
              </OnboardingProvider>
            </ExpensesProvider>
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function makeCandidate(overrides: Partial<HabitCandidate> = {}): HabitCandidate {
  return {
    merchantStem: 'merchant',
    merchantDisplay: 'Merchant',
    category: 'Food',
    governClass: 'govern',
    tier: 'solid',
    occurrences: 5,
    activeDays: 5,
    // 30-day coverage below, so totalCents already reads as the monthly cost.
    totalCents: 5000,
    annualizedLeakCents: 60000,
    rankScore: 60000,
    topMerchants: ['Merchant'],
    ...overrides,
  };
}

function makeScanResult(habits: HabitCandidate[], overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    importId: 'imp-1',
    status: 'ok',
    files: [],
    rows: [],
    questions: [],
    transfers: [],
    refunds: [],
    duplicatesMerged: 0,
    recurring: [],
    habits,
    coverage: { startISO: '2026-01-01', endISO: '2026-01-30', spanDays: 30, coveredDays: 30 },
    tier: 'solid',
    gracefulFailure: false,
    ...overrides,
  };
}

function makeNeedsReviewRow(): ScanResult['rows'][number] {
  return {
    id: 'r-nr-1',
    dateISO: '2026-01-02',
    date: new Date('2026-01-02'),
    amountCents: -1500,
    rawDescription: 'Mystery Merchant',
    merchantStem: 'mystery',
    merchantDisplay: 'Mystery Merchant',
    category: 'Other',
    categoryTier: 'needs-review',
    rowClass: 'spend',
    account: 'A',
    pending: false,
    foreign: false,
    internal: false,
    reversed: false,
    needsReview: true,
    hash: 'h-nr-1',
  };
}

async function renderResults(result: ScanResult) {
  // RTL v14: render() is itself async (matches __tests__/pickOneSheet.test.tsx).
  const view = await render(
    <Providers>
      <ResultsScreen result={result} files={[]} />
    </Providers>
  );
  // Flush the providers' passive storage-load effects (rules, expenses, habits).
  await act(async () => {});
  return view;
}

afterEach(cleanup);

describe('results screen: finding-first ladder (ADR 0020)', () => {
  it('leads with the top-ranked candidate and excludes it from the ranked list below', async () => {
    const top = makeCandidate({ merchantStem: 'costco', merchantDisplay: 'Costco', totalCents: 9000 });
    const second = makeCandidate({ merchantStem: 'netflix', merchantDisplay: 'Netflix', totalCents: 7000 });
    const third = makeCandidate({ merchantStem: 'uber', merchantDisplay: 'Uber', totalCents: 5000 });
    const result = makeScanResult([top, second, third]);

    const view = await renderResults(result);

    // Biggest-leak card: eyebrow, serif name with a trailing period, Break it
    // / Not this one (the exact habit-logging vocabulary, not "Track this
    // leak"/"Not a habit").
    expect(view.getByText(strings.leakScan.biggestLeakEyebrow)).toBeTruthy();
    expect(view.getByText('Costco.')).toBeTruthy();
    expect(view.getByRole('button', { name: strings.habitLogging.breakIt })).toBeTruthy();
    expect(view.getByRole('button', { name: strings.habitLogging.notThisOne })).toBeTruthy();

    // Expand to see the ranked list.
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.seeFullPicture }));
    });

    // Netflix and Uber are in the ranked list (their own HabitCard "Track
    // this leak" CTA); Costco is not repeated there.
    expect(view.getByText('Netflix')).toBeTruthy();
    expect(view.getByText('Uber')).toBeTruthy();
    expect(view.queryByText('Costco')).toBeNull();
    expect(view.getAllByRole('button', { name: strings.leakScan.trackThisLeak })).toHaveLength(2);
  });

  it('falls back to the pre-W4 order when there are zero candidates', async () => {
    const result = makeScanResult([]);

    const view = await renderResults(result);

    // No finding to lead with: no card, no dashed expander, and the
    // dashboard (KpiRow's "Total spent") is visible immediately, uncollapsed.
    expect(view.queryByText(strings.leakScan.biggestLeakEyebrow)).toBeNull();
    expect(view.queryByText(strings.leakScan.seeFullPicture)).toBeNull();
    expect(view.getByText(strings.leakScan.kpiTotalSpent)).toBeTruthy();
  });

  it('keeps the dashboard collapsed until the dashed expander is tapped', async () => {
    const result = makeScanResult([makeCandidate()]);

    const view = await renderResults(result);

    const expander = view.getByRole('button', { name: strings.leakScan.seeFullPicture });
    expect(expander.props.accessibilityState?.expanded).toBe(false);
    // Collapsed: the dashboard's KpiRow has not mounted.
    expect(view.queryByText(strings.leakScan.kpiTotalSpent)).toBeNull();

    await act(async () => {
      fireEvent.press(expander);
    });

    expect(view.getByText(strings.leakScan.kpiTotalSpent)).toBeTruthy();
    expect(expander.props.accessibilityState?.expanded).toBe(true);
  });

  it('keeps the review-queue banner above the fold while the ladder is collapsed', async () => {
    // Honesty surface rule (independents review): the banner qualifies every
    // number on screen, including the biggest-leak card's evidence, so it must
    // not sit behind the expander.
    const result = makeScanResult([makeCandidate()], { rows: [makeNeedsReviewRow()] });

    const view = await renderResults(result);

    expect(view.getByText(strings.leakScan.reviewQueueTitle(1))).toBeTruthy();
    // And the ladder is still collapsed: the banner did not drag the dashboard out.
    expect(view.queryByText(strings.leakScan.kpiTotalSpent)).toBeNull();
  });

  it('caps the ranked list at 5 for a 7-candidate synthetic result', async () => {
    // M1 (highest totalCents) leads as the card; M2..M7 remain. Sorted by
    // monthly cost descending, M7 (lowest) is the one dropped by the cap.
    const candidates = Array.from({ length: 7 }, (_, i) =>
      makeCandidate({
        merchantStem: `m${i + 1}`,
        merchantDisplay: `M${i + 1}`,
        totalCents: (7 - i) * 1000, // M1: 7000 ... M7: 1000
      })
    );
    const result = makeScanResult(candidates);

    const view = await renderResults(result);
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.seeFullPicture }));
    });

    // Card: M1. List: M2-M6 (5, the cap). Dropped entirely: M7.
    expect(view.getByText('M1.')).toBeTruthy();
    for (const name of ['M2', 'M3', 'M4', 'M5', 'M6']) {
      expect(view.getByText(name)).toBeTruthy();
    }
    expect(view.queryByText('M7')).toBeNull();
    expect(view.getAllByRole('button', { name: strings.leakScan.trackThisLeak })).toHaveLength(5);
  });

  it('shows the 30-day import as the primary CTA', async () => {
    const result = makeScanResult([makeCandidate()]);

    const view = await renderResults(result);

    expect(view.getByText(strings.leakScan.bringInLastDays(30))).toBeTruthy();
    expect(view.queryByText(/last 15 days/)).toBeNull();
  });

  it('wires Break it on the biggest-leak card to the exact existing pick-one flow', async () => {
    const result = makeScanResult([makeCandidate({ merchantDisplay: 'Costco', merchantStem: 'costco' })]);

    const view = await renderResults(result);

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitLogging.breakIt }));
    });

    // Same Decision-1 sheet "Track this leak" opens elsewhere in the app.
    expect(view.getByText(strings.habitLogging.startBreakingIt)).toBeTruthy();
  });

  // A fixed-class candidate is a commitment: rent, a mortgage, insurance, a car
  // payment. The ranked list has always rendered those as a no-CTA tip card,
  // but the hero path did not, so the priciest row won the lead slot on cost
  // alone. Against a real statement that row was $1,200-a-month rent, and the
  // app invited the user to break it. Tracking an essential is fine; proposing
  // you skip it is not.
  it('never leads with a fixed-class candidate, however expensive', async () => {
    const result = makeScanResult([
      makeCandidate({
        merchantDisplay: 'Park Property Management',
        merchantStem: 'park',
        category: 'Mortgage',
        governClass: 'fixed',
        totalCents: 120000, // dwarfs the coffee habit below
        occurrences: 1,
        activeDays: 1,
      }),
      makeCandidate({ merchantDisplay: 'Starbucks', merchantStem: 'starbucks', totalCents: 5000 }),
    ]);

    const view = await renderResults(result);

    // The coffee habit leads, not the rent.
    expect(view.getByText(strings.leakScan.biggestLeakEyebrow)).toBeTruthy();
    expect(view.getByText('Starbucks.')).toBeTruthy();
    expect(view.queryByText('Park Property Management.')).toBeNull();

    // Exactly one Break it on the screen, and it belongs to the coffee habit.
    expect(view.getAllByRole('button', { name: strings.habitLogging.breakIt })).toHaveLength(1);
  });

  // Passing over the rent must not delete it: it still belongs in the ladder,
  // as the tip card its class has always rendered.
  it('keeps the passed-over fixed candidate in the ranked list below', async () => {
    const result = makeScanResult([
      makeCandidate({
        merchantDisplay: 'Park Property Management',
        merchantStem: 'park',
        category: 'Mortgage',
        governClass: 'fixed',
        totalCents: 120000,
      }),
      makeCandidate({ merchantDisplay: 'Starbucks', merchantStem: 'starbucks', totalCents: 5000 }),
    ]);

    const view = await renderResults(result);

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.seeFullPicture }));
    });

    expect(view.getByText('Park Property Management')).toBeTruthy();
    // Its class carries no tracking CTA, so the count is still the hero's one.
    expect(view.getAllByRole('button', { name: strings.habitLogging.breakIt })).toHaveLength(1);
    expect(view.queryByRole('button', { name: strings.leakScan.trackThisLeak })).toBeNull();
  });

  // When every candidate is a commitment there is no leak to lead with, which
  // is the existing zero-finding path: no hero, no Break it, full list below.
  it('shows no hero when every candidate is fixed-class', async () => {
    const result = makeScanResult([
      makeCandidate({
        merchantDisplay: 'Park Property Management',
        merchantStem: 'park',
        category: 'Mortgage',
        governClass: 'fixed',
        totalCents: 120000,
      }),
    ]);

    const view = await renderResults(result);

    expect(view.queryByText(strings.leakScan.biggestLeakEyebrow)).toBeNull();
    expect(view.queryByRole('button', { name: strings.habitLogging.breakIt })).toBeNull();
  });
});
