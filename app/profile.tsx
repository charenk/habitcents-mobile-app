/**
 * Profile (design/header-unification U4, ADR 0019). The bottom sheet behind
 * Today's gear is gone; this pushed route is reachable from the same
 * top-right spot on all four tabs instead, so it always feels one tap away.
 *
 * Everything below the title is migrated verbatim from the deleted
 * components/SettingsSheet.tsx: the SettingsRow sub-component, the group/
 * eyebrow/row styles, and every handler. The app has no accounts yet, so the
 * copy stays settings-shaped under a Profile name; nothing here promises an
 * identity feature.
 *
 * The paywall placement value stays 'settings' for funnel continuity even
 * though the entry point is now named Profile (ADR 0019).
 */
import React, { useMemo } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DevMenuSection } from '@/components/dev/DevMenuSection';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { settingsRowLabel } from '@/utils/a11y';
import { CURRENCIES } from '@/utils/currency';
import { DEV_MENU_ENABLED } from '@/utils/devMenu';
import { getEntitlement, restore } from '@/utils/purchases';
import { clearOnboarding } from '@/utils/storage';

const PRIVACY_POLICY_URL = 'https://habitcents.com/privacy';
const TERMS_OF_SERVICE_URL = 'https://habitcents.com/terms';
const SUPPORT_URL = 'https://habitcents.com/support';

export default function ProfileScreen(): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show } = useToast();
  const { currency, setCurrency } = useCurrency();
  const { resetOnboarding } = useOnboarding();

  // Entitlement is read at render time; mock mode always reports 'free', so the
  // free line is the only one with ratified copy today.
  const isFree = getEntitlement() === 'free';

  // Ported verbatim from SettingsSheet: an alert listing every supported
  // currency, tapping one persists it through CurrencyContext.
  const handleCurrencyPress = () => {
    Alert.alert(strings.settings.currencyAlertTitle, strings.settings.currencyAlertMessage, [
      ...CURRENCIES.map((c) => ({
        text: strings.settings.currencyOption(c.name, c.symbol),
        onPress: () => {
          void setCurrency(c.code);
        },
      })),
      { text: strings.common.cancel, style: 'cancel' as const },
    ]);
  };

  // Pushing the paywall on top of Profile reads naturally, so this does not
  // back() first.
  const handlePremiumPress = () => {
    router.push('/paywall?placement=settings');
  };

  // Restore (BET-004, mock mode). Same outcome branching the old sheet used;
  // reported in a toast rather than an alert.
  const handleRestorePress = async () => {
    const result = await restore();
    show(
      result.ok && result.entitlement === 'premium'
        ? strings.settings.restoreDoneMessage
        : strings.settings.restoreNoneMessage
    );
  };

  // No accounts, so nothing to sign out of server-side: reset the onboarding
  // context (in-memory state + its persisted copy + audit answers) and drop
  // the has-onboarded flag, then send the user to the welcome screen.
  // Popping Profile off the stack first (router.back()) means replace()
  // swaps out the tab underneath it instead of leaving it stranded below
  // onboarding, so there is nothing to swipe back into after sign out.
  const handleSignOutPress = async () => {
    await resetOnboarding();
    await clearOnboarding();
    router.back();
    router.replace('/onboarding/welcome');
    show(strings.settings.signOutToast);
  };

  const version = Constants.expoConfig?.version ?? strings.settings.versionValue;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={strings.common.back}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="ArrowLeft" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + 44 }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          {strings.profile.title}
        </Text>
        {isFree ? <Text style={styles.plan}>{strings.settings.planFree}</Text> : null}

        <Text style={styles.eyebrow}>{strings.settings.groupPreferences}</Text>
        <View style={styles.group}>
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.currency}
            value={currency}
            onPress={handleCurrencyPress}
            accessibilityLabel={settingsRowLabel(strings.settings.currency, currency)}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.premiumRow}
            onPress={handlePremiumPress}
            chevron
            last
          />
        </View>

        <Text style={styles.eyebrow}>{strings.settings.groupAbout}</Text>
        <View style={styles.group}>
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.restoreRow}
            onPress={() => {
              void handleRestorePress();
            }}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.privacyPolicy}
            onPress={() => {
              Linking.openURL(PRIVACY_POLICY_URL).catch(() => {});
            }}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.termsOfService}
            onPress={() => {
              Linking.openURL(TERMS_OF_SERVICE_URL).catch(() => {});
            }}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.profile.supportRow}
            onPress={() => {
              Linking.openURL(SUPPORT_URL).catch(() => {});
            }}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.signOutRow}
            hint={strings.settings.signOutHint}
            destructive
            onPress={() => {
              void handleSignOutPress();
            }}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.versionRow}
            value={version}
            accessibilityLabel={settingsRowLabel(strings.settings.versionRow, version)}
            last
          />
        </View>

        {/* Developer-only. Renders nothing unless the build carries the gate
            (utils/devMenu.ts), so production is untouched. Popping back before
            restarting onboarding matches handleSignOutPress above. */}
        {DEV_MENU_ENABLED ? (
          <DevMenuSection styles={styles} theme={theme} onClose={() => router.back()} />
        ) : null}
      </ScrollView>
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    backButton: {
      padding: 4,
    },
    title: {
      fontSize: typeScale.screenTitle,
      fontFamily: theme.fonts.display,
      lineHeight: 40,
      includeFontPadding: false,
      color: theme.ink,
    },
    plan: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      marginTop: 2,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mist,
      marginTop: 22,
      marginBottom: 2,
    },
    group: {
      alignSelf: 'stretch',
    },
    row: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.hairlineSubtle,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowLabel: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.body,
      color: theme.ink,
      flexShrink: 1,
    },
    rowLabelDestructive: {
      color: theme.coral,
    },
    rowTrailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 12,
    },
    rowValue: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.body,
      color: theme.slate,
    },
    rowHint: {
      fontFamily: theme.fonts.ui,
      fontSize: 12,
      color: theme.mist,
    },
  });
}
