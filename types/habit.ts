/**
 * Type definitions for habit tracking and behavior change system.
 * Inspired by Atomic Habits framework.
 */

export type HabitStatus = 'discovered' | 'tracking' | 'changing' | 'completed';
export type HabitSentiment = 'good' | 'neutral' | 'bad';
export type TriggerType = 'time' | 'location' | 'emotion' | 'context';
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export type HabitTrigger = {
  type: TriggerType;
  description: string;
  confidence: number; // 0-1
  data?: {
    timeRange?: { start: string; end: string };
    dayOfWeek?: number[];
  };
};

export type HabitMilestone = {
  id: string;
  name: string;
  description: string;
  targetStreak: number;
  targetSavings?: number;
  reachedAt?: Date;
  icon: string;
};

export type HabitChangeGoal = {
  id: string;
  habitId: string;
  targetType: 'reduce_amount' | 'reduce_frequency' | 'eliminate' | 'substitute';
  targetValue?: number;
  targetSubstitute?: string;
  startDate: Date;
  currentStreak: number;
  longestStreak: number;
  savingsGoal: number;
  actualSavings: number;
  // Cents banked each time the user logs a successful (skipped) day. Defaults to
  // the detected per-occurrence average; user-editable. This is what makes the
  // dollars-saved counter move.
  skipValue: number;
  // Real per-day log history. Source of truth for the streak calendar and the
  // "logged today?" check. One entry per calendar day (deduped on write).
  logs: StreakDay[];
  milestones: HabitMilestone[];
  lastLogDate?: Date;
};

export type DetectedHabit = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  merchantPattern?: string;
  averageAmount: number; // Cents per occurrence
  frequency: HabitFrequency;
  occurrencesPerPeriod: number;
  totalMonthlySpend: number; // Cents
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  triggers: HabitTrigger[];
  status: HabitStatus;
  sentiment: HabitSentiment;
  discoveredAt: Date;
  dismissedAt?: Date;
  changeGoal?: HabitChangeGoal;
};

export type StreakDay = {
  date: Date;
  completed: boolean;
  amount?: number;
};

export type MicroLessonCategory = 'cue' | 'routine' | 'reward' | 'craving' | 'identity';

export type MicroLesson = {
  id: string;
  title: string;
  content: string;
  duration: string;
  category: MicroLessonCategory;
  order: number;
  completedAt?: Date;
};

export const DEFAULT_MILESTONES: Omit<HabitMilestone, 'id' | 'reachedAt'>[] = [
  { name: 'First Step', description: 'Complete your first day', targetStreak: 1, icon: 'footsteps-outline' },
  { name: 'Getting Started', description: 'Maintain a 3-day streak', targetStreak: 3, icon: 'flame-outline' },
  { name: 'Week Warrior', description: 'Complete a full week', targetStreak: 7, icon: 'calendar-outline' },
  { name: 'Habit Builder', description: 'Reach 14 days', targetStreak: 14, icon: 'construct-outline' },
  { name: 'Monthly Master', description: 'Complete 30 days', targetStreak: 30, icon: 'trophy-outline' },
  { name: 'Habit Champion', description: 'Reach 66 days (habit formation)', targetStreak: 66, icon: 'medal-outline' },
];

export const MICRO_LESSONS: MicroLesson[] = [
  {
    id: 'lesson-1',
    title: 'The Habit Loop',
    content: 'Every habit follows a loop: Cue → Routine → Reward. The cue triggers the behavior, the routine is the action itself, and the reward is what your brain gets from it. Understanding this loop is the first step to changing any habit.',
    duration: '2 min',
    category: 'routine',
    order: 1,
  },
  {
    id: 'lesson-2',
    title: 'Make It Obvious',
    content: 'The 1st Law of Behavior Change: Make It Obvious. Design your environment so the cues for good habits are visible and the cues for bad habits are hidden. If you want to spend less on coffee, don\'t walk past coffee shops.',
    duration: '2 min',
    category: 'cue',
    order: 2,
  },
  {
    id: 'lesson-3',
    title: 'Make It Attractive',
    content: 'The 2nd Law: Make It Attractive. Bundle habits you need to do with habits you want to do. Pair saving money with something enjoyable - like tracking your savings streak while listening to music.',
    duration: '2 min',
    category: 'craving',
    order: 3,
  },
  {
    id: 'lesson-4',
    title: 'Make It Easy',
    content: 'The 3rd Law: Make It Easy. Reduce friction for good habits and increase it for bad ones. Set up automatic transfers to savings. Delete shopping apps from your phone. The less effort required, the more likely the behavior.',
    duration: '2 min',
    category: 'routine',
    order: 4,
  },
  {
    id: 'lesson-5',
    title: 'Make It Satisfying',
    content: 'The 4th Law: Make It Satisfying. We repeat behaviors that make us feel good. Celebrate small wins. Track your streaks. Watching your savings grow provides immediate satisfaction for delayed gratification.',
    duration: '2 min',
    category: 'reward',
    order: 5,
  },
  {
    id: 'lesson-6',
    title: 'Identity-Based Change',
    content: 'The most effective way to change is to focus on who you wish to become, not what you want to achieve. Don\'t say "I want to save money." Say "I am someone who is financially responsible." Your habits shape your identity, and your identity shapes your habits.',
    duration: '3 min',
    category: 'identity',
    order: 6,
  },
  {
    id: 'lesson-7',
    title: 'The 2-Minute Rule',
    content: 'When starting a new habit, it should take less than 2 minutes. Want to save more? Start by just opening your savings app daily. The goal is to make starting effortless. You can optimize later.',
    duration: '2 min',
    category: 'routine',
    order: 7,
  },
];
