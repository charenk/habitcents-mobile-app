/**
 * ScrollFade: the end of a vertical scroller dissolves into the surface
 * below it instead of being sliced flat (Charen, 2026-09-07).
 *
 * Today's panes end in the ActionDock. When the dock's hairline went, the
 * scrolled content ended at an invisible line above the pill, and on a long
 * log the last row was cut off mid-glyph. This is a functional edge fade, the
 * vertical sibling of CategoryChipRow's horizontal one: it says "there is
 * more" without drawing a seam. PATTERN_VOCABULARY names scroll-edge fades
 * as functional, not decorative, which is why a gradient is allowed here.
 *
 * Drawn with react-native-svg, NOT expo-linear-gradient, on purpose. The
 * build-5 launch crash is still open and its only native delta was
 * expo-linear-gradient plus react-native-svg; the svg module already renders
 * in the launch path (every tab-bar icon), the gradient one does not (the
 * paywall hero and the expense sheet's chip rail render only when opened).
 * A fade on the first screen must not be the thing that puts a new module
 * into that path.
 *
 * STATIC, by decision. A fade that dissolves as the list reaches its end is
 * nicer, and it would be the app's first scroll-driven UI, which
 * ActionDock's record says needs its own ADR and a release-configuration
 * boot walk. So the fade is always on and sized to the scroller's own end
 * padding: with 24pt of padding under the last row, only that row's bottom
 * 12pt ever sits under the faintest third of a 36pt fade, so it stays
 * readable at the end and dissolves into the dock the rest of the time.
 *
 * Usage: make the scroller's parent `flex: 1` and render this as that
 * parent's LAST child. It positions itself at the bottom, takes the full
 * width, never intercepts touches, and is invisible to assistive tech.
 * Over an empty or short pane it is background over background.
 */
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

/** Sized against the scrollers' 24pt end padding; see the file header. */
export const SCROLL_FADE_HEIGHT = 36;

export type ScrollFadeProps = {
  /** Defaults to the page background, which is also the dock's fill. */
  color?: string;
  height?: number;
};

export function ScrollFade({ color, height = SCROLL_FADE_HEIGHT }: ScrollFadeProps) {
  const theme = useTheme();
  const fill = color ?? theme.background;
  // Gradient ids are global across every Svg on screen in react-native-svg,
  // and both Today panes stay mounted, so each instance needs its own.
  // useId's separators are not valid in a url() reference, hence the strip.
  const gradientId = `scroll-fade-${useId().replace(/[^A-Za-z0-9]/g, '')}`;

  return (
    <View
      style={[styles.wrap, { height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="scroll-fade"
    >
      <Svg width="100%" height={height} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fill} stopOpacity="0" />
            <Stop offset="1" stopColor={fill} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={height} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
