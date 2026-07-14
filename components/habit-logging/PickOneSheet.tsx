import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitFrequency } from '@/types/habit';
import { strings } from '@/constants/strings';

type PickOneSheetProps = {
  visible: boolean;
  habit: DetectedHabit | null;
  monthTotal: number;
  occurrences: number;
  onCancel: () => void;
  onStart: (skipValue: number, valueEdited: boolean) => void;
  /**
   * Free-tier touchpoint (ADR 0007, spec 01 §5 "Free tier, 2nd habit"): when a
   * free user is breaking a second habit, show a quiet note and disable Start.
   */
  freeTierBlocked?: boolean;
  /**
   * Opens the paywall from the free-tier trial CTA (BET-004). The parent closes
   * this sheet and navigates, so the CTA has real behavior instead of the old
   * no-op. Optional so callers that never block (e.g. onboarding's first habit)
   * can omit it.
   */
  onStartTrial?: () => void;
};

function cadenceLabel(frequency: HabitFrequency): string {
  if (frequency === 'daily') return strings.habitLogging.pickOneCadenceDaily;
  if (frequency === 'weekly') return strings.habitLogging.pickOneCadenceWeekly;
  return strings.habitLogging.pickOneCadenceMonthly;
}

/**
 * The pick-one confirmation sheet (spec 01 §4.3). Opened by Break it (Habits
 * tab) or Track this leak (Leak Scan results). Nothing is created until Start
 * breaking it is tapped; Cancel creates nothing.
 */
export function PickOneSheet({
  visible,
  habit,
  monthTotal,
  occurrences,
  onCancel,
  onStart,
  freeTierBlocked = false,
  onStartTrial,
}: PickOneSheetProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Prefill from the detected per-occurrence average; user-editable, numeric
  // keyboard, currency-formatted (spec §4.3 item 4). We track edits vs the
  // prefilled value for the valueEdited analytics field.
  const prefill = habit ? String((habit.averageAmount / 100).toFixed(2)) : '0.00';
  const [text, setText] = useState(prefill);

  React.useEffect(() => {
    if (visible) setText(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, habit?.id]);

  if (!habit) return null;

  const isDaily = habit.frequency === 'daily';
  const parsed = parseFloat(text);
  const parsedCents = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
  const valueEdited = text !== prefill;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.grabber} />
        <Text style={styles.title}>{habit.name}</Text>
        <Text style={styles.subtitle}>{cadenceLabel(habit.frequency)}</Text>

        <Text style={styles.paragraph}>
          {strings.habitLogging.leakEvidence(habit.name, format(monthTotal), occurrences)}
        </Text>
        <Text style={styles.paragraph}>{strings.habitLogging.pickOneValueLine}</Text>

        <Text style={styles.fieldLabel}>{strings.habitLogging.pickOneFieldLabel}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel={`${strings.habitLogging.pickOneFieldLabel}, amount`}
          />
        </View>
        <Text style={styles.cadenceNote}>
          {isDaily ? strings.habitLogging.pickOneCadenceNoteDaily : strings.habitLogging.pickOneCadenceNoteEvent}
        </Text>

        {freeTierBlocked && (
          <View style={styles.freeTierNote}>
            <Text style={styles.freeTierText}>{strings.habitLogging.freeTierNote}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onStartTrial}>
              <Text style={styles.freeTierCta}>{strings.habitLogging.freeTierTrialCta}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.primaryButton, freeTierBlocked && styles.primaryButtonDisabled]}
            disabled={freeTierBlocked}
            onPress={() => onStart(parsedCents, valueEdited)}
            accessibilityRole="button"
            accessibilityState={{ disabled: freeTierBlocked }}
          >
            <Text style={styles.primaryButtonText}>{strings.habitLogging.startBreakingIt}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>{strings.common.cancel}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 28,
    },
    grabber: {
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 14,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
      marginBottom: 12,
    },
    paragraph: {
      fontSize: 15,
      color: theme.text,
      lineHeight: 21,
      marginBottom: 8,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: 8,
      marginBottom: 6,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    input: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
    },
    cadenceNote: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    freeTierNote: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      gap: 6,
    },
    freeTierText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    freeTierCta: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.primary,
    },
    buttons: {
      gap: 8,
      marginTop: 'auto',
    },
    primaryButton: {
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      backgroundColor: theme.border,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.white,
    },
    secondaryButton: {
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
  });
}
