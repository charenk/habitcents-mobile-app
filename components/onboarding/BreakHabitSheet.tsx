/**
 * Break habit sheet (W3, "the app is the onboarding" complete, ADR 0020 +
 * 0022). Door 3's entire flow, replacing the deleted audit-subs / audit-vices
 * / reveal / success screens: one sheet, over the real app, that goes straight
 * from "pick a habit" to "start breaking it".
 *
 * Presentational only, like PickOneSheet: this component collects the pick
 * (chip or custom name), the amount, the cadence, and the bought-today
 * answer, then hands the whole thing to `onStart`. It does not touch
 * HabitsContext, ExpensesContext, or OnboardingContext itself; the caller
 * (app/(tabs)/index.tsx) owns seeding the habit, starting it, optionally
 * logging today's expense, and completing onboarding, the same split
 * PickOneSheet already uses.
 *
 * Amount-first, like every other amount in the app: a native-keyboard
 * AmountField (ADR 0023), prefilled from the picked preset and not
 * auto-focused, so a chip pick alone never pops the keyboard the user hasn't
 * asked for. The honest yearly line is pure arithmetic from what the user
 * just typed (365/52/12 by cadence), never an invented rate. Bought-today
 * defaults to "Not today" (ADR 0020): only an explicit Yes ever asks the
 * caller to write an expense.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, spacing, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { vicePresets, VICE_IDS, type ViceId } from '@/constants/onboardingPresets';
import type { HabitFrequency } from '@/types/habit';
import { strings } from '@/constants/strings';

const CUSTOM_CHIP_ID = 'custom' as const;
type BreakChipId = ViceId | typeof CUSTOM_CHIP_ID;

const CADENCE_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: 'daily', label: strings.onboarding.breakSheetCadenceMostDays },
  { value: 'weekly', label: strings.onboarding.breakSheetCadenceWeekly },
  { value: 'monthly', label: strings.onboarding.breakSheetCadenceMonthly },
];

const YEARLY_MULTIPLIER: Record<HabitFrequency, number> = {
  daily: 365,
  weekly: 52,
  monthly: 12,
};

/** Pure arithmetic on the entered amount, rounded to the nearest whole unit. */
function yearlyKeepCents(amountCents: number, cadence: HabitFrequency): number {
  return Math.round((amountCents * YEARLY_MULTIPLIER[cadence]) / 100) * 100;
}

function yearlyLineFor(cadence: HabitFrequency, formattedAmount: string): string {
  if (cadence === 'weekly') return strings.onboarding.breakSheetYearlyLineWeekly(formattedAmount);
  if (cadence === 'monthly') return strings.onboarding.breakSheetYearlyLineMonthly(formattedAmount);
  return strings.onboarding.breakSheetYearlyLineDaily(formattedAmount);
}

const BOUGHT_OPTIONS: { value: 'no' | 'yes'; label: string }[] = [
  { value: 'no', label: strings.onboarding.breakSheetBoughtNo },
  { value: 'yes', label: strings.onboarding.breakSheetBoughtYes },
];

export type BreakHabitStartData = {
  /** The vice preset id, or 'custom' for a typed name. */
  chipId: BreakChipId;
  /** Display name: the preset's name, or the trimmed custom text. Doubles as
   * the seeded habit's merchantPattern base (the caller derives the exact
   * merchantPattern; see index.tsx). */
  name: string;
  amountCents: number;
  /** True when amountCents differs from the selected chip's preset (always
   * true for the custom chip, which has no preset to compare against). */
  valueEdited: boolean;
  cadence: HabitFrequency;
  boughtToday: boolean;
};

export type BreakHabitSheetProps = {
  visible: boolean;
  /** Free-tier touchpoint (ADR 0007): reachable here via restart-onboarding
   * when a habit is already being broken. Swaps to the gate treatment,
   * mirroring PickOneSheet's gated state. */
  freeTierBlocked?: boolean;
  /** Dismiss without starting: scrim tap, swipe, or "Maybe later" on the gate. */
  onClose: () => void;
  onStart: (data: BreakHabitStartData) => void;
  /** Opens the paywall from the gate's upgrade CTA. Optional, like
   * PickOneSheet's, since a caller that never gates can omit it. */
  onStartTrial?: () => void;
};

