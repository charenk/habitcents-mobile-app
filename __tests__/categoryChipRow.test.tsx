/**
 * CategoryChipRow (components/money/CategoryChipRow.tsx): the auto-scroll
 * race fixed by this file.
 *
 * On first mount, the auto-scroll effect reads chip x-positions from a ref
 * populated by each chip's onLayout, which React Native fires AFTER the
 * effect on first mount. The effect used to bail silently in that case and
 * nothing re-triggered it, so opening on a late-in-list selected category
 * showed no scroll until an unrelated re-render happened to run the effect
 * again. The fix also attempts the scroll from the selected chip's own
 * onLayout, so whichever one runs second (the effect, on later value
 * changes, or the layout, on first mount) performs it.
 *
 * These tests fire a 'layout' event manually per chip, in the order React
 * Native reports it, to reproduce that ordering deterministically.
 * `scrollTo` is a real method on the ScrollView class instance (not
 * mockable via a prop), so it's reached through the test renderer's
 * `unstable_fiber` escape hatch, walking up from a chip's fiber to the
 * ancestor ScrollView fiber's `stateNode`. `unstable_fiber` is explicitly
 * documented by @testing-library/react-native as unstable; it's used here
 * only because there is no other way to observe this component calling a
 * real ScrollView method.
 *
 * `scrollTo` lives on ScrollView.prototype, not as an own property on each
 * instance (verified directly), so `jest.spyOn(instance, 'scrollTo')`
 * spies the ONE shared prototype method rather than an instance-scoped
 * copy, and jest.spyOn on an already-spied function returns the SAME spy
 * rather than a fresh one. Concretely: spying again per test, even after
 * cleanup() and jest.restoreAllMocks(), still shared call history across
 * tests here. The suite spies once and clears (not re-spies) between
 * tests to sidestep that.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CategoryChipRow } from '@/components/money/CategoryChipRow';
import type { Category } from '@/types/category';

const categories: Category[] = [
  {
    id: 'cat-food',
    name: 'Food',
    icon: 'fast-food-outline',
    color: '#66BB6A',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    icon: 'cart-outline',
    color: '#EC407A',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'cat-utilities',
    name: 'Utilities',
    icon: 'flash-outline',
    color: '#42A5F5',
    isDefault: true,
    isHidden: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
];

function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

/** Walks from a chip's fiber up to the ancestor ScrollView's class instance. */
function findScrollViewInstance(node: TestInstance): ScrollView {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fiber: any = node.unstable_fiber;
  while (fiber) {
    if (fiber.type === ScrollView || fiber.elementType === ScrollView) {
      return fiber.stateNode as ScrollView;
    }
    fiber = fiber.return;
  }
  throw new Error('CategoryChipRow: no ancestor ScrollView fiber found');
}

/** Fires the layout React Native would report for one chip's wrapper View. */
async function layoutChip(getByTestId: (id: string) => TestInstance, id: string, x: number) {
  await fireEvent(getByTestId(`category-chip-${id}`), 'layout', {
    nativeEvent: { layout: { x, y: 0, width: 90, height: 36 } },
  });
}

describe('CategoryChipRow scroll-to-selected', () => {
  let scrollToSpy: jest.SpyInstance;

  beforeAll(async () => {
    // Any ScrollView instance's fiber reaches the same prototype method, so
    // a throwaway render is enough to get the one spy the whole suite uses.
    const probe = await render(
      <ScrollView>
        <View testID="probe-chip" />
      </ScrollView>
    );
    const scrollView = findScrollViewInstance(probe.getByTestId('probe-chip'));
    scrollToSpy = jest.spyOn(scrollView, 'scrollTo').mockImplementation(() => {});
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
    scrollToSpy.mockClear();
  });

  afterAll(() => {
    scrollToSpy.mockRestore();
  });

  it('scrolls to the selected chip from its own onLayout when the auto-scroll effect already missed it (the mount race)', async () => {
    const { getByTestId } = await render(
      <Providers>
        <CategoryChipRow
          categories={categories}
          value="Utilities"
          onChange={() => {}}
          scrollToSelected
        />
      </Providers>
    );

    // The effect already ran once on mount (positions map still empty, per
    // the real RN ordering) and bailed. Now simulate RN reporting layout for
    // each chip in turn, last-in-list (the selected one) last: the scenario
    // the effect alone cannot recover from without this fix.
    await layoutChip(getByTestId, 'cat-food', 0);
    await layoutChip(getByTestId, 'cat-shopping', 98);
    expect(scrollToSpy).not.toHaveBeenCalled();

    await layoutChip(getByTestId, 'cat-utilities', 240);
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith({ x: 220, animated: false });
  });

  it('only scrolls once even if further chips report layout afterward', async () => {
    const { getByTestId } = await render(
      <Providers>
        <CategoryChipRow
          categories={categories}
          value="Food"
          onChange={() => {}}
          scrollToSelected
        />
      </Providers>
    );

    await layoutChip(getByTestId, 'cat-food', 0);
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith({ x: 0, animated: false });

    await layoutChip(getByTestId, 'cat-shopping', 98);
    await layoutChip(getByTestId, 'cat-utilities', 240);
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
  });

  it('does not scroll when scrollToSelected is false', async () => {
    const { getByTestId } = await render(
      <Providers>
        <CategoryChipRow categories={categories} value="Utilities" onChange={() => {}} />
      </Providers>
    );

    await layoutChip(getByTestId, 'cat-utilities', 240);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
