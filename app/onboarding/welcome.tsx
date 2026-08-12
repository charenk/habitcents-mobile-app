import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui';
import { AuroraBackground } from '@/components/onboarding/AuroraBackground';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/theme';
import type { OnboardingStep } from '@/types/onboarding';
import { strings } from '@/constants/strings';

// Resume routing (spec 02 section 7, "Mid-flow abandon and reopen"): welcome
// is not repeated once an intent has been picked (doorChosen set). Reopening
// resumes at the first incomplete input step with prior answers intact. The
// stored step is still named "fork"; the screen it routes to is now the intent
// picker, so a track, break, or scan user who abandons early re-picks rather
// than landing on a route that no longer exists.
const STEP_ROUTE: Partial<Record<OnboardingStep, string>> = {
  fork: '/onboarding/intent',
  // W3 ("the app is the onboarding" complete): audit_subs, audit_vices,
  // reveal, guided_log, and success all belonged to screens deleted by this
  // update. A device that has one of these stored from before must not crash
  // trying to route to a screen that no longer exists (the build 5 dayLogs
  // lesson, docs/runs.log: an unhandled resume target is exactly how that
  // crash happened); resuming at the intent picker is honest too, since
  // auditAnswers are legacy now and nothing reads a partial audit's answers
  // back into a screen anymore (OnboardingContext.completeOnboarding already
  // clears them on the next successful completion).
  audit_subs: '/onboarding/intent',
  audit_vices: '/onboarding/intent',
  reveal: '/onboarding/intent',
  guided_log: '/onboarding/intent',
  success: '/onboarding/intent',
};

/**
 * Welcome (design/redesign-handoff/03-onboarding.md, screen 1; W1, ADR
 * 0020/0022). Brand row, serif headline, the honest-zero hero, the privacy
 * line. Primary continues to the intent picker.
 *
 * Honest-zero rule (Charen, 2026-08-04): a finance app never shows an
 * invented total. The real KeptHero renders at cents=0, so it honestly says
 * "$0.00 / your first skip starts this counter" by itself. Sample dollars
 * appear only as per-skip example prices explicitly marked "for example",
 * never as a fake accumulated total. This replaces
 * components/onboarding/OutcomeCarousel.tsx (OB-5), which is retired along
 * with the static three-row value-prop list and How-it-works sheet it once
 * replaced.
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

  // DESIGN EXPLORATION (Charen, 2026-08-10): the splash reduces to aurora,
  // headline, and the single CTA. The retired block (brand row, KeptHero at
  // zero, value rows, privacy line) lives in this file's git history. NOTE
  // before this ships for real: the zero-state KeptHero on welcome was an
  // ADR 0022 ruling (the honest-zero hero); removing it here is Charen's
  // live exploration, to be ratified or reverted when the design lands.
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <AuroraBackground />
      <View style={styles.content}>
        <Text style={styles.headline} accessibilityRole="header">
          {strings.onboarding.welcomeHeadline}
        </Text>
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
      // UX-018: 24 drifted from the ratified 20pt screen gutter.
      paddingHorizontal: spacing.gutter,
    },
    // UX-061: was 44/48, an off-scale literal with no matching typeScale
    // step (closest is keptHero at 42); left as-is pending a scale
    // ratification, reported rather than guessed at.
    headline: {
      fontSize: 44,
      lineHeight: 48,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      marginBottom: 28,
    },
    footer: {
      // UX-018: 24 drifted from the ratified 20pt screen gutter.
      paddingHorizontal: spacing.gutter,
      paddingBottom: 16,
    },
  });
}
