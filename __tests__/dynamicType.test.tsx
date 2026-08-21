/**
 * Dynamic Type: what a device pass at the accessibility text sizes would hit.
 *
 * Jest cannot measure layout, so these assert the two things it can see: the
 * decisions a large text size drives (the answer buttons stacking), and the
 * caps and box shapes that stop scaled text from being clipped. Together with
 * the on-device walk in docs/device-pass.md, they keep this class of bug from
 * growing back silently.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockFontScale }),
}));

import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { KeptHero } from '@/components/habit-logging/KeptHero';
import { strings } from '@/constants/strings';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';

const habit = {
  id: 'h1',
  name: 'Coffee',
  frequency: 'daily',
  status: 'changing',
} as unknown as DetectedHabit;

const goal = {
  id: 'g1',
  habitId: 'h1',
  skipValue: 650,
  kept: 0,
  totalSkips: 0,
  dayLogs: [],
  trackingStart: new Date(),
  firstRun: false,
  backfillUsed: false,
} as unknown as HabitChangeGoal;

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}

async function renderCheckIn() {
  const view = await render(
    <Providers>
      <CheckInCard
        habit={habit}
        goal={goal}
        milestoneJustHit={null}
        onSkip={() => {}}
        onSlip={() => {}}
        onChangeAnswer={() => {}}
        onBackfill={() => {}}
        onOpenPartial={() => {}}
      />
    </Providers>
  );
  await act(async () => {});
  return view;
}

/** The style object actually applied to a node, flattened across arrays. */
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  const style = node.props.style;
  const parts = Array.isArray(style) ? style.flat(Infinity) : [style];
  return Object.assign({}, ...parts.filter(Boolean).map((p) => p as object));
}

/**
 * Walk up from a node to the nearest ancestor that lays its children out in a
 * direction. Button wraps its label in a couple of views, and how many is an
 * implementation detail this test should not encode.
 */
function layoutDirectionAbove(node: unknown): string | undefined {
  let current = node as { parent?: unknown; props?: { style?: unknown } } | null;
  for (let depth = 0; current && depth < 12; depth += 1) {
    const direction = flatStyle(current as never).flexDirection;
    if (direction === 'row' || direction === 'column') return direction as string;
    current = (current as { parent?: never }).parent ?? null;
  }
  return undefined;
}

afterEach(cleanup);

describe('the check-in answers stack past XL (spec 09 section 2)', () => {
  it('lays the two answers side by side at the default text size', async () => {
    mockFontScale = 1;
    const view = await renderCheckIn();

    expect(layoutDirectionAbove(view.getByText(strings.today.boughtIt))).toBe('row');
  });

  it('stacks them vertically once the user turns text up', async () => {
    mockFontScale = 1.35;
    const view = await renderCheckIn();

    expect(layoutDirectionAbove(view.getByText(strings.today.boughtIt))).toBe('column');
  });

  it('still offers both answers when stacked', async () => {
    mockFontScale = 2;
    const view = await renderCheckIn();

    expect(view.getByText(strings.today.boughtIt)).toBeTruthy();
    expect(view.getByText(strings.today.skipWithValue('$6.50'))).toBeTruthy();
  });
});

describe('the kept band scales instead of breaking', () => {
  it('caps the display serif at the ratified 1.3 and keeps the amount on one line', async () => {
    mockFontScale = 2;
    const view = await render(
      <Providers>
        <KeptHero cents={123456} />
      </Providers>
    );
    await act(async () => {});

    const amount = view.getByText('$1,234.56');
    expect(amount.props.maxFontSizeMultiplier).toBe(1.3);
    expect(amount.props.numberOfLines).toBe(1);
    expect(amount.props.adjustsFontSizeToFit).toBe(true);
  });
});

/**
 * A fixed `height` around text that scales is the shape this whole class of
 * bug takes, and it is easy to reintroduce by copying a neighbouring style.
 * These read the source rather than the render tree because that is where the
 * mistake is made.
 */
describe('pills that wrap scaling text are not fixed-height', () => {
  const read = (rel: string) =>
    fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  it.each([
    ['components/leak-scan/TierBadge.tsx', 'pill'],
    ['components/leak-scan/HabitCard.tsx', 'classPill'],
    ['components/leak-scan/HabitCard.tsx', 'pacePill'],
  ])('%s %s grows with its label', (file, styleName) => {
    const source = read(file);
    const block = source.slice(source.indexOf(`${styleName}: {`));
    const body = block.slice(0, block.indexOf('},'));

    expect(body).toContain('minHeight');
    expect(body).not.toMatch(/^\s*height: \d/m);
  });
});
