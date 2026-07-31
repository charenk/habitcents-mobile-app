import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { keptHeroLabel } from '@/utils/a11y';

type KeptHeroProps = {
  cents: number;
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
export function KeptHero({ cents }: KeptHeroProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // One utterance (spec 09 §2, row "Kept hero"): the band reads as a single
  // node, so VoiceOver says the settled value once instead of three fragments.
  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="text"
      accessibilityLabel={keptHeroLabel(format(cents))}
    >
      <Text style={styles.label} importantForAccessibility="no">
        {strings.habitLogging.keptSoFar}
      </Text>
      <Text style={styles.amount} importantForAccessibility="no">
        {format(cents)}
      </Text>
      <Text style={styles.caption} importantForAccessibility="no">
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
      paddingVertical: 22,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    label: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.primaryDark,
      textAlign: 'center',
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
