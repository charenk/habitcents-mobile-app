/**
 * Coach Moments: trigger selection + dedup engine
 * (docs/design-package-phase2/04-p2-2-coach-moments.md, decision 0004).
 *
 * Pure logic, no React/storage/analytics: this module decides *which* card
 * (if any) should render for a given event, and returns the updated dedup/
 * rotation state to persist. Callers (HabitsContext, LeakCard, ExpensesContext)
 * own persistence and firing `coach_moment_shown`; this module never imports
 * strings or fires events itself, so it stays trivially unit-testable.
 *
 * Card copy lives in constants/strings.ts (`strings.coachMoments`), sourced
 * verbatim from spec section 4. This module only ever returns card ids; the
 * caller resolves id -> text so the engine has zero coupling to i18n.
 *
 * Priority when multiple triggers could fire for the same render (spec §3,
 * §5): milestone > recovery (run-break) > first-time > rotation.
 */

import type { MilestoneThreshold } from '@/types/habit';
import { strings } from '@/constants/strings';

export type CoachMomentTrigger = 'first_log' | 'detection' | 'skip' | 'milestone' | 'broken_streak';

/** All card ids across the 5 triggers (17-card set; spec §4, §9 "ship 17"). */
export type CoachMomentCardId =
  | 'FL-1'
  | 'DT-1'
  | 'SK-0'
  | 'SK-1'
  | 'SK-2'
  | 'SK-3'
  | 'SK-4'
  | 'SK-5'
  | 'SK-6'
  | 'MS-10'
  | 'MS-30'
  | 'MS-50'
  | 'MS-66'
  | 'BR-1'
  | 'BR-2'
  | 'BR-3'
  | 'BR-4';

/** The rotating Skip pool, in spec order (SK-0 is the fixed first-ever card, not part of rotation). */
const SKIP_ROTATION: CoachMomentCardId[] = ['SK-1', 'SK-2', 'SK-3', 'SK-4', 'SK-5', 'SK-6'];

/** The rotating Broken-streak pool for a *plain* slip (BR-1 is the fixed run-break card, not part of rotation). */
const BROKEN_STREAK_ROTATION: CoachMomentCardId[] = ['BR-2', 'BR-3', 'BR-4'];

const MILESTONE_CARD: Record<MilestoneThreshold, CoachMomentCardId> = {
  10: 'MS-10',
  30: 'MS-30',
  50: 'MS-50',
  66: 'MS-66',
};

/**
 * Persisted dedup/rotation state. Once-per-event fields (spec §5: "a
 * `shownEvents` set keyed by `{trigger, contextId}`") are lifetime, app-wide:
 * the Coach Moment is the product's voice speaking to the user, not to a
 * single habit, so first-ever flags and pool rotation are shared across all
 * habits. Milestones are the one per-habit exception, since each habit has
 * its own 66-skip arc (spec 01 §4.6) and each threshold must fire once per
 * habit (acceptance test 01#10, "milestone_reached fires exactly once per
 * threshold per habit").
 */
export type CoachMomentState = {
  /** FL-1 shown at least once (ever). */
  firstLogShown: boolean;
  /** DT-1 shown at least once (ever). */
  detectionShown: boolean;
  /** SK-0 shown at least once (ever); once true, skip events use rotation. */
  firstSkipShown: boolean;
  /** Next index into SKIP_ROTATION to serve (wraps; "no repeat until pool exhausts"). */
  skipRotationIndex: number;
  /** Next index into BROKEN_STREAK_ROTATION to serve. */
  brokenStreakRotationIndex: number;
  /** BR-1 (run-break) shown at least once (ever); it is not once-only per spec, but tracked for completeness/analytics parity. */
  runBreakShown: boolean;
  /** Milestone thresholds already shown, keyed by goalId, so each fires once per habit. */
  milestonesShownByGoal: Record<string, MilestoneThreshold[]>;
};

export function createInitialCoachMomentState(): CoachMomentState {
  return {
    firstLogShown: false,
    detectionShown: false,
    firstSkipShown: false,
    skipRotationIndex: 0,
    brokenStreakRotationIndex: 0,
    runBreakShown: false,
    milestonesShownByGoal: {},
  };
}

export type CoachMomentResult = {
  trigger: CoachMomentTrigger;
  cardId: CoachMomentCardId;
};

/**
 * FL-1: the first expense ever logged (onboarding or Expenses), fixed, once
 * ever (spec §3, "First log"). Returns null (and unchanged state) if already
 * shown.
 */
export function selectFirstLogMoment(
  state: CoachMomentState
): { result: CoachMomentResult; nextState: CoachMomentState } | null {
  if (state.firstLogShown) return null;
  return {
    result: { trigger: 'first_log', cardId: 'FL-1' },
    nextState: { ...state, firstLogShown: true },
  };
}

/**
 * DT-1: a leak is first surfaced (detection or scan), fixed, once ever
 * (spec §3, "Detection").
 */
export function selectDetectionMoment(
  state: CoachMomentState
): { result: CoachMomentResult; nextState: CoachMomentState } | null {
  if (state.detectionShown) return null;
  return {
    result: { trigger: 'detection', cardId: 'DT-1' },
    nextState: { ...state, detectionShown: true },
  };
}

