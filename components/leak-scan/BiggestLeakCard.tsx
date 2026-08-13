import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, shadows, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { habitCandidateToDetectedHabit } from '@/utils/leakScanBridge';
import type { HabitCandidate } from '@/utils/leakScan/types';

type BiggestLeakCardProps = {
  /** The top-ranked candidate (result.habits[0], already governability-ranked
   *  by the pipeline). */
  candidate: HabitCandidate;
  coveredDays: number;
  /** Wired by the caller to the EXACT existing handlers: handleTrackLeak
   *  (opens the same Decision-1 pick-one sheet the ranked list's "Track this
   *  leak" uses) and handleNotAHabit (suppress + re-run). Nothing new is
   *  invented here, only a different lead-in surface for the same actions. */
  onBreak: () => void;
  onDismiss: () => void;
};

/**
 * Finding-first ladder (ADR 0020, W4 onboarding redesign, Charen 2026-08-04):
 * the results screen leads with this card instead of the dashboard. The
 * evidence line reuses the exact hasReliableRate branching habit-logging's
 * LeakCard already carries (components/habit-logging/LeakCard.tsx): a
 * monthly rate only once the pipeline's own evidence window supports one,
 * an observed total otherwise, never a fabricated rate.
 * habitCandidateToDetectedHabit is the same pure bridge handleTrackLeak
 * already calls; it is called again here only to read its evidence fields,
 * no side effects (addScanHabit only happens when Break it is pressed).
 */
export function BiggestLeakCard({ candidate, coveredDays, onBreak, onDismiss }: BiggestLeakCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const habit = useMemo(
    () => habitCandidateToDetectedHabit(candidate, coveredDays),
    [candidate, coveredDays]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{strings.leakScan.biggestLeakEyebrow}</Text>
      <Text style={styles.name}>{candidate.merchantDisplay}.</Text>
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
            {strings.habitLogging.leakEvidenceObserved(habit.name, format(habit.observedTotal), habit.observedCount)}
          </Text>
          <Text style={styles.evidenceHint}>{strings.habitLogging.leakEvidenceKeepLogging}</Text>
        </>
      )}
      <View style={styles.buttonsRow}>
        <Button label={strings.habitLogging.breakIt} onPress={onBreak} variant="primary" style={styles.grow} />
        <Button label={strings.habitLogging.notThisOne} onPress={onDismiss} variant="secondary" style={styles.grow} />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 18,
      ...shadows.card,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginBottom: 6,
    },
    name: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      marginBottom: 8,
    },
    evidence: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      marginBottom: 14,
      lineHeight: 19,
      fontVariant: ['tabular-nums'],
    },
    // The observed line and its quiet second line read as one paragraph
    // (matches LeakCard's evidenceTight/evidenceHint pairing).
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
