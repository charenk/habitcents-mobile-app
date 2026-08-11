/**
 * useViewQuote (U6, components/today/useViewQuote.ts): the per-pane rotation
 * hook. Direct hook tests via renderHook; __tests__/todayQuoteRibbonPlacement
 * .test.tsx covers it wired into the real Today screen (both panes active,
 * pager switches, etc).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useViewQuote } from '@/components/today/useViewQuote';
import { getKeptQuoteSeq, getSpentQuoteSeq, setKeptQuoteSeq, setSpentQuoteSeq } from '@/utils/storage';
import { strings } from '@/constants/strings';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useViewQuote: per-view registers', () => {
  it("the spent view's quote always comes from spentQuotes, never keptQuotes", async () => {
    const { result } = await renderHook(() => useViewQuote('spent', true));
    await act(async () => {});

    expect(strings.today.spentQuotes).toContainEqual(result.current);
    expect(strings.today.keptQuotes).not.toContainEqual(result.current);
  });

  it("the kept view's quote always comes from keptQuotes, never spentQuotes", async () => {
    const { result } = await renderHook(() => useViewQuote('kept', true));
    await act(async () => {});

    expect(strings.today.keptQuotes).toContainEqual(result.current);
    expect(strings.today.spentQuotes).not.toContainEqual(result.current);
  });
});

describe('useViewQuote: rotation', () => {
  it('advances the quote each time the pane transitions from inactive to active, and wraps back around after a full cycle', async () => {
    const quotes = strings.today.spentQuotes;
    const { result, rerender } = await renderHook(
      ({ active }: { active: boolean }) => useViewQuote('spent', active),
      { initialProps: { active: true } }
    );
    await act(async () => {});

    const seen = [result.current];

    // One full cycle of activations beyond the first: length - 1 more
    // deactivate/reactivate round trips.
    for (let i = 0; i < quotes.length - 1; i++) {
      await rerender({ active: false });
      await act(async () => {});
      await rerender({ active: true });
      await act(async () => {});
      seen.push(result.current);
    }

    // Every quote in the array was shown exactly once across the cycle, in
    // rotation order (mod length), proving both "advances" and "wraps".
    const indices = seen.map((q) => quotes.indexOf(q));
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBe((indices[i - 1] + 1) % quotes.length);
    }

    // One more activation lands back on the very first quote shown.
    await rerender({ active: false });
    await act(async () => {});
    await rerender({ active: true });
    await act(async () => {});
    expect(result.current).toEqual(seen[0]);
  });

  it('does not advance while the pane stays active (no re-count on re-render)', async () => {
    const { result, rerender } = await renderHook(
      ({ active }: { active: boolean }) => useViewQuote('spent', active),
      { initialProps: { active: true } }
    );
    await act(async () => {});
    const first = result.current;

    // Re-render with the same active=true a few times (e.g. parent re-render
    // for an unrelated reason): must not advance the counter each time.
    await rerender({ active: true });
    await rerender({ active: true });
    await act(async () => {});

    expect(result.current).toEqual(first);
  });

  it('the initially-active pane counts its mount as its first activation', async () => {
    await setSpentQuoteSeq(0);
    const { result } = await renderHook(() => useViewQuote('spent', true));
    await act(async () => {});

    // Counted exactly once: the persisted counter reads back as 1, not 0
    // (never counted) or 2 (double-counted).
    expect(await getSpentQuoteSeq()).toBe(1);
    expect(strings.today.spentQuotes).toContainEqual(result.current);
  });

  it('a pane that starts inactive does not advance the counter until it becomes active', async () => {
    await setKeptQuoteSeq(0);
    const { rerender } = await renderHook(
      ({ active }: { active: boolean }) => useViewQuote('kept', active),
      { initialProps: { active: false } }
    );
    await act(async () => {});
    expect(await getKeptQuoteSeq()).toBe(0);

    await rerender({ active: true });
    await act(async () => {});
    expect(await getKeptQuoteSeq()).toBe(1);
  });
});

describe('useViewQuote: resilience', () => {
  it('defaults to a clean rotation when the stored sequence is corrupt', async () => {
    await AsyncStorage.setItem('@habitcents_quote_seq_spent', 'not-a-number');
    const { result } = await renderHook(() => useViewQuote('spent', true));
    await act(async () => {});

    expect(strings.today.spentQuotes).toContainEqual(result.current);
  });
});

describe('useViewQuote storage: spent and kept counters are independent', () => {
  it('persists to separate keys and defaults each to 0 on missing data', async () => {
    expect(await getSpentQuoteSeq()).toBe(0);
    expect(await getKeptQuoteSeq()).toBe(0);

    await setSpentQuoteSeq(3);
    await setKeptQuoteSeq(7);

    expect(await getSpentQuoteSeq()).toBe(3);
    expect(await getKeptQuoteSeq()).toBe(7);
  });
});
