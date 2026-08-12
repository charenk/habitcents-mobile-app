/**
 * History calendar (design/redesign-handoff/04-screens.md, "Habit detail (R9)";
 * day-state rules in docs/design-package-phase2/01-habit-logging-spec.md
 * sections 2 and 4.9).
 *
 * Three states, three shapes: sage disc with a white check for a skip, cloud
 * disc for a slip, cloud outline for a day with no log. A slip is never red and
 * never sage. Pre-tracking and future days render as an empty slot, not as a
 * no-log day, because "you had not started yet" is not the same fact as "you
 * did not answer".
 *
 * Touch targets: the 26px dot carries 9px of hitSlop on every side, which is
 * the 44pt minimum (ADA fix, do not shrink either number without growing the
 * other).
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { atMidnight, dayStateFor, isSameDay } from '@/utils/habitLogging';
import { calendarCellLabel } from '@/utils/a11y';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import type { DayState, HabitLogEntry } from '@/types/habit';
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
          <TouchableOpacity
            onPress={goPrev}
            disabled={!canGoPrev}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            accessibilityState={{ disabled: !canGoPrev }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="ChevronLeft" size={20} color={canGoPrev ? theme.slate : theme.cloud} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goNext}
            disabled={!canGoNext}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: !canGoNext }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="ChevronRight" size={20} color={canGoNext ? theme.slate : theme.cloud} />
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
          const label = outOfRange
            ? ''
            : calendarCellLabel(MONTH_NAMES[viewMonth], d.getDate(), state as DayState);
          return (
            <View key={d.toISOString()} style={styles.cellSlot}>
              <TouchableOpacity
                disabled={!isToday || !onSelectToday}
                onPress={onSelectToday}
                accessible={!outOfRange}
                accessibilityLabel={label || undefined}
                accessibilityRole={isToday && onSelectToday ? 'button' : undefined}
                hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
                style={[
                  styles.dot,
                  state === 'skipped' && styles.dotSkipped,
                  state === 'slipped' && styles.dotSlipped,
                  state === 'no-log' && styles.dotNoLog,
                ]}
              >
                {/* UX-001: white on sage was 2.71:1, below the 3:1 icon floor. */}
                {state === 'skipped' && <Icon name="Check" size={12} color={theme.ink} />}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <LegendItem theme={theme} color={theme.primary} label={strings.habitLogging.legendSkipped} />
        <LegendItem theme={theme} color={theme.cloud} label={strings.habitLogging.legendSlipped} />
        <LegendItem theme={theme} outline label={strings.habitLogging.legendNoLog} />
      </View>
    </View>
  );
}

function LegendItem({ color, outline, label, theme }: { color?: string; outline?: boolean; label: string; theme: AppTheme }) {
  return (
    <View style={legendStyles.row}>
      <View
        style={[
          legendStyles.dot,
          color ? { backgroundColor: color } : null,
          outline ? { borderWidth: 1.5, borderColor: theme.cloud, backgroundColor: 'transparent' } : null,
        ]}
      />
      <Text style={[legendStyles.label, { color: theme.mistText, fontFamily: theme.fonts.ui }]}>{label}</Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 14 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  label: { fontSize: typeScale.caption },
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 18,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    monthLabel: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: 15,
      color: theme.ink,
    },
    navRow: {
      flexDirection: 'row',
      gap: 16,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dowLabel: {
      width: `${100 / 7}%`,
      textAlign: 'center',
      fontFamily: theme.fonts.uiBold,
      fontSize: 9,
      letterSpacing: 0.6,
      color: theme.mistText,
      marginBottom: 8,
    },
    cellSlot: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      marginBottom: 8,
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
      backgroundColor: theme.cloud,
    },
    dotNoLog: {
      borderWidth: 1.5,
      borderColor: theme.cloud,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
    },
  });
}
