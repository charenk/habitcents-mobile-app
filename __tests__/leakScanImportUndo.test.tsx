/**
 * Leak Scan import + undo, end to end through the real ResultsScreen (ADR
 * 0024, U11 fix).
 *
 * Bug: both results-screen write sites (handleSaveProjection for recurring
 * items, handleBringInDays for the last-30-days seed) hand-listed only a
 * subset of AddExpenseInput fields, silently dropping `source` and
 * `importId`. Every row landed in storage tagged source 'manual' with no
 * importId, so "Undo this import" (which filters expenses by importId, see
 * utils/leakScan/importWrite.ts undoImport) removed nothing -- a real report
 * card would just sit there after the user tapped Undo.
 *
 * This suite drives the actual screen (Save to HabitCents, Bring in your
 * last 30 days, then Undo this import -> confirm) and asserts against what
 * ExpensesContext actually persisted, proving the fix end to end rather than
 * only at the pure-function level (__tests__/leakScan/importWrite.test.ts).
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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getExpenses, saveExpenses } from '@/utils/storage';
import type { RecurringItem, ScanResult, ScanRow } from '@/utils/leakScan/types';

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

function makeSpendRow(overrides: Partial<ScanRow> = {}): ScanRow {
  const date = new Date();
  return {
    id: 'r-recent',
    dateISO: date.toISOString().slice(0, 10),
    date,
    amountCents: -1200,
    rawDescription: 'Coffee Shop',
    merchantStem: 'coffeeshop',
    merchantDisplay: 'Coffee Shop',
    category: 'Food',
    categoryTier: 'solid',
    rowClass: 'spend',
    account: 'A',
    pending: false,
    foreign: false,
    internal: false,
    reversed: false,
    needsReview: false,
    hash: 'h-recent',
    ...overrides,
  };
}

function makeRecurringItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    merchantStem: 'netflix',
    merchantDisplay: 'Netflix',
    category: 'Software & Subscriptions',
    rowClass: 'spend',
    amountCents: 1599,
    interval: 'monthly',
    occurrences: 3,
    lastDateISO: '2026-05-01',
    nextDateISO: '2026-06-01',
    nextMonthHits: 1,
    ...overrides,
  };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    importId: 'imp-undo-test',
    status: 'ok',
    files: [],
    rows: [makeSpendRow()],
    questions: [],
    transfers: [],
    refunds: [],
    duplicatesMerged: 0,
    recurring: [makeRecurringItem()],
    habits: [], // hasFinding=false: projection renders directly, no ladder expand needed
    coverage: { startISO: '2026-01-01', endISO: '2026-01-30', coveredDays: 30 },
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

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(cleanup);

describe('Leak Scan import write + undo (ADR 0024, U11)', () => {
  it('a saved recurring projection is tagged source import + importId, and undo removes exactly it', async () => {
    const result = makeScanResult();
    const view = await renderResults(result);

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.saveToHabitCents }));
    });

    const afterSave = await getExpenses();
    const netflixRow = afterSave.find((e) => e.title === 'Netflix');
    expect(netflixRow).toBeDefined();
    expect(netflixRow?.source).toBe('import');
    expect(netflixRow?.importId).toBe(result.importId);
    expect(netflixRow?.isRecurring).toBe(true);
    expect(netflixRow?.recurrence).toBe('monthly');

    // "Undo this import" opens a confirm modal (ResultsFooter); both the row
    // toggle and the modal's confirm button share the same accessible name.
    const undoButtons = view.getAllByRole('button', { name: strings.leakScan.undoImport });
    await act(async () => {
      fireEvent.press(undoButtons[0]); // opens the confirm modal
    });
    const undoButtonsWithModal = view.getAllByRole('button', { name: strings.leakScan.undoImport });
    await act(async () => {
      fireEvent.press(undoButtonsWithModal[undoButtonsWithModal.length - 1]); // confirm
    });

    const afterUndo = await getExpenses();
    expect(afterUndo.find((e) => e.title === 'Netflix')).toBeUndefined();
    expect(afterUndo.some((e) => e.importId === result.importId)).toBe(false);
  });

  it('the last-30-days seed is also tagged source import + importId, and undo removes it too, leaving other data untouched', async () => {
    // A pre-existing unrelated manual expense must survive the undo. Seeded
    // to storage BEFORE the provider mounts, so it's part of what
    // ExpensesContext hydrates into expensesRef -- seeding it after mount
    // would just be clobbered by the provider's own next commit(), which
    // only ever persists what it holds in memory.
    await saveExpenses([
      {
        id: 'manual-1',
        title: 'Manual coffee',
        amount: 400,
        category: 'Food',
        date: new Date(),
        time: '9:00 AM',
        isRecurring: false,
        reminderEnabled: false,
        source: 'manual',
        iconVariant: 'yellow',
      },
    ]);

    const result = makeScanResult({ recurring: [] }); // isolate the seed write site
    const view = await renderResults(result);

    await act(async () => {
      fireEvent.press(
        view.getByRole('button', { name: strings.leakScan.bringInLastDays(30) })
      );
    });

    const afterSeed = await getExpenses();
    const seeded = afterSeed.find((e) => e.title === 'Coffee Shop');
    expect(seeded).toBeDefined();
    expect(seeded?.source).toBe('import');
    expect(seeded?.importId).toBe(result.importId);

    const undoButtons = view.getAllByRole('button', { name: strings.leakScan.undoImport });
    await act(async () => {
      fireEvent.press(undoButtons[0]);
    });
    const undoButtonsWithModal = view.getAllByRole('button', { name: strings.leakScan.undoImport });
    await act(async () => {
      fireEvent.press(undoButtonsWithModal[undoButtonsWithModal.length - 1]);
    });

    const afterUndo = await getExpenses();
    expect(afterUndo.find((e) => e.title === 'Coffee Shop')).toBeUndefined();
    // The unrelated manual row is exactly the kind of "everything else"
    // undo must never touch.
    expect(afterUndo.find((e) => e.id === 'manual-1')).toBeDefined();
  });
});
