import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button, Icon } from '@/components/ui';
import type { IconName } from '@/components/ui';
import type { AppTheme } from '@/constants/theme';
import { radii, typeScale } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';

type Intent = 'track' | 'scan' | 'break';

type IntentCard = {
  intent: Intent;
  icon: IconName;
  eyebrow: string;
  title: string;
  description: string;
  route: string;
};

const CARDS: IntentCard[] = [
  {
    intent: 'track',
    icon: 'Timer',
    eyebrow: strings.onboarding.intentTrackEyebrow,
    title: strings.onboarding.intentTrackTitle,
    description: strings.onboarding.intentTrackDescription,
    // Door 1 (W2, "the app is the onboarding"): unused. handlePick's
    // intent === 'track' branch below replaces straight into the tabs
    // instead of pushing this route.
    route: '',
  },
  {
    intent: 'scan',
    icon: 'ChartPie',
    eyebrow: strings.onboarding.intentScanEyebrow,
    title: strings.onboarding.intentScanTitle,
    description: strings.onboarding.intentScanDescription,
    route: '/leak-scan',
  },
  {
    intent: 'break',
    icon: 'Sprout',
    eyebrow: strings.onboarding.intentBreakEyebrow,
    title: strings.onboarding.intentBreakTitle,
    description: strings.onboarding.intentBreakDescription,
    // Door 3 (W3, "the app is the onboarding" complete): unused, same as
    // Door 1's route above. handlePick's intent === 'break' branch replaces
    // straight into the tabs instead of pushing this route.
    route: '',
  },
];

// The intent picker is the new acquisition metric, but the stored door value is
// what the rest of onboarding (resume routing, onboarding_completed) reads. Both
// "track" and "break" stay on-device from the user's own taps, so both map to
// 'fresh'; only "scan" brings a statement in.
const DOOR_FOR_INTENT: Record<Intent, 'fresh' | 'statements'> = {
  track: 'fresh',
  scan: 'statements',
  break: 'fresh',
};

/**
 * Intent picker (design/redesign-handoff/03-onboarding.md, screen 2; replaces
 * the two-door fork). Three self-select paths that all converge on Today, plus
 * a skip that goes there directly. Nothing here is a dead end.
 */
export default function OnboardingIntentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { chooseDoor, completeOnboarding } = useOnboarding();

  const handlePick = async (card: IntentCard) => {
    track('onboarding_intent_selected', { intent: card.intent });
    await chooseDoor(DOOR_FOR_INTENT[card.intent]);

    // Door 1 & Door 3 (W2 + W3, "the app is the onboarding" complete): both
    // land straight on Today via a deep link instead of pushing a dedicated
    // onboarding screen; Today itself opens the relevant sheet (the real
    // LogExpenseSheet for track, BreakHabitSheet for break) and completes
    // onboarding once that sheet resolves (app/(tabs)/index.tsx). currentStep
    // deliberately stays at 'fork' in both cases: NEXT_STEP has no forward
    // step from 'fork' anymore (only Door 2's scan flow still pushes a
    // route), so an early abandon before either sheet resolves still resumes
    // at this picker on relaunch (STEP_ROUTE['fork'], welcome.tsx).
    if (card.intent === 'track') {
      router.replace('/(tabs)?view=spent&firstLog=1');
      return;
    }
    if (card.intent === 'break') {
      router.replace('/(tabs)?view=kept&breakEntry=1');
      return;
    }

    // Scan only, from here down.
    router.push(card.route);
  };

  const handleSkip = async () => {
    track('onboarding_intent_skipped', {});
    await chooseDoor('skip');
    await completeOnboarding();
    // Every onboarding path converges on Today, skip included (spec 03).
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {strings.onboarding.intentTitle}
        </Text>
        <Text style={styles.sub}>{strings.onboarding.intentSub}</Text>

        <View style={styles.cards}>
          {CARDS.map(card => (
            <Pressable
              key={card.intent}
              style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
              onPress={() => handlePick(card)}
              accessibilityRole="button"
              accessibilityLabel={card.title}
              accessibilityHint={`${card.eyebrow}. ${card.description}`}
            >
              <View style={styles.cardTile}>
                <Icon name={card.icon} size={18} color={theme.primaryDark} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.eyebrow}>{card.eyebrow}</Text>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>
              <Icon name="ChevronRight" size={18} color={theme.mist} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button label={strings.onboarding.skipForNow} variant="tertiary" onPress={handleSkip} />
      </View>
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
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    title: {
      fontSize: 30,
      lineHeight: 34,
      fontFamily: theme.fonts.display,
      color: theme.ink,
    },
    sub: {
      fontSize: 14,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 20,
      marginTop: 4,
    },
    cards: {
      gap: 12,
      marginTop: 24,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radii.feature,
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    cardPressed: {
      backgroundColor: theme.snow,
    },
    cardTile: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: {
      flex: 1,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.primaryDark,
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 17,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    cardDescription: {
      fontSize: 14,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 20,
      marginTop: 2,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      alignItems: 'center',
    },
  });
}
