import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { atMidnight, dayStateFor, isSameDay } from '@/utils/habitLogging';
import type { AppTheme } from '@/constants/theme';
import type { HabitLogEntry } from '@/types/habit';
import { strings } from '@/constants/strings';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type HistoryCalendarProps = {
  dayLogs: HabitLogEntry[];
  trackingStart: Date;
  today?: Date;
  onSelectToday?: () => void;
};

/**
 * The 3-state month calendar (spec 01 §4.9, §2). Pre-tracking and future days
 * are blank. Tapping today offers the same change-answer affordance as the
 * confirmation slot (handled by the caller via onSelectToday).
 */
export function HistoryCalendar({ dayLogs, trackingStart, today = new Date(), onSelectToday }: HistoryCalendarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const todayMid = atMidnight(today);
  const trackingStartMid = atMidnight(trackingStart);

  const [viewYear, setViewYear] = useState(todayMid.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayMid.getMonth());

  const canGoNext = viewYear < todayMid.getFullYear() ||
    (viewYear === todayMid.getFullYear() && viewMonth < todayMid.getMonth());
  const canGoPrev = viewYear > trackingStartMid.getFullYear() ||
    (viewYear === trackingStartMid.getFullYear() && viewMonth > trackingStartMid.getMonth());

  const goPrev = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goNext = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(new Date(viewYear, viewMonth, d));
    return result;
  }, [viewYear, viewMonth]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={goPrev} disabled={!canGoPrev} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={20} color={canGoPrev ? theme.primary : theme.border} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goNext} disabled={!canGoNext} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={20} color={canGoNext ? theme.primary : theme.border} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.grid}>
        {DOW_LABELS.map((d, i) => (
          <Text key={`dow-${i}`} style={styles.dowLabel}>{d}</Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`pad-${i}`} style={styles.cellSlot} />;
          const outOfRange = d.getTime() < trackingStartMid.getTime() || d.getTime() > todayMid.getTime();
          const isToday = isSameDay(d, todayMid);
          const state = outOfRange ? null : dayStateFor(dayLogs, d);
          const label = outOfRange ? '' : `${MONTH_NAMES[viewMonth]} ${d.getDate()}, ${
            state === 'skipped' ? 'skipped' : state === 'slipped' ? 'slipped' : 'no log'
          }`;
          return (
            <View key={d.toISOString()} style={styles.cellSlot}>
              <TouchableOpacity
                disabled={!isToday || !onSelectToday}
                onPress={onSelectToday}
                accessible={!outOfRange}
                accessibilityLabel={label || undefined}
                style={[
                  styles.dot,
                  state === 'skipped' && styles.dotSkipped,
                  state === 'slipped' && styles.dotSlipped,
                  state === 'no-log' && styles.dotNoLog,
                ]}
              >
                {state === 'skipped' && <Ionicons name="checkmark" size={12} color={theme.white} />}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <LegendItem color={theme.primary} label={strings.habitLogging.legendSkipped} />
        <LegendItem color={theme.slip} label={strings.habitLogging.legendSlipped} />
        <LegendItem outline label={strings.habitLogging.legendNoLog} theme={theme} />
      </View>
    </View>
  );
}

function LegendItem({ color, outline, label, theme }: { color?: string; outline?: boolean; label: string; theme?: AppTheme }) {
  return (
    <View style={legendStyles.row}>
      <View
        style={[
          legendStyles.dot,
          color ? { backgroundColor: color } : null,
          outline ? { borderWidth: 1.5, borderColor: theme?.border, backgroundColor: 'transparent' } : null,
        ]}
      />
      <Text style={[legendStyles.label, { color: theme?.textSecondary }]}>{label}</Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 14 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  label: { fontSize: 12 },
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    monthLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    navRow: {
      flexDirection: 'row',
      gap: 12,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dowLabel: {
      width: `${100 / 7}%`,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 6,
    },
    cellSlot: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      marginBottom: 6,
    },
    dot: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotSkipped: {
      backgroundColor: theme.primary,
    },
    dotSlipped: {
      backgroundColor: theme.slip,
    },
    dotNoLog: {
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 14,
    },
  });
}
