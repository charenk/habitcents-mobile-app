/**
 * Type definitions for onboarding flow and progressive feature reveal.
 *
 * Onboarding flow (P2-1, docs/design-package-phase2/02-p2-1-onboarding-leak-audit.md):
 * welcome -> fork -> [Door 1: audit_subs -> audit_vices -> reveal] -> guided_log -> success.
 * 'reveal' IS tracked as a currentStep gate even though it has no answers of
 * its own: without it, abandoning on the reveal screen and reopening would
 * resume past it straight into guided_log, so the user would never see their
 * leak number (the 90-second gate's entire point). Section 7 "Mid-flow
 * abandon and reopen" resumes at the first incomplete step with prior
 * answers intact.
 */

export type OnboardingStep =
  | 'welcome'
  | 'fork'
  | 'audit_subs'
  | 'audit_vices'
  | 'reveal'
  | 'guided_log'
  | 'success'
  // Legacy steps kept only for backward-compatible state shape; no longer
  // reachable from the rebuilt flow.
  | 'value_props'
  | 'first_expense';

export type OnboardingState = {
  currentStep: OnboardingStep;
  hasSeenWelcome: boolean;
  hasSeenValueProps: boolean;
  hasAddedFirstExpense: boolean;
  completedAt?: Date;
  skippedSteps: OnboardingStep[];
  /** door_chosen (section 6): which door the two-door fork resolved to. */
  doorChosen?: 'fresh' | 'statements' | 'skip';
  /**
   * onboarding_completed's habitStarted (section 6): true once "Plug the
   * biggest leak" (reveal) or "Break it" (success) completes the pick-one
   * sheet's Start breaking it. Read by the success screen to decide whether
   * its own Break it button is still offered (section 3.7).
   */
  habitStarted?: boolean;
};

export type FeatureRevealTrigger =
  | 'expense_count'
  | 'days_active'
  | 'habit_detected'
  | 'streak_achieved';

export type FeatureReveal = {
  id: string;
  feature: string;
  triggerType: FeatureRevealTrigger;
  triggerValue: number;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  shownAt?: Date;
  dismissedAt?: Date;
};

export type ProgressiveFeatureState = {
  expenseCount: number;
  daysActive: number;
  firstActiveDate?: Date;
  revealedFeatures: string[];
  pendingReveals: FeatureReveal[];
};

export const FEATURE_REVEALS: Omit<FeatureReveal, 'shownAt' | 'dismissedAt'>[] = [
  {
    id: 'reveal-reports',
    feature: 'reports',
    triggerType: 'expense_count',
    triggerValue: 5,
    message: 'Tap Reports to see insights about your spending!',
    actionLabel: 'View Reports',
    actionRoute: '/(tabs)/reports',
  },
  {
    id: 'reveal-habits',
    feature: 'habits',
    triggerType: 'expense_count',
    triggerValue: 10,
    message: "We've detected your first spending habit. Let's take a look!",
    actionLabel: 'View Habits',
    actionRoute: '/(tabs)/habits',
  },
  {
    id: 'reveal-learning',
    feature: 'learning',
    triggerType: 'days_active',
    triggerValue: 7,
    message: 'Unlock micro-lessons on building better financial habits!',
    actionLabel: 'Start Learning',
    actionRoute: '/(tabs)/habits',
  },
  {
    id: 'reveal-categories',
    feature: 'categories',
    triggerType: 'expense_count',
    triggerValue: 15,
    message: 'Customize your categories to track spending your way.',
    actionLabel: 'Manage Categories',
    actionRoute: '/(tabs)/categories',
  },
];

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  currentStep: 'welcome',
  hasSeenWelcome: false,
  hasSeenValueProps: false,
  hasAddedFirstExpense: false,
  skippedSteps: [],
};

export const INITIAL_PROGRESSIVE_STATE: ProgressiveFeatureState = {
  expenseCount: 0,
  daysActive: 0,
  revealedFeatures: [],
  pendingReveals: [],
};

// ---------------------------------------------------------------------------
// Door 1 Leak Audit answer persistence (spec 02 section 7, "Mid-flow abandon
// and reopen"): step answers persist locally per step so reopening resumes
// with prior answers intact. Amounts are cents; this is local device state
// only, never sent anywhere (section 6, "no amounts... in any event").
// ---------------------------------------------------------------------------

export type AuditSubscriptionSelection = {
  /** Chip id (constants/onboardingPresets.ts SubscriptionChipId) or a
   * generated id for a "Something else" entry. */
  id: string;
  /** Only set for "Something else": the user's typed name. */
  customName?: string;
  amountCents: number;
  edited: boolean;
  /** Door 2 graceful-failure re-entry (section 8.6): pre-selected from the
   * scan at an exact value, no tilde. */
  fromScan?: boolean;
};

export type AuditViceSelection = {
  id: string;
  perItemCents: number;
  edited: boolean;
  band: 'never' | 'oneToTwo' | 'threeToFive' | 'daily';
  answered: boolean;
};

export type AuditAnswers = {
  selectedSubscriptions: AuditSubscriptionSelection[];
  viceAnswers: AuditViceSelection[];
  subsStepDone: boolean;
  vicesStepDone: boolean;
};

export const INITIAL_AUDIT_ANSWERS: AuditAnswers = {
  selectedSubscriptions: [],
  viceAnswers: [],
  subsStepDone: false,
  vicesStepDone: false,
};
