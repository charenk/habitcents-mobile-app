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
 *
 * Two changes from device feedback (2026-08-04):
 * 1. Evidence and prefill come from the habit's observed fields. The `occurrences`
 *    prop is a per-period RATE, so it read "1 times" for a five-log afternoon;
 *    the sheet now uses habit.observedCount, and shows no monthly projection at
 *    all until habit.hasReliableRate is true.
 * 2. The gated state is a different screen, not the same screen with the button
 *    greyed out. No amount, no keypad, no daily-question note: all three are
 *    inert while gated. The user sees the leak, the situation, the price, and a
 *    live way out.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
  /**
   * Legacy prop, no longer rendered: it carries occurrencesPerPeriod, a rate
   * ("1x per day"), which the evidence line used to print as a count. The real
   * count is habit.observedCount. Kept so the frozen signature holds.
   */
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

  // Prefilled from the detected per-occurrence MEDIAN and edited on the keypad
  // (spec §4.3 item 4). Median, not average: one $44 order in a set of $4-$22
  // buys drags an average above every buy the user actually makes. valueEdited
  // compares cents against that prefill so the analytics field stays true
  // regardless of how the string was typed.
  const prefillCents = habit?.medianAmount ?? habit?.averageAmount ?? 0;
  const [value, setValue] = useState(() => centsToKeypadValue(prefillCents));

  useEffect(() => {
    if (visible) setValue(centsToKeypadValue(prefillCents));
  }, [visible, habit?.id, prefillCents]);

  if (!habit) return null;

  const isDaily = habit.frequency === 'daily';
  const cents = keypadValueToCents(value);
  const valueEdited = cents !== prefillCents;
  // A monthly rate is only shown once detection has watched the leak long
  // enough to have one (utils/habitDetection.ts MIN_SPAN_DAYS_FOR_RATE).
  const evidence = habit.hasReliableRate
    ? strings.habitLogging.leakEvidenceReliable(habit.name, format(monthTotal), habit.observedCount)
    : strings.habitLogging.leakEvidenceObserved(
        habit.name,
        format(habit.observedTotal),
        habit.observedCount
      );
  const hasRange = habit.maxAmount > habit.minAmount;

  const header = (
    <>
      <Text style={styles.title} accessibilityRole="header">{titleCase(habit.name)}</Text>
      <Text style={styles.cadence}>
        {strings.habitLogging.pickOneNewLeak} · {cadenceLabel(habit.frequency)}
      </Text>

      <Text style={styles.paragraph}>{evidence}</Text>
      {!habit.hasReliableRate && (
        <Text style={styles.hint}>{strings.habitLogging.leakEvidenceKeepLogging}</Text>
      )}
    </>
  );

  // Gated: a different sheet, not a disabled one. Nothing here pretends to be
  // usable, and the only live control leads somewhere real.
  if (freeTierBlocked) {
    return (
      <Sheet visible={visible} onClose={onCancel} accessibilityLabel={habit.name}>
        <ScrollView
          style={{ maxHeight: height * 0.86 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {header}

          <View style={styles.gateCard}>
            <Text style={styles.gateEyebrow}>{strings.habitLogging.freeTierNote}</Text>
            <Text style={styles.gateTitle}>{strings.habitLogging.gateTitle}</Text>
            <Text style={styles.gateBody}>
              {strings.habitLogging.gateBody(strings.paywall.planMonthlyPrice)}
            </Text>
            {/* Same honesty note the paywall carries: nothing is charged yet. */}
            <Text style={styles.gatePlanned}>{strings.paywall.plannedBanner}</Text>
          </View>

          <Button
            label={strings.habitLogging.gateUpgradeCta}
            onPress={() => onStartTrial?.()}
            style={styles.primary}
          />
          {/* Neutral exit: the leak is not being rejected, just deferred. */}
          <Button
            label={strings.habitLogging.gateMaybeLater}
            variant="tertiary"
            onPress={onCancel}
          />
        </ScrollView>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onCancel} accessibilityLabel={habit.name}>
      <ScrollView
        style={{ maxHeight: height * 0.86 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {header}
        <Text style={styles.paragraph}>{strings.habitLogging.pickOneValueLine}</Text>

        <Text style={styles.eyebrow}>{strings.habitLogging.pickOneFieldLabel}</Text>
        {hasRange && (
          <Text style={styles.hint}>
            {strings.habitLogging.pickOneRangeHint(format(habit.minAmount), format(habit.maxAmount))}
          </Text>
        )}
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

        <Button
          label={strings.habitLogging.startBreakingIt}
          onPress={() => onStart(cents, valueEdited)}
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
    // Quiet second line: the keep-logging note and the buy-range hint.
    hint: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      lineHeight: 18,
      color: theme.mist,
      marginBottom: 8,
    },
    gateCard: {
      backgroundColor: theme.snow,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.cloud,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginTop: 10,
    },
    gateEyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mist,
      marginBottom: 6,
    },
    gateTitle: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: 16,
      lineHeight: 22,
      color: theme.ink,
    },
    gateBody: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      lineHeight: 20,
      color: theme.slate,
      marginTop: 4,
    },
    gatePlanned: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      lineHeight: 17,
      color: theme.mist,
      marginTop: 10,
    },
    primary: {
      marginTop: 18,
    },
  });
}
