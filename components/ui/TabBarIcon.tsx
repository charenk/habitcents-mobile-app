/**
 * TabBarIcon: the bottom tab bar's icon, plus the surface that marks the
 * selected tab (ADR 0037).
 *
 * The problem it solves is measurable, not a matter of taste. Active sage
 * (#2C7851) and inactive mist (#677481) sit at 1.12:1 against each other, and
 * the active tab is actually 14 percent DARKER than its neighbours. Hue was
 * carrying the whole selected state, so in grayscale, or to a red-green
 * colour-blind user, the bar had no selection at all.
 *
 * Three signals now, only one of which is colour:
 *  1. a sage-light pill behind the icon,
 *  2. a heavier icon stroke (2.25 against 1.5),
 *  3. a heavier, darker label (handled in app/(tabs)/_layout.tsx).
 *
 * The pill is NOT a new pattern. It is Chip's existing `soft` selected tone
 * (primaryLight fill, primary border), which that component's record says
 * exists "for rails where a solid fill would read as a CTA". A tab bar is a
 * rail, and a solid sage tab would compete with Today's green plus button.
 * PATTERN_VOCABULARY's "do not invent a third switcher" rule is respected:
 * this reuses a selected tone, it does not add a track-and-thumb.
 *
 * No motion, deliberately. The house rule is that thumb swaps in switchers are
 * instant, SegmentedControl.tsx rejected a sliding thumb as "a second animated
 * surface competing with the sheet and toast motion the spec already budgets",
 * and the tab bar is named in design/INCIDENT-build5-launch-crash.md as a
 * release-crash suspect. A static answer needs no ADR for the motion budget.
 */
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, type AppTheme } from '@/constants/theme';

/** Stroke weights. The gap is the signal that survives desaturation. */
const STROKE_ACTIVE = 2.25;
const STROKE_INACTIVE = 1.5;

/** Pill geometry. Rounded rect, not stadium: Charen's 2026-08-16 call moved
 *  the switcher family off `radii.pill` onto the rounded-rect scale. */
const PILL_WIDTH = 56;
const PILL_HEIGHT = 32;

export type TabBarIconProps = {
  name: IconName;
  /** Supplied by React Navigation. */
  focused: boolean;
  /** Supplied by React Navigation from tabBarActiveTintColor / InactiveTintColor,
   *  so the tint stays token-driven rather than hard-coded here. */
  color: string;
  size: number;
};

export function TabBarIcon({ name, focused, color, size }: TabBarIconProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      testID={focused ? 'tab-icon-active' : 'tab-icon-inactive'}
      style={[styles.pill, focused ? styles.pillActive : null]}
    >
      <Icon
        name={name}
        size={size}
        color={color}
        strokeWidth={focused ? STROKE_ACTIVE : STROKE_INACTIVE}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    // The unselected tab reserves the same box, so nothing shifts when the
    // selection moves. Only the fill and border appear.
    pill: {
      width: PILL_WIDTH,
      height: PILL_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.control,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    pillActive: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
  });
}
