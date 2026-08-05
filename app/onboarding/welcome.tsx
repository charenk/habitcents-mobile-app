import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button, Icon, Sheet } from '@/components/ui';
import type { IconName } from '@/components/ui';
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
  // W2 ("the app is the onboarding") retires the practice-log screen. A
  // stored currentStep of 'guided_log' can still exist on-device from before
  // this update (the audit/break path used to stop here); mapped forward to
  // success, its former next step, rather than a route that no longer
  // exists. Door 3's unit owns the full step-machine rewrite this implies.
  guided_log: '/onboarding/success',
  success: '/onboarding/success',
};

// The three value props, stated up front (design/redesign-handoff/03-onboarding.md
// screen 1) rather than teased behind a carousel.
const VALUE_PROPS: { icon: IconName; text: string }[] = [
  { icon: 'Timer', text: strings.onboarding.valuePropLog },
  { icon: 'ChartPie', text: strings.onboarding.valuePropSee },
  { icon: 'Sprout', text: strings.onboarding.valuePropBreak },
];

const HOW_IT_WORKS_ICONS: IconName[] = ['Timer', 'ChartPie', 'Sprout'];

/**
 * Welcome (design/redesign-handoff/03-onboarding.md, screen 1). One screen, no
 * pager and no feature carousel: brand row, serif headline, the three value
 * props, the privacy line. Primary continues to the intent picker; "How it
 * works" opens a three-row sheet.
 */
export default function OnboardingWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { onboardingState, isLoading, completeStep } = useOnboarding();
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);

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

        <View style={styles.valueProps}>
          {VALUE_PROPS.map(prop => (
            <View key={prop.text} style={styles.valueRow}>
              <View style={styles.valueTile}>
                <Icon name={prop.icon} size={16} color={theme.primaryDark} />
              </View>
              <Text style={styles.valueText}>{prop.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.privacy}>{strings.onboarding.welcomeSub}</Text>
      </View>

      <View style={styles.footer}>
        <Button label={strings.onboarding.getStarted} onPress={handleGetStarted} />
        <Button
          label={strings.onboarding.howItWorks}
          variant="tertiary"
          onPress={() => setHowItWorksVisible(true)}
        />
      </View>

      <Sheet
        visible={howItWorksVisible}
        onClose={() => setHowItWorksVisible(false)}
        accessibilityLabel={strings.onboarding.howItWorks}
      >
        <View style={styles.sheetBody}>
          {strings.onboarding.howItWorksRows.map((row, i) => (
            <View key={row} style={styles.valueRow}>
              <View style={styles.valueTile}>
                <Icon name={HOW_IT_WORKS_ICONS[i]} size={16} color={theme.primaryDark} />
              </View>
              <Text style={styles.valueText}>{row}</Text>
            </View>
          ))}
          <Button label={strings.common.ok} onPress={() => setHowItWorksVisible(false)} />
        </View>
      </Sheet>
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
      gap: 6,
    },
    sheetBody: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 16,
    },
  });
}
