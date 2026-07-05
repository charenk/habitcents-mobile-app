import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CoachMomentSlot } from './CoachMomentSlot';
import { cardText, type CoachMomentCardId } from '@/utils/coachMoments';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit } from '@/types/habit';
import { strings } from '@/constants/strings';

type LeakCardProps = {
  habit: DetectedHabit;
  onBreak: () => void;
  onDismiss: () => void;
  /**
   * DT-1 (P2-2, spec 01 §4.5, §3 "Detection"): fires once, ever, the first
   * time any leak is surfaced. The parent (Habits tab) resolves this via
   * `maybeShowDetectionMoment()` for at most one LeakCard in the list, so it
   * is undefined/null on every other card.
   */
  coachMomentCardId?: CoachMomentCardId | null;
};

/**
 * The leak card in "Leaks found" (spec 01 §3.1, §4.10): unchanged from v1,
 * real Break it / Not this one buttons (never swipe-only, acceptance-adjacent
 * requirement carried from spec 3.1 item 2). Adds the DT-1 Coach Moment slot
 * (P2-2) below the evidence/buttons, the closest analog to a "confirmation
 * slot" this surface has: the moment a leak is shown to the user.
 */
export function LeakCard({ habit, onBreak, onDismiss, coachMomentCardId }: LeakCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{habit.name}</Text>
      <Text style={styles.evidence}>
        {strings.habitLogging.leakEvidence(habit.name, format(habit.totalMonthlySpend), habit.occurrencesPerPeriod)}
      </Text>
      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={onBreak} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{strings.habitLogging.breakIt}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onDismiss} accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>{strings.habitLogging.notThisOne}</Text>
        </TouchableOpacity>
      </View>
      {coachMomentCardId && <CoachMomentSlot text={cardText(coachMomentCardId)} />}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    name: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
    },
    evidence: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 6,
      marginBottom: 12,
      lineHeight: 20,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    primaryButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.white,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
  });
}
