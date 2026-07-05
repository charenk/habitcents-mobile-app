import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import {
  computeProjection,
  resolveSubscriptionAnswers,
  resolveViceAnswers,
  biggestLeakCandidate,
  candidateToSeedInput,
} from '@/utils/leakAudit';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';

/**
 * The reveal (spec 02 section 3.5). A hypothesis, not a verdict: the tilde is
 * mandatory, the honesty line names the basis. Both-empty case (section 8)
 * replaces the number with an honest no-number path; leak_revealed does not
 * fire there.
 */
export default function OnboardingRevealScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { currency, format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { auditAnswers, markHabitStarted, completeStep } = useOnboarding();
  const { seedDiscoveredHabit, startBreakingHabit, getHabitById } = useHabits();
  const { getCategoryByName } = useCategories();

  const [pickOneHabitId, setPickOneHabitId] = useState<string | null>(null);

  const subs = useMemo(
    () => resolveSubscriptionAnswers(auditAnswers.selectedSubscriptions, currency),
    [auditAnswers.selectedSubscriptions, currency]
  );
  const vices = useMemo(
    () => resolveViceAnswers(auditAnswers.viceAnswers, currency),
    [auditAnswers.viceAnswers, currency]
  );

  const projection = useMemo(() => computeProjection(subs, vices), [subs, vices]);
  const candidate = useMemo(() => biggestLeakCandidate(subs, vices), [subs, vices]);

  const pickOneHabit = pickOneHabitId ? getHabitById(pickOneHabitId) : null;

  // leak_revealed fires once, on render, only when there is a real number
  // (section 8: the both-empty honest path never fires this event).
  const trackedRef = React.useRef(false);
  React.useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    if (projection) {
      track('leak_revealed', { nSources: projection.nSources, hasEdits: projection.hasEdits });
    }
  }, [projection]);

  const goToGuidedLog = async () => {
    await completeStep('reveal');
    router.push('/onboarding/guided-log');
  };

  const handlePlugBiggestLeak = async () => {
    if (!candidate) {
      void goToGuidedLog();
      return;
    }
    const habit = await seedDiscoveredHabit(
      candidateToSeedInput(candidate, getCategoryByName('Other')?.id ?? 'Other')
    );
    setPickOneHabitId(habit.id);
  };

  const handleJustStartLogging = () => {
    void goToGuidedLog();
  };

  const handlePickOneStart = async (skipValue: number, valueEdited: boolean) => {
    if (!pickOneHabitId) return;
    await startBreakingHabit(pickOneHabitId, skipValue, valueEdited, 'detection');
    await markHabitStarted();
    setPickOneHabitId(null);
    void goToGuidedLog();
  };

  const handlePickOneCancel = () => {
    setPickOneHabitId(null);
    void goToGuidedLog();
  };

  React.useEffect(() => {
    if (projection) {
      AccessibilityInfo.announceForAccessibility?.(
        strings.onboarding.revealAnnouncement(`~${format(projection.yearlyCents)}`, format(projection.monthlyCents))
      );
    }
  }, [projection, format]);

  if (!projection) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.content}>
          <Text style={styles.title}>{strings.onboarding.noNumberYetTitle}</Text>
          <Text style={styles.sub}>{strings.onboarding.noNumberYetSubtitle}</Text>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={goToGuidedLog} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>{strings.onboarding.justStartLogging}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const captionText = auditAnswers.selectedSubscriptions.length > 0 && auditAnswers.viceAnswers.every((v) => v.band === 'never' || !v.answered)
    ? strings.onboarding.revealCaptionSubsOnly(format(projection.monthlyCents))
    : strings.onboarding.revealCaption(format(projection.monthlyCents));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.yearly}>{strings.onboarding.revealYearly(format(projection.yearlyCents))}</Text>
        <Text style={styles.caption}>{captionText}</Text>

        <View style={styles.breakdownCard}>
          {projection.breakdown.map((line) => (
            <View
              key={line.source}
              style={styles.breakdownRow}
              accessible
              accessibilityLabel={strings.onboarding.breakdownLine(line.source, format(line.yearlyCents))}
            >
              <Text style={styles.breakdownSource}>{line.source}</Text>
              <Text style={styles.breakdownAmount}>{`~${format(line.yearlyCents)}/yr`}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.honesty}>{strings.onboarding.revealHonesty}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handlePlugBiggestLeak} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{strings.onboarding.plugBiggestLeak}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleJustStartLogging} accessibilityRole="button" style={styles.plainButton}>
          <Text style={styles.plainButtonText}>{strings.onboarding.justStartLogging}</Text>
        </TouchableOpacity>
      </View>

      <PickOneSheet
        visible={!!pickOneHabit}
        habit={pickOneHabit ?? null}
        monthTotal={pickOneHabit?.totalMonthlySpend ?? 0}
        occurrences={pickOneHabit?.occurrencesPerPeriod ?? 0}
        onCancel={handlePickOneCancel}
        onStart={handlePickOneStart}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    sub: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
    },
    yearly: {
      fontSize: 42,
      fontWeight: '800',
      color: theme.text,
      textAlign: 'center',
      letterSpacing: -1.5,
    },
    caption: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
    breakdownCard: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 16,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.background,
    },
    breakdownSource: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    breakdownAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    honesty: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 17,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
      alignItems: 'center',
    },
    primaryButton: {
      minHeight: 48,
      width: '100%',
      borderRadius: 14,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.white,
    },
    plainButton: {
      marginTop: 10,
      minHeight: 44,
      justifyContent: 'center',
    },
    plainButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
  });
}
