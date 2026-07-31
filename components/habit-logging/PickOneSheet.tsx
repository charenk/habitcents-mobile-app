/**
 * Pick-one sheet (design/redesign-handoff/04-screens.md, "Pick-one sheet
 * (R14)"; product rules in docs/design-package-phase2/01-habit-logging-spec.md
 * section 4.3).
 *
 * The commitment moment: the leak's name, the evidence, and the one number the
 * whole habit runs on. Amount first, like every other amount in the app, so the
 * skip value is entered on the same keypad as an expense rather than in a
 * lonely text field.
 *
 * Nothing is created until "Start breaking it" is tapped; "Not this one"
 * creates nothing.
 *
 * PROPS ARE FROZEN. Today, habit detail, Insights, onboarding reveal/success
 * and the Leak Scan results screen all render this sheet; the internals were
 * rebuilt on Sheet + AmountDisplay + Keypad without touching the signature.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { Keypad } from '@/components/ui/Keypad';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitFrequency } from '@/types/habit';
import { centsToKeypadValue, keypadValueToCents } from '@/utils/keypad';
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

/** Serif titles end in a period (spec 01 §2), including habit names. */
function titleCase(name: string): string {
  return name.endsWith('.') ? name : `${name}.`;
}

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
  const { height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Prefilled from the detected per-occurrence average and edited on the keypad
  // (spec §4.3 item 4). valueEdited compares cents against that prefill so the
  // analytics field stays true regardless of how the string was typed.
  const prefillCents = habit?.averageAmount ?? 0;
  const [value, setValue] = useState(() => centsToKeypadValue(prefillCents));

  useEffect(() => {
    if (visible) setValue(centsToKeypadValue(prefillCents));
  }, [visible, habit?.id, prefillCents]);

  if (!habit) return null;

  const isDaily = habit.frequency === 'daily';
  const cents = keypadValueToCents(value);
  const valueEdited = cents !== prefillCents;

  return (
    <Sheet visible={visible} onClose={onCancel} accessibilityLabel={habit.name}>
      <ScrollView
        style={{ maxHeight: height * 0.86 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title} accessibilityRole="header">{titleCase(habit.name)}</Text>
        <Text style={styles.cadence}>{cadenceLabel(habit.frequency)}</Text>

        <Text style={styles.paragraph}>
          {strings.habitLogging.leakEvidence(habit.name, format(monthTotal), occurrences)}
        </Text>
        <Text style={styles.paragraph}>{strings.habitLogging.pickOneValueLine}</Text>

        <Text style={styles.eyebrow}>{strings.habitLogging.pickOneFieldLabel}</Text>
        {/* Wrapped so VoiceOver reads one labelled value instead of the
            currency symbol and the number as two bare nodes. */}
        <View accessible accessibilityLabel={`${strings.habitLogging.pickOneFieldLabel}, ${format(cents)}`}>
          <AmountDisplay valueCents={cents} focused size={46} zeroAsPlaceholder />
        </View>

        <View style={styles.keypad}>
          <Keypad value={value} onChange={setValue} />
        </View>

        <Text style={styles.cadenceNote}>
          {isDaily ? strings.habitLogging.pickOneCadenceNoteDaily : strings.habitLogging.pickOneCadenceNoteEvent}
        </Text>

        {freeTierBlocked && (
          <View style={styles.freeTierNote}>
            <Text style={styles.freeTierText}>{strings.habitLogging.freeTierNote}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onStartTrial}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              style={({ pressed }) => [styles.freeTierCtaHit, pressed ? styles.pressed : null]}
            >
              <Text style={styles.freeTierCta}>{strings.habitLogging.freeTierTrialCta}</Text>
            </Pressable>
          </View>
        )}

        <Button
          label={strings.habitLogging.startBreakingIt}
          onPress={() => onStart(cents, valueEdited)}
          disabled={freeTierBlocked}
          style={styles.primary}
        />
        <Button label={strings.habitLogging.notThisOne} variant="tertiary" onPress={onCancel} />
      </ScrollView>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: 32,
      lineHeight: 38,
      color: theme.ink,
    },
    cadence: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      marginTop: 2,
      marginBottom: 14,
    },
    paragraph: {
      fontFamily: theme.fonts.ui,
      fontSize: 14,
      lineHeight: 20,
      color: theme.slate,
      marginBottom: 8,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mist,
      marginTop: 14,
      marginBottom: 6,
    },
    keypad: {
      marginTop: 18,
    },
    cadenceNote: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      lineHeight: 18,
      color: theme.mist,
      marginTop: 14,
    },
    freeTierNote: {
      backgroundColor: theme.snow,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.cloud,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 14,
    },
    freeTierText: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
    },
    freeTierCtaHit: {
      minHeight: 32,
      justifyContent: 'center',
      marginTop: 2,
    },
    freeTierCta: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.secondary,
      color: theme.primaryDark,
    },
    pressed: {
      opacity: 0.6,
    },
    primary: {
      marginTop: 18,
    },
  });
}
