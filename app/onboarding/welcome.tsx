import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { completeStep } = useOnboarding();

  const handleGetStarted = async () => {
    await completeStep('welcome');
    router.push('/onboarding/value');
  };

  return (
    <LinearGradient
      colors={[theme.primary, theme.primaryDark]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="wallet" size={48} color={theme.primary} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{strings.onboarding.title}</Text>
        <Text style={styles.tagline}>
          {strings.onboarding.tagline}
        </Text>

        {/* Features preview */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="flash" size={24} color={theme.white} />
            <Text style={styles.featureText}>{strings.onboarding.featureTrack}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="analytics" size={24} color={theme.white} />
            <Text style={styles.featureText}>{strings.onboarding.featureDiscover}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="flame" size={24} color={theme.white} />
            <Text style={styles.featureText}>{strings.onboarding.featureBuild}</Text>
          </View>
        </View>
      </View>

      {/* CTA Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>{strings.onboarding.getStarted}</Text>
          <Ionicons name="arrow-forward" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    logoContainer: {
      marginBottom: 24,
    },
    logo: {
      width: 96,
      height: 96,
      borderRadius: 24,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    title: {
      fontSize: 36,
      fontWeight: '800',
      color: theme.white,
      marginBottom: 12,
    },
    tagline: {
      fontSize: 18,
      color: 'rgba(255, 255, 255, 0.9)',
      textAlign: 'center',
      lineHeight: 26,
      marginBottom: 48,
    },
    features: {
      width: '100%',
      gap: 16,
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
    },
    featureText: {
      fontSize: 16,
      color: theme.white,
      marginLeft: 12,
      fontWeight: '500',
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.white,
      paddingVertical: 18,
      borderRadius: 16,
      gap: 8,
    },
    buttonText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.primary,
    },
  });
}
