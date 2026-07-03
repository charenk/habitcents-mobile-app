import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useHabits } from '@/contexts/HabitsContext';
import { StreakCalendar } from '@/components/StreakCalendar';
import type { AppTheme } from '@/constants/theme';
import type { StreakDay } from '@/types/habit';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    getHabitById,
    getGoalByHabitId,
    createGoal,
    logStreakDay,
    startTrackingHabit,
  } = useHabits();

  const habit = getHabitById(id || '');
  const goal = getGoalByHabitId(id || '');

  const [isLogging, setIsLogging] = useState(false);

  if (!habit) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Habit not found</Text>
        </View>
      </View>
    );
  }

  const formatAmount = (cents: number): string => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  // Real streak history from the goal's persisted logs.
  const streakDays: StreakDay[] = useMemo(() => goal?.logs ?? [], [goal]);

  const handleStartTracking = async () => {
    await startTrackingHabit(habit.id);
    await createGoal(
      habit.id,
      'reduce_amount',
      Math.round(habit.totalMonthlySpend * 0.8),
      habit.totalMonthlySpend
    );
  };

  const handleLogDay = async (completed: boolean) => {
    if (!goal) return;
    setIsLogging(true);
    await logStreakDay(goal.id, completed);
    setIsLogging(false);
  };

  const getSentimentColor = () => {
    switch (habit.sentiment) {
      case 'good':
        return theme.primary;
      case 'bad':
        return theme.danger;
      default:
        return theme.iconOrange;
    }
  };

  const getTrendIcon = () => {
    switch (habit.trend) {
      case 'increasing':
        return 'trending-up';
      case 'decreasing':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (habit.trend) {
      case 'increasing':
        return theme.danger;
      case 'decreasing':
        return theme.primary;
      default:
        return theme.textSecondary;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + 44 }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor() + '20' }]}>
            <Text style={[styles.sentimentText, { color: getSentimentColor() }]}>
              {habit.sentiment.charAt(0).toUpperCase() + habit.sentiment.slice(1)} Habit
            </Text>
          </View>
          <Text style={styles.title}>{habit.name}</Text>
          <Text style={styles.description}>{habit.description}</Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatAmount(habit.totalMonthlySpend)}</Text>
              <Text style={styles.statLabel}>per month</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{habit.occurrencesPerPeriod}x</Text>
              <Text style={styles.statLabel}>per {habit.frequency === 'daily' ? 'day' : habit.frequency === 'weekly' ? 'week' : 'month'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={styles.trendRow}>
                <Ionicons name={getTrendIcon()} size={18} color={getTrendColor()} />
                <Text style={[styles.statValue, { color: getTrendColor(), marginLeft: 4 }]}>
                  {habit.trendPercentage}%
                </Text>
              </View>
              <Text style={styles.statLabel}>{habit.trend}</Text>
            </View>
          </View>
        </View>

        {/* Trigger Analysis */}
        {habit.triggers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When Does This Happen?</Text>
            <View style={styles.triggersCard}>
              {habit.triggers.map((trigger, index) => (
                <View key={index} style={styles.triggerRow}>
                  <View style={styles.triggerIcon}>
                    <Ionicons
                      name={
                        trigger.type === 'time'
                          ? 'time-outline'
                          : trigger.type === 'location'
                          ? 'location-outline'
                          : 'information-circle-outline'
                      }
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                  <View style={styles.triggerContent}>
                    <Text style={styles.triggerDescription}>{trigger.description}</Text>
                    <Text style={styles.triggerConfidence}>
                      {Math.round(trigger.confidence * 100)}% confidence
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Streak Section (if tracking) */}
        {goal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <StreakCalendar
              streakDays={streakDays}
              currentStreak={goal.currentStreak}
              longestStreak={goal.longestStreak}
            />
          </View>
        )}

        {/* Savings Section (if tracking) */}
        {goal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Savings Progress</Text>
            <View style={styles.savingsCard}>
              <View style={styles.savingsHeader}>
                <Text style={styles.savingsAmount}>
                  {formatAmount(goal.actualSavings)}
                </Text>
                <Text style={styles.savingsGoal}>
                  of {formatAmount(goal.savingsGoal)} goal
                </Text>
              </View>
              <View style={styles.savingsBar}>
                <View
                  style={[
                    styles.savingsBarFill,
                    {
                      width: `${Math.min(100, (goal.actualSavings / goal.savingsGoal) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Milestones (if tracking) */}
        {goal && goal.milestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            <View style={styles.milestonesCard}>
              {goal.milestones.map((milestone) => (
                <View
                  key={milestone.id}
                  style={[
                    styles.milestoneRow,
                    milestone.reachedAt && styles.milestoneRowCompleted,
                  ]}
                >
                  <View
                    style={[
                      styles.milestoneIcon,
                      milestone.reachedAt && styles.milestoneIconCompleted,
                    ]}
                  >
                    <Ionicons
                      name={
                        milestone.reachedAt
                          ? 'checkmark'
                          : (milestone.icon as keyof typeof Ionicons.glyphMap)
                      }
                      size={16}
                      color={milestone.reachedAt ? theme.white : theme.textSecondary}
                    />
                  </View>
                  <View style={styles.milestoneContent}>
                    <Text style={styles.milestoneName}>{milestone.name}</Text>
                    <Text style={styles.milestoneDescription}>
                      {milestone.targetStreak} day streak
                    </Text>
                  </View>
                  {milestone.reachedAt && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Suggestions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggestions</Text>
          <View style={styles.suggestionsCard}>
            <View style={styles.suggestionRow}>
              <Ionicons name="bulb-outline" size={20} color={theme.iconOrange} />
              <Text style={styles.suggestionText}>
                Try preparing coffee at home to save on coffee shop visits.
              </Text>
            </View>
            <View style={styles.suggestionRow}>
              <Ionicons name="time-outline" size={20} color={theme.primary} />
              <Text style={styles.suggestionText}>
                Set a reminder before your usual spending time.
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {!goal && habit.status === 'discovered' && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleStartTracking}>
              <Ionicons name="flag-outline" size={20} color={theme.white} />
              <Text style={styles.primaryButtonText}>Start Tracking This Habit</Text>
            </TouchableOpacity>
          )}

          {goal && (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleLogDay(true)}
                disabled={isLogging}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={theme.white} />
                <Text style={styles.primaryButtonText}>
                  {isLogging ? 'Logging...' : 'Log Today as Success'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleLogDay(false)}
                disabled={isLogging}
              >
                <Text style={styles.secondaryButtonText}>I slipped today</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      padding: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    headerSection: {
      marginBottom: 20,
    },
    sentimentBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 12,
    },
    sentimentText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    description: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 24,
    },
    statsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    stat: {
      flex: 1,
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      backgroundColor: theme.border,
      marginHorizontal: 12,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    triggersCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
    },
    triggerRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    triggerIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    triggerContent: {
      flex: 1,
    },
    triggerDescription: {
      fontSize: 15,
      color: theme.text,
      marginBottom: 2,
    },
    triggerConfidence: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    savingsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
    },
    savingsHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 12,
    },
    savingsAmount: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.primary,
    },
    savingsGoal: {
      fontSize: 15,
      color: theme.textSecondary,
      marginLeft: 8,
    },
    savingsBar: {
      height: 10,
      backgroundColor: theme.background,
      borderRadius: 5,
      overflow: 'hidden',
    },
    savingsBarFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 5,
    },
    milestonesCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
    },
    milestoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    milestoneRowCompleted: {
      opacity: 0.7,
    },
    milestoneIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    milestoneIconCompleted: {
      backgroundColor: theme.primary,
    },
    milestoneContent: {
      flex: 1,
    },
    milestoneName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    milestoneDescription: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    suggestionsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
    },
    suggestionRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    suggestionText: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      marginLeft: 12,
      lineHeight: 20,
    },
    actionsSection: {
      gap: 12,
      marginTop: 8,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 14,
      gap: 8,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.white,
    },
    secondaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    secondaryButtonText: {
      fontSize: 15,
      color: theme.textSecondary,
    },
  });
}
