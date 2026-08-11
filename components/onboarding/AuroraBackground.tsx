import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { withAlpha } from '@/utils/color';
import { useReducedMotion } from '@/utils/motion';

// Not in the theme palette: a near-white violet used only for the aurora's
// softest highlight stops, one step lighter than lavender. Local to this
// component on purpose (nothing else should reach for it).
const NEAR_WHITE_VIOLET = '#F3F0FF';

const AURORA_ROTATION_DEG = 10;
const DRIFT_DURATION_MS = 60000;

// One period of the streak gradient, as fractions of the period's own width
// (0 to 1) plus an alpha at full strength. The full gradient below repeats
// this twice, back to back, so translating the strip by exactly one period
// width (PERIOD_WIDTH) lands on a pixel-identical frame and the drift loops
// with no visible seam. Kept a hair inside [0, 1] (0.02 / 0.98) so the two
// repeats never place two stops at the exact same location.
type PeriodStop = { location: number; color: string; alpha: number };

/**
 * Tuned live in the simulator against Charen's device screenshot (the first
 * two passes read as near-white on a real display). Peaks alternate with
 * near-transparent valleys so the field reads as distinct tilted light
 * shafts, the reference look, rather than one blended wash. Contrast note:
 * the strongest peak (lavender 0.38 over snow) still leaves the ink
 * headline far above AA; the aurora lives behind type, never over it.
 */
function periodStops(theme: ReturnType<typeof useTheme>): PeriodStop[] {
  return [
    { location: 0.02, color: theme.lavender, alpha: 0 },
    { location: 0.1, color: theme.lavender, alpha: 0.38 },
    { location: 0.2, color: NEAR_WHITE_VIOLET, alpha: 0.08 },
    { location: 0.3, color: theme.categoryColors.utility, alpha: 0.3 },
    { location: 0.4, color: NEAR_WHITE_VIOLET, alpha: 0.06 },
    { location: 0.5, color: theme.categoryColors.transport, alpha: 0.24 },
    { location: 0.6, color: NEAR_WHITE_VIOLET, alpha: 0.3 },
    { location: 0.72, color: theme.lavender, alpha: 0.28 },
    { location: 0.82, color: NEAR_WHITE_VIOLET, alpha: 0.06 },
    { location: 0.92, color: theme.categoryColors.utility, alpha: 0.2 },
    { location: 0.98, color: theme.lavender, alpha: 0 },
  ];
}

/**
 * Doubles a period's stops side by side into one gradient's colors/locations
 * arrays, scaling every alpha by `alphaScale` (the depth strip renders at
 * half strength). `stops` must already be sorted ascending within [0, 1].
 */
function buildAuroraStops(stops: PeriodStop[], alphaScale: number) {
  const colors: string[] = [];
  const locations: number[] = [];
  for (const half of [0, 1] as const) {
    for (const stop of stops) {
      colors.push(withAlpha(stop.color, stop.alpha * alphaScale));
      locations.push(half === 0 ? stop.location * 0.5 : 0.5 + stop.location * 0.5);
    }
  }
  return { colors, locations };
}

/**
 * Welcome screen aurora (design/welcome-aurora unit; native adaptation of the
 * 21st.dev aurora background, light mode only). Purely decorative: airy
 * blue-violet streaks concentrated top-right, dissolving into the snow
 * ground by mid-screen. This is the second of exactly two decorative
 * gradients the app allows (design/PATTERN_VOCABULARY.md "Color"); everything
 * else in the palette carries meaning, this one is atmosphere only, so it
 * has zero touch and zero accessibility presence.
 *
 * Two horizontal LinearGradient strips (a primary and a half-alpha depth
 * copy at a phase offset) sit inside ONE rotated Animated.View so a single
 * Animated.Value drives both, matching this app's one-driver-per-node motion
 * rule (see ExampleCaption in app/onboarding/welcome.tsx: two release builds
 * crashed on mixed drivers on one node). Two overlay gradients above the
 * streaks approximate a mask: a vertical transparent-to-snow fade that
 * finishes by 60% of the aurora's height (the "dissolving by mid-screen"
 * read), and a horizontal snow-to-transparent fade that hides the top-left
 * so the glow reads as concentrated top-right. No blur dependency; the wide
 * stop spacing above does the softening.
 */
export function AuroraBackground() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const translate = useRef(new Animated.Value(0)).current;

  const stripWidth = width * 2.2;
  const stripHeight = height * 0.62;
  const periodWidth = stripWidth / 2;

  const stops = useMemo(() => periodStops(theme), [theme]);
  const primaryStops = useMemo(() => buildAuroraStops(stops, 1), [stops]);
  const depthStops = useMemo(() => buildAuroraStops(stops, 0.5), [stops]);

  // Full snow reached at 60% of the aurora's own height, expressed as a
  // fraction of the SCREEN height (the vertical mask spans the full screen
  // so anything below the aurora is already background-colored anyway).
  const verticalFullSnowLocation = Math.min(1, (stripHeight * 0.72) / height);

  useEffect(() => {
    // Reduced motion: render the first (static) frame, never start the loop
    // (ExampleCaption's early-return pattern, same file family).
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: 1,
        duration: DRIFT_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [reduceMotion, translate]);

  const translateX = translate.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -periodWidth],
  });

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: -stripHeight * 0.05,
          left: -(stripWidth - width) / 2,
          width: stripWidth,
          height: stripHeight,
          transform: [{ rotate: `${AURORA_ROTATION_DEG}deg` }, { translateX }],
        }}
      >
        <LinearGradient
          colors={primaryStops.colors as unknown as [string, string, ...string[]]}
          locations={primaryStops.locations as unknown as [number, number, ...number[]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Depth copy: half alpha, phase-shifted a quarter period so its bands
            fall between the primary strip's, not on top of them. */}
        <LinearGradient
          colors={depthStops.colors as unknown as [string, string, ...string[]]}
          locations={depthStops.locations as unknown as [number, number, ...number[]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            position: 'absolute',
            top: 0,
            left: -periodWidth * 0.25,
            width: stripWidth,
            height: stripHeight,
          }}
        />
      </Animated.View>

      {/* Mask approximation, above the streaks: vertical fade to snow first
          (finishes by 60% of the aurora's height), then a horizontal fade
          that hides the top-left so the glow biases top-right. */}
      <LinearGradient
        colors={[withAlpha(theme.snow, 0), theme.snow, theme.snow]}
        locations={[0, verticalFullSnowLocation, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[withAlpha(theme.snow, 0.85), withAlpha(theme.snow, 0.35), withAlpha(theme.snow, 0)]}
        locations={[0, 0.28, 0.55]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
