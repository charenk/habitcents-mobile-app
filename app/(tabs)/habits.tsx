import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { HabitInsightCard } from '@/components/HabitInsightCard';
import { HabitProgressCard } from '@/components/HabitProgressCard';
import { LessonCard, LessonDetail } from '@/components/LessonCard';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit, MicroLesson, StreakDay } from '@/types/habit';

type HabitSection = {
  title: string;
  type: 'insights' | 'active' | 'learning';
  data: (DetectedHabit | MicroLesson)[];
};

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<MicroLesson | null>(null);

  const {
    habits,
    goals,
    lessons,
    isLoading,
    refreshHabits,
    startTrackingHabit,
    dismissHabit,
    createGoal,
    logStreakDay,
    completeLesson,
    getActiveHabits,
    getDiscoveredHabits,
    getPendingLessons,
    getGoalByHabitId,
  } = useHabits();

  const { expenses } = useExpenses();

  // Refresh habits when expenses change
  useEffect(() => {
    if (expenses.length > 0) {
      refreshHabits(expenses);
    }
  }, [expenses.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHabits(expenses);
    setRefreshing(false);
  }, [refreshHabits, expenses]);

  const discoveredHabits = getDiscoveredHabits();
  const activeHabits = getActiveHabits();
  const pendingLessons = getPendingLessons();

  const sections: HabitSection[] = useMemo(() => {
    const result: HabitSection[] = [];

    if (discoveredHabits.length > 0) {
      result.push({
        title: 'Insights',
        type: 'insights',
        data: discoveredHabits,
      });
    }

    if (activeHabits.length > 0) {
      result.push({
        title: 'Active Changes',
        type: 'active',
        data: activeHabits,
      });
    }

    if (pendingLessons.length > 0) {
      result.push({
        title: 'Learning',
        type: 'learning',
        data: pendingLessons.slice(0, 3),
      });
    }

    return result;
  }, [discoveredHabits, activeHabits, pendingLessons]);

  const handleTrackHabit = useCallback(async (habit: DetectedHabit) => {
    await startTrackingHabit(habit.id);
    // Create a default goal
    await createGoal(habit.id, 'reduce_amount', Math.round(habit.totalMonthlySpend * 0.8));
  }, [startTrackingHabit, createGoal]);

  const handleDismissHabit = useCallback(async (habit: DetectedHabit) => {
    await dismissHabit(habit.id);
  }, [dismissHabit]);

  const handleHabitPress = useCallback((habit: DetectedHabit) => {
    router.push(`/habit/${habit.id}`);
  }, [router]);

  const handleLogToday = useCallback(async (habit: DetectedHabit) => {
    const goal = getGoalByHabitId(habit.id);
    if (goal) {
      await logStreakDay(goal.id, true);
    }
  }, [getGoalByHabitId, logStreakDay]);

  const handleLessonPress = useCallback((lesson: MicroLesson) => {
    setSelectedLesson(lesson);
  }, []);

  const handleCompleteLesson = useCallback(async () => {
    if (selectedLesson) {
      await completeLesson(selectedLesson.id);
      setSelectedLesson(null);
    }
  }, [selectedLesson, completeLesson]);

  // Real streak history from the goal's persisted logs.
  const getStreakDays = useCallback((habitId: string): StreakDay[] => {
    const goal = getGoalByHabitId(habitId);
    return goal?.logs ?? [];
  }, [getGoalByHabitId]);

  const renderItem = ({ item, section }: { item: DetectedHabit | MicroLesson; section: HabitSection }) => {
    if (section.type === 'insights') {
      const habit = item as DetectedHabit;
      return (
        <HabitInsightCard
          habit={habit}
          onTrack={() => handleTrackHabit(habit)}
          onDismiss={() => handleDismissHabit(habit)}
          onPress={() => handleHabitPress(habit)}
        />
      );
    }

    if (section.type === 'active') {
      const habit = item as DetectedHabit;
      const goal = getGoalByHabitId(habit.id);
      if (!goal) return null;

      return (
        <HabitProgressCard
          habit={habit}
          goal={goal}
          streakDays={getStreakDays(habit.id)}
          onPress={() => handleHabitPress(habit)}
          onLogToday={() => handleLogToday(habit)}
        />
      );
    }

    if (section.type === 'learning') {
      const lesson = item as MicroLesson;
      return (
        <LessonCard
          lesson={lesson}
          onPress={() => handleLessonPress(lesson)}
        />
      );
    }

    return null;
  };

  const renderSectionHeader = ({ section }: { section: HabitSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.type === 'insights' && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{section.data.length} new</Text>
        </View>
      )}
    </View>
  );

  const activeStreakTotal = activeHabits.reduce((sum, h) => {
    const goal = getGoalByHabitId(h.id);
    return sum + (goal?.currentStreak || 0);
  }, 0);

  const totalSaved = goals.reduce((sum, g) => sum + (g.actualSavings || 0), 0);

  const isEmpty = sections.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Your Habits</Text>
          <Text style={styles.subtitle}>
            {activeHabits.length} active{activeStreakTotal > 0 ? ` | ${activeStreakTotal} day streak` : ''}
          </Text>
        </View>
        {activeStreakTotal > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={20} color={theme.iconOrange} />
            <Text style={styles.streakBadgeText}>{activeStreakTotal}</Text>
          </View>
        )}
      </View>

      {activeHabits.length > 0 && (
        <View style={styles.savingsHero}>
          <Text style={styles.savingsLabel}>DOLLARS KEPT</Text>
          <Text style={styles.savingsValue}>{format(totalSaved)}</Text>
          <Text style={styles.savingsCaption}>from the habits you're breaking</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analyzing your spending patterns...</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={64} color={theme.textTertiary} />
          <Text style={styles.emptyTitle}>No habits detected yet</Text>
          <Text style={styles.emptySubtitle}>
            Keep adding expenses and we'll identify your spending patterns automatically.
          </Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={20} color={theme.iconOrange} />
            <Text style={styles.tipText}>
              Tip: Add at least 5 expenses at the same merchant to detect a habit.
            </Text>
          </View>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => 'id' in item ? item.id : (item as MicroLesson).id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}

      {/* Lesson Detail Modal */}
      <Modal
        visible={!!selectedLesson}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedLesson(null)}
      >
        {selectedLesson && (
          <LessonDetail
            lesson={selectedLesson}
            onComplete={handleCompleteLesson}
            onClose={() => setSelectedLesson(null)}
          />
        )}
      </Modal>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    savingsHero: {
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: theme.primary,
      borderRadius: 20,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    savingsLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    savingsValue: {
      fontSize: 44,
      fontWeight: '800',
      color: '#FFFFFF',
      marginTop: 4,
    },
    savingsCaption: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: 2,
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    streakBadgeText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginLeft: 4,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionBadge: {
      backgroundColor: theme.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginLeft: 8,
    },
    sectionBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginTop: 20,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 15,
      color: theme.textSecondary,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 22,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 24,
    },
    tipText: {
      fontSize: 13,
      color: theme.text,
      marginLeft: 10,
      flex: 1,
    },
  });
}
