/**
 * Pick-one sheet render tests (device feedback 2026-08-04). This sheet had zero
 * coverage, and both bugs Charen hit on device live in what it renders: a
 * fabricated monthly line for a leak seen for one afternoon, and a gated state
 * that showed a live keypad above a dead button with no price anywhere.
 *
 * Provider wiring mirrors __tests__/logExpenseSheet.test.tsx.
 */
// Full-provider renders exceed jest's 5s default under CI worker load.
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ToastProvider } from '@/components/ui/Toast';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { strings } from '@/constants/strings';
import type { DetectedHabit } from '@/types/habit';

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

/** Charen's Pizzahut cluster: $22, $12, $4, $5, $44 in one afternoon. */
function thinHabit(overrides: Partial<DetectedHabit> = {}): DetectedHabit {
  return {
    id: 'h1',
    name: 'Pizzahut Spending',
    description: '$87 on pizzahut across 5 buys so far',
    categoryId: 'food',
    merchantPattern: 'pizzahut',
    averageAmount: 1740,
    frequency: 'daily',
    occurrencesPerPeriod: 1,
    totalMonthlySpend: 52200,
    observedTotal: 8700,
    observedCount: 5,
    spanDays: 0,
    hasReliableRate: false,
    medianAmount: 1200,
    minAmount: 400,
    maxAmount: 4400,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status: 'discovered',
    sentiment: 'bad',
    discoveredAt: new Date('2026-08-04T12:00:00Z'),
    ...overrides,
  };
}

const noop = () => {};

async function renderSheet(props: Partial<React.ComponentProps<typeof PickOneSheet>> = {}) {
  const habit = props.habit ?? thinHabit();
  // Awaited on purpose: a second Sheet mount in the same file renders null
  // without the microtask this yields (same pattern as settingsSheet.test.tsx).
  const view = await render(
    <Providers>
      <PickOneSheet
        visible
        habit={habit}
        monthTotal={habit?.totalMonthlySpend ?? 0}
        occurrences={habit?.occurrencesPerPeriod ?? 0}
        onCancel={noop}
        onStart={noop}
        {...props}
      />
    </Providers>
  );
  // Flush the sheet's enter animation.
  await act(async () => {});
  return view;
}

afterEach(cleanup);

describe('PickOneSheet evidence', () => {
  it('states what was observed and never a monthly rate under a thin span', async () => {
    const view = await renderSheet();

    expect(view.getByText('$87.00 at Pizzahut Spending across 5 buys.')).toBeTruthy();
    expect(view.getByText(strings.habitLogging.leakEvidenceKeepLogging)).toBeTruthy();
    // The $522 line Charen saw on device.
    expect(view.queryByText(/522/)).toBeNull();
    expect(view.queryByText(/a month/)).toBeNull();
    expect(view.queryByText(/1 time/)).toBeNull();
  });

  it('states the monthly rate once the span supports one', async () => {
    const view = await renderSheet({
      habit: thinHabit({
        totalMonthlySpend: 15000,
        observedTotal: 20000,
        observedCount: 40,
        spanDays: 39,
        hasReliableRate: true,
      }),
    });

    expect(
      view.getByText('Pizzahut Spending costs you about $150.00 a month. You bought it 40 times in the last 3 months.')
    ).toBeTruthy();
    expect(view.queryByText(strings.habitLogging.leakEvidenceKeepLogging)).toBeNull();
  });
});

