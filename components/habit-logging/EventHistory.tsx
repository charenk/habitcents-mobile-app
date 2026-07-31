/**
 * Event history (design/redesign-handoff/04-screens.md, "Habit detail (R9)":
 * the weekly/monthly cadence card that replaces the calendar; product rules in
 * docs/design-package-phase2/01-habit-logging-spec.md section 4.9).
 *
 * A weekly or monthly leak has no daily question, so a month grid would be 28
 * empty circles and two answers. The list shows only what actually happened,
 * newest first: "Aug 3 · Skipped one · +$22.00" or "Aug 3 · Bought it".
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDate } from '@/utils/dates';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import type { HabitLogEntry } from '@/types/habit';
import { strings } from '@/constants/strings';

type EventHistoryProps = {
  dayLogs: HabitLogEntry[];
  skipValue: number;
};

function formatEventDate(d: Date): string {
  return formatDate(d, { month: 'short', day: 'numeric' });
}

export function EventHistory({ dayLogs, skipValue }: EventHistoryProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const events = useMemo(
    () => [...dayLogs].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [dayLogs]
  );

  if (events.length === 0) {
    return (
      <View style={styles.card}>
        {/* TODO(step-05): hoist to strings.ts (habitDetailV2.eventHistoryEmpty). */}
        <Text style={styles.empty}>Nothing logged yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {events.map((e, i) => (
        <View key={`${e.date.toISOString()}-${i}`} style={[styles.row, i < events.length - 1 && styles.rowBorder]}>
          <Text style={styles.date}>{formatEventDate(e.date)}</Text>
          <Text style={styles.detail}>
            {e.state === 'skipped'
              ? strings.habitLogging.eventSkippedOne(format(skipValue))
              : e.partialAmount != null
                ? strings.habitLogging.eventBoughtItPartial(format(Math.max(0, skipValue - e.partialAmount)))
                : strings.habitLogging.eventBoughtIt}
          </Text>
        </View>
      ))}
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
      paddingHorizontal: 18,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      paddingVertical: 12,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.hairlineSubtle,
    },
    date: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.mist,
      fontVariant: ['tabular-nums'],
    },
    detail: {
      fontFamily: theme.fonts.uiMedium,
      fontSize: 14,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    empty: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.mist,
      paddingVertical: 18,
    },
  });
}
