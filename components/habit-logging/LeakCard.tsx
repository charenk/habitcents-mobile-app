import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CoachMomentSlot } from './CoachMomentSlot';
import { cardText, type CoachMomentCardId } from '@/utils/coachMoments';
import { radii, shadows, typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit } from '@/types/habit';
import { strings } from '@/constants/strings';

type LeakCardProps = {
  habit: DetectedHabit;
  onBreak: () => void;
  onDismiss: () => void;
  /**
   * DT-1 (P2-2, spec 01 §4.5, §3 "Detection"): fires once, ever, the first
   * time any leak is surfaced. The parent (Today) resolves this via
   * `maybeShowDetectionMoment()` for at most one LeakCard in the list, so it
   * is undefined/null on every other card.
   */
  coachMomentCardId?: CoachMomentCardId | null;
  /**
   * The habit was being broken and was stopped, so its history is still on
   * file (spec 04 "Today", stopped-habit state). Only the primary label
   * changes: restarting runs through the same pick-one sheet.
   */
  breakAgain?: boolean;
};

/**
 * The leak card in "Leaks found" (spec 01 §3.1, §4.10, restyled for
 * design/redesign-handoff/04-screens.md): white feature card, real Break it /
 * Not this one buttons, never swipe-only. Carries the DT-1 Coach Moment slot
 * (P2-2) below the buttons, the closest analog to a "confirmation slot" this
 * surface has: the moment a leak is shown to the user.
 */
function LeakCardImpl({ habit, onBreak, onDismiss, coachMomentCardId, breakAgain }: LeakCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{habit.name}</Text>
      {habit.hasReliableRate ? (
        <Text style={styles.evidence}>
          {strings.habitLogging.leakEvidenceReliable(
            habit.name,
            format(habit.totalMonthlySpend),
            habit.observedCount
          )}
        </Text>
      ) : (
        <>
          <Text style={[styles.evidence, styles.evidenceTight]}>
            {strings.habitLogging.leakEvidenceObserved(
              habit.name,
              format(habit.observedTotal),
              habit.observedCount
            )}
          </Text>
          <Text style={styles.evidenceHint}>{strings.habitLogging.leakEvidenceKeepLogging}</Text>
        </>
      )}
      <View style={styles.buttonsRow}>
        <Button
          label={breakAgain ? strings.today.breakItAgain : strings.habitLogging.breakIt}
          onPress={onBreak}
          variant="primary"
          style={styles.grow}
        />
        <Button
          label={strings.habitLogging.notThisOne}
          onPress={onDismiss}
          variant="secondary"
          style={styles.grow}
        />
      </View>
      {coachMomentCardId && <CoachMomentSlot text={cardText(coachMomentCardId)} />}
    </View>
  );
}

/**
 * Memoized: LeakCard renders once per discovered leak in Today's "Leaks
 * found" list. NOTE (perf phase, see PR body): as of this pass its only call
 * site (app/(tabs)/index.tsx renderItem) still builds onBreak/onDismiss as
 * fresh inline arrows on every render, so the memo does not yet bail there;
 * stabilizing that call site was skipped as too risky for a zero-visible-
 * change pass (see report).
 */
export const LeakCard = memo(LeakCardImpl);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.cloud,
      ...shadows.card,
    },
    name: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.button,
      color: theme.ink,
    },
    evidence: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      marginTop: 6,
      marginBottom: 14,
      lineHeight: 19,
      fontVariant: ['tabular-nums'],
    },
    // The observed line and its quiet second line read as one paragraph.
    evidenceTight: {
      marginBottom: 2,
    },
    evidenceHint: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
      marginBottom: 14,
      lineHeight: 18,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    grow: {
      flex: 1,
    },
  });
}
