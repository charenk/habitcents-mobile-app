/**
 * Scope, end to end through the real intake hook and the real pipeline
 * (PRD v3.1 sect 7.1, phase 2).
 *
 * The unit tests in leakScan/scope.test.ts pin the model. This one pins the
 * wiring, which is where the subtle failure lives: scope is applied to a
 * finished scan, and every rule correction RE-RUNS that scan from scratch. Miss
 * the re-application and dismissing one leak silently repopulates every
 * category the user just placed out of bounds.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockGetDocumentAsync = jest.fn();
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

// Self-contained on purpose: a jest.mock factory is hoisted above the imports
// and may not close over ordinary module variables.
jest.mock('expo-file-system', () => ({
  File: class {
    async text() {
      const nodeFs = require('fs');
      const nodePath = require('path');
      return nodeFs.readFileSync(
        nodePath.join(__dirname, 'leakScanEval', 'fixtures', 'chequing-split-mixed-dates.csv'),
        'utf-8'
      );
    }
  },
}));

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { useLeakScanIntake } from '@/components/leak-scan/useLeakScanIntake';
import { getScanRules } from '@/utils/scanRules';
import { getScanSummary } from '@/utils/storage';
import { track } from '@/utils/analytics';
import { defaultScope, selectedCategories } from '@/utils/leakScan/scope';

const trackMock = track as jest.MockedFunction<typeof track>;

const FIXTURE = path.join(__dirname, 'leakScanEval', 'fixtures', 'chequing-split-mixed-dates.csv');
const FIXTURE_TEXT = fs.readFileSync(FIXTURE, 'utf-8');

beforeEach(async () => {
  await AsyncStorage.clear();
  trackMock.mockClear();
  mockGetDocumentAsync.mockReset();
  mockGetDocumentAsync.mockResolvedValue({
    canceled: false,
    assets: [{ name: 'statement.csv', uri: 'file:///statement.csv', size: FIXTURE_TEXT.length }],
  });
});

/** Run a scan and stop at whatever stage the hook lands on. */
async function scan() {
  // RTL v14: renderHook, like render, is async here.
  const { result } = await renderHook(() => useLeakScanIntake());
  await act(async () => {
    await result.current.pickAndScan();
  });
  return result;
}

function scopeCall() {
  return trackMock.mock.calls.find(([event]) => event === 'scope_selected');
}

describe('scope sits between extraction and results', () => {
  it('stops at the scope screen before showing any finding', async () => {
    const result = await scan();

    expect(result.current.state.stage).toBe('scope');
    // The unscoped result is present but has not been shown yet.
    expect(result.current.state.result?.habits.length).toBeGreaterThan(0);
  });

  it('starts on the fail-closed defaults for a first-time scanner', async () => {
    const result = await scan();

    expect(result.current.state.scope).toEqual(defaultScope());
    expect(selectedCategories(result.current.state.scope)).not.toContain('Other');
  });

  it('drops the out-of-scope rent candidate on confirm', async () => {
    const result = await scan();

    const before = result.current.state.result!.habits.map((h) => h.merchantStem);
    expect(before).toContain('park'); // the rent row, category Mortgage

    await act(async () => {
      await result.current.confirmScope();
    });

    expect(result.current.state.stage).toBe('done');
    const after = result.current.state.result!.habits.map((h) => h.merchantStem);
    expect(after).not.toContain('park');
    expect(after).toContain('starbucks');
  });

  it('keeps every row, so the dashboard still accounts for the excluded spend', async () => {
    const result = await scan();
    const rowsBefore = result.current.state.result!.rows.length;

    await act(async () => {
      await result.current.confirmScope();
    });

    expect(result.current.state.result!.rows).toHaveLength(rowsBefore);
    expect(result.current.state.result!.coverage).not.toBeNull();
  });
});

describe('scope is remembered and reported', () => {
  it('persists the confirmed selection for the next scan', async () => {
    const result = await scan();

    await act(async () => {
      result.current.toggleScopeCategory('Other');
    });
    await act(async () => {
      await result.current.confirmScope();
    });

    const rules = await getScanRules();
    expect(rules.scopeAnswered).toBe(true);
    expect(rules.scope.Other).toBe(true);
    expect(rules.scope.Food).toBe(true);
  });

  it('reopens on the remembered selection rather than the defaults', async () => {
    const first = await scan();
    await act(async () => {
      first.current.toggleScopeCategory('Food');
    });
    await act(async () => {
      await first.current.confirmScope();
    });

    const second = await scan();

    expect(second.current.state.stage).toBe('scope');
    expect(second.current.state.scope.Food).toBe(false);
  });

  it('reports the selection, and whether the defaults survived', async () => {
    const result = await scan();
    await act(async () => {
      await result.current.confirmScope();
    });

    const call = scopeCall();
    expect(call).toBeDefined();
    const props = call![1] as { categories_on: string; used_defaults: boolean };
    expect(props.used_defaults).toBe(true);
    expect(props.categories_on).toContain('food');
    // Short codes, because the analytics layer silently drops long strings.
    expect(props.categories_on.length).toBeLessThanOrEqual(64);
  });

  it('reports used_defaults false once the user edits', async () => {
    const result = await scan();
    await act(async () => {
      result.current.toggleScopeCategory('Other');
    });
    await act(async () => {
      await result.current.confirmScope();
    });

    const props = scopeCall()![1] as { used_defaults: boolean };
    expect(props.used_defaults).toBe(false);
  });
});

describe('the Insights snapshot follows the scope', () => {
  // The snapshot outlives the scan on Insights, so a leak the user placed out
  // of bounds must never survive there. It is written on confirm, not at scan
  // completion, precisely so this holds.
  it('never advertises an excluded leak', async () => {
    const result = await scan();

    expect(await getScanSummary()).toBeNull();

    await act(async () => {
      await result.current.confirmScope();
    });

    const summary = await getScanSummary();
    expect(summary).not.toBeNull();
    expect(summary!.topLeaks.map((l) => l.name.toLowerCase())).not.toContain('park');
  });
});
