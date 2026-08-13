import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { weekStrip, weekStats } from '@/utils/habitLogging';
import { weekDotLabel } from '@/utils/a11y';
import { typeScale, type AppTheme } from '@/constants/theme';
import type { HabitLogEntry } from '@/types/habit';
import { strings } from '@/constants/strings';
import { formatDate } from '@/utils/dates';

const DOT_SIZE = 26;

type WeekStripProps = {
  dayLogs: HabitLogEntry[];
  trackingStart: Date;
  skipValue: number;
  today?: Date;
};

/**
 * The 7-dot Mon-Sun week strip on the daily-cadence check-in card
 * (design/redesign-handoff/04-screens.md, "Today" 3). Same component renders
 * identically on Today and the habit detail screen (principle 6).
 *
 * Four dot states, and none of them is red: a skip is sage with a white check,
 * a slip is a flat cloud fill, today-unanswered is a sage ring, and anything
 * not yet reachable is a cloud ring. Every number comes from weekStats.
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
        {cells.map((cell, i) => {
          const unanswered = cell.state === 'no-log';
          const isTodayOpen = unanswered && cell.isToday && !cell.isFuture && !cell.isOutOfRange;
          // UX-027: the shared, unit-tested builder (utils/a11y.ts) instead of
          // a hand-rolled label whose wording had drifted from it.
          // UX-046: the weekday name/letter come from the cell's own date via
          // the locale-aware formatDate, not a hardcoded English array, so
          // this stops being a fixed-English surface.
          const weekdayFull = formatDate(cell.date, { weekday: 'long' });
          const weekdayLetter = formatDate(cell.date, { weekday: 'narrow' });
          const reachable = !cell.isFuture && !cell.isOutOfRange;
          return (
            <View key={i} style={styles.dayColumn}>
              <View
                accessible
                accessibilityLabel={weekDotLabel(weekdayFull, cell.state, cell.isToday, reachable)}
                style={[
                  styles.dot,
                  cell.state === 'skipped' && styles.dotSkipped,
                  cell.state === 'slipped' && styles.dotSlipped,
                  isTodayOpen && styles.dotToday,
                  unanswered && !isTodayOpen && styles.dotOpen,
                ]}
              >
                {/* UX-001: white on sage was 2.71:1, below the 3:1 icon floor. */}
                {cell.state === 'skipped' && <Icon name="Check" size={14} color={theme.ink} />}
              </View>
              <Text style={styles.dayLabel}>{weekdayLetter}</Text>
            </View>
          );
        })}
      </View>
      {stats.answered > 0 && (
        <Text style={styles.summary}>
          <Text style={styles.summaryBold}>
            {strings.today.weekSummarySkipped(stats.skips, stats.answered)}
          </Text>
          {stats.weekKept > 0
            ? strings.today.weekSummaryTail(format(stats.weekKept))
            : strings.habitLogging.weekSummarySuffix(null)}
        </Text>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      marginTop: 14,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayColumn: {
      alignItems: 'center',
      gap: 5,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotSkipped: {
      backgroundColor: theme.primary,
    },
    // A slip is neutral: a flat cloud fill, never red, and it never subtracts.
    dotSlipped: {
      backgroundColor: theme.cloud,
    },
    dotToday: {
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    dotOpen: {
      borderWidth: 1.5,
      borderColor: theme.cloud,
    },
    dayLabel: {
      // Batch 2: token, was a literal 9.
      fontSize: typeScale.micro,
      fontFamily: theme.fonts.uiBold,
      color: theme.mistText,
    },
    summary: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 10,
      fontVariant: ['tabular-nums'],
    },
    summaryBold: {
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
  });
}
