/**
 * HabitsList (Money > Habits, ADR 0019 DI-8).
 *
 * The management surface for every leak and habit: an eyebrow summary line,
 * then the same rows Insights' "Your leaks" card shows (components/insights/
 * LeaksCard.tsx), reused verbatim via the shared HabitLeakRow. Money owns
 * management (break it, open it); Insights keeps its own list as the analysis
 * lens next to "Where it went" and pace. The duplication between the two
 * tabs is deliberate for v1: same rows, same words, two different jobs.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { HabitLeakRow, type LeakRowData } from '@/components/habit-logging/HabitLeakRow';
import type { DetectedHabit } from '@/types/habit';

export type HabitsListProps = {
  rows: LeakRowData[];
  /** Sum of totalMonthlySpend over ACTIVE habits (status tracking or changing) in cents. */
  managedMonthlyTotal: number;
  /** "Break it" tapped: the screen opens the pick-one sheet for this habit. */
  onBreak: (habit: DetectedHabit) => void;
  /** "Breaking" tapped: the screen pushes the habit detail route. */
  onOpenHabit: (habitId: string) => void;
};

export function HabitsList({ rows, managedMonthlyTotal, onBreak, onOpenHabit }: HabitsListProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (rows.length === 0) {
    // Same experience, same words as Insights' empty leaks state: nothing has
    // been discovered yet, so there is nothing to manage on either tab.
    return (
      <View style={styles.card}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{strings.insights.leaksEmptyTitle}</Text>
          <Text style={styles.emptyBody}>{strings.insights.leaksEmptyBody}</Text>
        </View>
      </View>
    );
  }

  // "Managed" means a goal is actually running (tracking or changing); a
  // discovered-not-started leak never counts toward the count or the total,
  // so the summary never claims credit for a leak nobody has acted on yet.
  const managedCount = rows.filter(
    (row) => row.habit.status === 'tracking' || row.habit.status === 'changing'
  ).length;

  const summary =
    managedCount > 0
      ? strings.money.habitsManagedSummary(managedCount, format(managedMonthlyTotal))
      : strings.money.habitsDiscoveredSummary(rows.length);

  return (
    <View>
      <Text style={styles.eyebrow}>{summary}</Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <HabitLeakRow
            key={row.habit.id}
            row={row}
            onBreak={onBreak}
            onOpenHabit={onOpenHabit}
            showDivider={index < rows.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mist,
      marginBottom: 6,
      marginLeft: 4,
      fontVariant: ['tabular-nums'],
    },
    card: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.feature,
      paddingHorizontal: 18,
    },
    empty: {
      paddingVertical: 10,
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
