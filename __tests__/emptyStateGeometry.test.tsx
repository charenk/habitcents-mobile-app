/**
 * Empty-state geometry (Charen, 2026-09-07): pane-level zero states centre,
 * and their art lands on one y across the panes a user swipes between.
 *
 * Two mechanisms, both pinned here because nothing pinned any fill geometry
 * before and the drift was real (Money's Spent pane sat 2pt above its
 * siblings for a week):
 *  - EmptyState's fill mode wraps the block in a flexGrow centring wrapper,
 *    and any block holding art is floored to the standard block height, so a
 *    one-line and a two-line title put the 96pt art on the same y.
 *  - Each caller gives that wrapper a height: its scroll content grows to the
 *    pane in the empty case, and reads the one top-padding token.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { EmptyState, EMPTY_BLOCK_MIN_HEIGHT } from '@/components/ui/EmptyState';
import { SpentList } from '@/components/money/SpentList';
import { LeakFinderTeaser } from '@/components/insights/LeakFinderTeaser';
import { EMPTY_ART_SIZE } from '@/constants/emptyArt';
import { layout, spacing } from '@/constants/theme';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <OnboardingProvider>{children}</OnboardingProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

async function renderWith(node: React.ReactElement) {
  const view = await render(<Providers>{node}</Providers>);
  await act(async () => {});
  return view;
}

function flat(node: { props: Record<string, unknown> }, key = 'style'): Record<string, unknown> {
  return (StyleSheet.flatten(node.props[key] as never) ?? {}) as Record<string, unknown>;
}

const HIDDEN = { includeHiddenElements: true };

describe('EmptyState fill mode centres', () => {
  it('wraps the block in a flexGrow centring wrapper with the pane gutter', async () => {
    const view = await renderWith(
      <EmptyState layout="fill" illustration="money-spent" title="hook" cta={{ label: 'go', onPress: () => {} }} />
    );
    const wrap = flat(view.getByTestId('empty-state-fill'));
    expect(wrap.flexGrow).toBe(1);
    // flexGrow, never flex: flex also sets flexShrink, which let the block
    // squash below its content at large Dynamic Type.
    expect(wrap.flex).toBeUndefined();
    expect(wrap.justifyContent).toBe('center');
    expect(wrap.paddingHorizontal).toBe(spacing.xxl);
    expect(wrap.paddingTop).toBeUndefined();
  });

  it('floors any block that holds art to the standard block height', async () => {
    // The floor is what puts a one-line title's art on the same y as a
    // two-line title's: 96 + 12 + two lines of 20 + 12 + a 44pt action + 4.
    expect(EMPTY_BLOCK_MIN_HEIGHT).toBe(EMPTY_ART_SIZE + 12 + 40 + 12 + 48);

    const fill = await renderWith(<EmptyState layout="fill" illustration="money-spent" title="one line" />);
    expect(flat(fill.getByTestId('empty-state-block')).minHeight).toBe(EMPTY_BLOCK_MIN_HEIGHT);

    // Today's zero states are inline with art, and must share the floor so
    // Spent Zero and Kept Zero match each other.
    const inlineArt = await renderWith(<EmptyState illustration="today-kept" title="hook" />);
    expect(flat(inlineArt.getByTestId('empty-state-block')).minHeight).toBe(EMPTY_BLOCK_MIN_HEIGHT);
  });

  it('leaves in-card body-only states at their natural height', async () => {
    const view = await renderWith(<EmptyState body="nothing here yet" />);
    expect(flat(view.getByTestId('empty-state-block')).minHeight).toBeUndefined();
    expect(view.queryByTestId('empty-state-fill')).toBeNull();
  });
});

describe('Money Spent gives the wrapper a height', () => {
  it('grows its content to the pane only when never logged, on the shared top padding', async () => {
    const empty = await renderWith(
      <SpentList sections={[]} onEditExpense={jest.fn()} onLogExpense={jest.fn()} />
    );
    const list = empty.getByTestId('spent-list', HIDDEN);
    const content = flat(list, 'contentContainerStyle');
    expect(content.flexGrow).toBe(1);
    expect(content.paddingBottom).toBe(spacing.xxl);
    // The 2pt drift: this list read a literal 12 while money.tsx read 14.
    expect(content.paddingTop).toBe(layout.paneContentTop);
    // The outer flex is what gives the list a pane's height at all; drop it
    // and centring silently stops.
    expect(flat(list).flex).toBe(1);
    expect(empty.getByTestId('empty-state-fill', HIDDEN)).toBeTruthy();
  });
});

describe('Leak finder teaser centres the same way', () => {
  it('fills and centres, with no top pad, so it moves with the month pane', async () => {
    const view = await renderWith(
      <LeakFinderTeaser interestRecorded={false} onRecordInterest={jest.fn()} />
    );
    const root = flat(view.getByTestId('leak-finder-teaser'));
    expect(root.flexGrow).toBe(1);
    expect(root.flex).toBeUndefined();
    expect(root.justifyContent).toBe('center');
    expect(root.paddingTop).toBeUndefined();
    expect(root.paddingHorizontal).toBe(spacing.xxl);
  });
});
