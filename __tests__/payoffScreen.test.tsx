/**
 * The payoff (PRD v3.1 sect 7.5, phase 4; revives the screen ADR 0020 retired,
 * per ADR 0026).
 *
 * The revival is earned by carrying the user's real history, so these tests
 * pin what makes it honest: every figure is observed rather than extrapolated,
 * and the kept band shows the user's true zero instead of celebrating a total
 * nobody has earned yet.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { PayoffScreen } from '@/components/leak-scan/PayoffScreen';
import { strings } from '@/constants/strings';
import type { DetectedHabit } from '@/types/habit';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function habit(overrides: Partial<DetectedHabit> = {}): DetectedHabit {
  return {
    id: 'scan-habit-starbucks',
    name: 'Starbucks',
    description: '',
    categoryId: 'Food',
    merchantPattern: 'starbucks',
    averageAmount: 600,
    frequency: 'weekly',
    occurrencesPerPeriod: 3,
    totalMonthlySpend: 7200,
    observedTotal: 8400,
    observedCount: 14,
    spanDays: 87,
    hasReliableRate: true,
    medianAmount: 600,
    minAmount: 600,
    maxAmount: 600,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status: 'changing',
    sentiment: 'neutral',
    discoveredAt: new Date('2026-08-14T00:00:00.000Z'),
    ...overrides,
  };
}

async function renderPayoff(overrides: Partial<React.ComponentProps<typeof PayoffScreen>> = {}) {
  const props = { habit: habit(), onContinue: jest.fn(), ...overrides };
  // RTL v14: render() is itself async (matches resultsScreenLadder.test.tsx).
  const view = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <LocaleProvider>
          <CurrencyProvider>
            <PayoffScreen {...props} />
          </CurrencyProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  await act(async () => {});
  return { view, props };
}

afterEach(cleanup);

describe('payoff screen', () => {
  it('states the real history the PRD asks for', async () => {
    const { view } = await renderPayoff();

    // "Starbucks, 14 times, $84.00 in your statement. Skip it once and $6.00
    // comes back." Count, total, and per-buy price: all observed.
    expect(
      view.getByText(strings.leakScan.payoffEvidence('Starbucks', 14, '$84.00', '$6.00'))
    ).toBeTruthy();
  });

  it('shows the user their own zero, not an invented total', async () => {
    const { view } = await renderPayoff();

    // The honest-zero rule (ADR 0022): the only accumulated total this app
    // renders is one the user earned, and at this moment that is nothing.
    expect(view.getByText('$0.00')).toBeTruthy();
    expect(view.getByText(strings.habitLogging.keptZeroCaption)).toBeTruthy();
  });

  it('claims no monthly rate, so a short statement cannot make it lie', async () => {
    // A two-week window: the UX-073 class of error is about extrapolating a
    // month from a window that cannot support one. This screen never does.
    const { view } = await renderPayoff({
      habit: habit({ spanDays: 14, hasReliableRate: false, observedCount: 4, observedTotal: 2400 }),
    });

    expect(
      view.getByText(strings.leakScan.payoffEvidence('Starbucks', 4, '$24.00', '$6.00'))
    ).toBeTruthy();
    expect(view.queryByText(/a month/)).toBeNull();
  });

  it('reads a single occurrence without mangling the grammar', async () => {
    const { view } = await renderPayoff({
      habit: habit({ observedCount: 1, observedTotal: 600 }),
    });

    expect(view.getByText(/1 time,/)).toBeTruthy();
    expect(view.queryByText(/1 times,/)).toBeNull();
  });

  it('continues forward', async () => {
    const { view, props } = await renderPayoff();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.payoffContinue }));
    });

    expect(props.onContinue).toHaveBeenCalledTimes(1);
  });
});
