import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useHabits } from '@/contexts/HabitsContext';
import { KeptHero } from '@/components/habit-logging/KeptHero';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import {
  resolveSubscriptionAnswers,
  resolveViceAnswers,
  biggestLeakCandidate,
  candidateToSeedInput,
} from '@/utils/leakAudit';
import { useCategories } from '@/contexts/CategoriesContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

/**
 * Success (spec 02 section 3.7). Kept hero primed at zero. Biggest-leak card
 * offers Break it if the reveal's primary path wasn't already taken. Continue
 * lands on the Habits tab and fires onboarding_completed with the door and
 * whether a habit was started anywhere in the flow.
 */
export default function OnboardingSuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { currency, format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { onboardingState, auditAnswers, completeOnboarding, markHabitStarted } = useOnboarding();
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
  const candidate = useMemo(() => biggestLeakCandidate(subs, vices), [subs, vices]);

  const pickOneHabit = pickOneHabitId ? getHabitById(pickOneHabitId) : null;
  const habitAlreadyStarted = !!onboardingState.habitStarted;

  const handleBreakIt = async () => {
    if (!candidate) return;
    const habit = await seedDiscoveredHabit(
      candidateToSeedInput(candidate, getCategoryByName('Other')?.id ?? 'Other')
    );
    setPickOneHabitId(habit.id);
  };

  const handlePickOneStart = async (skipValue: number, valueEdited: boolean) => {
    if (!pickOneHabitId) return;
    await startBreakingHabit(pickOneHabitId, skipValue, valueEdited, 'detection');
    await markHabitStarted();
    setPickOneHabitId(null);
  };

  const handleContinue = async () => {
    // onboarding_completed fires inside completeOnboarding() itself (spec 02
    // section 6), reading the latest doorChosen/habitStarted.
    await completeOnboarding();
    router.replace('/(tabs)/habits');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={48} color={theme.white} />
        </View>
        <Text style={styles.title}>{strings.onboarding.leakMapReady}</Text>

        <KeptHero cents={0} />

        {candidate && (
          <View style={styles.leakCard}>
            <Text style={styles.leakName}>{candidate.name}</Text>
            <Text style={styles.leakCaption}>
              {strings.onboarding.biggestLeakCaption(format(candidate.totalMonthlySpendCents))}
            </Text>
            {!habitAlreadyStarted && (
              <TouchableOpacity style={styles.breakButton} onPress={handleBreakIt} accessibilityRole="button">
                <Text style={styles.breakButtonText}>{strings.onboarding.breakIt}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.quietNote}>{strings.onboarding.trialQuietNote}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{strings.onboarding.continueToHabits}</Text>
        </TouchableOpacity>
      </View>

      <PickOneSheet
        visible={!!pickOneHabit}
        habit={pickOneHabit ?? null}
        monthTotal={pickOneHabit?.totalMonthlySpend ?? 0}
        occurrences={pickOneHabit?.occurrencesPerPeriod ?? 0}
        onCancel={() => setPickOneHabitId(null)}
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
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    checkCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    leakCard: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginTop: 16,
    },
    leakName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    leakCaption: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
      marginBottom: 12,
    },
    breakButton: {
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    breakButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.white,
    },
    quietNote: {
      fontSize: 12,
      color: theme.textTertiary,
      textAlign: 'center',
      marginTop: 20,
      lineHeight: 17,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    primaryButton: {
      minHeight: 50,
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
  });
}
