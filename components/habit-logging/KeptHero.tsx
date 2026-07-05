import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { keptHeroLabel } from '@/utils/a11y';

type KeptHeroProps = {
  cents: number;
};

/**
 * The Kept hero on the Habits tab (spec 01 §4.1). On any skip, the amount
 * counts up over 250ms while tinting green and scaling to 1.06, then settles
 * back over 200ms. Decreases (corrections) count down with no pulse.
 * Reduced-motion: instant swap, no scale. This is the only cross-habit
 * aggregate; no other cross-habit number exists.
 */
export function KeptHero({ cents }: KeptHeroProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [display, setDisplay] = useState(cents);
  const prevRef = useRef(cents);
  const scale = useRef(new Animated.Value(1)).current;
  const tint = useRef(new Animated.Value(0)).current; // 0 = text color, 1 = primary
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { if (mounted) setReduceMotion(!!v); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const from = prevRef.current;
    const to = cents;
    prevRef.current = to;
    if (from === to) return;

    if (reduceMotion) {
      setDisplay(to);
      return;
    }

    const isIncrease = to > from;
    const duration = 250;
    const start = Date.now();
    let raf: ReturnType<typeof setTimeout>;
    const step = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) {
        raf = setTimeout(step, 16);
      }
    };
    step();

    if (isIncrease) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.06, duration: 250, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(tint, { toValue: 1, duration: 250, useNativeDriver: false }),
          Animated.timing(tint, { toValue: 0, duration: 200, useNativeDriver: false }),
        ]),
      ]).start();
    }

    return () => clearTimeout(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents, reduceMotion]);

  const color = tint.interpolate({ inputRange: [0, 1], outputRange: [theme.text, theme.primary] });

  // One utterance, spoken on settle (spec 09 §2, row "Kept hero"): the label is
  // keyed to the final `cents`, not the per-frame `display`, so VoiceOver
  // announces the settled value once rather than every count-up frame. Inner
  // text nodes are hidden from the a11y tree so they are not read separately.
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={keptHeroLabel(format(cents))}
    >
      <Text style={styles.label} importantForAccessibility="no">{strings.habitLogging.keptSoFar}</Text>
      <Animated.Text
        style={[styles.amount, { color, transform: [{ scale }] }]}
        importantForAccessibility="no"
      >
        {format(display)}
      </Animated.Text>
      <Text style={styles.caption} importantForAccessibility="no">
        {cents === 0 ? strings.habitLogging.keptZeroCaption : strings.habitLogging.keptCaption}
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 18,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: theme.textSecondary,
    },
    amount: {
      fontSize: 42,
      fontWeight: '800',
      marginTop: 4,
      letterSpacing: -1,
    },
    caption: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
  });
}
