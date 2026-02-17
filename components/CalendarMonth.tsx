import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import type { CalendarEvent } from '@/data/upcomingMock';
import type { UpcomingTypeFilter } from '@/data/upcomingMock';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CONTAINER_PADDING = 12;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CALENDAR_INNER_WIDTH = SCREEN_WIDTH - 40 - CONTAINER_PADDING * 2;
const CELL_SIZE = Math.max(36, Math.floor(CALENDAR_INNER_WIDTH / 7));

type CalendarMonthProps = {
  year: number;
  month: number;
  events: CalendarEvent[];
  filter: UpcomingTypeFilter;
};

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const startDay = (first.getDay() + 6) % 7;
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthDays = new Date(prevYear, prevMonth + 1, 0).getDate();
  const leading: number[] = [];
  for (let i = 0; i < startDay; i++) {
    leading.push(prevMonthDays - startDay + 1 + i);
  }
  const current: number[] = [];
  for (let i = 1; i <= daysInMonth; i++) current.push(i);
  const totalCells = leading.length + current.length;
  const trailingCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const trailing: number[] = [];
  for (let i = 1; i <= trailingCount; i++) trailing.push(i);
  return { leading, current, trailing, prevMonth, prevYear };
}

function getEventsForDay(day: number, month: number, year: number, events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => e.date === day && e.month === month && e.year === year);
}

function EventIcons({
  events,
  theme,
  styles,
}: {
  events: CalendarEvent[];
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  if (events.length === 0) return null;
  return (
    <View style={styles.eventIcons}>
      {events.map((e) => {
        if (e.type === 'rent')
          return <Ionicons key={`${e.date}-rent`} name="home-outline" size={10} color={theme.textSecondary} />;
        if (e.type === 'income')
          return <Ionicons key={`${e.date}-income`} name="arrow-down" size={10} color={theme.primary} />;
        if (e.type === 'car')
          return <Ionicons key={`${e.date}-car`} name="car-outline" size={10} color="#2196F3" />;
        return null;
      })}
    </View>
  );
}

export function CalendarMonth({ year, month, events, filter }: CalendarMonthProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();
  const { leading, current, trailing, prevMonth, prevYear } = getDaysInMonth(year, month);

  const renderDay = (day: number, isCurrent: boolean, isTrailing: boolean) => {
    const isToday = isCurrentMonth && isCurrent && day === todayDate;
    const isOtherMonth = !isCurrent;
    const monthToUse = isTrailing ? month + 1 : isCurrent ? month : prevMonth;
    const yearToUse = isTrailing ? (month === 11 ? year + 1 : year) : !isCurrent ? prevYear : year;
    const dayEvents = getEventsForDay(day, monthToUse, yearToUse, events);

    const cellStyle = [
      styles.dayCell,
      { width: CELL_SIZE, height: CELL_SIZE },
      isToday && styles.dayCellToday,
      isOtherMonth && styles.dayCellOtherMonth,
    ];

    return (
      <View key={`${monthToUse}-${day}`} style={cellStyle}>
        <EventIcons events={dayEvents} theme={theme} styles={styles} />
        <Text style={[styles.dayNum, isOtherMonth && styles.otherMonth, isToday && styles.todayText]}>
          {day}
        </Text>
        {isToday && <Text style={styles.todayLabel}>Today</Text>}
      </View>
    );
  };

  const leadingDays = leading.map((day) => renderDay(day, false, false));
  const currentDays = current.map((day) => renderDay(day, true, false));
  const trailingDays = trailing.map((day) => renderDay(day, false, true));
  const allDays = [...leadingDays, ...currentDays, ...trailingDays];
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    rows.push(allDays.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      <View style={styles.dowRow}>
        {DOW.map((d) => (
          <View key={d} style={[styles.dowCell, { width: CELL_SIZE }]}>
            <Text style={styles.dowText}>{d}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={styles.weekRow}>
          {row}
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.calendarBg,
      paddingHorizontal: CONTAINER_PADDING,
      paddingVertical: 10,
      borderRadius: 8,
    },
    dowRow: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    dowCell: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    dowText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.calendarDow,
      textAlign: 'center',
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: 0,
    },
    dayCell: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.calendarCellBg,
      borderWidth: 1,
      borderColor: theme.chipBorder,
    },
    dayCellToday: {
      backgroundColor: theme.primaryMuted,
      borderColor: theme.primary,
      borderWidth: 1.5,
    },
    dayCellOtherMonth: {
      borderStyle: 'dotted',
      borderColor: theme.calendarOtherMonth,
      backgroundColor: theme.calendarOtherMonthBg,
    },
    eventIcons: {
      flexDirection: 'row',
      gap: 2,
      marginBottom: 2,
    },
    dayNum: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    otherMonth: {
      color: theme.calendarOtherMonth,
      fontWeight: '400',
    },
    todayText: {
      color: theme.text,
      fontWeight: '700',
    },
    todayLabel: {
      fontSize: 9,
      color: theme.primary,
      marginTop: 2,
    },
  });
}
