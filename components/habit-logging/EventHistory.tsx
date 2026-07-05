import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import type { HabitLogEntry } from '@/types/habit';
import { strings } from '@/constants/strings';

type EventHistoryProps = {
  dayLogs: HabitLogEntry[];
  skipValue: number;
};

function formatEventDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Event list for weekly/monthly cadence habits (spec 01 §4.9): newest first,
 * "{date} · Skipped one · +{skipValue}" or "{date} · Bought it" (partial:
 * "{date} · Bought it · {difference} kept").
 */
export function EventHistory({ dayLogs, skipValue }: EventHistoryProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const events = useMemo(
    () => [...dayLogs].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [dayLogs]
  );

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
      backgroundColor: theme.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    date: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    detail: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
  });
}
