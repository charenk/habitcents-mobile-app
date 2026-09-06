/**
 * TabBarIcon: the bottom tab bar's icon, and the surface that marks the
 * selected tab.
 *
 * The problem it solves is measurable, not a matter of taste. Active sage
 * (#2C7851) and inactive mist (#677481) sit at 1.12:1 against each other, and
 * the active tab is actually 14 percent DARKER than its neighbours. Hue alone
 * cannot carry the selected state: in grayscale, or to a red-green colour-blind
 * user, the bar would have no selection at all. That requirement is from
 * ADR 0037 and it still holds.
 *
 * What changed (2026-09-06): the signal is the glyph itself. Selected tabs are
 * filled, unselected tabs are outlined, and there is no surface behind either.
 * Filled against outlined is a difference in mass, so it survives desaturation
 * the way the old pill did, and it is the treatment iOS itself uses. Two
 * signals now, one of which is colour:
 *  1. a filled glyph against an outlined one,
 *  2. a heavier, darker label (handled in app/(tabs)/_layout.tsx).
 *
 * The pill this replaces was Chip's `soft` selected tone. It read as a bordered
 * box floating in the chrome, which is the heaviest thing the tab bar contained
 * and heavier than the content above it. TabBar.md carried the escape hatch:
 * "if the border reads heavy at arm's length, fill-only is a one-line change".
 * It did, so the whole surface goes rather than just its border.
 *
 * The stroke weights went with it. The old 2.25-against-1.5 gap existed to give
 * the pill a second non-colour partner; a filled glyph already carries far more
 * weight than a stroke bump can, and 2.25 under a fill just bloats the shape.
 *
 * No motion, deliberately. The house rule is that thumb swaps in switchers are
 * instant, SegmentedControl.tsx rejected a sliding thumb as "a second animated
 * surface competing with the sheet and toast motion the spec already budgets",
 * and the tab bar is named in design/INCIDENT-build5-launch-crash.md as a
 * release-crash suspect. A static answer needs no ADR for the motion budget.
 */
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { TrendingUpFilled, WalletFilled, type FilledGlyphProps } from './TabGlyphsFilled';

/**
 * One entry per tab. `outline` is the unselected glyph and, where lucide can
 * fill its own geometry, the selected one too. `Filled` is only present for the
 * glyphs lucide draws as open paths, which a naive fill would deform (see
 * TabGlyphsFilled).
 */
type TabGlyphSpec = {
  outline: IconName;
  Filled?: ComponentType<FilledGlyphProps>;
};

const TAB_GLYPHS = {
  // Closed geometry: Sun's centre is a circle, LayoutGrid is four rects. The
  // rays and gaps are open paths, which fill to nothing and so stay strokes.
  Sun: { outline: 'Sun' },
  LayoutGrid: { outline: 'LayoutGrid' },
  // Open geometry: authored fills.
  Wallet: { outline: 'Wallet', Filled: WalletFilled },
  TrendingUp: { outline: 'TrendingUp', Filled: TrendingUpFilled },
} as const satisfies Record<string, TabGlyphSpec>;

/** Deliberately narrower than IconName: only these four glyphs have a
 *  selected-state answer, so a fifth tab has to come here and choose one. */
export type TabGlyphName = keyof typeof TAB_GLYPHS;

/** The outline weight, now used in both states. */
const STROKE = 1.5;

/** The box every tab icon reserves, selected or not, so nothing reflows when
 *  the selection moves and a filled glyph cannot nudge its neighbours. */
const BOX = 32;

export type TabBarIconProps = {
  name: TabGlyphName;
  /** Supplied by React Navigation. */
  focused: boolean;
  /** Supplied by React Navigation from tabBarActiveTintColor / InactiveTintColor,
   *  so the tint stays token-driven rather than hard-coded here. */
  color: string;
  size: number;
};

export function TabBarIcon({ name, focused, color, size }: TabBarIconProps) {
  const spec: TabGlyphSpec = TAB_GLYPHS[name];
  const Filled = spec.Filled;

  return (
    <View testID={focused ? 'tab-icon-active' : 'tab-icon-inactive'} style={styles.box}>
      {focused && Filled ? (
        // testID lives on this wrapper rather than the Svg: react-native-svg
        // has no special handling for it, so it never reaches the native view
        // as a testID an RNTL query can find. Same reasoning as EmptyState's
        // icon wrapper.
        <View testID={`tab-glyph-filled-${name}`}>
          <Filled color={color} size={size} />
        </View>
      ) : (
        <Icon
          name={spec.outline}
          size={size}
          color={color}
          strokeWidth={STROKE}
          // lucide forwards this onto every subpath, so a closed glyph fills
          // and an open one is unaffected.
          fill={focused ? color : 'none'}
        />
      )}
    </View>
  );
}

// Theme-free: the box is geometry only, and both tints arrive as props from
// React Navigation.
const styles = StyleSheet.create({
  box: {
    width: BOX,
    height: BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
