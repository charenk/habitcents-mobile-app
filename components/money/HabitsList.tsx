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
import { EmptyState } from '@/components/ui';
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
  /** Empty-state first action (PRD v3.1 sect 5). Gate-aware at the call site. */
  onBreakHabit?: () => void;
};

export function HabitsList({ rows, managedMonthlyTotal, onBreak, onOpenHabit, onBreakHabit }: HabitsListProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (rows.length === 0) {
    // Pane-level fill treatment, no card shell: nothing has been discovered
    // yet, so there is nothing to manage on either tab. The habits tab offers
    // the direct action rather than Insights' "go log something", because
    // this IS the habits surface: someone here already knows what they want
    // to break.
    return (
      <EmptyState
        layout="fill"
        illustration="money-habits"
        title={strings.money.habitsEmptyTitle}
        cta={onBreakHabit ? { label: strings.money.habitsEmptyCta, onPress: onBreakHabit } : undefined}
      />
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
      color: theme.mistText,
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
  });
}
