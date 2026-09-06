/**
 * TabBarIcon: the selected tab's non-colour signal.
 *
 * Why this file exists at all: before ADR 0037 nothing in __tests__ touched the
 * tab bar, and the selected state was carried by hue alone. Active sage and
 * inactive mist measure 1.12:1 against each other, so in grayscale, or to a
 * red-green colour-blind user, there was no selection. That requirement did not
 * change when the pill was replaced by a filled glyph (2026-09-06); only the
 * signal did. Fill against outline is what a colour-blind regression would
 * silently undo, so it is pinned here, not the tint.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TabBarIcon, type TabGlyphName } from '@/components/ui/TabBarIcon';
import { lightTheme } from '@/constants/theme';

// Awaited, matching every other render helper in this suite: the theme
// provider settles a font/async read on mount.
async function renderIcon(focused: boolean, name: TabGlyphName = 'Sun') {
  const view = await render(
    <ThemeProvider>
      <TabBarIcon
        name={name}
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

/** lucide passes `fill` straight to the react-native-svg root and to every
 *  subpath, so the rendered value is readable without reaching into lucide. */
function fillOf(view: { toJSON: () => unknown }): string | undefined {
  const walk = (node: unknown): string | undefined => {
    if (!node || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) {
      for (const child of node) {
        const hit = walk(child);
        if (hit !== undefined) return hit;
      }
      return undefined;
    }
    const n = node as { props?: Record<string, unknown>; children?: unknown };
    const fill = n.props?.fill;
    if (typeof fill === 'string') return fill;
    return walk(n.children);
  };
  return walk(view.toJSON());
}

describe('TabBarIcon: fill marks the selection', () => {
  // The signal that survives desaturation: strip the colour and the glyph's
  // mass is all that is left.
  it('fills a lucide-fillable glyph with the tint when focused', async () => {
    const view = await renderIcon(true);
    expect(fillOf(view)).toBe(lightTheme.primary);
  });

  it('leaves the same glyph unfilled when not focused', async () => {
    const view = await renderIcon(false);
    expect(fillOf(view)).toBe('none');
  });

  // Wallet and TrendingUp are open paths: a naive fill deforms them, so they
  // carry authored filled variants. If one is dropped, the glyph silently
  // becomes a lump rather than failing loudly, so the swap is pinned.
  it.each<TabGlyphName>(['Wallet', 'TrendingUp'])(
    'renders the authored filled variant for %s when focused',
    async (name) => {
      const focused = await renderIcon(true, name);
      expect(focused.getByTestId(`tab-glyph-filled-${name}`)).toBeTruthy();

      const unfocused = await renderIcon(false, name);
      expect(unfocused.queryByTestId(`tab-glyph-filled-${name}`)).toBeNull();
    }
  );
});

describe('TabBarIcon: the box', () => {
  // A filled glyph must not nudge its neighbours, and the row must not reflow
  // when the selection moves.
  it('reserves the same box in both states', async () => {
    const activeView = await renderIcon(true);
    const active = styleOf(activeView.getByTestId('tab-icon-active'));
    const inactiveView = await renderIcon(false);
    const inactive = styleOf(inactiveView.getByTestId('tab-icon-inactive'));

    expect(active.width).toBe(inactive.width);
    expect(active.height).toBe(inactive.height);
  });

  // The pill is gone: no fill, no border, nothing behind the glyph. This is the
  // regression that would quietly reintroduce a surface in the chrome.
  it('draws no surface behind the glyph in either state', async () => {
    const activeView = await renderIcon(true);
    const active = styleOf(activeView.getByTestId('tab-icon-active'));
    const inactiveView = await renderIcon(false);
    const inactive = styleOf(inactiveView.getByTestId('tab-icon-inactive'));

    for (const box of [active, inactive]) {
      expect(box.backgroundColor).toBeUndefined();
      expect(box.borderWidth).toBeUndefined();
      expect(box.borderColor).toBeUndefined();
    }
  });
});
