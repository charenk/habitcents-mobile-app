/**
 * RemindersSheet (Tier 2, ops docs/reminders-spec.md section 5): the global
 * switch, the default reminder time, and the denied-permission route. Built
 * on CurrencySheet's selection-sheet shape (pinned serif title, rows, a
 * pinned tertiary Close), which is the house pattern for a Profile row's
 * sub-surface.
 *
 * The global row defaults ON in storage: it is a master override, not a
 * second opt-in (per-bill reminders default off, so two off defaults would
 * make the feature silently dead). Time is picked from preset chips, the
 * MonthDayPicker philosophy: no native time-picker dependency, so this
 * surface stays OTA-eligible and one visual language with the bill sheet.
 * Every change ripples to the scheduled notifications through the
 * reconciler with no code here; this sheet only writes preferences.
 *
 * ADR 0005 deleted the old reminder-time row for being a setting without a
 * feature; this sheet exists only because Tier 1 delivers now.
 */
import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useReminders } from '@/contexts/RemindersContext';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import { track } from '@/utils/analytics';
import { formatTime } from '@/utils/dates';
import { hapticError, hapticSelection } from '@/utils/motion';

export type RemindersSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/** Four presets, all on the hour. Labels render through the locale time
 * formatter (ADA-008: never a hardcoded "9:00 AM"). */
export const REMINDER_TIME_PRESETS = [9, 12, 17, 20] as const;

/** A preset hour as the user's locale writes it, e.g. "9:00 AM" or "09:00". */
export function reminderTimeLabelFor(hour: number, minute = 0): string {
  return formatTime(new Date(2026, 0, 1, hour, minute), {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function RemindersSheet({ visible, onClose }: RemindersSheetProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const strings = useStrings();
  const { show } = useToast();
  const { prefs, permission, setGlobalEnabled, setReminderTime } = useReminders();

  const handleGlobalToggle = () => {
    const next = !prefs.enabled;
    hapticSelection();
    track('reminders_global_toggled', { enabled: next });
    // Optimistic in the context; a failed persist rolls the switch back
    // there, so the only job here is saying that it failed.
    void setGlobalEnabled(next).catch((error) => {
      console.error('Error saving reminder preferences:', error);
      hapticError();
      show(strings.toasts.saveFailed);
    });
  };

  const handleTimeSelect = (hour: number) => {
    if (hour === prefs.hour && prefs.minute === 0) return;
    hapticSelection();
    track('reminder_time_changed', { hour });
    void setReminderTime(hour, 0).catch((error) => {
      console.error('Error saving reminder time:', error);
      hapticError();
      show(strings.toasts.saveFailed);
    });
  };

  // Denied is not recoverable in-app; the honest offer is the road to where
  // it is recoverable. Same failure convention as Profile's external links.
  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => show(strings.settings.linkOpenFailed));
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={strings.settings.remindersSheetTitle}
      header={
        <View style={styles.titleWrap}>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
            {strings.settings.remindersSheetTitle}
          </Text>
        </View>
      }
      contentContainerStyle={styles.content}
      footer={<Button label={strings.common.close} variant="tertiary" onPress={onClose} />}
    >
      <Pressable
        onPress={handleGlobalToggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: prefs.enabled }}
        accessibilityLabel={strings.settings.remindersGlobalRow}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Text style={styles.rowLabel}>{strings.settings.remindersGlobalRow}</Text>
        {prefs.enabled ? <Icon name="Check" size={20} color={theme.ink} /> : null}
      </Pressable>

      {prefs.enabled ? (
        <>
          <Text style={styles.eyebrow}>{strings.settings.remindersTimeEyebrow}</Text>
          <View style={styles.chipRow}>
            {REMINDER_TIME_PRESETS.map((hour) => (
              <Chip
                key={hour}
                label={reminderTimeLabelFor(hour)}
                selected={prefs.hour === hour && prefs.minute === 0}
                onPress={() => handleTimeSelect(hour)}
              />
            ))}
          </View>
        </>
      ) : null}

      {prefs.enabled && permission === 'denied' ? (
        <>
          <Text style={styles.deniedBody}>{strings.reminders.deniedHint}</Text>
          <Pressable
            onPress={handleOpenSettings}
            accessibilityRole="button"
            accessibilityLabel={strings.settings.remindersOpenSettings}
            style={({ pressed }) => [styles.row, styles.rowLast, pressed && styles.rowPressed]}
          >
            <Text style={styles.rowLabel}>{strings.settings.remindersOpenSettings}</Text>
            <Icon name="ExternalLink" size={16} color={theme.slate} />
          </Pressable>
        </>
      ) : null}
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 12,
    },
    titleWrap: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 8,
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: typeScale.sheetTitle,
      lineHeight: 32,
      color: theme.ink,
      includeFontPadding: false,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
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
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginTop: 16,
      marginBottom: 8,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingBottom: 4,
    },
    deniedBody: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.slate,
      marginTop: 16,
    },
  });
}
