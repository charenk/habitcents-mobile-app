import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/constants/theme';
import type { Expense } from '@/types/expense';
import type { Category } from '@/types/category';
import type { DetectedHabit, HabitChangeGoal, HabitMilestone } from '@/types/habit';
import type { DashboardConfig } from '@/types/report';
import type { OnboardingState, ProgressiveFeatureState, AuditAnswers } from '@/types/onboarding';
import { type CurrencyCode, DEFAULT_CURRENCY, isCurrencyCode } from '@/utils/currency';
import { type CoachMomentState, createInitialCoachMomentState } from '@/utils/coachMoments';

// Storage keys
const ONBOARDING_KEY = '@habitcents_onboarded';
const THEME_MODE_KEY = '@habitcents_theme_mode';
const CURRENCY_KEY = '@habitcents_currency';
const EXPENSES_KEY = '@habitcents_expenses';
const CATEGORIES_KEY = '@habitcents_categories';
const HABITS_KEY = '@habitcents_habits';
const HABIT_GOALS_KEY = '@habitcents_habit_goals';
const COACH_MOMENTS_KEY = '@habitcents_coach_moments';
const DASHBOARD_KEY = '@habitcents_dashboard';
const ONBOARDING_STATE_KEY = '@habitcents_onboarding_state';
const PROGRESSIVE_FEATURES_KEY = '@habitcents_progressive_features';
// Onboarding Leak Audit answer persistence (P2-1, spec 02 section 7).
const AUDIT_ANSWERS_KEY = '@habitcents_audit_answers';

// =====================
// SAFE LOAD HELPERS
// =====================

/**
 * Preserve unreadable data under a backup key before returning empty, so a
 * transient corruption can never be silently overwritten by the next save.
 */
