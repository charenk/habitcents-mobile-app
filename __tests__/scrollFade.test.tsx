/**
 * ScrollFade (Charen, 2026-09-07): a vertical scroller's end dissolves into
 * the surface below it rather than being sliced flat.
 *
 * What is pinned is the contract a caller relies on without seeing: it sits
 * at the bottom of its parent at the shared height, it never takes a touch,
 * it is invisible to assistive tech, and it runs from transparent to the
 * page background. The gradient is react-native-svg, not
 * expo-linear-gradient, and that choice is pinned too (see the component
 * header for the crash-incident reason).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient, Stop } from 'react-native-svg';
import { act, cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ScrollFade, SCROLL_FADE_HEIGHT } from '@/components/ui/ScrollFade';
import { lightTheme } from '@/constants/theme';

async function renderFade(props: Partial<React.ComponentProps<typeof ScrollFade>> = {}) {
  const view = await render(
    <ThemeProvider>
      <ScrollFade {...props} />
    </ThemeProvider>
  );
  await act(async () => {});
  return view;
}

afterEach(cleanup);

/**
 * react-native-svg's LinearGradient reads its <Stop> children as data and
 * folds them into a native gradient array; the Stops themselves never
 * mount, and RNTL's host-tree queries cannot see gradient props. So the
 * contract is read at the composite level through react-test-renderer:
 * the gradient elements and the Stop elements a caller actually authors.
 */
// react-test-renderer ships here without type declarations, and adding
// @types for one test would touch package.json, a native-fingerprint file
// (ADR 0029). The three members this file uses are typed locally instead.
type RtrInstance = {
  props: Record<string, unknown>;
  findAllByType: (type: unknown) => RtrInstance[];
};
type RtrTree = { root: RtrInstance };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require('react-test-renderer') as {
  create: (element: React.ReactElement) => RtrTree;
};

async function mount(node: React.ReactElement): Promise<RtrTree> {
  let tree!: RtrTree;
  await act(async () => {
    tree = TestRenderer.create(<ThemeProvider>{node}</ThemeProvider>);
  });
  return tree;
}

function stops(tree: RtrTree): Array<{ color: unknown; opacity: unknown }> {
  const [gradient] = tree.root.findAllByType(LinearGradient);
  return React.Children.toArray(gradient?.props.children as React.ReactNode)
    .filter((child): child is React.ReactElement => React.isValidElement(child) && child.type === Stop)
    .map((s) => {
      const p = s.props as { stopColor?: unknown; stopOpacity?: unknown };
      return { color: p.stopColor, opacity: p.stopOpacity };
    });
}

function gradientIds(tree: RtrTree): unknown[] {
  return tree.root.findAllByType(LinearGradient).map((g) => g.props.id);
}

describe('ScrollFade', () => {
  it('pins itself to the bottom of its parent at the shared height, untouchable and unspoken', async () => {
    const view = await renderFade();
    const wrap = view.getByTestId('scroll-fade', { includeHiddenElements: true });
    const style = StyleSheet.flatten(wrap.props.style);

    expect(style.position).toBe('absolute');
    expect(style.bottom).toBe(0);
    expect(style.left).toBe(0);
    expect(style.right).toBe(0);
    expect(style.height).toBe(SCROLL_FADE_HEIGHT);
    expect(wrap.props.pointerEvents).toBe('none');
    expect(wrap.props.accessibilityElementsHidden).toBe(true);
  });

  it('runs from transparent to the page background', async () => {
    const tree = await mount(<ScrollFade />);

    expect(stops(tree)).toEqual([
      { color: lightTheme.background, opacity: '0' },
      { color: lightTheme.background, opacity: '1' },
    ]);
  });

  it('takes a custom colour and height', async () => {
    const view = await renderFade({ color: '#FFFFFF', height: 20 });
    const wrap = view.getByTestId('scroll-fade', { includeHiddenElements: true });
    expect(StyleSheet.flatten(wrap.props.style).height).toBe(20);

    const tree = await mount(<ScrollFade color="#FFFFFF" height={20} />);
    expect(stops(tree).map((s) => s.color)).toEqual(['#FFFFFF', '#FFFFFF']);
  });

  // The two Today panes stay mounted together, and react-native-svg gradient
  // ids are global across every Svg on screen, so two fades must not share one.
  it('gives each instance its own gradient id', async () => {
    const tree = await mount(
      <>
        <ScrollFade />
        <ScrollFade />
      </>
    );
    const ids = gradientIds(tree);
    expect(ids).toHaveLength(2);
    expect(ids.every((id) => typeof id === 'string' && id.startsWith('scroll-fade-'))).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });
});
