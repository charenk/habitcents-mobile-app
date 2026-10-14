/**
 * BreakHabitSheet's gated state only (gating audit backlog, 2026-08-11): the
 * free-tier upsell pitch used to render unconditionally whenever
 * freeTierBlocked was true, which is wrong for a premium user already at the
 * real 5-habit ceiling (reachable here via restart-onboarding). `entitlement`
 * picks between the free-tier pitch and the honest ceiling copy, mirroring
 * PickOneSheet's identical fix (__tests__/pickOneSheet.test.tsx).
 *
 * The ungated flow (chip pick, amount, cadence, bought-today) has no existing
 * coverage; adding it is a separate, larger unit of work and out of scope
 * here.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { BreakHabitSheet } from '@/components/onboarding/BreakHabitSheet';
import { strings } from '@/constants/strings';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const noop = () => {};

async function renderSheet(props: Partial<React.ComponentProps<typeof BreakHabitSheet>> = {}) {
  const view = await render(
    <Providers>
      <BreakHabitSheet visible onClose={noop} onStart={noop} freeTierBlocked {...props} />
    </Providers>
  );
  await act(async () => {});
  return view;
}

afterEach(cleanup);

describe('BreakHabitSheet gated (free tier)', () => {
  it('shows the free-tier pitch and price when entitlement is free (or omitted)', async () => {
    const view = await renderSheet({ entitlement: 'free', onStartTrial: noop });

    expect(view.getByText(strings.habitLogging.gateTitle)).toBeTruthy();
    expect(view.getByText(/\$3\.99 a month/)).toBeTruthy();
    expect(view.getByText(strings.paywall.plannedBanner)).toBeTruthy();
    expect(view.getByRole('button', { name: strings.habitLogging.gateUpgradeCta })).toBeTruthy();
  });

  it('drops the chip/amount/cadence fields entirely', async () => {
    const view = await renderSheet({ entitlement: 'free', onStartTrial: noop });

    expect(view.queryByLabelText(/^One skip keeps,/)).toBeNull();
    expect(view.queryByText(strings.onboarding.somethingElse)).toBeNull();
  });
});

describe('BreakHabitSheet gated (premium at ceiling)', () => {
  it('shows the ceiling copy, not the free-tier pitch, and drops the price/upgrade CTA', async () => {
    const view = await renderSheet({ entitlement: 'premium', onStartTrial: noop });

    expect(view.getByText(strings.habitLogging.ceilingTitle)).toBeTruthy();
    expect(view.getByText(strings.habitLogging.ceilingBody)).toBeTruthy();
    expect(view.queryByText(strings.habitLogging.gateTitle)).toBeNull();
    expect(view.queryByText(strings.habitLogging.freeTierNote)).toBeNull();
    expect(view.queryByText(/\$3\.99 a month/)).toBeNull();
    expect(view.queryByText(strings.paywall.plannedBanner)).toBeNull();
    expect(view.queryByRole('button', { name: strings.habitLogging.gateUpgradeCta })).toBeNull();
  });

  it('dismisses on the single button, never calling onStartTrial', async () => {
    const onStartTrial = jest.fn();
    const onClose = jest.fn();
    const view = await renderSheet({ entitlement: 'premium', onStartTrial, onClose });

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitLogging.ceilingDismiss }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onStartTrial).not.toHaveBeenCalled();
  });
});
