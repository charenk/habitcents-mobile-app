import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/constants/theme';
import type { Expense } from '@/types/expense';
import type { Category } from '@/types/category';
import type { DetectedHabit, HabitChangeGoal, HabitMilestone } from '@/types/habit';
import type { DashboardConfig } from '@/types/report';
import type { OnboardingState, ProgressiveFeatureState } from '@/types/onboarding';

// Storage keys
const ONBOARDING_KEY = '@habitcents_onboarded';
const THEME_MODE_KEY = '@habitcents_theme_mode';
const EXPENSES_KEY = '@habitcents_expenses';
const CATEGORIES_KEY = '@habitcents_categories';
const HABITS_KEY = '@habitcents_habits';
const HABIT_GOALS_KEY = '@habitcents_habit_goals';
const LESSONS_PROGRESS_KEY = '@habitcents_lessons_progress';
const DASHBOARD_KEY = '@habitcents_dashboard';
const ONBOARDING_STATE_KEY = '@habitcents_onboarding_state';
const PROGRESSIVE_FEATURES_KEY = '@habitcents_progressive_features';

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
 * Get persisted expenses
 */
export async function getExpenses(): Promise<Expense[]> {
  try {
    const value = await AsyncStorage.getItem(EXPENSES_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    // Restore Date objects from ISO strings
    return parsed.map((e: Expense & { date: string }) => ({
      ...e,
      date: new Date(e.date),
    }));
  } catch (error) {
    console.error('Error reading expenses:', error);
    return [];
  }
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
  try {
    const value = await AsyncStorage.getItem(CATEGORIES_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return parsed.map((c: Category & { createdAt: string }) => ({
      ...c,
      createdAt: new Date(c.createdAt),
    }));
  } catch (error) {
    console.error('Error reading categories:', error);
    return [];
  }
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
  try {
    const value = await AsyncStorage.getItem(HABITS_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return parsed.map((h: DetectedHabit & { discoveredAt: string; dismissedAt?: string }) => ({
      ...h,
      discoveredAt: new Date(h.discoveredAt),
      dismissedAt: h.dismissedAt ? new Date(h.dismissedAt) : undefined,
    }));
  } catch (error) {
    console.error('Error reading habits:', error);
    return [];
  }
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
  try {
    const value = await AsyncStorage.getItem(HABIT_GOALS_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return parsed.map((g: HabitChangeGoal & { startDate: string; lastLogDate?: string }) => ({
      ...g,
      startDate: new Date(g.startDate),
      lastLogDate: g.lastLogDate ? new Date(g.lastLogDate) : undefined,
      milestones: g.milestones.map((m: HabitMilestone & { reachedAt?: string | Date }) => ({
        ...m,
        reachedAt: m.reachedAt ? new Date(m.reachedAt as string) : undefined,
      })),
    }));
  } catch (error) {
    console.error('Error reading habit goals:', error);
    return [];
  }
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

/**
 * Get lesson progress
 */
export async function getLessonsProgress(): Promise<Record<string, Date>> {
  try {
    const value = await AsyncStorage.getItem(LESSONS_PROGRESS_KEY);
    if (!value) return {};
    const parsed = JSON.parse(value);
    const result: Record<string, Date> = {};
    for (const [id, dateStr] of Object.entries(parsed)) {
      result[id] = new Date(dateStr as string);
    }
    return result;
  } catch (error) {
    console.error('Error reading lessons progress:', error);
    return {};
  }
}

/**
 * Save lesson progress
 */
export async function saveLessonsProgress(progress: Record<string, Date>): Promise<void> {
  try {
    await AsyncStorage.setItem(LESSONS_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving lessons progress:', error);
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
