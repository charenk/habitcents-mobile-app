import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Modal,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { KeptHero } from '@/components/habit-logging/KeptHero';
import { LeakCard } from '@/components/habit-logging/LeakCard';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { PartialSlipSheet } from '@/components/habit-logging/PartialSlipSheet';
import { LessonCard, LessonDetail } from '@/components/LessonCard';
import { atMidnight, dayStateFor, FREE_TIER_HABIT_LIMIT } from '@/utils/habitLogging';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitChangeGoal, MicroLesson } from '@/types/habit';
import { strings } from '@/constants/strings';

type BreakingItem = { habit: DetectedHabit; goal: HabitChangeGoal };

type HabitSection = {
  title: string;
  type: 'leaks' | 'breaking' | 'learning';
  data: (DetectedHabit | BreakingItem | MicroLesson)[];
};

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<MicroLesson | null>(null);
  const [pickOneHabitId, setPickOneHabitId] = useState<string | null>(null);
  const [partialGoalId, setPartialGoalId] = useState<string | null>(null);

  const {
    goals,
    lessons,
    isLoading,
    refreshHabits,
    dismissHabit,
    startBreakingHabit,
    answerToday,
    answerEvent,
    changeTodayAnswer,
    backfillYesterday,
    savePartialSlip,
    completeLesson,
    getActiveHabits,
    getDiscoveredHabits,
    getPendingLessons,
    getGoalByHabitId,
    getHabitById,
    lastMilestone,
  } = useHabits();

  const { expenses } = useExpenses();

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

  const breakingItems: BreakingItem[] = useMemo(() => {
    return activeHabits
      .map((habit) => {
        const goal = getGoalByHabitId(habit.id);
        return goal ? { habit, goal } : null;
      })
      .filter((x): x is BreakingItem => x !== null);
  }, [activeHabits, getGoalByHabitId]);

  // Stacking (spec §4.2): unanswered daily first, then weekly/monthly, then
  // answered-today cards.
  const sortedBreakingItems = useMemo(() => {
    const today = atMidnight(new Date());
    const rank = (item: BreakingItem): number => {
      const isDaily = item.habit.frequency === 'daily';
      if (isDaily) {
        const answered = dayStateFor(item.goal.dayLogs, today) !== 'no-log';
        return answered ? 2 : 0;
      }
      return 1;
    };
    return [...breakingItems].sort((a, b) => rank(a) - rank(b));
  }, [breakingItems]);

  const sections: HabitSection[] = useMemo(() => {
    const result: HabitSection[] = [];

    if (discoveredHabits.length > 0) {
      result.push({
        title: strings.habitLogging.leaksFoundSection,
        type: 'leaks',
        data: discoveredHabits,
      });
    }

    if (sortedBreakingItems.length > 0) {
      result.push({
        title: strings.habitLogging.breakingNowSection,
        type: 'breaking',
        data: sortedBreakingItems,
      });
    }

    if (pendingLessons.length > 0) {
      result.push({
        title: strings.habits.sectionLearning,
        type: 'learning',
        data: pendingLessons.slice(0, 3),
      });
    }

    return result;
  }, [discoveredHabits, sortedBreakingItems, pendingLessons]);

  const handleDismissHabit = useCallback(async (habit: DetectedHabit) => {
    await dismissHabit(habit.id);
  }, [dismissHabit]);

  const handleHabitPress = useCallback((habitId: string) => {
    router.push(`/habit/${habitId}`);
  }, [router]);

  const handleLessonPress = useCallback((lesson: MicroLesson) => {
    setSelectedLesson(lesson);
  }, []);

  const handleCompleteLesson = useCallback(async () => {
    if (selectedLesson) {
      await completeLesson(selectedLesson.id);
      setSelectedLesson(null);
    }
  }, [selectedLesson, completeLesson]);

  const pickOneHabit = pickOneHabitId ? getHabitById(pickOneHabitId) : null;
  // Free-tier touchpoint (ADR 0007): blocked when there is already an active
  // habit and this would be a second.
  const freeTierBlocked = activeHabits.length >= FREE_TIER_HABIT_LIMIT;

  const handleStart = useCallback(async (skipValue: number, valueEdited: boolean) => {
    if (!pickOneHabitId) return;
    await startBreakingHabit(pickOneHabitId, skipValue, valueEdited, 'detection');
    setPickOneHabitId(null);
  }, [pickOneHabitId, startBreakingHabit]);

  const partialGoal = partialGoalId ? goals.find((g) => g.id === partialGoalId) ?? null : null;

  const totalKept = goals.reduce((sum, g) => sum + (g.kept || 0), 0);

  const isEmpty = sections.length === 0;

  const renderItem = ({ item, section }: { item: DetectedHabit | BreakingItem | MicroLesson; section: HabitSection }) => {
    if (section.type === 'leaks') {
      const habit = item as DetectedHabit;
      return (
        <LeakCard
          habit={habit}
          onBreak={() => setPickOneHabitId(habit.id)}
          onDismiss={() => handleDismissHabit(habit)}
        />
      );
    }

    if (section.type === 'breaking') {
      const { habit, goal } = item as BreakingItem;
      const milestoneJustHit = lastMilestone?.goalId === goal.id ? lastMilestone.threshold : null;
      return (
        <CheckInCard
          habit={habit}
          goal={goal}
          milestoneJustHit={milestoneJustHit}
          onSkip={() => (habit.frequency === 'daily' ? answerToday(goal.id, 'skipped') : answerEvent(goal.id, 'skipped'))}
          onSlip={() => (habit.frequency === 'daily' ? answerToday(goal.id, 'slipped') : answerEvent(goal.id, 'slipped'))}
          onChangeAnswer={() => changeTodayAnswer(goal.id)}
          onBackfill={(state) => backfillYesterday(goal.id, state)}
          onOpenPartial={() => setPartialGoalId(goal.id)}
          onOpenDetail={() => handleHabitPress(habit.id)}
        />
      );
    }

    if (section.type === 'learning') {
      const lesson = item as MicroLesson;
      return <LessonCard lesson={lesson} onPress={() => handleLessonPress(lesson)} />;
    }

    return null;
  };

  const renderSectionHeader = ({ section }: { section: HabitSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{strings.habits.title}</Text>
      </View>

      <KeptHero cents={totalKept} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{strings.habits.loading}</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={64} color={theme.textTertiary} />
          <Text style={styles.emptyTitle}>{strings.habitLogging.emptyLeaksTitle}</Text>
          <Text style={styles.emptySubtitle}>{strings.habitLogging.emptyLeaksSubtitle}</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => router.push('/(tabs)/expenses')}
            accessibilityRole="button"
          >
            <Text style={styles.emptyCtaText}>{strings.habitLogging.logAnExpense}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => {
            if ('habit' in item) return item.habit.id;
            return 'id' in item ? item.id : `item-${index}`;
          }}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
        />
      )}

      <PickOneSheet
        visible={!!pickOneHabit}
        habit={pickOneHabit ?? null}
        monthTotal={pickOneHabit?.totalMonthlySpend ?? 0}
        occurrences={pickOneHabit?.occurrencesPerPeriod ?? 0}
        freeTierBlocked={freeTierBlocked}
        onCancel={() => setPickOneHabitId(null)}
        onStart={handleStart}
      />

      <PartialSlipSheet
        visible={!!partialGoal}
        skipValue={partialGoal?.skipValue ?? 0}
        onCancel={() => setPartialGoalId(null)}
        onSave={async (amount) => {
          if (partialGoalId) await savePartialSlip(partialGoalId, amount);
          setPartialGoalId(null);
        }}
      />

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
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    sectionHeader: {
      marginTop: 20,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
    emptyCta: {
      marginTop: 20,
      minHeight: 46,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCtaText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.white,
    },
  });
}
