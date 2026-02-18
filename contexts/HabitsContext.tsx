import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getHabits,
  saveHabits,
  getHabitGoals,
  saveHabitGoals,
  getLessonsProgress,
  saveLessonsProgress,
} from '@/utils/storage';
import { detectHabits, mergeHabits } from '@/utils/habitDetection';
import type { Expense } from '@/types/expense';
import type {
  DetectedHabit,
  HabitChangeGoal,
  HabitMilestone,
  MicroLesson,
  HabitStatus,
} from '@/types/habit';
import { DEFAULT_MILESTONES, MICRO_LESSONS } from '@/types/habit';

type HabitsContextValue = {
  habits: DetectedHabit[];
  goals: HabitChangeGoal[];
  lessons: MicroLesson[];
  isLoading: boolean;
  refreshHabits: (expenses: Expense[]) => Promise<void>;
  startTrackingHabit: (habitId: string) => Promise<void>;
  dismissHabit: (habitId: string) => Promise<void>;
  createGoal: (
    habitId: string,
    targetType: HabitChangeGoal['targetType'],
    targetValue?: number,
    savingsGoal?: number
  ) => Promise<HabitChangeGoal>;
  logStreakDay: (goalId: string, completed: boolean, amount?: number) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<HabitChangeGoal>) => Promise<void>;
  completeLesson: (lessonId: string) => Promise<void>;
  getHabitById: (id: string) => DetectedHabit | undefined;
  getGoalByHabitId: (habitId: string) => HabitChangeGoal | undefined;
  getActiveHabits: () => DetectedHabit[];
  getDiscoveredHabits: () => DetectedHabit[];
  getCompletedLessons: () => MicroLesson[];
  getPendingLessons: () => MicroLesson[];
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createMilestones(): HabitMilestone[] {
  return DEFAULT_MILESTONES.map((m, index) => ({
    ...m,
    id: `milestone-${index}`,
  }));
}

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<DetectedHabit[]>([]);
  const [goals, setGoals] = useState<HabitChangeGoal[]>([]);
  const [lessonsProgress, setLessonsProgress] = useState<Record<string, Date>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Build lessons with completion status
  const lessons: MicroLesson[] = MICRO_LESSONS.map(lesson => ({
    ...lesson,
    completedAt: lessonsProgress[lesson.id],
  }));

  useEffect(() => {
    async function loadData() {
      const [storedHabits, storedGoals, storedProgress] = await Promise.all([
        getHabits(),
        getHabitGoals(),
        getLessonsProgress(),
      ]);
      setHabits(storedHabits);
      setGoals(storedGoals);
      setLessonsProgress(storedProgress);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const refreshHabits = useCallback(async (expenses: Expense[]): Promise<void> => {
    const detected = detectHabits(expenses);
    const merged = mergeHabits(habits, detected);
    setHabits(merged);
    await saveHabits(merged);
  }, [habits]);

  const startTrackingHabit = useCallback(async (habitId: string): Promise<void> => {
    const updated = habits.map(h =>
      h.id === habitId ? { ...h, status: 'tracking' as HabitStatus } : h
    );
    setHabits(updated);
    await saveHabits(updated);
  }, [habits]);

  const dismissHabit = useCallback(async (habitId: string): Promise<void> => {
    const updated = habits.map(h =>
      h.id === habitId ? { ...h, dismissedAt: new Date() } : h
    );
    setHabits(updated);
    await saveHabits(updated);
  }, [habits]);

  const createGoal = useCallback(async (
    habitId: string,
    targetType: HabitChangeGoal['targetType'],
    targetValue?: number,
    savingsGoal?: number
  ): Promise<HabitChangeGoal> => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      throw new Error('Habit not found');
    }

    const newGoal: HabitChangeGoal = {
      id: generateId('goal'),
      habitId,
      targetType,
      targetValue,
      startDate: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      savingsGoal: savingsGoal || habit.totalMonthlySpend,
      actualSavings: 0,
      milestones: createMilestones(),
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    await saveHabitGoals(updatedGoals);

    // Update habit status
    const updatedHabits = habits.map(h =>
      h.id === habitId
        ? { ...h, status: 'changing' as HabitStatus, changeGoal: newGoal }
        : h
    );
    setHabits(updatedHabits);
    await saveHabits(updatedHabits);

    return newGoal;
  }, [habits, goals]);

  const logStreakDay = useCallback(async (
    goalId: string,
    completed: boolean,
    amount?: number
  ): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = goal.currentStreak;
    let longestStreak = goal.longestStreak;
    let actualSavings = goal.actualSavings;

    if (completed) {
      // Check if continuing streak
      const lastLog = goal.lastLogDate ? new Date(goal.lastLogDate) : null;
      if (lastLog) {
        lastLog.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((today.getTime() - lastLog.getTime()) / (24 * 60 * 60 * 1000));
        if (dayDiff === 1) {
          // Consecutive day
          newStreak++;
        } else if (dayDiff > 1) {
          // Streak broken
          newStreak = 1;
        }
        // Same day - no change
      } else {
        newStreak = 1;
      }

      if (newStreak > longestStreak) {
        longestStreak = newStreak;
      }

      // Calculate savings if amount provided
      if (amount !== undefined) {
        const habit = habits.find(h => h.id === goal.habitId);
        if (habit) {
          const expectedSpend = habit.averageAmount;
          const saved = Math.max(0, expectedSpend - amount);
          actualSavings += saved;
        }
      }
    } else {
      // Reset streak
      newStreak = 0;
    }

    // Check milestones
    const updatedMilestones = goal.milestones.map(m => {
      if (!m.reachedAt && newStreak >= m.targetStreak) {
        return { ...m, reachedAt: new Date() };
      }
      return m;
    });

    const updatedGoal: HabitChangeGoal = {
      ...goal,
      currentStreak: newStreak,
      longestStreak,
      actualSavings,
      lastLogDate: today,
      milestones: updatedMilestones,
    };

    const updatedGoals = goals.map(g => g.id === goalId ? updatedGoal : g);
    setGoals(updatedGoals);
    await saveHabitGoals(updatedGoals);

    // Update habit with goal
    const updatedHabits = habits.map(h =>
      h.id === goal.habitId ? { ...h, changeGoal: updatedGoal } : h
    );
    setHabits(updatedHabits);
    await saveHabits(updatedHabits);
  }, [goals, habits]);

  const updateGoal = useCallback(async (
    goalId: string,
    updates: Partial<HabitChangeGoal>
  ): Promise<void> => {
    const updatedGoals = goals.map(g =>
      g.id === goalId ? { ...g, ...updates } : g
    );
    setGoals(updatedGoals);
    await saveHabitGoals(updatedGoals);
  }, [goals]);

  const completeLesson = useCallback(async (lessonId: string): Promise<void> => {
    const updated = { ...lessonsProgress, [lessonId]: new Date() };
    setLessonsProgress(updated);
    await saveLessonsProgress(updated);
  }, [lessonsProgress]);

  const getHabitById = useCallback((id: string): DetectedHabit | undefined => {
    return habits.find(h => h.id === id);
  }, [habits]);

  const getGoalByHabitId = useCallback((habitId: string): HabitChangeGoal | undefined => {
    return goals.find(g => g.habitId === habitId);
  }, [goals]);

  const getActiveHabits = useCallback((): DetectedHabit[] => {
    return habits.filter(h => h.status === 'tracking' || h.status === 'changing');
  }, [habits]);

  const getDiscoveredHabits = useCallback((): DetectedHabit[] => {
    return habits.filter(h => h.status === 'discovered' && !h.dismissedAt);
  }, [habits]);

  const getCompletedLessons = useCallback((): MicroLesson[] => {
    return lessons.filter(l => l.completedAt);
  }, [lessons]);

  const getPendingLessons = useCallback((): MicroLesson[] => {
    return lessons.filter(l => !l.completedAt);
  }, [lessons]);

  return (
    <HabitsContext.Provider
      value={{
        habits,
        goals,
        lessons,
        isLoading,
        refreshHabits,
        startTrackingHabit,
        dismissHabit,
        createGoal,
        logStreakDay,
        updateGoal,
        completeLesson,
        getHabitById,
        getGoalByHabitId,
        getActiveHabits,
        getDiscoveredHabits,
        getCompletedLessons,
        getPendingLessons,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export function useHabits(): HabitsContextValue {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error('useHabits must be used within HabitsProvider');
  return ctx;
}
