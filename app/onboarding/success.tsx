import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon } from '@/components/ui';
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
import { radii, typeScale, type AppTheme } from '@/constants/theme';
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
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.brandMark}>
          <Icon name="Sprout" size={22} color={theme.primaryDark} />
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
              <Button
                label={strings.onboarding.breakIt}
                onPress={handleBreakIt}
                style={styles.breakButton}
              />
            )}
          </View>
        )}

        <Text style={styles.quietNote}>{strings.onboarding.trialQuietNote}</Text>
        <Button
          label={strings.onboarding.seePremium}
          onPress={() => router.push('/paywall?placement=onboarding')}
          variant="tertiary"
          style={styles.premiumLink}
        />
      </View>

      <View style={styles.footer}>
        <Button label={strings.onboarding.continueToHabits} onPress={handleContinue} />
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
    // Quiet brand mark instead of a celebration burst: sprout in a sage-light
    // disc (redesign spec 01, "no confetti, no bounce").
    brandMark: {
      width: 56,
      height: 56,
      borderRadius: radii.pill,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      fontSize: 30,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      textAlign: 'center',
      lineHeight: 34,
      marginBottom: 4,
    },
    leakCard: {
      width: '100%',
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 16,
      marginTop: 16,
    },
    leakName: {
      fontSize: 16,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    leakCaption: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 4,
      marginBottom: 12,
    },
    breakButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 22,
    },
    quietNote: {
      // P2-4 spec 05 section 6: readable captions use slate, not mist
      // (fails WCAG AA on this background).
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      textAlign: 'center',
      marginTop: 24,
      lineHeight: 18,
    },
    premiumLink: {
      alignSelf: 'center',
      marginTop: 2,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
  });
}
