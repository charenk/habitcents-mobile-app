/**
 * ResultsScreen's undo-import flow (design/leakscan-migration, U12a).
 *
 * Two things this pins:
 * 1. The undo confirm is now the house ConfirmSheet (components/ui/
 *    ConfirmSheet.tsx), not the bespoke alert-style Modal ResultsFooter used
 *    to draw. Its re-entrancy guard is unit-tested generically in
 *    __tests__/confirmSheet.test.tsx; this test pins the same guarantee
 *    (fires exactly once on a fast double tap) through the real caller,
 *    ResultsFooter -> ResultsScreen.
 * 2. The post-undo state used to be a bare "This import has been undone."
 *    screen with no exit except the invisible iOS edge swipe (a true
 *    dead-end). It now keeps the same confirmation line and adds a primary
 *    action, "Continue to HabitCents", that calls router.replace('/(tabs)')
 *    (replace, not push, so this screen can never be revisited mid-stack).
 *
 * Provider wiring mirrors __tests__/resultsScreenLadder.test.tsx; this file
 * additionally mocks expo-router (that file deliberately does not, since it
 * never presses a button that navigates) so router.replace is observable.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
import { track } from '@/utils/analytics';
import type { ScanResult } from '@/utils/leakScan/types';

const trackMock = track as jest.MockedFunction<typeof track>;

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

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
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
    habits: [],
    coverage: { startISO: '2026-01-01', endISO: '2026-01-30', spanDays: 30, coveredDays: 30 },
    tier: 'solid',
    gracefulFailure: false,
    ...overrides,
  };
}

async function renderResults(result: ScanResult) {
  const view = await render(
    <Providers>
      <ResultsScreen result={result} files={[]} />
    </Providers>
  );
  await act(async () => {});
  return view;
}

beforeEach(() => {
  trackMock.mockClear();
  mockPush.mockClear();
  mockReplace.mockClear();
});

afterEach(cleanup);

describe('ResultsScreen undo flow (design/leakscan-migration, U12a)', () => {
  it('opens the house ConfirmSheet and fires onUndo exactly once on a fast double tap', async () => {
    const view = await renderResults(makeScanResult());

    // Open the confirm sheet.
    await act(async () => {
      fireEvent.press(view.getByText(strings.leakScan.undoImport));
    });

    // Both the footer's trigger and the sheet's own destructive confirm
    // button read "Undo this import" (unchanged from the original Modal),
    // so there are two matches once the sheet is open; index 1 is the
    // sheet's confirm button.
    const confirmMatches = view.getAllByText(strings.leakScan.undoImport);
    expect(confirmMatches).toHaveLength(2);

    // Both presses land in the same tick, before any state update from the
    // first has a chance to unmount anything -- the same fast-double-tap
    // scenario __tests__/confirmSheet.test.tsx guards against generically.
    await act(async () => {
      fireEvent.press(confirmMatches[1]);
      fireEvent.press(confirmMatches[1]);
    });

    expect(trackMock.mock.calls.filter(([event]) => event === 'scan_undone')).toHaveLength(1);
    expect(view.getByText(strings.leakScan.undoneMessage)).toBeTruthy();
  });

  it('cancels via the house ConfirmSheet without undoing', async () => {
    const view = await renderResults(makeScanResult());

    await act(async () => {
      fireEvent.press(view.getByText(strings.leakScan.undoImport));
    });
    await act(async () => {
      fireEvent.press(view.getByText(strings.common.cancel));
    });

    expect(trackMock.mock.calls.filter(([event]) => event === 'scan_undone')).toHaveLength(0);
    expect(view.queryByText(strings.leakScan.undoneMessage)).toBeNull();
  });

  it('gives the post-undo state a real exit instead of a dead end', async () => {
    const view = await renderResults(makeScanResult());

    await act(async () => {
      fireEvent.press(view.getByText(strings.leakScan.undoImport));
    });
    const confirmMatches = view.getAllByText(strings.leakScan.undoImport);
    await act(async () => {
      fireEvent.press(confirmMatches[1]);
    });

    // The confirmation line is unchanged; the fix adds a way out.
    expect(view.getByText(strings.leakScan.undoneMessage)).toBeTruthy();
    const continueButton = view.getByText(strings.leakScan.undoneContinue);
    expect(continueButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(continueButton);
    });

    // replace, not push: this screen must never be revisited mid-stack.
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    expect(mockPush).not.toHaveBeenCalledWith('/(tabs)');
  });
});