describe('PickOneSheet ungated', () => {
  it('prefills the median buy, not the average, and explains the range', async () => {
    const view = await renderSheet();

    // Median $12.00, not the $17.40 average one $44 order pulls it up to.
    expect(view.getByLabelText('One skip keeps, $12.00')).toBeTruthy();
    expect(view.getByText('Your buys ranged $4.00 to $44.00.')).toBeTruthy();
  });

  it('keeps the native amount field and the real primary action', async () => {
    const view = await renderSheet();

    expect(view.getByLabelText(/^One skip keeps,/)).toBeTruthy();
    expect(view.getByText(strings.habitLogging.pickOneCadenceNoteDaily)).toBeTruthy();
    const start = view.getByRole('button', { name: strings.habitLogging.startBreakingIt });
    expect(start.props.accessibilityState?.disabled).toBeFalsy();
    expect(start.props.accessibilityHint).toBeUndefined();
    expect(view.getByRole('button', { name: strings.habitLogging.notThisOne })).toBeTruthy();
  });

  // UX-051: a $0.00 start would set "one skip keeps $0.00" with no warning,
  // silently zeroing out every future skip on this habit (see PickOneSheet's
  // handleStart doc comment). Disabled-until-valid (ops ADR 0028, 2026-08-16):
  // Start is disabled at zero rather than live-and-toasting.
  it('disables Start at a zero amount, then starts on press once it is nonzero', async () => {
    const onStart = jest.fn();
    const view = await renderSheet({ onStart });

    await act(async () => {
      fireEvent.changeText(view.getByLabelText(/^One skip keeps,/), '0');
    });

    const disabledStart = view.getByRole('button', { name: strings.habitLogging.startBreakingIt });
    expect(disabledStart.props.accessibilityState?.disabled).toBe(true);
    expect(disabledStart.props.accessibilityHint).toBe(strings.sheets.saveHintAmount);

    // A press on a disabled Button never reaches onPress (Button.tsx passes
    // `disabled` straight to Pressable), so this pins that the control itself
    // blocks the start, not just that nobody happened to press it.
    await act(async () => {
      fireEvent.press(disabledStart);
    });
    expect(onStart).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.changeText(view.getByLabelText(/^One skip keeps,/), '5');
    });

    const enabledStart = view.getByRole('button', { name: strings.habitLogging.startBreakingIt });
    expect(enabledStart.props.accessibilityState?.disabled).toBe(false);
    expect(enabledStart.props.accessibilityHint).toBeUndefined();

    await act(async () => {
      fireEvent.press(enabledStart);
    });
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

describe('PickOneSheet gated (free tier)', () => {
  it('drops the amount, the keypad and the daily-question note', async () => {
    const view = await renderSheet({ freeTierBlocked: true, onStartTrial: noop });

    expect(view.queryByLabelText('5')).toBeNull();
    expect(view.queryByLabelText(/^One skip keeps,/)).toBeNull();
    expect(view.queryByText(strings.habitLogging.pickOneCadenceNoteDaily)).toBeNull();
    expect(view.queryByText(strings.habitLogging.pickOneValueLine)).toBeNull();
  });

  it('names the situation, shows the price, and keeps the honesty note', async () => {
    const view = await renderSheet({ freeTierBlocked: true, onStartTrial: noop });

    expect(view.getByText(strings.habitLogging.gateTitle)).toBeTruthy();
    expect(view.getByText(/\$3\.99 a month/)).toBeTruthy();
    expect(view.getByText(strings.paywall.plannedBanner)).toBeTruthy();
    // The leak itself is still on screen: the user sees what they would break.
    expect(view.getByText('$87.00 at Pizzahut Spending across 5 buys.')).toBeTruthy();
  });

  it('offers an enabled upgrade CTA and a neutral exit', async () => {
    const onStartTrial = jest.fn();
    const onCancel = jest.fn();
    const view = await renderSheet({ freeTierBlocked: true, onStartTrial, onCancel });

    const upgrade = view.getByRole('button', { name: strings.habitLogging.gateUpgradeCta });
    expect(upgrade.props.accessibilityState?.disabled).toBeFalsy();
    await act(async () => {
      fireEvent.press(upgrade);
    });
    expect(onStartTrial).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitLogging.gateMaybeLater }));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    // "Not this one" read as rejecting the leak forever; it is gone from here.
    expect(view.queryByText(strings.habitLogging.notThisOne)).toBeNull();
    expect(view.queryByText(strings.habitLogging.startBreakingIt)).toBeNull();
  });
});