async function backupCorrupt(key: string, raw: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${key}_corrupt_backup`, raw);
  } catch {
    // best effort
  }
  console.error(`Corrupt data at ${key}; preserved to ${key}_corrupt_backup`);
}

/**
 * Load a persisted array safely. Distinguishes "no data" (returns []) from
 * "unreadable data" (backs up the raw blob, then returns []). Each record is
 * run through `revive`; records that revive to null (bad shape / invalid date)
 * are dropped rather than crashing the whole collection.
 */
async function loadArray<T>(key: string, revive: (raw: any) => T | null): Promise<T[]> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      await backupCorrupt(key, value);
      return [];
    }
    if (!Array.isArray(parsed)) {
      await backupCorrupt(key, value);
      return [];
    }
    const out: T[] = [];
    for (const raw of parsed) {
      try {
        const item = revive(raw);
        if (item !== null) out.push(item);
      } catch {
        // Skip a single malformed record; keep the rest.
      }
    }
    return out;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return [];
  }
}

/** Parse a value into a valid Date, or null if unparseable. */
function toValidDate(value: unknown): Date | null {
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Check if user has completed onboarding
 */
export async function getHasOnboarded(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error reading onboarding state:', error);
    return false;
  }
}

/**
 * Mark user as having completed onboarding
 */
export async function setHasOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.error('Error saving onboarding state:', error);
  }
}

/**
 * Clear onboarding state (useful for testing)
 */
export async function clearOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    console.error('Error clearing onboarding state:', error);
  }
}

/**
 * Get persisted theme mode (light, dark, or system)
 */
export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const value = await AsyncStorage.getItem(THEME_MODE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
    return 'system';
  } catch (error) {
    console.error('Error reading theme mode:', error);
    return 'system';
  }
}

/**
 * Persist theme mode
 */
export async function setThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  } catch (error) {
    console.error('Error saving theme mode:', error);
  }
}

/**
 * Get persisted currency code (defaults to USD)
 */
export async function getCurrency(): Promise<CurrencyCode> {
  try {
    const value = await AsyncStorage.getItem(CURRENCY_KEY);
    if (isCurrencyCode(value)) return value;
    return DEFAULT_CURRENCY;
  } catch (error) {
    console.error('Error reading currency:', error);
    return DEFAULT_CURRENCY;
  }
}

/**
 * Persist currency code
 */
export async function setCurrency(code: CurrencyCode): Promise<void> {
  try {
    await AsyncStorage.setItem(CURRENCY_KEY, code);
  } catch (error) {
    console.error('Error saving currency:', error);
  }
}

/**
 * Get persisted expenses
 */
export async function getExpenses(): Promise<Expense[]> {
  return loadArray<Expense>(EXPENSES_KEY, (raw) => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
    const date = toValidDate(raw.date);
    if (!date) return null; // an invalid date would crash date grouping/formatting
    return { ...raw, date } as Expense;
  });
}

/**
 * Persist expenses
 */
export async function saveExpenses(expenses: Expense[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.error('Error saving expenses:', error);
  }
}

// =====================
// CATEGORIES STORAGE
// =====================

/**
 * Get persisted categories
 */
export async function getCategories(): Promise<Category[]> {
  return loadArray<Category>(CATEGORIES_KEY, (raw) => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
    return { ...raw, createdAt: toValidDate(raw.createdAt) ?? new Date() } as Category;
  });
}

/**
 * Persist categories
 */
export async function saveCategories(categories: Category[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error('Error saving categories:', error);
  }
}

// =====================
// HABITS STORAGE
// =====================

/**
 * Get persisted detected habits
 */
export async function getHabits(): Promise<DetectedHabit[]> {
  return loadArray<DetectedHabit>(HABITS_KEY, (raw) => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
    return {
      ...raw,
      discoveredAt: toValidDate(raw.discoveredAt) ?? new Date(),
      dismissedAt: raw.dismissedAt ? toValidDate(raw.dismissedAt) ?? undefined : undefined,
    } as DetectedHabit;
  });
}

/**
 * Persist detected habits
 */
export async function saveHabits(habits: DetectedHabit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Error saving habits:', error);
  }
}

/**
 * Get persisted habit goals
 */
export async function getHabitGoals(): Promise<HabitChangeGoal[]> {
  return loadArray<HabitChangeGoal>(HABIT_GOALS_KEY, (raw) => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
    return {
      ...raw,
      startDate: toValidDate(raw.startDate) ?? new Date(),
      lastLogDate: raw.lastLogDate ? toValidDate(raw.lastLogDate) ?? undefined : undefined,
      // Reconstruct log dates; drop entries with invalid dates. Default to [] for
      // goals saved before logs existed.
      logs: Array.isArray(raw.logs)
        ? raw.logs
            .map((d: { date: unknown }) => {
              const date = toValidDate(d.date);
              return date ? { ...d, date } : null;
            })
            .filter((d: unknown): d is { date: Date } => d !== null)
        : [],
      milestones: Array.isArray(raw.milestones)
        ? raw.milestones.map((m: HabitMilestone & { reachedAt?: string | Date }) => ({
            ...m,
            reachedAt: m.reachedAt ? toValidDate(m.reachedAt) ?? undefined : undefined,
          }))
        : [],
    } as HabitChangeGoal;
  });
}

/**
 * Persist habit goals
 */
export async function saveHabitGoals(goals: HabitChangeGoal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HABIT_GOALS_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('Error saving habit goals:', error);
  }
}

// =====================
// COACH MOMENTS STORAGE (P2-2, docs/design-package-phase2/04-p2-2-coach-moments.md)
// =====================
// Replaces the removed lessons-progress store above: the micro-lessons
// library (MICRO_LESSONS, the Habits-tab "Learning" section) is deleted per
// spec 04's removal note: its psychology is redistributed into the Coach
// Moment card copies, selected by utils/coachMoments.ts.

/**
 * Get the persisted Coach Moment dedup/rotation state. Returns a fresh
 * initial state (all pools at the start, nothing shown yet) if none is
 * stored or the stored value is unreadable, so a corrupt/missing record
 * degrades to "show cards from the top" rather than crashing.
 */
export async function getCoachMomentState(): Promise<CoachMomentState> {
  try {
    const value = await AsyncStorage.getItem(COACH_MOMENTS_KEY);
    if (!value) return createInitialCoachMomentState();
    const parsed = JSON.parse(value);
    return {
      ...createInitialCoachMomentState(),
      ...parsed,
      milestonesShownByGoal: parsed.milestonesShownByGoal ?? {},
    };
  } catch (error) {
    console.error('Error reading coach moment state:', error);
    return createInitialCoachMomentState();
  }
}

/**
 * Persist the Coach Moment dedup/rotation state.
 */
export async function saveCoachMomentState(state: CoachMomentState): Promise<void> {
  try {
    await AsyncStorage.setItem(COACH_MOMENTS_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving coach moment state:', error);
  }
}

// =====================
// DASHBOARD STORAGE
// =====================

/**
 * Get dashboard config
 */
export async function getDashboardConfig(): Promise<DashboardConfig | null> {
  try {
    const value = await AsyncStorage.getItem(DASHBOARD_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return {
      ...parsed,
      lastUpdated: new Date(parsed.lastUpdated),
    };
  } catch (error) {
    console.error('Error reading dashboard config:', error);
    return null;
  }
}

/**
 * Save dashboard config
 */
export async function saveDashboardConfig(config: DashboardConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(DASHBOARD_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving dashboard config:', error);
  }
}

// =====================
// ONBOARDING STATE STORAGE
// =====================

/**
 * Get detailed onboarding state
 */
export async function getOnboardingState(): Promise<OnboardingState | null> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_STATE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return {
      ...parsed,
      completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
    };
  } catch (error) {
    console.error('Error reading onboarding state:', error);
    return null;
  }
}

/**
 * Save detailed onboarding state
 */
export async function saveOnboardingState(state: OnboardingState): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving onboarding state:', error);
  }
}

/**
 * Get progressive feature state
 */
export async function getProgressiveFeatureState(): Promise<ProgressiveFeatureState | null> {
  try {
    const value = await AsyncStorage.getItem(PROGRESSIVE_FEATURES_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return {
      ...parsed,
      firstActiveDate: parsed.firstActiveDate ? new Date(parsed.firstActiveDate) : undefined,
    };
  } catch (error) {
    console.error('Error reading progressive feature state:', error);
    return null;
  }
}

/**
 * Save progressive feature state
 */
export async function saveProgressiveFeatureState(state: ProgressiveFeatureState): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESSIVE_FEATURES_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving progressive feature state:', error);
  }
}

// =====================
// ONBOARDING LEAK AUDIT ANSWERS (P2-1, spec 02 section 7)
// =====================

/**
 * Get persisted Door 1 Leak Audit answers, so abandon-and-reopen resumes at
 * the first incomplete step with prior answers intact.
 */
export async function getAuditAnswers(): Promise<AuditAnswers | null> {
  try {
    const value = await AsyncStorage.getItem(AUDIT_ANSWERS_KEY);
    if (!value) return null;
    return JSON.parse(value) as AuditAnswers;
  } catch (error) {
    console.error('Error reading audit answers:', error);
    return null;
  }
}

/** Persist Door 1 Leak Audit answers. */
export async function saveAuditAnswers(answers: AuditAnswers): Promise<void> {
  try {
    await AsyncStorage.setItem(AUDIT_ANSWERS_KEY, JSON.stringify(answers));
  } catch (error) {
    console.error('Error saving audit answers:', error);
  }
}

/** Clear Door 1 Leak Audit answers (used when the audit is fully re-completed). */
export async function clearAuditAnswers(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUDIT_ANSWERS_KEY);
  } catch (error) {
    console.error('Error clearing audit answers:', error);
  }
}
