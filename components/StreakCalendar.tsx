import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

type StreakDay = {
  date: Date;
  completed: boolean;
};

type StreakCalendarProps = {
  streakDays: StreakDay[];
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
};

const DAYS_TO_SHOW = 14;
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakCalendar({
  streakDays,
  currentStreak,
  longestStreak,
  compact = false,
}: StreakCalendarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate last N days
  const days = useMemo(() => {
    const result: { date: Date; completed: boolean; isToday: boolean }[] = [];
    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const streakDay = streakDays.find(d => {
        const dDate = new Date(d.date);
        dDate.setHours(0, 0, 0, 0);
        return dDate.getTime() === date.getTime();
      });

      result.push({
        date,
        completed: streakDay?.completed ?? false,
        isToday: i === 0,
      });
    }
    return result;
  }, [streakDays, today]);

  const formatDate = (date: Date): string => {
    return date.getDate().toString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.streakInfo}>
          <Ionicons name="flame" size={20} color={theme.iconOrange} />
          <Text style={styles.streakCount}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
        {!compact && (
          <Text style={styles.longestStreak}>
            Best: {longestStreak} days
          </Text>
        )}
      </View>

      <View style={styles.calendar}>
        {days.map((day, index) => (
          <View key={index} style={styles.dayColumn}>
            <Text style={styles.dayName}>
              {DAY_NAMES[day.date.getDay()]}
            </Text>
            <View
              style={[
                styles.dayCell,
                day.completed && styles.dayCellCompleted,
                day.isToday && styles.dayCellToday,
              ]}
            >
              {day.completed ? (
                <Ionicons
                  name="checkmark"
                  size={compact ? 14 : 16}
                  color={theme.white}
                />
              ) : (
                <Text
                  style={[
                    styles.dayNumber,
                    day.isToday && styles.dayNumberToday,
                  ]}
                >
                  {formatDate(day.date)}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {!compact && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotCompleted]} />
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotMissed]} />
            <Text style={styles.legendText}>Missed</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme, compact: boolean) {
  const cellSize = compact ? 28 : 36;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: compact ? 12 : 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    streakInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    streakCount: {
      fontSize: compact ? 18 : 24,
      fontWeight: '700',
      color: theme.text,
      marginLeft: 6,
    },
    streakLabel: {
      fontSize: compact ? 13 : 15,
      color: theme.textSecondary,
      marginLeft: 6,
    },
    longestStreak: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    calendar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayColumn: {
      alignItems: 'center',
    },
    dayName: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.textTertiary,
      marginBottom: 4,
    },
    dayCell: {
      width: cellSize,
      height: cellSize,
      borderRadius: cellSize / 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    dayCellCompleted: {
      backgroundColor: theme.primary,
    },
    dayCellToday: {
      borderWidth: 2,
      borderColor: theme.primary,
    },
    dayNumber: {
      fontSize: compact ? 11 : 13,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    dayNumberToday: {
      color: theme.primary,
      fontWeight: '700',
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 12,
      gap: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 6,
    },
    legendDotCompleted: {
      backgroundColor: theme.primary,
    },
    legendDotMissed: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    legendText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
  });
}
