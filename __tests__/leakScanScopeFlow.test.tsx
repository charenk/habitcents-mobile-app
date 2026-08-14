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

    // Phase 3 put the habit deck here; before it, confirming scope went
    // straight to the results ladder.
    expect(result.current.state.stage).toBe('deck');
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

describe('the habit deck follows the scope', () => {
  async function scanAndConfirm() {
    const result = await scan();
    await act(async () => {
      await result.current.confirmScope();
    });
    return result;
  }

  it('deals a deck instead of dropping the user on the dashboard', async () => {
    const result = await scanAndConfirm();

    expect(result.current.state.stage).toBe('deck');
    expect(result.current.state.deck.length).toBeGreaterThan(0);
    expect(result.current.state.deck.length).toBeLessThanOrEqual(3);
  });

  it('never deals the rent card, whatever it costs', async () => {
    const result = await scanAndConfirm();
    expect(result.current.state.deck.map((c) => c.merchantStem)).not.toContain('park');
  });

  it('deals only behavioral, governable candidates', async () => {
    const result = await scanAndConfirm();

    for (const card of result.current.state.deck) {
      expect(card.isBehavioral).toBe(true);
      expect(card.isSubscription).toBe(false);
      expect(card.governClass).toBe('govern');
    }
  });

  it('drops a dismissed card and suppresses the merchant for good', async () => {
    const result = await scanAndConfirm();
    const first = result.current.state.deck[0];

    await act(async () => {
      await result.current.dismissDeckCandidate(first);
    });

    expect(result.current.state.deck.map((c) => c.merchantStem)).not.toContain(first.merchantStem);
    // Also gone from the ladder the user lands on, so the full list never
    // re-offers what they just rejected.
    expect(result.current.state.result!.habits.map((h) => h.merchantStem)).not.toContain(
      first.merchantStem
    );

    const rules = await getScanRules();
    expect(rules.suppressedHabits[first.merchantStem]).toBe(true);
  });

  it('falls through to the full list once every card is rejected, and only once', async () => {
    const result = await scanAndConfirm();

    const deck = [...result.current.state.deck];
    for (const card of deck) {
      await act(async () => {
        await result.current.dismissDeckCandidate(card);
      });
    }

    expect(result.current.state.stage).toBe('done');
    // One fallback hop: the full list is terminal, never itself fallen back
    // from, so exactly one exhaustion is reported.
    const exhausted = trackMock.mock.calls.filter(([event]) => event === 'deck_exhausted');
    expect(exhausted).toHaveLength(1);
    expect(exhausted[0][1]).toEqual({ fallback: 'full_list' });
  });

  it('treats the ghost exit as a choice, not an exhaustion', async () => {
    const result = await scanAndConfirm();

    await act(async () => {
      result.current.leaveDeck();
    });

    expect(result.current.state.stage).toBe('done');
    expect(trackMock.mock.calls.filter(([event]) => event === 'deck_exhausted')).toHaveLength(0);
  });

  // Phase 4: activation lands on the payoff, not back on a dashboard.
  // Bookkeeping must not stand between the user and the moment the product
  // exists to deliver.
  it('shows the payoff when a habit is activated, and continues to the list', async () => {
    const result = await scanAndConfirm();
    const card = result.current.state.deck[0];

    await act(async () => {
      result.current.enterPayoff({
        ...card,
        id: 'scan-habit-x',
        name: card.merchantDisplay,
      } as never);
    });

    expect(result.current.state.stage).toBe('payoff');
    expect(result.current.state.activated).not.toBeNull();

    await act(async () => {
      result.current.leavePayoff();
    });

    expect(result.current.state.stage).toBe('done');
  });

  it('keeps the passed-over findings on the result for the bills offer', async () => {
    const result = await scanAndConfirm();

    // The rent row is not deck material, but it is still a finding: phase 5's
    // bills offer draws from exactly this.
    const stems = result.current.state.result!.habits.map((h) => h.merchantStem);
    expect(stems.length).toBeGreaterThanOrEqual(result.current.state.deck.length);
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
