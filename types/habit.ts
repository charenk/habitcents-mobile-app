/**
 * Type definitions for habit tracking and behavior change system.
 * Inspired by Atomic Habits framework.
 */

export type HabitStatus = 'discovered' | 'tracking' | 'changing' | 'completed';
export type HabitSentiment = 'good' | 'neutral' | 'bad';
export type TriggerType = 'time' | 'location' | 'emotion' | 'context';
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

// ---------------------------------------------------------------------------
// Habit logging v2 (Phase 2 build item 1, spec docs/design-package-phase2/01).
// A leak becomes a habit the user is "breaking now". The daily action is one
// question: did you skip it today? A skip is the win and it is the only thing
// that ever moves Kept forward. A slip is neutral, recorded honestly, and never
// subtracts from Kept. Weekly/monthly leaks use an event-based "I skipped one"
// variant instead of a daily question. See section 2 of the spec for the exact
// vocabulary; never rename these to streak/success/completed language.
// ---------------------------------------------------------------------------

/** The three day-states rendered identically in the week strip, calendar, and history. */
export type DayState = 'skipped' | 'slipped' | 'no-log';

/**
 * One answered day (daily cadence) or event (weekly/monthly cadence). Only
 * answered days are stored; an absent entry for a date means no-log. This is
 * the source of truth for the week strip, the history calendar/event list, and
 * total-skip / chapter math. Distinct from the legacy `StreakDay` (below),
 * which the pre-v2 streak system still uses for the Reports "Habit Streaks"
 * widget; that widget is out of this build's scope and is left untouched.
 */
export type HabitLogEntry = {
  /** Calendar day (daily cadence) or event timestamp (weekly/monthly). */
  date: Date;
  state: 'skipped' | 'slipped';
  /**
   * Set only for a partial slip (section 4.7): amount actually spent, cents.
   * The day still counts as a slip; the credited amount is
   * max(0, skipValue - partialAmount) and does not increment total skips.
   */
  partialAmount?: number;
  /** True when this entry was recorded via the one-time "missed yesterday" backfill. */
  backfill?: boolean;
};

/** Names of the four chapters of the long arc (total skips 0/10/30/50/66). */
export type ChapterName = 'Deciding' | 'Rhythm' | 'Cruising' | 'Rewiring' | 'Rewired';

/** Total-skip thresholds that fire a milestone and advance the chapter (section 3.4). */
export const MILESTONE_THRESHOLDS = [10, 30, 50, 66] as const;
export type MilestoneThreshold = (typeof MILESTONE_THRESHOLDS)[number];

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
  // --- Legacy streak system (pre-v2). Kept only because the Reports "Habit
  // Streaks" widget (app/(tabs)/reports.tsx, components/WidgetCard.tsx) still
  // reads these fields; that widget is out of scope for the habit-logging v2
  // build (docs/design-package-phase2/01-habit-logging-spec.md) and is left
  // untouched. Nothing in the v2 logging surfaces writes user-facing streak
  // copy from these fields anymore. ---
  currentStreak: number;
  longestStreak: number;
  savingsGoal: number;
  actualSavings: number;
  milestones: HabitMilestone[];
  // Real per-day log history for the legacy streak calendar. One entry per
  // calendar day (deduped on write).
  logs: StreakDay[];
  lastLogDate?: Date;
  // --- Habit logging v2 fields (spec 01). ---
  // Cents banked on each skip. Prefilled from the detected per-occurrence
  // average on the pick-one sheet, user-editable there and via "Edit one skip
  // keeps" on the detail screen. This is what moves the Kept hero.
  skipValue: number;
  // Kept, this habit only (section 4.8 stats row). Slips never change this.
  kept: number;
  // Total skips ever recorded (not consecutive days). Drives the long arc,
  // chapters, and milestone_reached; never decremented except by a same-day
  // answer correction (section 4.4), and even then the chapter never falls.
  totalSkips: number;
  // Highest total-skip milestone threshold ever reached, so the chapter label
  // can never move backward (section 4.6) even if totalSkips dips by one from
  // a same-day correction.
  highestMilestoneReached: number;
  // First calendar day this goal was tracked; day-states before this date are
  // "out of range" (section 2), never no-log.
  trackingStart: Date;
  // Real per-day (daily cadence) or per-event (weekly/monthly cadence) log
  // history. Source of truth for the week strip, calendar / event list, and
  // all v2 math. One entry per calendar day for daily cadence; multiple
  // entries per day allowed for weekly/monthly (section 3.3, 5).
  dayLogs: HabitLogEntry[];
  // True until the very first answer ever; drives the first-run copy
  // ("Your first skip starts the counter.").
  firstRun: boolean;
  // One-time backfill-for-yesterday offer already used (section 3.6, 5).
  backfillUsed: boolean;
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

export const DEFAULT_MILESTONES: Omit<HabitMilestone, 'id' | 'reachedAt'>[] = [
  { name: 'First Step', description: 'Complete your first day', targetStreak: 1, icon: 'footsteps-outline' },
  { name: 'Getting Started', description: 'Maintain a 3-day streak', targetStreak: 3, icon: 'flame-outline' },
  { name: 'Week Warrior', description: 'Complete a full week', targetStreak: 7, icon: 'calendar-outline' },
  { name: 'Habit Builder', description: 'Reach 14 days', targetStreak: 14, icon: 'construct-outline' },
  { name: 'Monthly Master', description: 'Complete 30 days', targetStreak: 30, icon: 'trophy-outline' },
  { name: 'Habit Champion', description: 'Reach 66 days (habit formation)', targetStreak: 66, icon: 'medal-outline' },
];
