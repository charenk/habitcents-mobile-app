import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';

/**
 * Background tone of the slot (design/redesign-handoff/04-screens.md, "Today"):
 * sage-light after a skip, snow after a slip, lavender on a chapter crossing.
 */
export type CoachMomentTone = 'snow' | 'sage' | 'lavender';

type CoachMomentSlotProps = {
  text: string;
  /**
   * Milestone (chapter-crossing) treatment. Kept as-is for existing call sites;
   * equivalent to `tone="lavender"` and wins over an explicit tone.
   */
  tint?: boolean;
  /** Chapter line, e.g. "10 total skips · Rhythm". Renders as a pill on lavender. */
  headline?: string;
  tone?: CoachMomentTone;
};

/**
 * The quiet card inside the check-in confirmation slot (spec 01 §4.5). Never a
 * toast, never a modal; it occupies layout below the confirmation line. Final
 * copy selection (trigger matrix, rotation) is P2-2 (docs/design-package-phase2/
 * 04-p2-2-coach-moments.md); this component only renders whatever text/tone
 * the caller supplies and fires no event itself (callers fire
 * `coach_moment_shown` once per render at the call site).
 */
export function CoachMomentSlot({ text, tint, headline, tone = 'snow' }: CoachMomentSlotProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const resolved: CoachMomentTone = tint ? 'lavender' : tone;

  const cardStyle =
    resolved === 'lavender' ? styles.cardLavender : resolved === 'sage' ? styles.cardSage : styles.cardSnow;
  const iconColor =
    resolved === 'lavender' ? theme.lavender : resolved === 'sage' ? theme.primaryDark : theme.mist;

  return (
    <View>
      {headline ? (
        resolved === 'lavender' ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{headline}</Text>
          </View>
        ) : (
          <Text style={styles.headline}>{headline}</Text>
        )
      ) : null}
      <View style={[styles.card, cardStyle]}>
        <Icon name="Sprout" size={14} color={iconColor} style={styles.icon} />
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    headline: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.secondary,
      color: theme.ink,
      marginTop: 12,
    },
    pill: {
      alignSelf: 'flex-start',
      backgroundColor: theme.coachMomentMilestoneBg,
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginTop: 12,
    },
    pillText: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.secondary,
      color: theme.lavender,
      fontVariant: ['tabular-nums'],
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: radii.card,
      padding: 12,
      marginTop: 10,
    },
    cardSnow: {
      backgroundColor: theme.snow,
    },
    cardSage: {
      backgroundColor: theme.primaryLight,
    },
    cardLavender: {
      backgroundColor: theme.coachMomentMilestoneBg,
    },
    icon: {
      marginTop: 2,
    },
    text: {
      flex: 1,
      fontFamily: theme.fonts.ui,
      fontSize: 13.5,
      color: theme.slate,
      lineHeight: 19,
    },
  });
}
