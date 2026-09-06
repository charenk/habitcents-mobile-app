/**
 * A single leak row: an emoji tile, the leak name, a monthly evidence line, and
 * a right-hand action chosen purely by the habit's status. Nothing here mutates
 * state: the row reports the intent upward and the caller owns the pick-one
 * sheet and navigation.
 *
 * Shared by the Insights tab's "Your leaks" card (components/insights/LeaksCard.tsx)
 * and the Money > Habits tab.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmojiTile } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitStatus } from '@/types/habit';
import { useStrings } from '@/utils/i18n';

export type LeakRowData = {
  habit: DetectedHabit;
  /** Category glyph for the tile, resolved by the caller from the category name. */
  emoji: string;
  /** Category identity color; the tile tints it to 12%. */
  tint: string;
};

export type HabitLeakRowProps = {
  row: LeakRowData;
  /** "Break it" tapped: the caller opens the pick-one sheet for this habit. */
  onBreak: (habit: DetectedHabit) => void;
  /** "Breaking" tapped: the caller pushes the habit detail route. */
  onOpenHabit: (habitId: string) => void;
  /** Whether this row draws the hairline divider below it. */
  showDivider?: boolean;
};

type LeakAction = 'break' | 'breaking' | 'watch';

/**
 * The row action is a pure function of habit status, so a leak can never show
 * two calls to action at once:
 * - discovered: not being broken yet, so the sage "Break it" CTA.
 * - changing: already being broken, so the primaryLight "Breaking" chip.
 * - tracking (and the terminal "completed"): watched only, so a plain slate
 *   label with no action behind it.
 */
export function leakRowAction(status: HabitStatus): LeakAction {
  if (status === 'discovered') return 'break';
  if (status === 'changing') return 'breaking';
  return 'watch';
}

export function HabitLeakRow({ row, onBreak, onOpenHabit, showDivider = false }: HabitLeakRowProps) {
  const theme = useTheme();
  const strings = useStrings();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { habit, emoji, tint } = row;
  const action = leakRowAction(habit.status);
  // Under the observation threshold there is no honest monthly rate to
  // show, so the row states the total we watched instead.
  const summary = habit.hasReliableRate
    ? strings.insights.leakSummary(format(habit.totalMonthlySpend), habit.observedCount)
    : strings.insights.leakSummaryObserved(format(habit.observedTotal), habit.observedCount);

  return (
    <View style={[styles.row, showDivider ? styles.rowDivider : null]}>
      <EmojiTile emoji={emoji} size={36} color={tint} />

      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {habit.name}
        </Text>
        <Text style={styles.rowSummary} numberOfLines={1}>
          {summary}
        </Text>
      </View>

      {action === 'break' && (
        <Pressable
          onPress={() => onBreak(habit)}
          hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${strings.insights.leakActionBreak}, ${habit.name}`}
          style={({ pressed }) => [styles.breakButton, pressed ? styles.breakButtonPressed : null]}
        >
          <Text style={styles.breakLabel}>{strings.insights.leakActionBreak}</Text>
        </Pressable>
      )}

      {action === 'breaking' && (
        <Pressable
          onPress={() => onOpenHabit(habit.id)}
          hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${strings.insights.leakActionBreaking}, ${habit.name}`}
          style={({ pressed }) => [styles.breakingChip, pressed ? styles.breakingChipPressed : null]}
        >
          <Text style={styles.breakingLabel}>{strings.insights.leakActionBreaking}</Text>
        </Pressable>
      )}

      {action === 'watch' && <Text style={styles.watchLabel}>{strings.insights.leakActionWatch}</Text>}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.hairlineSubtle,
    },
    rowText: {
      flex: 1,
    },
    rowName: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    rowSummary: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    breakButton: {
      minHeight: 38,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: radii.control,
      backgroundColor: theme.primary,
    },
    breakButtonPressed: {
      // ADR 0027 (2026-08-16, Option A): the label below is white, and
      // primaryPressedBg now resolves to the retuned sagePressed (#246242,
      // white at 7.24:1), so the label clears AA in BOTH the resting and
      // pressed states. UX-001.
      backgroundColor: theme.primaryPressedBg,
    },
    breakLabel: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.white,
    },
    breakingChip: {
      minHeight: 38,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: radii.control,
      backgroundColor: theme.primaryLight,
    },
    breakingChipPressed: {
      opacity: 0.7,
    },
    breakingLabel: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.primaryDark,
    },
    watchLabel: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.slate,
      paddingHorizontal: 14,
    },
  });
}
