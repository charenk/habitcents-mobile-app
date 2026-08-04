/**
 * Dev-only sample data. Populates a realistic account (expenses across
 * categories, two detected leaks, one habit being broken mid-arc) so redesign
 * work can be checked against populated screens instead of empty states.
 *
 * Never shipped: every caller is gated behind `__DEV__` and the only UI trigger
 * (components/dev/DevSeedButton) renders null in production. Nothing here runs on
 * a normal launch. Dates are relative to the real "today" so the data always
 * reads as current.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DevSettings } from 'react-native';
import type { Expense, ExpenseCategory, RecurrenceFrequency } from '@/types/expense';
import type { Category, CategoryIcon } from '@/types/category';
import type { DetectedHabit, HabitChangeGoal, HabitLogEntry } from '@/types/habit';
import {
  saveExpenses,
  saveCategories,
  saveHabits,
  saveHabitGoals,
  setHasOnboarded,
  setCurrency,
  saveOnboardingState,
  saveProgressiveFeatureState,
} from '@/utils/storage';

function daysAgo(n: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

let seq = 0;
function id(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

// --- categories: the 10 defaults with stable ids the expenses reference ---
const CATEGORY_DEFS: Array<[string, string, CategoryIcon, string]> = [
  ['cat-rent', 'Mortgage/Rent', 'home-outline', '#7E57C2'],
  ['cat-car', 'Car', 'car-outline', '#FFA726'],
  ['cat-ent', 'Entertainment', 'film-outline', '#42A5F5'],
  ['cat-food', 'Food', 'fast-food-outline', '#66BB6A'],
  ['cat-shop', 'Shopping', 'cart-outline', '#EC407A'],
  ['cat-util', 'Utilities', 'flash-outline', '#26C6DA'],
  ['cat-health', 'Healthcare', 'medical-outline', '#EF5350'],
  ['cat-transport', 'Transportation', 'bus-outline', '#8D6E63'],
  ['cat-subs', 'Software & Subscriptions', 'card-outline', '#26A69A'],
  ['cat-other', 'Other', 'ellipsis-horizontal-outline', '#9E9E9E'],
];

function buildCategories(): Category[] {
  return CATEGORY_DEFS.map(([cid, name, icon, color]) => ({
    id: cid,
    name,
    icon,
    color,
    isDefault: true,
    isHidden: false,
    createdAt: daysAgo(60),
  }));
}

type ExpSpec = {
  title: string;
  cents: number;
  category: ExpenseCategory;
  categoryId: string;
  date: Date;
  merchant?: string;
  recurrence?: RecurrenceFrequency;
  variant?: 'yellow' | 'green';
};

function buildExpenses(): Expense[] {
  const specs: ExpSpec[] = [
    // Blue Bottle coffee: the leak being broken (repeat merchant)
    ...[[12, 8, 14], [10, 8, 32], [8, 7, 58], [5, 8, 21], [3, 8, 9], [1, 8, 40]].map(
      ([n, h, m]) => ({
        title: 'Blue Bottle',
        cents: 650,
        category: 'Food' as const,
        categoryId: 'cat-food',
        date: daysAgo(n, h, m),
        merchant: 'Blue Bottle',
      }),
    ),
    // DoorDash: second leak
    ...[[11, 2840], [7, 3115], [4, 2560], [2, 3390]].map(([n, c]) => ({
      title: 'DoorDash',
      cents: c,
      category: 'Food' as const,
      categoryId: 'cat-food',
      date: daysAgo(n, 19, 30),
      merchant: 'DoorDash',
    })),
    // Groceries
    { title: 'Whole Foods', cents: 6218, category: 'Food', categoryId: 'cat-food', date: daysAgo(9, 17, 10), merchant: 'Whole Foods' },
    { title: 'Whole Foods', cents: 4487, category: 'Food', categoryId: 'cat-food', date: daysAgo(3, 17, 10), merchant: 'Whole Foods' },
    // Transport
    { title: 'Shell', cents: 5240, category: 'Transportation', categoryId: 'cat-transport', date: daysAgo(8, 18, 5), merchant: 'Shell' },
    { title: 'Uber', cents: 1875, category: 'Transportation', categoryId: 'cat-transport', date: daysAgo(6, 22, 40), merchant: 'Uber' },
    { title: 'Uber', cents: 2310, category: 'Transportation', categoryId: 'cat-transport', date: daysAgo(1, 23, 12), merchant: 'Uber' },
    // Shopping
    { title: 'Amazon', cents: 3499, category: 'Shopping', categoryId: 'cat-shop', date: daysAgo(5, 12, 0), merchant: 'Amazon' },
    { title: 'Amazon', cents: 1299, category: 'Shopping', categoryId: 'cat-shop', date: daysAgo(2, 13, 45), merchant: 'Amazon' },
    // Entertainment
    { title: 'AMC Theatres', cents: 2600, category: 'Entertainment', categoryId: 'cat-ent', date: daysAgo(4, 20, 15), merchant: 'AMC', variant: 'yellow' },
    // Recurring
    { title: 'Netflix', cents: 1599, category: 'Software & Subscriptions', categoryId: 'cat-subs', date: daysAgo(6, 6, 0), merchant: 'Netflix', recurrence: 'monthly' },
    { title: 'Spotify', cents: 1099, category: 'Software & Subscriptions', categoryId: 'cat-subs', date: daysAgo(9, 6, 0), merchant: 'Spotify', recurrence: 'monthly' },
    { title: 'PG&E', cents: 8740, category: 'Utilities', categoryId: 'cat-util', date: daysAgo(7, 9, 0), merchant: 'PG&E', recurrence: 'monthly' },
    { title: 'Rent', cents: 210000, category: 'Mortgage', categoryId: 'cat-rent', date: daysAgo(13, 9, 0), merchant: 'Landlord', recurrence: 'monthly' },
    // Today
    { title: 'Blue Bottle', cents: 650, category: 'Food', categoryId: 'cat-food', date: daysAgo(0, 8, 18), merchant: 'Blue Bottle' },
    { title: 'Sweetgreen', cents: 1685, category: 'Food', categoryId: 'cat-food', date: daysAgo(0, 12, 35), merchant: 'Sweetgreen' },
  ];

  return specs.map((s) => ({
    id: id('exp'),
    title: s.title,
    amount: s.cents,
    category: s.category,
    categoryId: s.categoryId,
    class: 'spend',
    merchant: s.merchant,
    date: s.date,
    time: timeLabel(s.date),
    isRecurring: s.recurrence != null,
    recurrence: s.recurrence,
    reminderEnabled: false,
    source: 'manual',
    iconVariant: s.variant ?? 'green',
  }));
}

const SKIP_VALUE = 650; // $6.50 kept per skipped coffee

function buildGoal(): HabitChangeGoal {
  // 28 days of history ending yesterday: mostly skipped, a few honest slips.
  const slipDays = new Set([23, 19, 14, 6, 2]);
  const dayLogs: HabitLogEntry[] = [];
  for (let n = 28; n >= 1; n -= 1) {
    dayLogs.push({ date: daysAgo(n, 8, 20), state: slipDays.has(n) ? 'slipped' : 'skipped' });
  }
  const totalSkips = dayLogs.filter((d) => d.state === 'skipped').length;
  const kept = totalSkips * SKIP_VALUE;

  return {
    id: 'goal-coffee-1',
    habitId: 'habit-coffee',
    targetType: 'eliminate',
    startDate: daysAgo(28),
    // legacy streak fields (unused by v2 surfaces, kept for the Reports widget)
    currentStreak: 3,
    longestStreak: 11,
    savingsGoal: 0,
    actualSavings: kept,
    milestones: [],
    logs: [],
    lastLogDate: daysAgo(1, 8, 20),
    // v2 fields
    skipValue: SKIP_VALUE,
    kept,
    totalSkips,
    highestMilestoneReached: 10,
    trackingStart: daysAgo(28),
    dayLogs,
    firstRun: false,
    backfillUsed: true,
  };
}

function buildHabits(): DetectedHabit[] {
  return [
    {
      id: 'habit-coffee',
      name: 'Morning coffee',
      description: 'Blue Bottle most mornings',
      categoryId: 'cat-food',
      merchantPattern: 'Blue Bottle',
      averageAmount: 650,
      frequency: 'daily',
      occurrencesPerPeriod: 20,
      totalMonthlySpend: 13000,
      observedTotal: 13000,
      observedCount: 20,
      spanDays: 30,
      hasReliableRate: true,
      medianAmount: 650,
      minAmount: 450,
      maxAmount: 875,
      trend: 'stable',
      trendPercentage: 2,
      triggers: [],
      status: 'changing',
      sentiment: 'bad',
      discoveredAt: daysAgo(30),
    },
    {
      id: 'habit-doordash',
      name: 'Food delivery',
      description: 'DoorDash dinners',
      categoryId: 'cat-food',
      merchantPattern: 'DoorDash',
      averageAmount: 2976,
      frequency: 'weekly',
      occurrencesPerPeriod: 4,
      totalMonthlySpend: 11900,
      observedTotal: 23800,
      observedCount: 8,
      spanDays: 56,
      hasReliableRate: true,
      medianAmount: 2850,
      minAmount: 1800,
      maxAmount: 4400,
      trend: 'increasing',
      trendPercentage: 14,
      triggers: [],
      status: 'discovered',
      sentiment: 'bad',
      discoveredAt: daysAgo(20),
    },
  ];
}

/**
 * Overwrite local storage with the sample account and reload so every provider
 * re-hydrates. Dev only. Returns before the reload takes effect.
 */
export async function seedDevData(): Promise<void> {
  if (!__DEV__) return;
  const expenses = buildExpenses();
  await Promise.all([
    saveCategories(buildCategories()),
    saveExpenses(expenses),
    saveHabits(buildHabits()),
    saveHabitGoals([buildGoal()]),
    setCurrency('USD'),
    setHasOnboarded(),
    saveOnboardingState({
      currentStep: 'success',
      hasSeenWelcome: true,
      hasSeenValueProps: true,
      hasAddedFirstExpense: true,
      completedAt: daysAgo(28),
      skippedSteps: [],
    }),
    saveProgressiveFeatureState({
      expenseCount: expenses.length,
      daysActive: 28,
      revealedFeatures: ['habits', 'reports', 'upcoming'],
      pendingReveals: [],
      firstActiveDate: daysAgo(28),
    }),
  ]);
  DevSettings.reload();
}

/** Wipe all local data and reload to the empty/onboarding state. Dev only. */
export async function clearDevData(): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.clear();
  DevSettings.reload();
}
