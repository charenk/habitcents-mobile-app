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
    route: '/onboarding/audit-subs',
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
  const { chooseDoor, completeStep, completeOnboarding } = useOnboarding();

  const handlePick = async (card: IntentCard) => {
    track('onboarding_intent_selected', { intent: card.intent });
    await chooseDoor(DOOR_FOR_INTENT[card.intent]);

    // Door 1 (W2, "the app is the onboarding"): track no longer pushes a
    // guided-log screen. It lands straight on Today, which opens the real
    // LogExpenseSheet itself (firstLog=1) and completes onboarding from
    // there once that sheet is saved or dismissed (app/(tabs)/index.tsx).
    // currentStep deliberately stays at 'fork' rather than advancing:
    // NEXT_STEP['fork'] is 'audit_subs', the break path's next screen, which
    // would be the wrong resume target for a track user. If the app is
    // killed before Today finishes completing onboarding, a relaunch's
    // welcome resume effect sends them back to this picker (STEP_ROUTE
    // ['fork']), same as it already does today for an early abandon here.
    if (card.intent === 'track') {
      router.replace('/(tabs)?view=spent&firstLog=1');
      return;
    }

    // Only the break path advances the stored step, because that is the one
    // whose next screen is the audit. Scan leaves the step at the picker so
    // an early abandon resumes here rather than mid-audit.
    if (card.intent === 'break') {
      await completeStep('fork');
    }
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
