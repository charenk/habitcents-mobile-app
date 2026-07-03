import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { StreakCalendar } from './StreakCalendar';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitChangeGoal, StreakDay } from '@/types/habit';
import { strings } from '@/constants/strings';

type HabitProgressCardProps = {
  habit: DetectedHabit;
  goal: HabitChangeGoal;
  streakDays: StreakDay[];
  onPress?: () => void;
  onLogToday?: () => void;
};

export function HabitProgressCard({
  habit,
  goal,
  streakDays,
  onPress,
  onLogToday,
}: HabitProgressCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const savingsProgress = goal.savingsGoal > 0
    ? Math.min(100, Math.round((goal.actualSavings / goal.savingsGoal) * 100))
    : 0;

  const getGoalTypeLabel = () => {
    switch (goal.targetType) {
      case 'reduce_amount':
        return strings.habits.reduceToAmount(format(goal.targetValue ?? 0, { compact: true }));
      case 'reduce_frequency':
        return strings.habits.reduceToFrequency(goal.targetValue);
      case 'eliminate':
        return strings.habits.eliminate;
      case 'substitute':
        return strings.habits.substitute(goal.targetSubstitute);
      default:
        return strings.habits.trackThisHabit;
    }
  };

  const hasLoggedToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return streakDays.some(d => {
      const dayDate = new Date(d.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === today.getTime();
    });
  };

  // Get recent milestones
  const recentMilestones = goal.milestones
    .filter(m => m.reachedAt)
    .slice(-2);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{habit.name}</Text>
          <Text style={styles.goalType}>{getGoalTypeLabel()}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name="pulse" size={14} color={theme.primary} />
          <Text style={styles.statusText}>{strings.habits.active}</Text>
        </View>
      </View>

      <StreakCalendar
        streakDays={streakDays}
        currentStreak={goal.currentStreak}
        longestStreak={goal.longestStreak}
        compact
      />

      {/* Savings Progress */}
      <View style={styles.savingsSection}>
        <View style={styles.savingsHeader}>
          <Text style={styles.savingsLabel}>{strings.habits.savingsProgress}</Text>
          <Text style={styles.savingsAmount}>
            {format(goal.actualSavings, { compact: true })} / {format(goal.savingsGoal, { compact: true })}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${savingsProgress}%` },
            ]}
          />
        </View>
      </View>

      {/* Recent Milestones */}
      {recentMilestones.length > 0 && (
        <View style={styles.milestonesSection}>
          {recentMilestones.map((milestone) => (
            <View key={milestone.id} style={styles.milestoneChip}>
              <Ionicons
                name={milestone.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={theme.primary}
              />
              <Text style={styles.milestoneName}>{milestone.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Log Today Button */}
      {!hasLoggedToday() && onLogToday && (
        <TouchableOpacity style={styles.logButton} onPress={onLogToday}>
          <Ionicons name="add-circle" size={20} color={theme.white} />
          <Text style={styles.logButtonText}>{strings.habits.logToday}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    headerLeft: {
      flex: 1,
    },
    name: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    goalType: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
      marginLeft: 4,
    },
    savingsSection: {
      marginTop: 16,
    },
    savingsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    savingsLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    savingsAmount: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.background,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    milestonesSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
      gap: 8,
    },
    milestoneChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary + '15',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    milestoneName: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.primary,
      marginLeft: 4,
    },
    logButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 16,
    },
    logButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.white,
      marginLeft: 6,
    },
  });
}
