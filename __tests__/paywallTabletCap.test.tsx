/**
 * Paywall fixed footer tablet cap (routine/ipad, decision 1, issue #139,
 * 2026-09-07, Charen): the trial line and CTA bar cap at the shared 600pt
 * content column on iPad, matching the scroll content above it, rather than
 * staying full width.
 *
 * No other paywall behavior is covered here; this is a first, minimal render
 * harness for app/paywall.tsx (no prior test rendered it), scoped to the one
 * thing this run's plan item needs pinned. Provider wiring mirrors
 * __tests__/profile.test.tsx (SafeAreaProvider + ThemeProvider + ToastProvider,
 * plus a mocked expo-router since there is no navigator in a unit test).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/utils/analytics', () => ({
  ...jest.requireActual('@/utils/analytics'),
  track: jest.fn(),
}));

import React from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import PaywallScreen from '@/app/paywall';
import { layout } from '@/constants/theme';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function flattenStyle(style: unknown): Record<string, unknown> {
  const styles = Array.isArray(style) ? style.flat(Infinity) : [style];
  return Object.assign({}, ...styles.filter((s): s is Record<string, unknown> => !!s && typeof s === 'object'));
}

async function renderPaywall() {
  const view = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <ToastProvider>
          <PaywallScreen />
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  await act(async () => {});
  return { view };
}

afterEach(cleanup);

describe('paywall: fixed footer tablet cap (routine/ipad, decision 1)', () => {
  it('caps and centers the footer at the shared content column width', async () => {
    const { view } = await renderPaywall();

    const footer = view.getByTestId('paywall-footer');
    const flat = flattenStyle(footer.props.style);

    expect(flat.width).toBe('100%');
    expect(flat.maxWidth).toBe(layout.contentMaxWidth);
    expect(flat.alignSelf).toBe('center');
  });
});
