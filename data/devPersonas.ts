/**
 * Developer-only data personas: one tap puts the device in a known state.
 *
 * Why: every round of device feedback so far has needed state that takes
 * minutes to hand-build (log four expenses at one merchant so detection fires,
 * reach the paywall gate, get back to a fresh install). These three presets
 * cover the states worth testing, and the shapes are pure functions so they can
 * be asserted in unit tests without touching AsyncStorage.
 *
 * Gate: nothing here is reachable unless DEV_MENU_ENABLED (utils/devMenu.ts).
 *
 * Storage etiquette: applying a persona removes only this app's own
 * `@habitcents*` keys (which includes the mock entitlement key) instead of
 * calling AsyncStorage.clear(). Anything another library persisted on the same
 * device survives, so a reset can never take out state we do not own.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Category } from '@/types/category';
import type { Expense } from '@/types/expense';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';
import type { OnboardingState, ProgressiveFeatureState } from '@/types/onboarding';
import {
  buildCategories,
  buildExpenses,
  buildGoal,
  buildHabits,
  daysAgo,
} from '@/data/devSeed';
import {
  saveCategories,
  saveExpenses,
  saveHabitGoals,
  saveHabits,
  saveOnboardingState,
  saveProgressiveFeatureState,
  setCurrency,
  setHasOnboarded,
} from '@/utils/storage';
import { setMockEntitlement, type Entitlement } from '@/utils/purchases';

/** Every key this app owns starts with this. Nothing else may be removed. */
export const APP_KEY_PREFIX = '@habitcents';

export type PersonaId = 'new' | 'firstRun' | 'returning';

/**
 * Row copy, held apart from the builders so the menu can render the list
 * without constructing the heavy returning-user fixture on every render.
 */
export const PERSONA_META: Record<PersonaId, { label: string; hint: string }> = {
  new: { label: 'Persona: new user', hint: 'zero data' },
  firstRun: { label: 'Persona: first run', hint: 'onboarding, defaults ready' },
  returning: { label: 'Persona: returning user', hint: 'rich history' },
};

export type PersonaData = {
  id: PersonaId;
  /** Row label in the developer menu. */
  label: string;
  /** What the state is for, shown as the row's trailing hint. */
  hint: string;
  categories: Category[];
  expenses: Expense[];
  habits: DetectedHabit[];
  goals: HabitChangeGoal[];
  /** Value of the has-onboarded flag app/index.tsx reads on launch. */
  onboarded: boolean;
  onboardingState: OnboardingState | null;
  progressive: ProgressiveFeatureState | null;
  entitlement: Entitlement;
};

/**
 * New user, zero data. Nothing stored at all, so launch lands on
 * /onboarding/welcome exactly the way a fresh install does.
 */
export function buildNewUserPersona(): PersonaData {
  return {
    id: 'new',
    ...PERSONA_META.new,
    categories: [],
    expenses: [],
    habits: [],
    goals: [],
    onboarded: false,
    onboardingState: null,
    progressive: null,
    entitlement: 'free',
  };
}

/**
 * First-run experience: onboarding not yet done, but the default categories
 * exist, so the guided-log step has real categories to offer. This is the
 * "fresh install with defaults already provisioned" state.
 */
export function buildFirstRunPersona(): PersonaData {
  return {
    id: 'firstRun',
    ...PERSONA_META.firstRun,
    categories: buildCategories(),
    expenses: [],
    habits: [],
    goals: [],
    onboarded: false,
    onboardingState: null,
    progressive: null,
    entitlement: 'free',
  };
}

/**
 * Returning user with real history: the full sample account. Enough repeat
 * merchants for detection to fire, a coffee habit mid-arc with 28 days of day
 * logs, an undetected DoorDash leak, plus upcoming recurring items.
 */
export function buildReturningUserPersona(): PersonaData {
  const expenses = buildExpenses();
  return {
    id: 'returning',
    ...PERSONA_META.returning,
    categories: buildCategories(),
    expenses,
    habits: buildHabits(),
    goals: [buildGoal()],
    onboarded: true,
    onboardingState: {
      currentStep: 'success',
      hasSeenWelcome: true,
      hasSeenValueProps: true,
      hasAddedFirstExpense: true,
      completedAt: daysAgo(28),
      skippedSteps: [],
    },
    progressive: {
      expenseCount: expenses.length,
      daysActive: 28,
      revealedFeatures: ['habits', 'reports', 'upcoming'],
      pendingReveals: [],
      firstActiveDate: daysAgo(28),
    },
    entitlement: 'free',
  };
}

/** Builders keyed by id, in the order the menu lists them. */
export const PERSONA_BUILDERS: Record<PersonaId, () => PersonaData> = {
  new: buildNewUserPersona,
  firstRun: buildFirstRunPersona,
  returning: buildReturningUserPersona,
};

export const PERSONA_ORDER: PersonaId[] = ['new', 'firstRun', 'returning'];

/**
 * Remove every key this app owns and nothing else, and drop the in-memory mock
 * entitlement with it so a gate check before the reload cannot read a stale
 * premium grant.
 */
export async function clearAppData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith(APP_KEY_PREFIX));
  if (ours.length > 0) await AsyncStorage.multiRemove(ours);
  await setMockEntitlement('free');
}

/**
 * Write a persona to storage. Clears this app's keys first so the result is the
 * persona and nothing left over. Does not reload: the caller decides when to
 * restart, which keeps this function testable.
 */
export async function applyPersona(persona: PersonaData): Promise<void> {
  await clearAppData();

  if (persona.categories.length > 0) await saveCategories(persona.categories);
  if (persona.expenses.length > 0) await saveExpenses(persona.expenses);
  if (persona.habits.length > 0) await saveHabits(persona.habits);
  if (persona.goals.length > 0) await saveHabitGoals(persona.goals);
  if (persona.onboardingState) await saveOnboardingState(persona.onboardingState);
  if (persona.progressive) await saveProgressiveFeatureState(persona.progressive);
  if (persona.onboarded) {
    await setCurrency('USD');
    await setHasOnboarded();
  }
  await setMockEntitlement(persona.entitlement);
}
