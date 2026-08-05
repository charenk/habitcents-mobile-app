import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button, Icon } from '@/components/ui';
import { OutcomeCarousel } from '@/components/onboarding/OutcomeCarousel';
import type { AppTheme } from '@/constants/theme';
import { typeScale } from '@/constants/theme';
import type { OnboardingStep } from '@/types/onboarding';
import { strings } from '@/constants/strings';

// Resume routing (spec 02 section 7, "Mid-flow abandon and reopen"): welcome
// is not repeated once an intent has been picked (doorChosen set). Reopening
// resumes at the first incomplete input step with prior answers intact. The
// stored step is still named "fork"; the screen it routes to is now the intent
// picker, so a track or scan user who abandons early re-picks rather than
// landing on a route that no longer exists.
const STEP_ROUTE: Partial<Record<OnboardingStep, string>> = {
  fork: '/onboarding/intent',
  audit_subs: '/onboarding/audit-subs',
  audit_vices: '/onboarding/audit-vices',
  reveal: '/onboarding/reveal',
  guided_log: '/onboarding/guided-log',
  success: '/onboarding/success',
};

/**
 * Welcome (design/redesign-handoff/03-onboarding.md, screen 1; OB-5/ADR 0020).
 * Brand row, serif headline, the outcome carousel, the privacy line. Primary
 * continues to the intent picker. The static three-row value-prop list and
 * the redundant How-it-works sheet are retired in favor of
 * components/onboarding/OutcomeCarousel.tsx, which carries the same lines.
 */
export default function OnboardingWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { onboardingState, isLoading, completeStep } = useOnboarding();

  useEffect(() => {
    if (isLoading) return;
    if (!onboardingState.doorChosen || onboardingState.doorChosen === 'skip') return;
    // The scan path owns its own resume state past the picker; the only thing
    // welcome needs to do is not re-show itself, so route straight back into
    // that flow rather than falling through to a STEP_ROUTE entry.
    if (onboardingState.doorChosen === 'statements') {
      router.replace('/leak-scan');
      return;
    }
    const resumeRoute = STEP_ROUTE[onboardingState.currentStep];
    if (resumeRoute) {
      router.replace(resumeRoute);
    }
  }, [isLoading, onboardingState.doorChosen, onboardingState.currentStep, router]);

  const handleGetStarted = async () => {
    await completeStep('welcome');
    router.push('/onboarding/intent');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Icon name="Sprout" size={18} color={theme.white} />
          </View>
          <Text style={styles.brandName}>{strings.onboarding.brandName}</Text>
        </View>

        <Text style={styles.headline} accessibilityRole="header">
          {strings.onboarding.welcomeHeadline}
        </Text>

        <View style={styles.carousel}>
          <OutcomeCarousel />
        </View>

        <Text style={styles.privacy}>{strings.onboarding.welcomeSub}</Text>
      </View>

      <View style={styles.footer}>
        <Button label={strings.onboarding.getStarted} onPress={handleGetStarted} />
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
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 28,
    },
    brandMark: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandName: {
      fontSize: 17,
      fontFamily: theme.fonts.uiBold,
      color: theme.ink,
    },
    headline: {
      fontSize: 44,
      lineHeight: 48,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      marginBottom: 28,
    },
    carousel: {
      marginBottom: 24,
    },
    privacy: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.mist,
      lineHeight: 19,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
  });
}
