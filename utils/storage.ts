import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/constants/theme';
import type { Expense } from '@/types/expense';
import type { Category } from '@/types/category';
import type { DetectedHabit, HabitChangeGoal, HabitLogEntry, HabitMilestone } from '@/types/habit';
import type { DashboardConfig } from '@/types/report';
import type { OnboardingState, ProgressiveFeatureState, AuditAnswers } from '@/types/onboarding';
import type { ScanSummary } from '@/types/scanSummary';
import { type CurrencyCode, DEFAULT_CURRENCY, isCurrencyCode } from '@/utils/currency';
import { type CoachMomentState, createInitialCoachMomentState } from '@/utils/coachMoments';
import {
  DEFAULT_UPCOMING_WINDOW_DAYS,
  isUpcomingWindowDays,
  type UpcomingWindowDays,
} from '@/utils/upcomingWindow';

// Storage keys
const ONBOARDING_KEY = '@habitcents_onboarded';
const THEME_MODE_KEY = '@habitcents_theme_mode';
const CURRENCY_KEY = '@habitcents_currency';
const UPCOMING_WINDOW_KEY = '@habitcents_upcoming_window';
const EXPENSES_KEY = '@habitcents_expenses';
const CATEGORIES_KEY = '@habitcents_categories';
const HABITS_KEY = '@habitcents_habits';
const HABIT_GOALS_KEY = '@habitcents_habit_goals';
const COACH_MOMENTS_KEY = '@habitcents_coach_moments';
const DASHBOARD_KEY = '@habitcents_dashboard';
const ONBOARDING_STATE_KEY = '@habitcents_onboarding_state';
const PROGRESSIVE_FEATURES_KEY = '@habitcents_progressive_features';
// Onboarding Leak Audit answer persistence (P2-1, spec 02 section 7).
// LEGACY (W3, "the app is the onboarding" complete): the audit screens that
// wrote this key are deleted, and nothing reads it back into a screen
// anymore. Kept only so completeOnboarding's one-time clearAuditAnswers()
// call below still has a key to clear on a device upgrading from before this
// update; never write new data here.
const AUDIT_ANSWERS_KEY = '@habitcents_audit_answers';
// Leak Scan summary snapshot (OB-4, ADR 0020): survives navigation so a later
// Insights segment can read the last scan without re-running the pipeline.
const SCAN_SUMMARY_KEY = '@habitcents_scan_summary';
// Recurring materializer delete-child tombstones (ADR 0024, U11). See
// utils/materializer.ts planMaterialization's header comment for why this
// exists instead of "plan only forward from the newest child".
const RECURRING_TOMBSTONES_KEY = '@habitcents_recurring_tombstones';

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
 * Get the persisted Upcoming window selection (U8: the 2 weeks / 1 month / 3
 * months picker on Money > Upcoming). Defaults to
 * DEFAULT_UPCOMING_WINDOW_DAYS when nothing is stored or the stored value is
 * not one of the valid presets (utils/upcomingWindow.ts), so a corrupt or
 * stale value degrades to the default rather than a nonsense window.
 */
export async function getUpcomingWindowDays(): Promise<UpcomingWindowDays> {
  try {
    const value = await AsyncStorage.getItem(UPCOMING_WINDOW_KEY);
    const parsed = value === null ? NaN : Number(value);
    return isUpcomingWindowDays(parsed) ? parsed : DEFAULT_UPCOMING_WINDOW_DAYS;
  } catch (error) {
    console.error('Error reading upcoming window:', error);
    return DEFAULT_UPCOMING_WINDOW_DAYS;
  }
}

/**
 * Persist the Upcoming window selection.
 */
