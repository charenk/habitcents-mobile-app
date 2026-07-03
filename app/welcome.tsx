import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { setHasOnboarded } from '@/utils/storage';
import { strings } from '@/constants/strings';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleGetStarted = async () => {
    await setHasOnboarded();
    router.replace('/(tabs)/expenses');
  };

  const handleSkip = async () => {
    await setHasOnboarded();
    router.replace('/(tabs)/expenses');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>{strings.welcome.logo}</Text>
        <Text style={styles.tagline}>{strings.welcome.tagline}</Text>
        <Text style={styles.description}>
          {strings.welcome.description}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
          <Text style={styles.primaryButtonText}>{strings.welcome.getStarted}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>{strings.welcome.skipForNow}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface,
      padding: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      fontSize: 48,
      fontWeight: '700',
      color: theme.primary,
      marginBottom: 16,
    },
    tagline: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 28,
    },
    description: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: 20,
    },
    buttonContainer: {
      width: '100%',
      paddingBottom: 20,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryButtonText: {
      color: theme.white,
      fontSize: 18,
      fontWeight: '600',
    },
    skipButton: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    skipButtonText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
  });
}
