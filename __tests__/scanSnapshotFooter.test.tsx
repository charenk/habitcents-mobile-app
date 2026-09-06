/**
 * The scan snapshot's footer with the flow ENABLED (decision 0009).
 *
 * Its dormant half is pinned in insightsFirstScan.test.tsx, which renders the
 * real screen with the real (off) gate. This file covers the other branch: it
 * mocks utils/scanFlow rather than flipping the env var, because the gate's
 * own env behaviour is already pinned in scanFlowGate.test.tsx and what
 * matters here is what the card does once the answer is yes. Together the two
 * mean the re-scan entry is gated, not deleted: it returns exactly as build
 * 12 shipped it the moment the rework starts.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/scanFlow', () => ({
  SCAN_FLOW_FLAG: 'EXPO_PUBLIC_SCAN_FLOW',
  SCAN_FLOW_ENABLED: true,
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ScanSnapshotCard } from '@/components/insights/ScanSnapshotCard';
import { strings } from '@/constants/strings';
import type { ScanSummary } from '@/types/scanSummary';

function summary(): ScanSummary {
  return {
    schemaVersion: 1,
    createdAt: new Date('2026-07-15T12:00:00.000Z'),
    evidence: {
      windowStart: new Date('2026-06-01T00:00:00.000Z'),
      windowEnd: new Date('2026-06-30T00:00:00.000Z'),
      fileCount: 1,
      rowCount: 40,
    },
    kpis: {
      totalSpentCents: 100000,
      totalSpentTier: 'solid',
      perDayCents: 3333,
      transactionCount: 20,
      purchasesPerDay: 0.7,
      spanDays: 30,
      coveredDays: 30,
      nAccounts: 1,
    },
    categories: [],
    topLeaks: [],
    projection: null,
  };
}

afterEach(() => {
  mockPush.mockClear();
  cleanup();
});

it('offers the re-scan action and the until-replaced caption when the flow is live', async () => {
  const view = await render(
    <ThemeProvider>
      <CurrencyProvider>
        <ScanSnapshotCard summary={summary()} />
      </CurrencyProvider>
    </ThemeProvider>
  );

  expect(view.getByText(strings.insights.scanUpdatedCaption)).toBeTruthy();
  expect(view.queryByText(strings.insights.scanSavedCaption)).toBeNull();

  fireEvent.press(view.getByRole('button', { name: strings.insights.scanRerunAction }));
  expect(mockPush).toHaveBeenCalledWith('/leak-scan');
});