export async function setUpcomingWindowDays(days: UpcomingWindowDays): Promise<void> {
  try {
    await AsyncStorage.setItem(UPCOMING_WINDOW_KEY, String(days));
  } catch (error) {
    console.error('Error saving upcoming window:', error);
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

/**
 * Get the recurring-materializer tombstone set: one composite
 * `${parentId}|${YYYY-MM-DD}` key per occurrence the user explicitly deleted,
 * so a later planning pass never resurrects exactly the row they removed.
 * Returns [] (never throws) on missing or unreadable data, same degrade-safe
 * shape as every other getter in this file -- a lost tombstone at worst
 * regenerates one already-deleted row, never crashes app start.
 */
export async function getRecurringTombstones(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(RECURRING_TOMBSTONES_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch (error) {
    console.error('Error reading recurring tombstones:', error);
    return [];
  }
}

/** Persist the recurring-materializer tombstone set. */
export async function saveRecurringTombstones(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECURRING_TOMBSTONES_KEY, JSON.stringify(keys));
  } catch (error) {
    console.error('Error saving recurring tombstones:', error);
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
    // Observed-evidence fields (device feedback 2026-08-04). A habit written
    // before they existed has none of them, and the leak card reads them during
    // render, so every one gets a value here. The defaults reproduce exactly
    // what the old row already displayed; the next detection pass overwrites
    // them with real observation through mergeHabits().
    const num = (value: unknown, fallback: number): number =>
      typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    const averageAmount = num(raw.averageAmount, 0);
    return {
      ...raw,
      discoveredAt: toValidDate(raw.discoveredAt) ?? new Date(),
      dismissedAt: raw.dismissedAt ? toValidDate(raw.dismissedAt) ?? undefined : undefined,
      observedTotal: num(raw.observedTotal, num(raw.totalMonthlySpend, 0)),
      observedCount: num(raw.observedCount, num(raw.occurrencesPerPeriod, 0)),
      spanDays: num(raw.spanDays, 0),
      hasReliableRate: typeof raw.hasReliableRate === 'boolean' ? raw.hasReliableRate : true,
      medianAmount: num(raw.medianAmount, averageAmount),
      minAmount: num(raw.minAmount, averageAmount),
      maxAmount: num(raw.maxAmount, averageAmount),
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
    const startDate = toValidDate(raw.startDate) ?? new Date();
    // Habit logging v2 fields. A goal written before v2 has none of them, and
    // an absent dayLogs used to reach dayStateFor() as undefined and crash the
    // check-in card on render. Every v2 field gets a value here so the rest of
    // the app can treat a revived goal as complete.
    const dayLogs: HabitLogEntry[] = Array.isArray(raw.dayLogs)
      ? raw.dayLogs
          .map((entry: { date: unknown }) => {
            const date = toValidDate(entry.date);
            return date ? ({ ...entry, date } as HabitLogEntry) : null;
          })
          .filter((entry: HabitLogEntry | null): entry is HabitLogEntry => entry !== null)
      : [];
    return {
      ...raw,
      startDate,
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
      dayLogs,
      // Tracking cannot have started before the goal existed, so startDate is
      // the honest fallback: earlier days then read as out of range, not no-log.
      trackingStart: toValidDate(raw.trackingStart) ?? startDate,
      skipValue: typeof raw.skipValue === 'number' ? raw.skipValue : 0,
      kept: typeof raw.kept === 'number' ? raw.kept : 0,
      totalSkips: typeof raw.totalSkips === 'number' ? raw.totalSkips : 0,
      highestMilestoneReached:
        typeof raw.highestMilestoneReached === 'number' ? raw.highestMilestoneReached : 0,
      firstRun: typeof raw.firstRun === 'boolean' ? raw.firstRun : dayLogs.length === 0,
      backfillUsed: raw.backfillUsed === true,
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

// =====================
// LEAK SCAN SUMMARY (OB-4, ADR 0020)
// =====================

/**
 * Get the persisted Leak Scan summary snapshot, or null if none is stored,
 * the blob is corrupt, or its schemaVersion is not one this build knows how
 * to read. Every date field is revived and defaulted individually rather than
 * trusted as-is: this codebase already crashed a real device once (build 5,
 * see the getHabitGoals dayLogs revive above) on a stored record missing a
 * field a render path assumed existed. A bad or unreadable summary degrades
 * to "no summary yet" -- it never throws into whatever reads it.
 */
export async function getScanSummary(): Promise<ScanSummary | null> {
  try {
    const value = await AsyncStorage.getItem(SCAN_SUMMARY_KEY);
    if (!value) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      await backupCorrupt(SCAN_SUMMARY_KEY, value);
      return null;
    }
    if (!parsed || typeof parsed !== 'object') {
      await backupCorrupt(SCAN_SUMMARY_KEY, value);
      return null;
    }
    const raw = parsed as Record<string, unknown>;
    if (raw.schemaVersion !== 1) {
      await backupCorrupt(SCAN_SUMMARY_KEY, value);
      return null;
    }
    const createdAt = toValidDate(raw.createdAt);
    if (!createdAt) return null;

    const rawEvidence = (raw.evidence as Record<string, unknown>) ?? {};
    const rawKpis = (raw.kpis as Record<string, unknown>) ?? {};
    const num = (value: unknown, fallback: number): number =>
      typeof value === 'number' && Number.isFinite(value) ? value : fallback;

    return {
      schemaVersion: 1,
      createdAt,
      evidence: {
        windowStart: rawEvidence.windowStart ? toValidDate(rawEvidence.windowStart) : null,
        windowEnd: rawEvidence.windowEnd ? toValidDate(rawEvidence.windowEnd) : null,
        fileCount: num(rawEvidence.fileCount, 0),
        rowCount: num(rawEvidence.rowCount, 0),
      },
      kpis: {
        totalSpentCents: num(rawKpis.totalSpentCents, 0),
        totalSpentTier: (rawKpis.totalSpentTier as ScanSummary['kpis']['totalSpentTier']) ?? 'needs-review',
        perDayCents: num(rawKpis.perDayCents, 0),
        transactionCount: num(rawKpis.transactionCount, 0),
        purchasesPerDay: num(rawKpis.purchasesPerDay, 0),
        // spanDays is newer than the first shipped summaries (UX-073). A
        // record written before it existed falls back to coveredDays, which
        // is what those older figures were actually computed against, so a
        // revived pre-fix snapshot stays internally consistent instead of
        // pairing old numbers with a new denominator. The next scan replaces
        // it with correct values.
        spanDays: num(rawKpis.spanDays, num(rawKpis.coveredDays, 0)),
        coveredDays: num(rawKpis.coveredDays, 0),
        nAccounts: num(rawKpis.nAccounts, 0),
      },
      categories: Array.isArray(raw.categories) ? (raw.categories as ScanSummary['categories']) : [],
      topLeaks: Array.isArray(raw.topLeaks) ? (raw.topLeaks as ScanSummary['topLeaks']) : [],
      projection: (raw.projection as ScanSummary['projection']) ?? null,
    };
  } catch (error) {
    console.error('Error reading scan summary:', error);
    return null;
  }
}

/**
 * Persist the Leak Scan summary snapshot. Each successful save REPLACES the
 * previous one (ADR 0020: kept until replaced, no expiry) -- there is only
 * ever one summary on device, matching a single AsyncStorage key rather than
 * an array.
 */
export async function saveScanSummary(summary: ScanSummary | null): Promise<void> {
  if (!summary) return;
  try {
    await AsyncStorage.setItem(SCAN_SUMMARY_KEY, JSON.stringify(summary));
  } catch (error) {
    console.error('Error saving scan summary:', error);
  }
}

// =====================
// TODAY QUOTE ROTATION (U6, components/today/useViewQuote.ts)
// =====================
// One small counter per Today pane: incremented once each time that pane
// becomes active, read modulo the quote array's length. Two keys, not one,
// so Spent and Kept rotate independently of each other.
const QUOTE_SEQ_SPENT_KEY = '@habitcents_quote_seq_spent';
const QUOTE_SEQ_KEPT_KEY = '@habitcents_quote_seq_kept';

/** Shared getter: an unreadable or missing value defaults to 0, never throws. */
async function getQuoteSeq(key: string): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch (error) {
    console.error(`Error reading quote sequence ${key}:`, error);
    return 0;
  }
}

async function setQuoteSeq(key: string, value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(key, String(value));
  } catch (error) {
    console.error(`Error saving quote sequence ${key}:`, error);
  }
}

/** Get the persisted Spent-view quote counter. Defaults to 0. */
export function getSpentQuoteSeq(): Promise<number> {
  return getQuoteSeq(QUOTE_SEQ_SPENT_KEY);
}

/** Persist the Spent-view quote counter. */
export function setSpentQuoteSeq(value: number): Promise<void> {
  return setQuoteSeq(QUOTE_SEQ_SPENT_KEY, value);
}

/** Get the persisted Kept-view quote counter. Defaults to 0. */
export function getKeptQuoteSeq(): Promise<number> {
  return getQuoteSeq(QUOTE_SEQ_KEPT_KEY);
}

/** Persist the Kept-view quote counter. */
export function setKeptQuoteSeq(value: number): Promise<void> {
  return setQuoteSeq(QUOTE_SEQ_KEPT_KEY, value);
}
