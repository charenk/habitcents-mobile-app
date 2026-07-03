import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, useThemeMode } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CURRENCIES } from '@/utils/currency';
import { clearOnboarding } from '@/utils/storage';
import { strings } from '@/constants/strings';

const themeModeLabel: Record<string, string> = {
  light: strings.settings.light,
  dark: strings.settings.dark,
  system: strings.settings.system,
};

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const { currency, setCurrency } = useCurrency();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleCurrencyPress = () => {
    Alert.alert(strings.settings.currencyAlertTitle, strings.settings.currencyAlertMessage, [
      ...CURRENCIES.map((c) => ({
        text: strings.settings.currencyOption(c.name, c.symbol),
        onPress: () => setCurrency(c.code),
      })),
      { text: strings.common.cancel, style: 'cancel' as const },
    ]);
  };

  const handleAppearancePress = () => {
    Alert.alert(
      strings.settings.appearanceAlertTitle,
      strings.settings.appearanceAlertMessage,
      [
        { text: strings.settings.light, onPress: () => setThemeMode('light') },
        { text: strings.settings.dark, onPress: () => setThemeMode('dark') },
        { text: strings.settings.system, onPress: () => setThemeMode('system') },
        { text: strings.common.cancel, style: 'cancel' as const },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    await clearOnboarding();
    Alert.alert(
      strings.settings.onboardingResetTitle,
      strings.settings.onboardingResetMessage,
      [
        { text: strings.settings.restartNow, onPress: () => router.replace('/') },
        { text: strings.common.ok },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{strings.settings.account}</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>{strings.settings.profile}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>{strings.settings.notifications}</Text>
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{strings.settings.preferences}</Text>
        <TouchableOpacity style={styles.row} onPress={handleAppearancePress}>
          <Text style={styles.rowText}>{strings.settings.appearance}</Text>
          <Text style={styles.rowValue}>{themeModeLabel[themeMode]}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleCurrencyPress}>
          <Text style={styles.rowText}>{strings.settings.currency}</Text>
          <Text style={styles.rowValue}>{currency}</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <Text style={styles.rowText}>{strings.settings.privacy}</Text>
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{strings.settings.about}</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>{strings.settings.version}</Text>
          <Text style={styles.rowValue}>{strings.settings.versionValue}</Text>
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{strings.settings.developer}</Text>
        <TouchableOpacity style={styles.row} onPress={handleResetOnboarding}>
          <Text style={styles.dangerText}>{strings.settings.resetOnboarding}</Text>
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
