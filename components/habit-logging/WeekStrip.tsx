import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { weekStrip, weekStats, type WeekDayCell } from '@/utils/habitLogging';
import type { AppTheme } from '@/constants/theme';
import type { HabitLogEntry } from '@/types/habit';
import { strings } from '@/constants/strings';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type WeekStripProps = {
  dayLogs: HabitLogEntry[];
  trackingStart: Date;
  skipValue: number;
  today?: Date;
};

function stateLabel(cell: WeekDayCell): string {
  if (cell.isOutOfRange) return 'not yet';
  if (cell.isFuture) return 'not yet';
  if (cell.isToday && cell.state === 'no-log') return 'today, not answered yet';
  if (cell.state === 'skipped') return 'skipped';
  if (cell.state === 'slipped') return 'slipped';
  return 'no log';
}

/**
 * The 7-dot Mon-Sun week strip on the daily-cadence check-in card
 * (spec 01 §4.2, §2). Same component renders identically on the Habits tab
 * and the habit detail screen (principle 6).
 */
export function WeekStrip({ dayLogs, trackingStart, skipValue, today = new Date() }: WeekStripProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const cells = useMemo(() => weekStrip(dayLogs, today, trackingStart), [dayLogs, today, trackingStart]);
  const stats = useMemo(
    () => weekStats(dayLogs, today, trackingStart, skipValue),
    [dayLogs, today, trackingStart, skipValue]
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {cells.map((cell, i) => (
          <View key={i} style={styles.dayColumn}>
            <View
              accessible
              accessibilityLabel={`${DAY_NAMES_FULL[i]}, ${stateLabel(cell)}`}
              style={[
                styles.dot,
                cell.state === 'skipped' && styles.dotSkipped,
                cell.state === 'slipped' && styles.dotSlipped,
                cell.state === 'no-log' && cell.isToday && !cell.isFuture && !cell.isOutOfRange && styles.dotToday,
                cell.state === 'no-log' && (!cell.isToday || cell.isFuture || cell.isOutOfRange) && styles.dotNoLog,
              ]}
            >
              {cell.state === 'skipped' && (
                <Ionicons name="checkmark" size={13} color={theme.white} />
              )}
            </View>
            <Text style={styles.dayLabel}>{DAY_LABELS[i]}</Text>
          </View>
        ))}
      </View>
      {stats.answered > 0 && (
        <Text style={styles.summary}>
          <Text style={styles.summaryBold}>
            {strings.habitLogging.weekSummaryBold(stats.skips, stats.answered)}
          </Text>
          {strings.habitLogging.weekSummarySuffix(stats.weekKept > 0 ? format(stats.weekKept) : null)}
        </Text>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      marginTop: 10,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayColumn: {
      alignItems: 'center',
      gap: 3,
    },
    dot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotSkipped: {
      backgroundColor: theme.primary,
    },
    dotSlipped: {
      backgroundColor: theme.slipWeekFill,
    },
    dotToday: {
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    dotNoLog: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderStyle: 'dashed',
    },
    dayLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.textTertiary,
    },
    summary: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 8,
    },
    summaryBold: {
      fontWeight: '700',
      color: theme.text,
    },
  });
}