export function BreakHabitSheet({
  visible,
  freeTierBlocked = false,
  onClose,
  onStart,
  onStartTrial,
}: BreakHabitSheetProps) {
  const theme = useTheme();
  const { currency, format } = useCurrency();
  const { height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const presets = useMemo(() => vicePresets(currency), [currency]);
  const presetCentsById = useMemo(
    () => new Map(presets.map((p) => [p.id, p.perItemCents])),
    [presets]
  );
  const presetNameById = useMemo(() => new Map(presets.map((p) => [p.id, p.name])), [presets]);

  const [selectedChip, setSelectedChip] = useState<BreakChipId | null>(null);
  const [customName, setCustomName] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [cadence, setCadence] = useState<HabitFrequency>('daily');
  const [boughtToday, setBoughtToday] = useState<'no' | 'yes'>('no');

  // Fresh state every time the sheet opens: this is a new pick each time, not
  // an edit of the last one (PickOneSheet resets on `visible` the same way).
  useEffect(() => {
    if (!visible) return;
    setSelectedChip(null);
    setCustomName('');
    setAmountCents(0);
    setCadence('daily');
    setBoughtToday('no');
  }, [visible]);

  const selectChip = (id: BreakChipId) => {
    setSelectedChip(id);
    if (id === CUSTOM_CHIP_ID) {
      // No stated price to prefill from; the user types both the name and
      // the amount.
      setAmountCents(0);
    } else {
      setAmountCents(presetCentsById.get(id) ?? 0);
    }
  };

  const prefillCents = selectedChip && selectedChip !== CUSTOM_CHIP_ID ? presetCentsById.get(selectedChip) ?? 0 : 0;
  const valueEdited = amountCents !== prefillCents;

  const name =
    selectedChip === CUSTOM_CHIP_ID
      ? customName.trim()
      : selectedChip
        ? presetNameById.get(selectedChip) ?? ''
        : '';

  const canStart =
    !!selectedChip &&
    amountCents > 0 &&
    (selectedChip !== CUSTOM_CHIP_ID || customName.trim().length > 0);

  // Disabled-Start hint (ops ADR 0028, 2026-08-16): names the FIRST thing
  // canStart is missing, in the same order canStart checks it, so a
  // VoiceOver user hears one concrete next step rather than every gap at
  // once. Only read while Start is actually disabled (see the Button below).
  const startHint = !selectedChip
    ? strings.onboarding.breakSheetHintPickHabit
    : selectedChip === CUSTOM_CHIP_ID && customName.trim().length === 0
      ? strings.onboarding.breakSheetHintNameIt
      : strings.sheets.saveHintAmount;

  const yearlyCents = yearlyKeepCents(amountCents, cadence);
  const yearlyLine = yearlyLineFor(cadence, format(yearlyCents));

  const handleStart = () => {
    if (!canStart || !selectedChip) return;
    onStart({
      chipId: selectedChip,
      name,
      amountCents,
      valueEdited,
      cadence,
      boughtToday: boughtToday === 'yes',
    });
  };

  if (freeTierBlocked) {
    return (
      <Sheet visible={visible} onClose={onClose} accessibilityLabel={strings.onboarding.breakSheetTitle}>
        <ScrollView
          style={{ maxHeight: height * 0.86 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
            {strings.onboarding.breakSheetTitle}
          </Text>
          <Text style={styles.caption}>{strings.onboarding.breakSheetCaption}</Text>

          <View style={styles.gateCard}>
            <Text style={styles.gateEyebrow}>{strings.habitLogging.freeTierNote}</Text>
            <Text style={styles.gateTitle}>{strings.habitLogging.gateTitle}</Text>
            <Text style={styles.gateBody}>
              {strings.habitLogging.gateBody(strings.paywall.planMonthlyPrice)}
            </Text>
            <Text style={styles.gatePlanned}>{strings.paywall.plannedBanner}</Text>
          </View>

          <Button
            label={strings.habitLogging.gateUpgradeCta}
            onPress={() => onStartTrial?.()}
            style={styles.primary}
          />
          <Button label={strings.habitLogging.gateMaybeLater} variant="tertiary" onPress={onClose} />
        </ScrollView>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      accessibilityLabel={strings.onboarding.breakSheetTitle}
    >
      <View style={[styles.body, { maxHeight: height * 0.86 }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
            {strings.onboarding.breakSheetTitle}
          </Text>
          <Text style={styles.caption}>{strings.onboarding.breakSheetCaption}</Text>

          <View style={styles.chipRow}>
            {VICE_IDS.map((id) => (
              <Chip
                key={id}
                label={presetNameById.get(id) ?? id}
                selected={selectedChip === id}
                onPress={() => selectChip(id)}
              />
            ))}
            <Chip
              label={strings.onboarding.somethingElse}
              selected={selectedChip === CUSTOM_CHIP_ID}
              onPress={() => selectChip(CUSTOM_CHIP_ID)}
            />
          </View>

          {selectedChip === CUSTOM_CHIP_ID && (
            <TextField
              variant="white"
              value={customName}
              onChangeText={setCustomName}
              placeholder={strings.onboarding.somethingElseNamePlaceholder}
              style={styles.customNameInput}
              accessibilityLabel={strings.onboarding.somethingElseNamePlaceholder}
            />
          )}

          <Text style={styles.eyebrow}>{strings.habitLogging.pickOneFieldLabel}</Text>
          <AmountField
            valueCents={amountCents}
            onChangeCents={setAmountCents}
            size={48}
            accessibilityLabel={`${strings.habitLogging.pickOneFieldLabel}, ${format(amountCents)}`}
          />

          <Text style={styles.eyebrow}>{strings.onboarding.breakSheetCadenceLabel}</Text>
          <SegmentedControl
            options={CADENCE_OPTIONS}
            value={cadence}
            onChange={setCadence}
            accessibilityLabel={strings.onboarding.breakSheetCadenceLabel}
          />

          <Text style={styles.yearlyLine}>{yearlyLine}</Text>

          <Text style={styles.eyebrow}>{strings.onboarding.breakSheetBoughtTodayLabel}</Text>
          <SegmentedControl
            options={BOUGHT_OPTIONS}
            value={boughtToday}
            onChange={setBoughtToday}
            accessibilityLabel={strings.onboarding.breakSheetBoughtTodayLabel}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={strings.habitLogging.startBreakingIt}
            onPress={handleStart}
            disabled={!canStart}
            // Only carried while disabled, so VoiceOver never reads stale
            // guidance on an already-enabled button (Button.tsx passes the
            // hint straight through unconditionally).
            accessibilityHint={canStart ? undefined : startHint}
          />
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
    },
    title: {
      fontFamily: theme.fonts.display,
      // Batch 2: the third decision-moment sheet title. It sat at 28 while the
      // partial-slip and pick-one sheets sat at 32, a spread nobody can read
      // as intent. All three now share displayMid, leaving two ranks that mean
      // something: sheetTitle 26 for utility sheets, displayMid 30 for the
      // sheets that ask you to decide something. UX-018.
      fontSize: typeScale.displayMid,
      lineHeight: 34,
      color: theme.ink,
    },
    caption: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.label,
      lineHeight: 20,
      color: theme.slate,
      marginTop: 4,
      marginBottom: 16,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    customNameInput: {
      marginTop: 10,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginTop: 18,
      marginBottom: 8,
    },
    yearlyLine: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.label,
      lineHeight: 20,
      color: theme.slate,
      marginTop: 12,
    },
    primary: {
      marginTop: spacing.xxl,
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
  });
}
