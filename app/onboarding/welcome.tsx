import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { welcomePositioningCents } from '@/constants/onboardingPresets';
import type { AppTheme } from '@/constants/theme';
import type { OnboardingStep } from '@/types/onboarding';
import { strings } from '@/constants/strings';

// Resume routing (spec 02 section 7, "Mid-flow abandon and reopen"): welcome
// is not repeated once the fork has been resolved (doorChosen set). Reopening
// resumes at the first incomplete input step with prior answers intact.
const STEP_ROUTE: Partial<Record<OnboardingStep, string>> = {
  fork: '/onboarding/fork',
  audit_subs: '/onboarding/audit-subs',
  audit_vices: '/onboarding/audit-vices',
  reveal: '/onboarding/reveal',
  guided_log: '/onboarding/guided-log',
  success: '/onboarding/success',
};

/**
 * Welcome (spec 02 section 3.1). One screen, no pager, no feature carousel, no
 * voice-input promises. Primary continues to the two-door fork; "How it works"
 * opens a 3-line sheet.
 */
export default function OnboardingWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { format, currency } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { onboardingState, isLoading, completeStep } = useOnboarding();
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!onboardingState.doorChosen || onboardingState.doorChosen === 'skip') return;
    // Door 2 (statements) owns its own resume state past the fork; the only
    // thing welcome needs to do is not re-show itself, so route straight back
    // into that flow rather than falling through to a Door-1 STEP_ROUTE entry.
    if (onboardingState.doorChosen === 'statements') {
      router.replace('/leak-scan');
      return;
    }
    const resumeRoute = STEP_ROUTE[onboardingState.currentStep];
    if (resumeRoute) {
      router.replace(resumeRoute);
    }
  }, [isLoading, onboardingState.doorChosen, onboardingState.currentStep, router]);

  const handleFindMyLeak = async () => {
    await completeStep('welcome');
    router.push('/onboarding/fork');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.wordmark}>
          <View style={styles.wordmarkDot}>
            <Text style={styles.wordmarkDotText}>¢</Text>
          </View>
          <Text style={styles.wordmarkText}>HabitCents</Text>
        </View>

        <Text style={styles.headline}>
          {strings.onboarding.welcomeHeadline(format(welcomePositioningCents(currency)))}
        </Text>
        <Text style={styles.sub}>{strings.onboarding.welcomeSub}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleFindMyLeak} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{strings.onboarding.findMyLeak}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setHowItWorksVisible(true)}
          accessibilityRole="button"
          style={styles.plainButton}
        >
          <Text style={styles.plainButtonText}>{strings.onboarding.howItWorks}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={howItWorksVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHowItWorksVisible(false)}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.grabber} />
          <Text style={styles.sheetText}>{strings.onboarding.howItWorksSheet}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setHowItWorksVisible(false)}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>{strings.common.ok}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
      paddingHorizontal: 28,
    },
    wordmark: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 24,
    },
    wordmarkDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wordmarkDotText: {
      color: theme.white,
      fontSize: 18,
      fontWeight: '800',
    },
    wordmarkText: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    headline: {
      fontSize: 30,
      fontWeight: '800',
      color: theme.text,
      lineHeight: 38,
      letterSpacing: -0.4,
      marginBottom: 12,
    },
    sub: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 21,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
      alignItems: 'center',
    },
    primaryButton: {
      minHeight: 50,
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
      marginTop: 14,
      minHeight: 44,
      justifyContent: 'center',
    },
    plainButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    sheet: {
      flex: 1,
      backgroundColor: theme.surface,
      paddingHorizontal: 20,
      paddingTop: 12,
      justifyContent: 'flex-end',
      gap: 16,
    },
    grabber: {
      position: 'absolute',
      top: 12,
      alignSelf: 'center',
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
    },
    sheetText: {
      fontSize: 16,
      color: theme.text,
      lineHeight: 23,
    },
  });
}
