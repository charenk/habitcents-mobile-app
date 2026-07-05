import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

type CoachMomentSlotProps = {
  text: string;
  /** Milestone (chapter-crossing) treatment: tinted background + headline (spec 01 §4.5). */
  tint?: boolean;
  headline?: string;
};

/**
 * The quiet card inside the check-in confirmation slot (spec 01 §4.5). Never a
 * toast, never a modal; it occupies layout below the confirmation line. Final
 * copy selection (trigger matrix, rotation) is P2-2 (docs/design-package-phase2/
 * 04-p2-2-coach-moments.md); this component only renders whatever text/tint
 * the caller supplies and fires no event itself (callers fire
 * `coach_moment_shown` once per render at the call site).
 */
export function CoachMomentSlot({ text, tint, headline }: CoachMomentSlotProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View>
      {headline && <Text style={styles.headline}>{headline}</Text>}
      <View style={[styles.card, tint && styles.cardTint]}>
        <Ionicons name="leaf-outline" size={13} color={theme.textSecondary} style={styles.icon} />
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    headline: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
      marginTop: 10,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: theme.coachMomentBg,
      borderRadius: 12,
      padding: 12,
      marginTop: 10,
    },
    cardTint: {
      backgroundColor: theme.coachMomentMilestoneBg,
    },
    icon: {
      marginTop: 3,
    },
    text: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
  });
}
