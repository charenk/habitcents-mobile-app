/**
 * SettingsSheet (design/redesign-handoff/02-navigation.md, "Settings").
 *
 * The Settings tab is gone; the gear on Today opens this bottom sheet instead.
 * Serif title, a plan line, then two labelled groups of rows: Preferences
 * (Currency, Premium) and About (Restore purchases, Sign out, Version).
 *
 * Scope notes:
 * - The spec's "Categories" row under Preferences is DROPPED (Charen,
 *   2026-07-30): Categories stays a tab, see design/REDESIGN_RUNBOOK.md.
 * - Privacy policy and terms rows are carried over from the old settings
 *   screen. Spec 02 omits them, but the store listing requires reachable
 *   links, so dropping them would be a regression.
 * - Sign out touches nothing server-side because there are no accounts. It
 *   clears the local session (onboarding state + the has-onboarded flag) and
 *   sends the user back to onboarding. Expenses, habits and categories stay on
 *   the device, which is what the row's hint promises.
 * - Motion lives in the Sheet primitive, which already honors reduced motion.
 */
import React, { useMemo } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useCurrency } from '@/contexts/CurrencyContext';

const PRIVACY_POLICY_URL = 'https://habitcents.com/privacy';
const TERMS_OF_SERVICE_URL = 'https://habitcents.com/terms';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { settingsRowLabel } from '@/utils/a11y';
import { CURRENCIES } from '@/utils/currency';
import { getEntitlement, restore } from '@/utils/purchases';
import { clearOnboarding } from '@/utils/storage';

type SettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsSheet({ visible, onClose }: SettingsSheetProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { show } = useToast();
  const { currency, setCurrency } = useCurrency();
  const { resetOnboarding } = useOnboarding();

  // Entitlement is read at render time; mock mode always reports 'free', so the
  // free line is the only one with ratified copy today.
  const isFree = getEntitlement() === 'free';

  // Ported verbatim from the old app/(tabs)/settings.tsx: an alert listing every
  // supported currency, tapping one persists it through CurrencyContext.
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

  const handlePremiumPress = () => {
    onClose();
    router.push('/paywall?placement=settings');
  };

  // Restore (BET-004, mock mode). Same outcome branching the old screen used;
  // the redesign reports it in a toast instead of an alert.
  const handleRestorePress = async () => {
    const result = await restore();
    show(
      result.ok && result.entitlement === 'premium'
        ? strings.settings.restoreDoneMessage
        : strings.settings.restoreNoneMessage
    );
  };

  // No accounts, so nothing to sign out of server-side: reset the onboarding
  // context (in-memory state + its persisted copy + audit answers) and drop the
  // has-onboarded flag, then send the user to the welcome screen.
  const handleSignOutPress = async () => {
    await resetOnboarding();
    await clearOnboarding();
    onClose();
    router.replace('/onboarding/welcome');
    show(strings.settings.signOutToast);
  };

  const version = Constants.expoConfig?.version ?? strings.settings.versionValue;

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={strings.settings.sheetTitle}>
      <View style={styles.content}>
        <Text style={styles.title}>{strings.settings.sheetTitle}</Text>
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
      </View>
    </Sheet>
  );
}

type SettingsRowProps = {
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
  label: string;
  /** Trailing value, e.g. the currency code or the app version. */
  value?: string;
  /** Trailing hint in small mist type, e.g. the sign-out reassurance. */
  hint?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  /** Last row in its group: no separator below it. */
  last?: boolean;
  accessibilityLabel?: string;
};

/**
 * One 48pt row. Interactive rows are buttons; a static row (Version) stays a
 * labelled, non-actionable element so VoiceOver never offers a dead activation.
 */
function SettingsRow({
  styles,
  theme,
  label,
  value,
  hint,
  onPress,
  chevron,
  destructive,
  last,
  accessibilityLabel,
}: SettingsRowProps): React.JSX.Element {
  const rowStyle: StyleProp<ViewStyle> = [styles.row, last ? styles.rowLast : null];
  const body = (
    <>
      <Text style={[styles.rowLabel, destructive ? styles.rowLabelDestructive : null]}>
        {label}
      </Text>
      <View style={styles.rowTrailing}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        {chevron ? <Icon name="ChevronRight" size={16} color={theme.mist} /> : null}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={rowStyle} accessible accessibilityLabel={accessibilityLabel ?? label}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [rowStyle, pressed ? styles.rowPressed : null]}
    >
      {body}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: 30,
      lineHeight: 36,
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
