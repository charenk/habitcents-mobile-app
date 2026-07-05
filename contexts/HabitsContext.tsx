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
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  atMidnight,
  canBackfillYesterday,
  countTotalSkips,
  dayStateFor,
  isSameDay,
  milestoneCrossed,
  partialSlipCredit,
  weekStats,
} from '@/utils/habitLogging';
import { track } from '@/utils/analytics';
import type { Expense } from '@/types/expense';
import type {
  DetectedHabit,
  HabitChangeGoal,
  HabitLogEntry,
  MicroLesson,
  HabitStatus,
} from '@/types/habit';
import { MICRO_LESSONS } from '@/types/habit';

type AnswerState = 'skipped' | 'slipped';

type HabitsContextValue = {
  habits: DetectedHabit[];
  goals: HabitChangeGoal[];
  lessons: MicroLesson[];
  isLoading: boolean;
  refreshHabits: (expenses: Expense[]) => Promise<void>;
  dismissHabit: (habitId: string) => Promise<void>;
  /**
   * Pick-one sheet "Start breaking it" (spec 01 §3.1, §4.3). Nothing is
   * created until this is called; cancel on the sheet creates nothing.
   * `source` distinguishes detection-surfaced leaks from Leak Scan results.
   */
  startBreakingHabit: (
    habitId: string,
    skipValue: number,
    valueEdited: boolean,
    source?: 'detection' | 'scan'
  ) => Promise<HabitChangeGoal>;
  /** Daily cadence: answer today's check-in question (spec §3.2). */
  answerToday: (goalId: string, state: AnswerState) => Promise<void>;
  /** Weekly/monthly cadence: record one event (spec §3.3). */
  answerEvent: (goalId: string, state: AnswerState) => Promise<void>;
  /** "Change answer", today only (spec §4.4). Flips today's answer. */
  changeTodayAnswer: (goalId: string) => Promise<void>;
  /** One-time "missed yesterday" backfill (spec §3.6). */
  backfillYesterday: (goalId: string, state: AnswerState) => Promise<void>;
  /** "Spent less than usual?" partial slip (spec §4.7). Applies to today's slip. */
  savePartialSlip: (goalId: string, amountSpent: number) => Promise<void>;
  /** "Edit one skip keeps" footer action (spec §4.8). */
  updateSkipValue: (goalId: string, skipValue: number) => Promise<void>;
  /** "Stop breaking this habit" (spec §4.8). History is preserved. */
  stopBreakingHabit: (goalId: string) => Promise<void>;
  completeLesson: (lessonId: string) => Promise<void>;
  getHabitById: (id: string) => DetectedHabit | undefined;
  getGoalByHabitId: (habitId: string) => HabitChangeGoal | undefined;
  getActiveHabits: () => DetectedHabit[];
  getDiscoveredHabits: () => DetectedHabit[];
  getCompletedLessons: () => MicroLesson[];
  getPendingLessons: () => MicroLesson[];
  /** The milestone threshold newly crossed by the most recent answer, if any. */
  lastMilestone: { goalId: string; threshold: 10 | 30 | 50 | 66 } | null;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<DetectedHabit[]>([]);
  const [goals, setGoals] = useState<HabitChangeGoal[]>([]);
  const [lessonsProgress, setLessonsProgress] = useState<Record<string, Date>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastMilestone, setLastMilestone] = useState<HabitsContextValue['lastMilestone']>(null);
  const { currency } = useCurrency();

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
    const detected = detectHabits(expenses, currency);
    const merged = mergeHabits(habits, detected);
    setHabits(merged);
    await saveHabits(merged);

    // Fire detection_shown only when a new leak surfaces (discovered count grew),
    // so we measure the aha moment without spamming an event on every log.
    const isDiscovered = (h: DetectedHabit) => h.status === 'discovered' && !h.dismissedAt;
    const before = habits.filter(isDiscovered).length;
    const after = merged.filter(isDiscovered).length;
    if (after > before) {
      track('detection_shown', { habit_count: after });
    }
  }, [habits, currency]);

  const dismissHabit = useCallback(async (habitId: string): Promise<void> => {
    const updated = habits.map(h =>
      h.id === habitId ? { ...h, dismissedAt: new Date() } : h
    );
    setHabits(updated);
    await saveHabits(updated);
    track('habit_dismissed', { source: 'detection' });
  }, [habits]);

  /**
   * Pick-one sheet "Start breaking it" (spec §3.1, §4.3). Nothing exists
   * before this call: no goal, no habit-status change. valueEdited records
   * whether the user changed the prefilled per-occurrence average.
   */
  const startBreakingHabit = useCallback(async (
    habitId: string,
    skipValue: number,
    valueEdited: boolean,
    source: 'detection' | 'scan' = 'detection'
  ): Promise<HabitChangeGoal> => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      throw new Error('Habit not found');
    }

    const trackingStart = atMidnight(new Date());
    const newGoal: HabitChangeGoal = {
      id: generateId('goal'),
      habitId,
      targetType: 'reduce_amount',
      targetValue: undefined,
      startDate: new Date(),
      // Legacy streak fields: unused by v2 surfaces, kept at zero so the
      // Reports "Habit Streaks" widget renders a harmless empty state.
      currentStreak: 0,
      longestStreak: 0,
      savingsGoal: habit.totalMonthlySpend,
      actualSavings: 0,
      milestones: [],
      logs: [],
      // v2 fields
      skipValue,
      kept: 0,
      totalSkips: 0,
      highestMilestoneReached: 0,
      trackingStart,
      dayLogs: [],
      firstRun: true,
      backfillUsed: false,
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    await saveHabitGoals(updatedGoals);

    const updatedHabits = habits.map(h =>
      h.id === habitId
        ? { ...h, status: 'changing' as HabitStatus, changeGoal: newGoal }
        : h
    );
    setHabits(updatedHabits);
    await saveHabits(updatedHabits);

    track('habit_goal_created', { cadence: habit.frequency, value_edited: valueEdited });
    track('habit_tracking_started', { cadence: habit.frequency, source });
    return newGoal;
  }, [habits, goals]);

  const persistGoalAndHabit = useCallback(async (updatedGoal: HabitChangeGoal) => {
    const updatedGoals = goals.map(g => (g.id === updatedGoal.id ? updatedGoal : g));
    setGoals(updatedGoals);
    await saveHabitGoals(updatedGoals);

    const updatedHabits = habits.map(h =>
      h.id === updatedGoal.habitId ? { ...h, changeGoal: updatedGoal } : h
    );
    setHabits(updatedHabits);
    await saveHabits(updatedHabits);
  }, [goals, habits]);

  const answerToday = useCallback(async (goalId: string, state: AnswerState): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const habit = habits.find(h => h.id === goal.habitId);
    const today = atMidnight(new Date());

    // Daily cadence: one entry per calendar day, so replace today's if present.
    const withoutToday = goal.dayLogs.filter((e) => !isSameDay(e.date, today));
    const wasFirstEver = goal.firstRun;
    const entry: HabitLogEntry = { date: today, state };
    const dayLogs = [...withoutToday, entry];
    const totalSkipsBefore = goal.totalSkips;
    const totalSkips = countTotalSkips(dayLogs);
    const kept = state === 'skipped' ? goal.kept + goal.skipValue : goal.kept;
    const highestMilestoneReached = Math.max(goal.highestMilestoneReached, totalSkips);

    const updatedGoal: HabitChangeGoal = {
      ...goal,
      dayLogs,
      totalSkips,
      kept,
      firstRun: false,
      lastLogDate: today,
      highestMilestoneReached,
    };
    await persistGoalAndHabit(updatedGoal);

    const wk = weekStats(dayLogs, today, goal.trackingStart, goal.skipValue);
    if (state === 'skipped') {
      track('skip_logged', {
        cadence: habit?.frequency,
        total_skips_after: totalSkips,
        week_skips: wk.skips,
        backfill: false,
      });
    } else {
      track('slip_logged', { cadence: habit?.frequency, partial: false, backfill: false });
    }

    const crossed = wasFirstEver ? null : milestoneCrossed(totalSkipsBefore, totalSkips);
    if (crossed) {
      track('milestone_reached', { milestone: crossed });
      setLastMilestone({ goalId, threshold: crossed });
    } else {
      setLastMilestone(null);
    }
  }, [goals, habits, persistGoalAndHabit]);

  const answerEvent = useCallback(async (goalId: string, state: AnswerState): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const habit = habits.find(h => h.id === goal.habitId);
    const now = new Date();

    // Weekly/monthly cadence: multiple entries per day are allowed (spec §3.3),
    // so events always append rather than dedupe by day.
    const wasFirstEver = goal.firstRun;
    const entry: HabitLogEntry = { date: now, state };
    const dayLogs = [...goal.dayLogs, entry];
    const totalSkipsBefore = goal.totalSkips;
    const totalSkips = countTotalSkips(dayLogs);
    const kept = state === 'skipped' ? goal.kept + goal.skipValue : goal.kept;
    const highestMilestoneReached = Math.max(goal.highestMilestoneReached, totalSkips);

    const updatedGoal: HabitChangeGoal = {
      ...goal,
      dayLogs,
      totalSkips,
      kept,
      firstRun: false,
      lastLogDate: now,
      highestMilestoneReached,
    };
    await persistGoalAndHabit(updatedGoal);

    const periodSkips = skipsThisPeriod(dayLogs, now);
    if (state === 'skipped') {
      track('skip_logged', {
        cadence: habit?.frequency,
        total_skips_after: totalSkips,
        week_skips: periodSkips,
        backfill: false,
      });
    } else {
      track('slip_logged', { cadence: habit?.frequency, partial: false, backfill: false });
    }

    const crossed = wasFirstEver ? null : milestoneCrossed(totalSkipsBefore, totalSkips);
    if (crossed) {
      track('milestone_reached', { milestone: crossed });
      setLastMilestone({ goalId, threshold: crossed });
    } else {
      setLastMilestone(null);
    }
  }, [goals, habits, persistGoalAndHabit]);

  /** "Change answer", today only (spec §4.4): flips today's skip<->slip. */
  const changeTodayAnswer = useCallback(async (goalId: string): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const today = atMidnight(new Date());
    const current = dayStateFor(goal.dayLogs, today);
    if (current === 'no-log') return;

    const from = current;
    const to: AnswerState = current === 'skipped' ? 'slipped' : 'skipped';
    const dayLogs = goal.dayLogs.map((e) =>
      isSameDay(e.date, today) ? { ...e, state: to, partialAmount: undefined } : e
    );
    const totalSkips = countTotalSkips(dayLogs);
    // Skip -> slip: kept counts down, no pulse. Slip -> skip: kept counts up.
    const kept = to === 'skipped' ? goal.kept + goal.skipValue : Math.max(0, goal.kept - goal.skipValue);

    const updatedGoal: HabitChangeGoal = {
      ...goal,
      dayLogs,
      totalSkips,
      kept,
      // The displayed chapter never falls (§4.6, §9): highestMilestoneReached
      // is left untouched even though totalSkips may have just dropped by one.
    };
    await persistGoalAndHabit(updatedGoal);
    track('answer_changed', { from, to });
  }, [goals, persistGoalAndHabit]);

  /** One-time "missed yesterday" backfill (spec §3.6). */
  const backfillYesterday = useCallback(async (goalId: string, state: AnswerState): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const habit = habits.find(h => h.id === goal.habitId);
    const today = atMidnight(new Date());
    if (!canBackfillYesterday(goal.dayLogs, today, goal.trackingStart, goal.backfillUsed)) return;

    const yesterday = atMidnight(new Date(today.getTime() - 24 * 60 * 60 * 1000));
    const entry: HabitLogEntry = { date: yesterday, state, backfill: true };
    const dayLogs = [...goal.dayLogs, entry];
    const totalSkipsBefore = goal.totalSkips;
    const totalSkips = countTotalSkips(dayLogs);
    const kept = state === 'skipped' ? goal.kept + goal.skipValue : goal.kept;
    const highestMilestoneReached = Math.max(goal.highestMilestoneReached, totalSkips);

    const updatedGoal: HabitChangeGoal = {
      ...goal,
      dayLogs,
      totalSkips,
      kept,
      backfillUsed: true,
      highestMilestoneReached,
    };
    await persistGoalAndHabit(updatedGoal);

    if (state === 'skipped') {
      const wk = weekStats(dayLogs, today, goal.trackingStart, goal.skipValue);
      track('skip_logged', {
        cadence: habit?.frequency,
        total_skips_after: totalSkips,
        week_skips: wk.skips,
        backfill: true,
      });
    } else {
      track('slip_logged', { cadence: habit?.frequency, partial: false, backfill: true });
    }

    const crossed = milestoneCrossed(totalSkipsBefore, totalSkips);
    if (crossed) {
      track('milestone_reached', { milestone: crossed });
      setLastMilestone({ goalId, threshold: crossed });
    }
  }, [goals, habits, persistGoalAndHabit]);

  /** "Spent less than usual?" partial slip (spec §4.7). Applies to today's slip entry. */
  const savePartialSlip = useCallback(async (goalId: string, amountSpent: number): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const today = atMidnight(new Date());
    const existing = goal.dayLogs.find((e) => isSameDay(e.date, today));
    if (!existing || existing.state !== 'slipped') return;

    const credit = partialSlipCredit(goal.skipValue, amountSpent);
    const dayLogs = goal.dayLogs.map((e) =>
      isSameDay(e.date, today) ? { ...e, partialAmount: amountSpent } : e
    );
    const updatedGoal: HabitChangeGoal = {
      ...goal,
      dayLogs,
      kept: goal.kept + credit,
    };
    await persistGoalAndHabit(updatedGoal);
    track('slip_logged', { partial: true, backfill: false });
  }, [goals, persistGoalAndHabit]);

  /** "Edit one skip keeps" (spec §4.8). */
  const updateSkipValue = useCallback(async (goalId: string, skipValue: number): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    await persistGoalAndHabit({ ...goal, skipValue });
  }, [goals, persistGoalAndHabit]);

  /** "Stop breaking this habit" (spec §4.8). History is preserved; status reverts. */
  const stopBreakingHabit = useCallback(async (goalId: string): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const updatedHabits = habits.map(h =>
      h.id === goal.habitId ? { ...h, status: 'discovered' as HabitStatus, changeGoal: undefined } : h
    );
    setHabits(updatedHabits);
    await saveHabits(updatedHabits);
  }, [goals, habits]);

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
        dismissHabit,
        startBreakingHabit,
        answerToday,
        answerEvent,
        changeTodayAnswer,
        backfillYesterday,
        savePartialSlip,
        updateSkipValue,
        stopBreakingHabit,
        completeLesson,
        getHabitById,
        getGoalByHabitId,
        getActiveHabits,
        getDiscoveredHabits,
        getCompletedLessons,
        getPendingLessons,
        lastMilestone,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

/** Skips recorded in the current Mon-Sun week, for the weekly/monthly period chip. */
function skipsThisPeriod(dayLogs: HabitLogEntry[], now: Date): number {
  const monday = new Date(now);
  const dow = monday.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return dayLogs.filter((e) => e.state === 'skipped' && e.date.getTime() >= monday.getTime()).length;
}

export function useHabits(): HabitsContextValue {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error('useHabits must be used within HabitsProvider');
  return ctx;
}
