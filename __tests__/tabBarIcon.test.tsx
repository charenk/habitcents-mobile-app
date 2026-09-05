/**
 * TabBarIcon (ADR 0037): the selected tab's three signals.
 *
 * Why this file exists at all: before ADR 0037 nothing in __tests__ touched the
 * tab bar, and the selected state was carried by hue alone. Active sage and
 * inactive mist measure 1.12:1 against each other, so in grayscale, or to a
 * red-green colour-blind user, there was no selection. The fix was to add two
 * signals that are not colour, and those two are exactly what a colour-blind
 * regression would silently undo. So they are pinned here, not the tint.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TabBarIcon } from '@/components/ui/TabBarIcon';
import { lightTheme, radii } from '@/constants/theme';

// Awaited, matching every other render helper in this suite: the theme
// provider settles a font/async read on mount.
async function renderIcon(focused: boolean) {
  const view = await render(
    <ThemeProvider>
      <TabBarIcon
        name="Sun"
        focused={focused}
        color={focused ? lightTheme.primary : lightTheme.tabIconDefault}
        size={24}
      />
    </ThemeProvider>
  );
  await act(async () => {});
  return view;
}

afterEach(cleanup);

/** RN flattens style arrays only on request; nulls are dropped by the renderer. */
function styleOf(node: { props: Record<string, unknown> }): Record<string, unknown> {
  const style = node.props.style;
  const parts = Array.isArray(style) ? style : [style];
  return Object.assign({}, ...parts.filter(Boolean));
}

describe('TabBarIcon: the pill', () => {
  it('fills and borders only when the tab is focused', async () => {
    const view = await renderIcon(true);
    const active = styleOf(view.getByTestId('tab-icon-active'));

    expect(active.backgroundColor).toBe(lightTheme.primaryLight);
    expect(active.borderColor).toBe(lightTheme.primary);
    expect(active.borderRadius).toBe(radii.control);
  });

  it('is transparent when the tab is not focused', async () => {
    const view = await renderIcon(false);
    const inactive = styleOf(view.getByTestId('tab-icon-inactive'));

    expect(inactive.backgroundColor).toBeUndefined();
    expect(inactive.borderColor).toBe('transparent');
  });

  // The unselected tab reserves the same box, so the row does not reflow when
  // the selection moves. A pill that only existed while focused would shift
  // every sibling icon on each tab change.
  it('reserves the same box in both states', async () => {
    const activeView = await renderIcon(true);
    const active = styleOf(activeView.getByTestId('tab-icon-active'));
    const inactiveView = await renderIcon(false);
    const inactive = styleOf(inactiveView.getByTestId('tab-icon-inactive'));

    expect(active.width).toBe(inactive.width);
    expect(active.height).toBe(inactive.height);
    expect(inactive.borderWidth).toBe(active.borderWidth);
  });
});

/** lucide passes strokeWidth straight to the react-native-svg root, so it is
 *  readable off the rendered tree without reaching into lucide's internals. */
function strokeOf(view: { toJSON: () => unknown }): number | undefined {
  const walk = (node: unknown): number | undefined => {
    if (!node || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) {
      for (const child of node) {
        const hit = walk(child);
        if (hit !== undefined) return hit;
      }
      return undefined;
    }
    const n = node as { props?: Record<string, unknown>; children?: unknown };
    const width = n.props?.strokeWidth;
    if (typeof width === 'number') return width;
    return walk(n.children);
  };
  return walk(view.toJSON());
}

describe('TabBarIcon: the stroke', () => {
  // This is the signal that survives desaturation, so it is the one that
  // matters most: strip the colour and the weight is all that is left.
  it('is heavier when focused than when not', async () => {
    const activeView = await renderIcon(true);
    const active = strokeOf(activeView);
    const inactiveView = await renderIcon(false);
    const inactive = strokeOf(inactiveView);

    expect(active).toBe(2.25);
    expect(inactive).toBe(1.5);
    expect(active as number).toBeGreaterThan(inactive as number);
  });
});
