/**
 * Scope selection screen (PRD v3.1 sect 7.1, phase 2).
 *
 * The screen's job is to make the boundary the user's, and to make the locked
 * tier legible rather than invisible: an exclusion the user cannot see reads as
 * the app losing their data, while an exclusion shown with its reason reads as
 * judgment.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ScopeScreen } from '@/components/leak-scan/ScopeScreen';
import { strings } from '@/constants/strings';
import { defaultScope, toggleScope, type ScanScope } from '@/utils/leakScan/scope';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderScope(overrides: Partial<React.ComponentProps<typeof ScopeScreen>> = {}) {
  const props = {
    scope: defaultScope(),
    onToggle: jest.fn(),
    onConfirm: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  };
  // RTL v14: render() is itself async (matches resultsScreenLadder.test.tsx).
  const view = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <LocaleProvider>
          <ScopeScreen {...props} />
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  return { view, props };
}

afterEach(cleanup);

describe('scope screen', () => {
  it('asks where to look, not what was found', async () => {
    const { view } = await renderScope();
    expect(view.getByText(strings.leakScan.scopeTitle)).toBeTruthy();
  });

  it('offers every available category as a switch and no locked one', async () => {
    const { view } = await renderScope();

    const switches = view.getAllByRole('switch');
    const labels = switches.map((s) => s.props.accessibilityLabel).sort();
    // Display labels, not stored values: 'Software & Subscriptions' renders
    // as 'Subscriptions' (Charen, 2026-09-04).
    expect(labels).toEqual([
      'Car',
      'Entertainment',
      'Food',
      'Other',
      'Shopping',
      'Subscriptions',
      'Transportation',
      'Utilities',
    ]);
    expect(labels).not.toContain('Mortgage');
    expect(labels).not.toContain('Home');
    expect(labels).not.toContain('Healthcare');
  });

  it('shows the locked tier with its reason rather than hiding it', async () => {
    const { view } = await renderScope();

    expect(view.getByText(strings.leakScan.scopeLockedReason)).toBeTruthy();
    // Named, so the user can see the app did not simply lose the spend.
    // The stored 'Mortgage' value renders under its display name.
    expect(view.getByText('Home')).toBeTruthy();
    expect(view.getByText('Healthcare')).toBeTruthy();
  });

  it('reflects the fail-closed defaults in the switch states', async () => {
    const { view } = await renderScope();

    const stateFor = (label: string) =>
      view.getAllByRole('switch').find((s) => s.props.accessibilityLabel === label)?.props
        .accessibilityState?.checked;

    expect(stateFor('Food')).toBe(true);
    expect(stateFor('Entertainment')).toBe(true);
    expect(stateFor('Other')).toBe(false);
    expect(stateFor('Transportation')).toBe(false);
  });

  it('reports the selected count', async () => {
    const { view } = await renderScope();
    expect(view.getByText(strings.leakScan.scopeSelectedCount(4))).toBeTruthy();
  });

  it('says plainly when nothing is selected instead of blocking the user', async () => {
    const empty: ScanScope = {};
    const { view } = await renderScope({ scope: empty });

    expect(view.getByText(strings.leakScan.scopeNoneSelected)).toBeTruthy();
    // Confirm stays live: an empty scope is a legitimate answer, it just means
    // no habit proposals. The dashboard still shows every dollar.
    expect(view.getByRole('button', { name: strings.leakScan.scopeConfirm })).toBeTruthy();
  });

  it('raises a toggle for the tapped category', async () => {
    const { view, props } = await renderScope();

    const other = view.getAllByRole('switch').find((s) => s.props.accessibilityLabel === 'Other')!;
    await act(async () => {
      fireEvent.press(other);
    });

    expect(props.onToggle).toHaveBeenCalledWith('Other');
  });

  it('confirms the selection', async () => {
    const { view, props } = await renderScope({ scope: toggleScope(defaultScope(), 'Other') });

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.scopeConfirm }));
    });

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });
});
