/**
 * Pick-one sheet (design/redesign-handoff/04-screens.md, "Pick-one sheet
 * (R14)"; product rules in docs/design-package-phase2/01-habit-logging-spec.md
 * section 4.3).
 *
 * The commitment moment: the leak's name, the evidence, and the one number the
 * whole habit runs on. Amount first, like every other amount in the app: a
 * native-keyboard AmountField (ADR 0023), prefilled from the detected median
 * and not auto-focused, since the amount already has a real value the user
 * only edits if it's wrong.
 *
 * Nothing is created until "Start breaking it" is tapped; "Not this one"
 * creates nothing.
 *
 * PROPS ARE FROZEN. Today, habit detail, Insights, onboarding reveal/success
 * and the Leak Scan results screen all render this sheet; the internals were
 * rebuilt on Sheet + AmountField without touching the signature.
 *
 * Two changes from device feedback (2026-08-04):
 * 1. Evidence and prefill come from the habit's observed fields. The `occurrences`
 *    prop is a per-period RATE, so it read "1 times" for a five-log afternoon;
 *    the sheet now uses habit.observedCount, and shows no monthly projection at
 *    all until habit.hasReliableRate is true.
 * 2. The gated state is a different screen, not the same screen with the button
 *    greyed out. No amount, no field, no daily-question note: all three are
 *    inert while gated. The user sees the leak, the situation, the price, and a
 *    live way out.
 *
 * A third gated variant (backlog from the gating audit, 2026-08-11): a
 * premium user already at the real 5-habit ceiling used to see the same
 * free-tier upsell pitch as a free user, which is dishonest (they are already
 * paying) and pitches nothing they can buy. `entitlement` (optional, so the
 * frozen signature only grows) tells the gated state which honest copy to
 * show; omitting it keeps the free-tier pitch, which is right for every
 * existing call site that has never passed an entitlement.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitFrequency } from '@/types/habit';
import type { Entitlement } from '@/utils/purchases';
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
  /**
   * Which honest gated copy to show when freeTierBlocked is true: a free
   * user sees the upgrade pitch, a premium user at the real ceiling sees the
   * ceiling copy with no upgrade CTA. Optional and defaults to the free-tier
   * pitch, so every call site written before this prop existed is unchanged.
   */
  entitlement?: Entitlement;
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
  entitlement,
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
  const [cents, setCents] = useState(prefillCents);

  useEffect(() => {
    if (visible) setCents(prefillCents);
  }, [visible, habit?.id, prefillCents]);

  if (!habit) return null;

  const isDaily = habit.frequency === 'daily';
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

  // UX-051: cents === 0 would set "one skip keeps $0.00" with no warning,
  // silently zeroing out every future skip on this habit.
  // Disabled-until-valid (ops ADR 0028, 2026-08-16): Start is disabled until
  // an amount is entered, rather than staying live and toasting "Enter an
  // amount first." on an empty tap (the old house pattern, shared with
  // PartialSlipSheet/ExpenseSheet).
  const canStart = cents !== 0;

  const handleStart = () => {
    // Unreachable from the UI now that Start is disabled until canStart;
    // kept as a defensive guard.
    if (!canStart) return;
    onStart(cents, valueEdited);
  };

  const header = (
    <>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>{titleCase(habit.name)}</Text>
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
    // A premium user can reach this gate too (already at the real 5-habit
    // ceiling), and the free-tier upsell pitch below is wrong for them: they
    // are already paying, and there is nothing left to sell. Distinct honest
    // copy, no upgrade CTA (backlog from the gating audit, 2026-08-11).
    const atCeiling = entitlement === 'premium';
    return (
      <Sheet visible={visible} onClose={onCancel} accessibilityLabel={habit.name}>
        <ScrollView
          style={{ maxHeight: height * 0.86 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {header}

          <View style={styles.gateCard}>
            <Text style={styles.gateEyebrow}>
              {atCeiling ? strings.habitLogging.ceilingNote : strings.habitLogging.freeTierNote}
            </Text>
            <Text style={styles.gateTitle}>
              {atCeiling ? strings.habitLogging.ceilingTitle : strings.habitLogging.gateTitle}
            </Text>
            <Text style={styles.gateBody}>
              {atCeiling
                ? strings.habitLogging.ceilingBody
                : strings.habitLogging.gateBody(strings.paywall.planMonthlyPrice)}
            </Text>
            {/* Same honesty note the paywall carries: nothing is charged yet.
                Not shown at the ceiling: nobody is being asked to pay. */}
            {!atCeiling && (
              <Text style={styles.gatePlanned}>{strings.paywall.plannedBanner}</Text>
            )}
          </View>

          {atCeiling ? (
            <Button
              label={strings.habitLogging.ceilingDismiss}
              onPress={onCancel}
              style={styles.primary}
            />
          ) : (
            <>
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
            </>
          )}
        </ScrollView>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onCancel} avoidKeyboard accessibilityLabel={habit.name}>
      <View style={[styles.body, { maxHeight: height * 0.86 }]}>
        <ScrollView
          style={styles.scroll}
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
          <AmountField
            valueCents={cents}
            onChangeCents={setCents}
            size={48}
            accessibilityLabel={`${strings.habitLogging.pickOneFieldLabel}, ${format(cents)}`}
          />

          <Text style={styles.cadenceNote}>
            {isDaily ? strings.habitLogging.pickOneCadenceNoteDaily : strings.habitLogging.pickOneCadenceNoteEvent}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={strings.habitLogging.startBreakingIt}
            onPress={handleStart}
            disabled={!canStart}
            // Only carried while disabled, so VoiceOver never reads stale
            // guidance on an already-enabled button (Button.tsx passes the
            // hint straight through unconditionally).
            accessibilityHint={canStart ? undefined : strings.sheets.saveHintAmount}
          />
          <Button label={strings.habitLogging.notThisOne} variant="tertiary" onPress={onCancel} />
        </View>
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: {
      flexShrink: 1,
    },
    scroll: {
      flexShrink: 1,
    },
    content: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 8,
    },
    title: {
      fontFamily: theme.fonts.display,
      // Batch 2: token, was a literal 32. displayMid (30) is now the one
      // size for every decision-moment sheet title (partial slip, pick one,
      // break habit).
      fontSize: typeScale.displayMid,
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
      fontSize: typeScale.label,
      lineHeight: 20,
      color: theme.slate,
      marginBottom: 8,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginTop: 14,
      marginBottom: 6,
    },
    cadenceNote: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      lineHeight: 18,
      color: theme.mistText,
      marginTop: 14,
    },
    // Quiet second line: the keep-logging note and the buy-range hint.
    hint: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      lineHeight: 18,
      color: theme.mistText,
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
      color: theme.mistText,
      marginBottom: 6,
    },
    gateTitle: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.button,
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
      color: theme.mistText,
      marginTop: 10,
    },
    primary: {
      marginTop: 18,
    },
  });
}
