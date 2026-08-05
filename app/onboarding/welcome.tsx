import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button, Icon } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { KeptHero } from '@/components/habit-logging/KeptHero';
import { useReducedMotion } from '@/utils/motion';
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

// The two honest-zero value rows under the hero (W1, ADR 0020/0022).
const VALUE_ROWS: { icon: IconName; text: string }[] = [
  { icon: 'Timer', text: strings.onboarding.valuePropLog },
  { icon: 'ChartLine', text: strings.onboarding.outcomeKeptCounts },
];

const EXAMPLE_ROTATE_MS = 2600;
const EXAMPLE_FADE_MS = 220;

/**
 * The rotating "for example: ..." caption under the hero (W1). Cosmetic
 * only: the accessibility label is pinned to the first example so VoiceOver
 * never announces a rotation (PATTERN_VOCABULARY "anything mounted
 * off-screen" spirit extended to anything that moves on its own; there is no
 * live region here on purpose). A plain setInterval drives a single Animated
 * opacity value with useNativeDriver true, one driver on one node, matching
 * this app's motion rule after two release-build crashes from mixed drivers.
 */
function ExampleCaption({ theme, styles }: { theme: AppTheme; styles: Styles }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: EXAMPLE_FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        setIndex(i => (i + 1) % strings.onboarding.exampleSkips.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: EXAMPLE_FADE_MS,
          useNativeDriver: true,
        }).start();
      });
    }, EXAMPLE_ROTATE_MS);
    return () => clearInterval(id);
  }, [reduceMotion, opacity]);

  const fragment = reduceMotion
    ? strings.onboarding.exampleSkips[0]
    : strings.onboarding.exampleSkips[index];

  return (
    <View
      style={styles.exampleRow}
      accessible
      // Static first line on purpose: the rotation is decorative, not
      // content, so the accessible label never changes underneath a reader.
      accessibilityLabel={`${strings.onboarding.exampleSkipPrefix} ${strings.onboarding.exampleSkips[0]}`}
    >
      <Text style={styles.examplePrefix} importantForAccessibility="no">
        {strings.onboarding.exampleSkipPrefix}{' '}
      </Text>
      <Animated.Text style={[styles.exampleFragment, { opacity }]} importantForAccessibility="no">
        {fragment}
      </Animated.Text>
    </View>
  );
}

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

        <View style={styles.heroSection}>
          {/* Content column already carries the screen's 24pt gutter, so the
              hero is not full-bleed here; no extra gutter style needed. */}
          <KeptHero cents={0} />
          <ExampleCaption theme={theme} styles={styles} />
        </View>

        <View style={styles.valueProps}>
          {VALUE_ROWS.map(row => (
            <View key={row.text} style={styles.valueRow}>
              <View style={styles.valueTile}>
                <Icon name={row.icon} size={16} color={theme.primaryDark} />
              </View>
              <Text style={styles.valueText}>{row.text}</Text>
            </View>
          ))}
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
    heroSection: {
      marginBottom: 24,
    },
    exampleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 10,
    },
    examplePrefix: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.mist,
    },
    exampleFragment: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    valueProps: {
      gap: 12,
      marginBottom: 24,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    valueTile: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    valueText: {
      flex: 1,
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.ink,
      lineHeight: 21,
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

type Styles = ReturnType<typeof createStyles>;
