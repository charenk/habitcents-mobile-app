import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

export type ShareCounterCardProps = {
  amount: string;
  days: number;
};

/**
 * The branded image captured for the native share sheet (roadmap P4-3).
 * Visually a standalone, square-ish sage-light card carrying the same "kept"
 * hero treatment as KeptHero (components/habit-logging/KeptHero.tsx): same
 * background, same display serif for the money, same eyebrow/wordmark
 * vocabulary. Kept as its own component (not a reuse of KeptHero) because it
 * renders on-screen (mounted and visible in app/share-card.tsx, not hidden
 * off-screen) for a view-shot capture, never live app chrome, and carries a
 * wordmark KeptHero has no reason to show.
 *
 * Plain View, not a Pressable or anything interactive: it exists only to be
 * captured by react-native-view-shot's captureRef in app/share-card.tsx.
 */
export const ShareCounterCard = forwardRef<View, ShareCounterCardProps>(function ShareCounterCard(
  { amount, days },
  ref
) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <Text style={styles.headline} maxFontSizeMultiplier={1.3} numberOfLines={2}>
        {strings.shareCard.headline(amount, days)}
      </Text>
      <Text style={styles.wordmark} maxFontSizeMultiplier={1.3}>
        {strings.shareCard.wordmark}
      </Text>
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      width: 320,
      aspectRatio: 1,
      backgroundColor: theme.primaryLight,
      borderRadius: radii.frame,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    headline: {
      fontSize: typeScale.displayMid,
      fontFamily: theme.fonts.display,
      color: theme.primaryDark,
      textAlign: 'center',
    },
    wordmark: {
      position: 'absolute',
      bottom: spacing.xxl,
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.primaryDark,
    },
  });
}
