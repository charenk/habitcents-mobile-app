/**
 * Bills offer screen (PRD v3.1 sect 8, phase 5).
 *
 * The screen files rather than nudges, so what matters is: it proposes rather
 * than asks (everything ticked, cadence already stated), it writes only what
 * survives the tick, and what it writes stays part of the scan's import so
 * "Undo this import" can still take it away.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { BillsScreen } from '@/components/leak-scan/BillsScreen';
import { buildBillsOffer } from '@/utils/leakScan/bills';
import { undoImport } from '@/utils/leakScan/importWrite';
import { getExpenses } from '@/utils/storage';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';
import type { RecurringItem, ScanResult } from '@/utils/leakScan/types';

const trackMock = track as jest.MockedFunction<typeof track>;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function item(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    merchantStem: 'hydro',
    merchantDisplay: 'Hydro One',
    category: 'Utilities',
    rowClass: 'spend',
    amountCents: 8500,
    interval: 'monthly',
    occurrences: 3,
    lastDateISO: '2026-06-01',
    nextDateISO: '2026-07-01',
    nextMonthHits: 1,
    ...overrides,
  };
}

const RECURRING = [
  item({ merchantStem: 'rent', merchantDisplay: 'Park Property', category: 'Mortgage', amountCents: 120000 }),
  item({ merchantStem: 'hydro', merchantDisplay: 'Hydro One' }),
  item({ merchantStem: 'netflix', merchantDisplay: 'Netflix', amountCents: 1899 }),
];

function scanResult(recurring: RecurringItem[] = RECURRING): ScanResult {
  return {
    importId: 'imp-1',
    status: 'ok',
    files: [],
    rows: [],
    questions: [],
    transfers: [],
    refunds: [],
    duplicatesMerged: 0,
    recurring,
    habits: [],
    coverage: { startISO: '2026-04-01', endISO: '2026-06-30', spanDays: 91, coveredDays: 27 },
    tier: 'solid',
    gracefulFailure: false,
  };
}

async function renderBills(result: ScanResult = scanResult()) {
  const onDone = jest.fn();
  // RTL v14: render() is itself async (matches resultsScreenLadder.test.tsx).
  const view = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>
            <ExpensesProvider>
              <BillsScreen offer={buildBillsOffer(result)} result={result} onDone={onDone} />
            </ExpensesProvider>
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  await act(async () => {});
  return { view, onDone };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  trackMock.mockClear();
});

afterEach(cleanup);

function importedCalls() {
  return trackMock.mock.calls.filter(([event]) => event === 'bills_imported');
}

describe('bills screen', () => {
  it('groups bills apart from subscriptions', async () => {
    const { view } = await renderBills();

    expect(view.getByText(strings.leakScan.billsGroupBills)).toBeTruthy();
    expect(view.getByText(strings.leakScan.billsGroupSubscriptions)).toBeTruthy();
    expect(view.getByText('Park Property')).toBeTruthy();
    expect(view.getByText('Netflix')).toBeTruthy();
  });

  it('states the cadence rather than asking for it', async () => {
    const { view } = await renderBills();
    // Propose, don't ask: extraction already knows how often these repeat.
    expect(view.getAllByText(strings.leakScan.billsCadenceMonthly).length).toBe(3);
  });

  it('starts with every row ticked', async () => {
    const { view } = await renderBills();

    const switches = view.getAllByRole('switch');
    expect(switches).toHaveLength(3);
    expect(switches.every((s) => s.props.accessibilityState?.checked)).toBe(true);
    expect(view.getByRole('button', { name: strings.leakScan.billsConfirm(3) })).toBeTruthy();
  });

  it('reports the size of the offer on arrival', async () => {
    await renderBills();

    const offered = trackMock.mock.calls.filter(([event]) => event === 'bills_offered');
    expect(offered).toHaveLength(1);
    expect(offered[0][1]).toEqual({ count_proposed: 3 });
  });

  it('writes only the rows still ticked', async () => {
    const { view, onDone } = await renderBills();

    const netflix = view
      .getAllByRole('switch')
      .find((s) => String(s.props.accessibilityLabel).startsWith('Netflix'))!;
    await act(async () => {
      fireEvent.press(netflix);
    });

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.billsConfirm(2) }));
    });

    const written = await getExpenses();
    expect(written.map((e) => e.merchant).sort()).toEqual(['Hydro One', 'Park Property']);
    expect(importedCalls()[0][1]).toEqual({ count_accepted: 2, skipped: false });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when the user unticks everything', async () => {
    const { view, onDone } = await renderBills();

    for (const s of view.getAllByRole('switch')) {
      await act(async () => {
        fireEvent.press(s);
      });
    }

    // The CTA stops claiming to add anything rather than sitting there disabled.
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.billsConfirmNone }));
    });

    expect(await getExpenses()).toHaveLength(0);
    // Zero accepted, but the user READ the offer and declined it: skipped
    // false keeps this cohort separable from the outright skip below.
    expect(importedCalls()[0][1]).toEqual({ count_accepted: 0, skipped: false });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('files nothing when skipped, and says so', async () => {
    const { view, onDone } = await renderBills();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.billsSkip }));
    });

    expect(await getExpenses()).toHaveLength(0);
    // Reported as zero rather than not reported, so bills_imported /
    // bills_offered has a denominator that includes the people who declined;
    // skipped true marks that this cohort never engaged with the rows at all.
    expect(importedCalls()[0][1]).toEqual({ count_accepted: 0, skipped: true });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('writes rows the scan import can still take back', async () => {
    const { view } = await renderBills();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.billsConfirm(3) }));
    });

    const written = await getExpenses();
    expect(written).toHaveLength(3);
    // The undo coherence that matters: a bill filed here belongs to the same
    // import as everything else the scan wrote, so "Undo this import" removes
    // it too rather than orphaning it in Upcoming.
    expect(written.every((e) => e.importId === 'imp-1')).toBe(true);
    expect(written.every((e) => e.source === 'import')).toBe(true);
    expect(undoImport(written, 'imp-1')).toHaveLength(0);
  });

  it('writes them as real schedules, not one-off rows', async () => {
    const { view } = await renderBills();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.leakScan.billsConfirm(3) }));
    });

    const written = await getExpenses();
    expect(written.every((e) => e.isRecurring)).toBe(true);
    expect(written.every((e) => e.recurrence === 'monthly')).toBe(true);
  });
});
