import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

/**
 * Two-door fork (spec 02 section 3.2). Door 1 (Start fresh) enters the Leak
 * Audit this build owns. Door 2 (Bring your statements) does router.push to
 * /leak-scan and nothing else; a sibling build owns that route. Skip for now
 * lands on the Expenses tab, zero-expense empty state.
 */
export default function OnboardingForkScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { chooseDoor, completeStep, completeOnboarding } = useOnboarding();

  const handleDoorFresh = async () => {
    await chooseDoor('fresh');
    await completeStep('fork');
    router.push('/onboarding/audit-subs');
  };

  const handleDoorStatements = async () => {
    await chooseDoor('statements');
    router.push('/leak-scan');
  };

  const handleSkip = async () => {
    await chooseDoor('skip');
    await completeOnboarding();
    router.replace('/(tabs)/expenses');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.title}>{strings.onboarding.forkTitle}</Text>
        <Text style={styles.sub}>{strings.onboarding.forkSub}</Text>

        <TouchableOpacity
          style={[styles.door, styles.doorHot]}
          onPress={handleDoorFresh}
          accessibilityRole="button"
        >
          <Text style={styles.doorTagHot}>{strings.onboarding.doorFreshTag}</Text>
          <Text style={styles.doorName}>{strings.onboarding.doorFreshName}</Text>
          <Text style={styles.doorDescription}>{strings.onboarding.doorFreshDescription}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.door} onPress={handleDoorStatements} accessibilityRole="button">
          <Text style={styles.doorTag}>{strings.onboarding.doorStatementsTag}</Text>
          <Text style={styles.doorName}>{strings.onboarding.doorStatementsName}</Text>
          <Text style={styles.doorDescription}>{strings.onboarding.doorStatementsDescription}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSkip} accessibilityRole="button" style={styles.plainButton}>
          <Text style={styles.plainButtonText}>{strings.onboarding.skipForNow}</Text>
        </TouchableOpacity>
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
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 4,
    },
    sub: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 24,
    },
    door: {
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
    },
    doorHot: {
      borderColor: theme.primary,
      backgroundColor: theme.iconBgGreen + '20',
    },
    doorTag: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      marginBottom: 6,
    },
    doorTagHot: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
      marginBottom: 6,
    },
    doorName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    doorDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      alignItems: 'center',
    },
    plainButton: {
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
