import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import { keptHeroLabel } from '@/utils/a11y';

type KeptHeroProps = {
  cents: number;
  // Optional outer-style override (DI-6): defaults to unset so onboarding
  // success, which already sits inside its own padded container, keeps its
  // current full-width-within-parent look untouched.
  style?: StyleProp<ViewStyle>;
};

/**
 * The kept band (design/redesign-handoff/04-screens.md, "Today" 2): a
 * sage-light feature card holding the one cross-habit aggregate in the app.
 * Eyebrow in sage-dark, the amount in the display serif with tabular figures,
 * caption below. Zero swaps the caption for the first-skip line.
 *
 * Deliberately motionless. The redesign allows exactly one playful motion in
 * the app and spends it on the skip confirmation (CheckInCard), so the older
 * count-up plus scale/tint pulse is gone. That also retires the mixed
 * native/JS Animated driver on a single node, which crashed release builds.
 */
export function KeptHero({ cents, style }: KeptHeroProps) {
  const theme = useTheme();
  const strings = useStrings();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // One utterance (spec 09 §2, row "Kept hero"): the band reads as a single
  // node, so VoiceOver says the settled value once instead of three fragments.
  return (
    <View
      style={[styles.card, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={keptHeroLabel(format(cents))}
    >
      <Text style={styles.label} importantForAccessibility="no" maxFontSizeMultiplier={1.5}>
        {strings.habitLogging.keptSoFar}
      </Text>
      {/*
        The kept band is the app's biggest number: a 42pt display serif,
        centered, with nothing to wrap onto. Uncapped it reached roughly 130pt
        at the top accessibility sizes and broke mid-currency-string.
        maxFontSizeMultiplier 1.3 is the ratified serif-money cap
        (design/PATTERN_VOCABULARY.md), and adjustsFontSizeToFit +
        numberOfLines keep a long amount on one line inside the band, which is
        what spec 09 row "Kept hero" asks for: the number scales, and never
        truncates. Same treatment SpentKeptChips already got under UX-067.
      */}
      <Text
        style={styles.amount}
        importantForAccessibility="no"
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {format(cents)}
      </Text>
      <Text style={styles.caption} importantForAccessibility="no" maxFontSizeMultiplier={1.5}>
        {cents === 0 ? strings.habitLogging.keptZeroCaption : strings.habitLogging.keptCaption}
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.primaryLight,
      borderRadius: radii.feature,
      // This band centers its content, so it is deliberately NOT on the
      // spacing.xl top-level card padding: it has no left content edge to
      // align. 22 is the one value on this screen that is off the ratified
      // 2pt scale (which skips from 20 to 24); left as-is rather than change
      // the hero's height in a spacing pass. Worth settling on device.
      paddingVertical: 22,
      paddingHorizontal: spacing.gutter,
      alignItems: 'center',
    },
    label: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.primaryDark,
      textAlign: 'center',
      // UX-060: the string stays sentence case (constants/strings.ts); this
      // eyebrow uppercases via style, matching the rest of the vocabulary.
      textTransform: 'uppercase',
    },
    // Kept is the hero currency number, so it carries the display serif
    // (spec 01 section 2) with tabular figures. Sage-dark rather than sage:
    // the brand green does not carry on the sage-light band.
    amount: {
      fontSize: typeScale.keptHero,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.primaryDark,
      marginTop: 6,
      textAlign: 'center',
    },
    caption: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 2,
      textAlign: 'center',
    },
  });
}