/**
 * Skip trigger: first-ever skip uses SK-0; afterward rotate SK-1..SK-6 with
 * no repeat until the pool exhausts (spec §3, "Skip").
 */
export function selectSkipMoment(
  state: CoachMomentState
): { result: CoachMomentResult; nextState: CoachMomentState } {
  if (!state.firstSkipShown) {
    return {
      result: { trigger: 'skip', cardId: 'SK-0' },
      nextState: { ...state, firstSkipShown: true },
    };
  }
  const index = state.skipRotationIndex % SKIP_ROTATION.length;
  const cardId = SKIP_ROTATION[index];
  return {
    result: { trigger: 'skip', cardId },
    nextState: { ...state, skipRotationIndex: index + 1 },
  };
}

/**
 * Milestone trigger: total skips cross 10/30/50/66 (chapter change), keyed
 * to the threshold, once per threshold per habit (spec §3, "Milestone";
 * acceptance test 4). `goalId` scopes the once-per-habit rule.
 */
export function selectMilestoneMoment(
  state: CoachMomentState,
  goalId: string,
  threshold: MilestoneThreshold
): { result: CoachMomentResult; nextState: CoachMomentState } | null {
  const shown = state.milestonesShownByGoal[goalId] ?? [];
  if (shown.includes(threshold)) return null;
  return {
    result: { trigger: 'milestone', cardId: MILESTONE_CARD[threshold] },
    nextState: {
      ...state,
      milestonesShownByGoal: {
        ...state.milestonesShownByGoal,
        [goalId]: [...shown, threshold],
      },
    },
  };
}

/**
 * Broken-streak trigger: a slip after a run of 3+ consecutive skips uses the
 * fixed BR-1 recovery card; a plain slip rotates BR-2..BR-4 (spec §3,
 * "Broken streak"). `runBreak` is the caller's pre-computed
 * `slipFollowsStreak` result (utils/habitLogging.ts) so this module stays
 * free of date math.
 */
export function selectBrokenStreakMoment(
  state: CoachMomentState,
  runBreak: boolean
): { result: CoachMomentResult; nextState: CoachMomentState } {
  if (runBreak) {
    return {
      result: { trigger: 'broken_streak', cardId: 'BR-1' },
      nextState: { ...state, runBreakShown: true },
    };
  }
  const index = state.brokenStreakRotationIndex % BROKEN_STREAK_ROTATION.length;
  const cardId = BROKEN_STREAK_ROTATION[index];
  return {
    result: { trigger: 'broken_streak', cardId },
    nextState: { ...state, brokenStreakRotationIndex: index + 1 },
  };
}

/**
 * Full priority resolution for the check-in confirmation slot (spec §3, §5):
 * milestone > recovery (run-break) > first-time (skip) > rotation. Detection
 * and first-log are separate mount points (LeakCard, first-expense flow) and
 * are not part of this stack; callers invoke selectFirstLogMoment /
 * selectDetectionMoment directly at their own mount points.
 *
 * `answer` is the just-recorded state; `milestone` is the threshold crossed
 * by this same answer, if any (from utils/habitLogging.ts#milestoneCrossed).
 * `runBreak` is only meaningful when answer === 'slipped'.
 */
export function selectCheckInMoment(
  state: CoachMomentState,
  goalId: string,
  answer: 'skipped' | 'slipped',
  options: { milestone?: MilestoneThreshold | null; runBreak?: boolean } = {}
): { result: CoachMomentResult; nextState: CoachMomentState } | null {
  if (options.milestone != null) {
    const viaMilestone = selectMilestoneMoment(state, goalId, options.milestone);
    if (viaMilestone) return viaMilestone;
    // Threshold already shown for this goal (shouldn't normally happen since
    // milestoneCrossed only reports a fresh crossing): fall through to the
    // ordinary skip/slip card so the slot is never left silently empty.
  }

  if (answer === 'slipped') {
    return selectBrokenStreakMoment(state, !!options.runBreak);
  }

  return selectSkipMoment(state);
}

/** Resolves a card id to its copy (verbatim from strings.coachMoments). */
export function cardText(cardId: CoachMomentCardId): string {
  const c = strings.coachMoments;
  switch (cardId) {
    case 'FL-1': return c.fl1;
    case 'DT-1': return c.dt1;
    case 'SK-0': return c.sk0;
    case 'SK-1': return c.sk1;
    case 'SK-2': return c.sk2;
    case 'SK-3': return c.sk3;
    case 'SK-4': return c.sk4;
    case 'SK-5': return c.sk5;
    case 'SK-6': return c.sk6;
    case 'MS-10': return c.ms10;
    case 'MS-30': return c.ms30;
    case 'MS-50': return c.ms50;
    case 'MS-66': return c.ms66;
    case 'BR-1': return c.br1;
    case 'BR-2': return c.br2;
    case 'BR-3': return c.br3;
    case 'BR-4': return c.br4;
  }
}

/** True for the four milestone card ids, which get the tinted treatment (spec §4.5). */
export function isMilestoneCard(cardId: CoachMomentCardId): boolean {
  return cardId === 'MS-10' || cardId === 'MS-30' || cardId === 'MS-50' || cardId === 'MS-66';
}
