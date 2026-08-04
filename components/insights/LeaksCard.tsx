/**
 * "Your leaks" card on the Insights tab (spec 04 "Insights", item 1).
 *
 * One row per leak: an emoji tile, the leak name, a monthly evidence line, and
 * a right-hand action chosen purely by the habit's status. Nothing here mutates
 * state: the row reports the intent upward and the screen owns the pick-one
 * sheet and navigation.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmojiTile } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitStatus } from '@/types/habit';
import { strings } from '@/constants/strings';

export type LeakRowData = {
  habit: DetectedHabit;
  /** Category glyph for the tile, resolved by the screen from the category name. */
  emoji: string;
  /** Category identity color; the tile tints it to 12%. */
  tint: string;
};

type LeaksCardProps = {
  rows: LeakRowData[];
  /** "Break it" tapped: the screen opens the pick-one sheet for this habit. */
  onBreak: (habit: DetectedHabit) => void;
  /** "Breaking" tapped: the screen pushes the habit detail route. */
  onOpenHabit: (habitId: string) => void;
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
function actionFor(status: HabitStatus): LeakAction {
  if (status === 'discovered') return 'break';
  if (status === 'changing') return 'breaking';
  return 'watch';
}

export function LeaksCard({ rows, onBreak, onOpenHabit }: LeaksCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {strings.insights.leaksTitle}
      </Text>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{strings.insights.leaksEmptyTitle}</Text>
          <Text style={styles.emptyBody}>{strings.insights.leaksEmptyBody}</Text>
        </View>
      ) : (
        rows.map(({ habit, emoji, tint }, index) => {
          const action = actionFor(habit.status);
          // Under the observation threshold there is no honest monthly rate to
          // show, so the row states the total we watched instead.
          const summary = habit.hasReliableRate
            ? strings.insights.leakSummary(format(habit.totalMonthlySpend), habit.observedCount)
            : strings.insights.leakSummaryObserved(format(habit.observedTotal), habit.observedCount);

          return (
            <View
              key={habit.id}
              style={[styles.row, index < rows.length - 1 ? styles.rowDivider : null]}
            >
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

              {action === 'watch' && (
                <Text style={styles.watchLabel}>{strings.insights.leakActionWatch}</Text>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 18,
    },
    cardTitle: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      marginBottom: 4,
    },
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
      fontSize: 14.5,
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
      backgroundColor: theme.primaryDark,
    },
    breakLabel: {
      fontSize: 13,
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
      fontSize: 13,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.primaryDark,
    },
    watchLabel: {
      fontSize: 13,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.slate,
      paddingHorizontal: 14,
    },
    empty: {
      paddingTop: 8,
      paddingBottom: 4,
    },
    emptyTitle: {
      fontSize: 14.5,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    emptyBody: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 4,
      lineHeight: 18,
    },
  });
}
