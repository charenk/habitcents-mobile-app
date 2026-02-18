/**
 * Type definitions for onboarding flow and progressive feature reveal.
 */

export type OnboardingStep = 'welcome' | 'value_props' | 'first_expense' | 'success';

export type OnboardingState = {
  currentStep: OnboardingStep;
  hasSeenWelcome: boolean;
  hasSeenValueProps: boolean;
  hasAddedFirstExpense: boolean;
  completedAt?: Date;
  skippedSteps: OnboardingStep[];
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
