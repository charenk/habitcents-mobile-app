/**
 * "Your leaks" card on the Insights tab (spec 04 "Insights", item 1).
 *
 * The card shell (title, empty state) lives here; each row is the shared
 * HabitLeakRow (components/habit-logging/HabitLeakRow.tsx), so this card and
 * the Money > Habits tab render the identical row.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit } from '@/types/habit';
import { strings } from '@/constants/strings';
import { HabitLeakRow, type LeakRowData } from '@/components/habit-logging/HabitLeakRow';
import { EmptyState } from '@/components/ui';

export type { LeakRowData };

type LeaksCardProps = {
  rows: LeakRowData[];
  /** "Break it" tapped: the screen opens the pick-one sheet for this habit. */
  onBreak: (habit: DetectedHabit) => void;
  /** "Breaking" tapped: the screen pushes the habit detail route. */
  onOpenHabit: (habitId: string) => void;
};

export function LeaksCard({ rows, onBreak, onOpenHabit }: LeaksCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {strings.insights.leaksTitle}
      </Text>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState title={strings.insights.leaksEmptyTitle} body={strings.insights.leaksEmptyBody} />
        </View>
      ) : (
        rows.map((row, index) => (
          <HabitLeakRow
            key={row.habit.id}
            row={row}
            onBreak={onBreak}
            onOpenHabit={onOpenHabit}
            showDivider={index < rows.length - 1}
          />
        ))
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
    empty: {
      paddingTop: 8,
      paddingBottom: 4,
      alignItems: 'center',
    },
  });
}
