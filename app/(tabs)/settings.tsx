import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CURRENCIES } from '@/utils/currency';
import { strings } from '@/constants/strings';
import { settingsRowLabel } from '@/utils/a11y';

// P2-4 (docs/design-package-phase2/05-p2-4-design-unification.md, section 3):
// two sections, three rows. Profile, Notifications, Appearance, the dead
// Privacy row, and the entire Developer section (including Reset Onboarding)
// are removed; see the spec for reasoning per row.
const PRIVACY_POLICY_URL = 'https://habitcents.com/privacy';

export default function SettingsScreen() {
  const theme = useTheme();
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

  const handlePrivacyPolicyPress = () => {
    Linking.openURL(PRIVACY_POLICY_URL).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{strings.settings.preferences}</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={handleCurrencyPress}
          accessibilityRole="button"
          accessibilityLabel={settingsRowLabel(strings.settings.currency, currency)}
        >
          <Text style={styles.rowText}>{strings.settings.currency}</Text>
          <Text style={styles.rowValue}>{currency}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{strings.settings.about}</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={handlePrivacyPolicyPress}
          accessibilityRole="button"
          accessibilityLabel={strings.settings.privacyPolicy}
        >
          <Text style={styles.rowText}>{strings.settings.privacyPolicy}</Text>
        </TouchableOpacity>
        <View
          style={styles.row}
          accessible
          accessibilityLabel={settingsRowLabel(strings.settings.version, strings.settings.versionValue)}
        >
          <Text style={styles.rowText}>{strings.settings.version}</Text>
          <Text style={styles.rowValue}>{strings.settings.versionValue}</Text>
        </View>
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
  });
}
