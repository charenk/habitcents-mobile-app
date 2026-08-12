/**
 * Profile (design/header-unification U4, ADR 0019; regrouped design/
 * profile-restructure U9). The bottom sheet behind Today's gear is gone;
 * this pushed route is reachable from the same top-right spot on all four
 * tabs instead, so it always feels one tap away.
 *
 * U9 reordered the page so weight follows importance: General (the rows a
 * user actually checks: currency, plan, support) outranks More (legal links
 * and start-over, a visually quieter tier). Restore purchases left the page
 * entirely; it only lives on the paywall now. The plan line under the title
 * is gone too, since Subscription already carries that status.
 *
 * Everything here traces back to the deleted components/SettingsSheet.tsx:
 * the SettingsRow sub-component, the group/eyebrow/row styles, and every
 * handler. The app has no accounts yet, so the copy stays settings-shaped
 * under a Profile name; nothing here promises an identity feature.
 *
 * The paywall placement value stays 'settings' for funnel continuity even
 * though the entry point is now named Profile (ADR 0019).
 */
import React, { useMemo, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { DevMenuSection } from '@/components/dev/DevMenuSection';
import { CurrencySheet } from '@/components/settings/CurrencySheet';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { typeScale, layout } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { settingsRowLabel } from '@/utils/a11y';
import { DEV_MENU_ENABLED } from '@/utils/devMenu';
import { clearOnboarding } from '@/utils/storage';
import { isPremium } from '@/utils/purchases';

const PRIVACY_POLICY_URL = 'https://habitcents.com/privacy';
const TERMS_OF_SERVICE_URL = 'https://habitcents.com/terms';
const SUPPORT_MAILTO_URL = `mailto:${strings.settings.supportEmail}`;

export default function ProfileScreen(): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { show } = useToast();
  const { currency } = useCurrency();
  const { resetOnboarding } = useOnboarding();
  const [currencySheetVisible, setCurrencySheetVisible] = useState(false);
  const [startOverConfirmVisible, setStartOverConfirmVisible] = useState(false);
  // Gating audit (build 12): the row used to always read Free, even after a
  // completed (mock) purchase. isPremium() reads getEntitlement() directly,
  // the same source every habit gate already trusts.
  const subscriptionValue = isPremium()
    ? strings.settings.subscriptionValuePremium
    : strings.settings.subscriptionValueFree;

  // Opens the house bottom sheet (design/selection-sheets U3), replacing the
  // native Alert.alert this row used to open.
  const handleCurrencyPress = () => {
    setCurrencySheetVisible(true);
  };

  // Pushing the paywall on top of Profile reads naturally, so this does not
  // back() first. Placement stays 'settings' for funnel continuity even
  // though the row now reads Subscription (ADR 0019).
  const handleSubscriptionPress = () => {
    router.push('/paywall?placement=settings');
  };

  // Legal rows leave the app for the browser (external-link affordance,
  // design/row-affordances). A device with no browser handler, or a rejected
  // universal link, used to fail silently; it now surfaces a toast so the tap
  // is never a dead end.
  const openExternal = (url: string, failureMessage: string) => {
    Linking.openURL(url).catch(() => show(failureMessage));
  };

  // Start over (design/profile-restructure U9, replaces Sign out). Tapping
  // the row only opens the shared ConfirmSheet; nothing runs until the user
  // confirms there.
  const handleStartOverPress = () => {
    setStartOverConfirmVisible(true);
  };

  // No accounts, so nothing to sign out of server-side: reset the onboarding
  // context (in-memory state + its persisted copy + audit answers) and drop
  // the has-onboarded flag, then send the user to the welcome screen.
  // Popping Profile off the stack first (router.back()) means replace()
  // swaps out the tab underneath it instead of leaving it stranded below
  // onboarding, so there is nothing to swipe back into after start-over.
  const confirmStartOver = async () => {
    setStartOverConfirmVisible(false);
    await resetOnboarding();
    await clearOnboarding();
    router.back();
    router.replace('/onboarding/welcome');
    show(strings.settings.startOverToast);
  };

  const version = Constants.expoConfig?.version ?? strings.settings.versionValue;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={strings.profile.title} onBack={() => router.back()} />

        <Text style={styles.eyebrow}>{strings.settings.groupGeneral}</Text>
        <View style={styles.group}>
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.currency}
            value={currency}
            onPress={handleCurrencyPress}
            chevron
            accessibilityLabel={settingsRowLabel(strings.settings.currency, currency)}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.subscriptionRow}
            value={subscriptionValue}
            onPress={handleSubscriptionPress}
            chevron
            accessibilityLabel={settingsRowLabel(strings.settings.subscriptionRow, subscriptionValue)}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.profile.supportRow}
            value={strings.settings.supportEmail}
            onPress={() => {
              openExternal(SUPPORT_MAILTO_URL, strings.settings.mailOpenFailed);
            }}
            accessibilityLabel={settingsRowLabel(
              strings.profile.supportRow,
              strings.settings.supportEmail
            )}
            last
          />
        </View>

        <Text style={styles.eyebrow}>{strings.settings.groupMore}</Text>
        <View style={styles.group}>
          {/* SettingsRow applies strings.settings.opensInBrowserHint to every
              externalLink row automatically, so these two rows below need no
              accessibilityHint of their own. */}
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.privacyPolicy}
            externalLink
            muted
            onPress={() => {
              openExternal(PRIVACY_POLICY_URL, strings.settings.linkOpenFailed);
            }}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.termsOfService}
            externalLink
            muted
            onPress={() => {
              openExternal(TERMS_OF_SERVICE_URL, strings.settings.linkOpenFailed);
            }}
          />
          <SettingsRow
            styles={styles}
            theme={theme}
            label={strings.settings.startOverRow}
            hint={strings.settings.startOverHint}
            muted
            last
            onPress={handleStartOverPress}
          />
        </View>

        <Text style={styles.versionFooter}>{strings.settings.versionFooter(version)}</Text>

        {/* Developer-only. Renders nothing unless the build carries the gate
            (utils/devMenu.ts), so production is untouched. Popping back before
            restarting onboarding matches confirmStartOver above. */}
        {DEV_MENU_ENABLED ? (
          <DevMenuSection styles={styles} theme={theme} onClose={() => router.back()} />
        ) : null}
      </ScrollView>

      <CurrencySheet
        visible={currencySheetVisible}
        onClose={() => setCurrencySheetVisible(false)}
      />

      <ConfirmSheet
        visible={startOverConfirmVisible}
        onClose={() => setStartOverConfirmVisible(false)}
        onConfirm={() => {
          void confirmStartOver();
        }}
        title={strings.settings.startOverConfirmTitle}
        body={strings.settings.startOverConfirmBody}
        confirmLabel={strings.settings.startOverConfirmCta}
        cancelLabel={strings.settings.startOverConfirmCancel}
      />
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
      // Matches ScreenHeader's own 20pt gutter (PATTERN_VOCABULARY.md: one
      // 20pt horizontal gutter per screen) so the title lines up with the
      // rows below it now that both share the same header component.
      paddingHorizontal: 20,
      paddingBottom: layout.screenBottomClearance,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
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
    rowLabelMuted: {
      color: theme.slate,
    },
    rowTrailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 12,
    },
    rowValue: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
    },
    rowHint: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
    },
    versionFooter: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
      textAlign: 'center',
      marginTop: 22,
    },
  });
}
