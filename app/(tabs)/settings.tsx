import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, useThemeMode } from '@/contexts/ThemeContext';
import { clearOnboarding } from '@/utils/storage';

const themeModeLabel: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleAppearancePress = () => {
    Alert.alert(
      'Appearance',
      'Choose theme',
      [
        { text: 'Light', onPress: () => setThemeMode('light') },
        { text: 'Dark', onPress: () => setThemeMode('dark') },
        { text: 'System', onPress: () => setThemeMode('system') },
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    await clearOnboarding();
    Alert.alert(
      'Onboarding Reset',
      'Close and reopen the app to see the welcome screen.',
      [
        { text: 'Restart Now', onPress: () => router.replace('/') },
        { text: 'OK' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Profile</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>Notifications</Text>
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Preferences</Text>
        <TouchableOpacity style={styles.row} onPress={handleAppearancePress}>
          <Text style={styles.rowText}>Appearance</Text>
          <Text style={styles.rowValue}>{themeModeLabel[themeMode]}</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <Text style={styles.rowText}>Privacy</Text>
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Version</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Developer</Text>
        <TouchableOpacity style={styles.row} onPress={handleResetOnboarding}>
          <Text style={styles.dangerText}>Reset Onboarding</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 16,
    },
    group: {
      marginBottom: 24,
    },
    groupTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    row: {
      backgroundColor: theme.surface,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowText: {
      fontSize: 16,
      color: theme.text,
    },
    rowValue: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    dangerText: {
      fontSize: 16,
      color: theme.danger,
    },
  });
}
