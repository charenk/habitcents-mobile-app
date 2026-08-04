/**
 * DEVELOPER section of the settings sheet: the on-device debug controls.
 *
 * Why it lives inside settings rather than as a floating overlay: the old
 * floating Seed/Clear pills collided with real UI twice, and they were gated on
 * `__DEV__`, so they did not exist in the TestFlight builds Charen actually
 * tests. This section is gated on DEV_MENU_ENABLED instead, which the
 * `internal` EAS profile turns on and `production` explicitly turns off.
 *
 * It renders nothing unless the gate is on, and the call site in
 * components/SettingsSheet.tsx checks the same gate, so a production build has
 * two constant-false branches and no reachable dev code.
 *
 * Copy here is deliberately NOT in constants/strings.ts: none of it is
 * customer-facing, and keeping it local means a production build carries no
 * user-visible strings that only a developer should ever read.
 */
import React, { useCallback, useState } from 'react';
import { Alert, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { SettingsRow, type SettingsRowStyles } from '@/components/settings/SettingsRow';
import { useToast } from '@/components/ui/Toast';
import type { AppTheme } from '@/constants/theme';
import { useOnboarding } from '@/contexts/OnboardingContext';
import {
  PERSONA_BUILDERS,
  PERSONA_META,
  PERSONA_ORDER,
  applyPersona,
  clearAppData,
  type PersonaId,
} from '@/data/devPersonas';
import { settingsRowLabel } from '@/utils/a11y';
import { DEV_MENU_ENABLED, devBuildInfo, reloadApp } from '@/utils/devMenu';
import { getEntitlement, setMockEntitlement, type Entitlement } from '@/utils/purchases';
import { clearOnboarding } from '@/utils/storage';

const copy = {
  eyebrow: 'Developer',
  entitlementRow: 'Entitlement',
  entitlementFree: 'Free',
  entitlementPremium: 'Premium',
  entitlementToast: (value: string) => `Entitlement is now ${value.toLowerCase()}.`,
  personaToast: (label: string) => `${label} applied. Reloading.`,
  restartRow: 'Restart onboarding',
  restartHint: 'keeps your data',
  restartToast: 'Onboarding reset.',
  wipeRow: 'Wipe app data',
  wipeHint: 'this app only',
  wipeAlertTitle: 'Wipe app data',
  wipeAlertMessage:
    'Removes every HabitCents key on this device and reloads. Storage from other apps is left alone.',
  wipeConfirm: 'Wipe',
  wipeCancel: 'Cancel',
  wipeToast: 'App data wiped. Reloading.',
  buildRow: 'Build',
  buildValue: (channel: string) => `${channel} · dev menu on`,
};

export type DevMenuSectionProps = {
  /** The settings sheet's own stylesheet, so rows look identical to the rest. */
  styles: SettingsRowStyles & {
    eyebrow: StyleProp<TextStyle>;
    group: StyleProp<ViewStyle>;
  };
  theme: AppTheme;
  /** Close the sheet before navigating away. */
  onClose: () => void;
};

export function DevMenuSection({
  styles,
  theme,
  onClose,
}: DevMenuSectionProps): React.JSX.Element | null {
  const router = useRouter();
  const { show } = useToast();
  const { resetOnboarding } = useOnboarding();
  const [entitlement, setEntitlement] = useState<Entitlement>(() => getEntitlement());
  const [busy, setBusy] = useState(false);

  // Second gate, so this component is inert even if a caller forgets to check.
  const enabled = DEV_MENU_ENABLED;

  // One-at-a-time guard: every action below either reloads or navigates, so a
  // double tap could otherwise interleave two storage rewrites.
  const run = useCallback(
    (fn: () => Promise<void>) => () => {
      if (busy) return;
      setBusy(true);
      void fn().finally(() => setBusy(false));
    },
    [busy]
  );

  const handleEntitlementPress = run(async () => {
    const next: Entitlement = entitlement === 'premium' ? 'free' : 'premium';
    await setMockEntitlement(next);
    setEntitlement(next);
    show(
      copy.entitlementToast(
        next === 'premium' ? copy.entitlementPremium : copy.entitlementFree
      )
    );
  });

  const handlePersonaPress = (id: PersonaId) =>
    run(async () => {
      const persona = PERSONA_BUILDERS[id]();
      await applyPersona(persona);
      show(copy.personaToast(persona.label));
      await reloadApp();
    });

  // Both onboarding keys have to go: resetOnboarding() clears the flow state and
  // audit answers, clearOnboarding() drops the has-onboarded flag that
  // app/index.tsx actually reads. Sign out already pairs them the same way.
  const handleRestartPress = run(async () => {
    await resetOnboarding();
    await clearOnboarding();
    onClose();
    router.replace('/onboarding/welcome');
    show(copy.restartToast);
  });

  const handleWipePress = () => {
    if (busy) return;
    Alert.alert(copy.wipeAlertTitle, copy.wipeAlertMessage, [
      { text: copy.wipeCancel, style: 'cancel' },
      {
        text: copy.wipeConfirm,
        style: 'destructive',
        onPress: run(async () => {
          await clearAppData();
          show(copy.wipeToast);
          await reloadApp();
        }),
      },
    ]);
  };

  if (!enabled) return null;

  const entitlementValue =
    entitlement === 'premium' ? copy.entitlementPremium : copy.entitlementFree;
  const build = devBuildInfo();
  const buildValue = copy.buildValue(build.channel);

  return (
    <>
      <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
      <View style={styles.group}>
        <SettingsRow
          styles={styles}
          theme={theme}
          label={copy.entitlementRow}
          value={entitlementValue}
          onPress={handleEntitlementPress}
          accessibilityLabel={settingsRowLabel(copy.entitlementRow, entitlementValue)}
        />
        {PERSONA_ORDER.map((id) => (
          <SettingsRow
            key={id}
            styles={styles}
            theme={theme}
            label={PERSONA_META[id].label}
            hint={PERSONA_META[id].hint}
            onPress={handlePersonaPress(id)}
            accessibilityLabel={settingsRowLabel(PERSONA_META[id].label, PERSONA_META[id].hint)}
          />
        ))}
        <SettingsRow
          styles={styles}
          theme={theme}
          label={copy.restartRow}
          hint={copy.restartHint}
          onPress={handleRestartPress}
        />
        <SettingsRow
          styles={styles}
          theme={theme}
          label={copy.wipeRow}
          hint={copy.wipeHint}
          destructive
          onPress={handleWipePress}
        />
        <SettingsRow
          styles={styles}
          theme={theme}
          label={copy.buildRow}
          value={buildValue}
          accessibilityLabel={settingsRowLabel(copy.buildRow, buildValue)}
          last
        />
      </View>
    </>
  );
}
