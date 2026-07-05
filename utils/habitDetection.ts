/**
 * Habit detection algorithm that analyzes spending patterns
 * to auto-detect user habits based on transaction history.
 */

import type { Expense } from '@/types/expense';
import type { DetectedHabit, HabitTrigger, HabitFrequency, HabitSentiment } from '@/types/habit';
import { type CurrencyCode, DEFAULT_CURRENCY, formatMoney, scaleThresholdCents } from '@/utils/currency';

type MerchantGroup = {
  merchant: string;
  categoryId: string;
  expenses: Expense[];
  totalAmount: number;
  avgAmount: number;
  frequency: HabitFrequency;
  occurrencesPerPeriod: number;
  triggers: HabitTrigger[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DETECTION_WINDOW_DAYS = 90;
const MIN_OCCURRENCES = 4;
const MIN_MONTHLY_SPEND_CENTS = 2000; // $20 minimum
const MIN_CONFIDENCE = 0.5;

/**
 * Generate unique ID
 */
function generateId(): string {
  return `habit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get expenses within the detection window
 */
function filterRecentExpenses(expenses: Expense[]): Expense[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DETECTION_WINDOW_DAYS);
  return expenses.filter(e => e.date >= cutoff);
}

/**
 * Normalize a merchant name for grouping. Returns '' when there is no merchant.
 */
function normalizeMerchant(merchant: string | undefined): string {
  return merchant ? merchant.toLowerCase().trim() : '';
}

/**
 * Group expenses by merchant. Expenses without a merchant are excluded: merchant
 * is the real behavioral signal, and grouping by the freeform title produced
 * generic false-positive habits like "New Expense Spending" (H5). Detection now
 * only fires for expenses the user tagged with a merchant.
 */
function groupByMerchant(expenses: Expense[]): Map<string, Expense[]> {
  const groups = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const key = normalizeMerchant(expense.merchant);
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(expense);
  }

  return groups;
}

type FrequencyResult = {
  frequency: HabitFrequency;
  // Occurrences per the NAMED period (per day for daily, per week for weekly,
  // per month for monthly). Display-facing: rendered as "{n}x per {period}".
  occurrencesPerPeriod: number;
  // Single canonical rate used for all money math. Deriving monthlySpend from
  // this one number (instead of a per-frequency multiply) prevents the class of
  // double-counting bug where a per-month count was multiplied by 30 again.
  monthlyOccurrences: number;
};

/**
 * Calculate frequency based on occurrence pattern.
 */
function calculateFrequency(expenses: Expense[]): FrequencyResult {
  if (expenses.length < 2) {
    return { frequency: 'monthly', occurrencesPerPeriod: 1, monthlyOccurrences: 1 };
  }

  // Sort by date
  const sorted = [...expenses].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Average gap between consecutive occurrences, in days.
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i].date.getTime() - sorted[i - 1].date.getTime();
  }
  const avgGapDays = totalGap / (sorted.length - 1) / MS_PER_DAY;

  // TRADEOFF: floor the gap at 1 day. This guards divide-by-zero from same-day
  // clusters (all expenses on one date -> avgGapDays 0 -> previously Infinity)
  // and caps the monthly rate at ~daily. The cost is that genuine multiple-times-
  // per-day habits are treated as once-daily, which under-estimates rather than
  // the far worse over-estimation of extrapolating a month from a same-day cluster.
  const effectiveGapDays = Math.max(avgGapDays, 1);
  const monthlyOccurrences = 30 / effectiveGapDays;

  if (effectiveGapDays <= 2) {
    return {
      frequency: 'daily',
      occurrencesPerPeriod: Math.max(1, Math.round(1 / effectiveGapDays)),
      monthlyOccurrences,
    };
  } else if (effectiveGapDays <= 10) {
    return {
      frequency: 'weekly',
      occurrencesPerPeriod: Math.max(1, Math.round(7 / effectiveGapDays)),
      monthlyOccurrences,
    };
  } else {
    return {
      frequency: 'monthly',
      occurrencesPerPeriod: Math.max(1, Math.round(30 / effectiveGapDays)),
      monthlyOccurrences,
    };
  }
}

/**
 * Analyze time-of-day triggers
 */
function analyzeTimeTriggers(expenses: Expense[]): HabitTrigger | null {
  const hours: number[] = [];

  for (const expense of expenses) {
    // Parse time like "9:30 AM"
    const match = expense.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let hour = parseInt(match[1], 10);
      const isPM = match[3].toUpperCase() === 'PM';
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      hours.push(hour);
    }
  }

  if (hours.length < 3) return null;

  // Calculate average and standard deviation
  const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
  const variance = hours.reduce((sum, h) => sum + Math.pow(h - avgHour, 2), 0) / hours.length;
  const stdDev = Math.sqrt(variance);

  // If standard deviation is low, there's a time pattern
  if (stdDev < 3) {
    const startHour = Math.max(0, Math.floor(avgHour - stdDev));
    const endHour = Math.min(23, Math.ceil(avgHour + stdDev));
    const confidence = Math.max(0.5, 1 - stdDev / 12);

    const formatHour = (h: number) => {
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12}:00 ${suffix}`;
    };

    return {
      type: 'time',
      description: `Usually between ${formatHour(startHour)} - ${formatHour(endHour)}`,
      confidence,
      data: {
        timeRange: { start: formatHour(startHour), end: formatHour(endHour) },
      },
    };
  }

  return null;
}

/**
 * Analyze day-of-week triggers
 */
function analyzeDayOfWeekTriggers(expenses: Expense[]): HabitTrigger | null {
  const dayCounts = new Array(7).fill(0);

  for (const expense of expenses) {
    dayCounts[expense.date.getDay()]++;
  }

  const totalExpenses = expenses.length;
  const avgPerDay = totalExpenses / 7;

  // Find days with significantly higher counts
  const significantDays: number[] = [];
  for (let i = 0; i < 7; i++) {
    if (dayCounts[i] > avgPerDay * 1.5) {
      significantDays.push(i);
    }
  }

  if (significantDays.length > 0 && significantDays.length <= 3) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const names = significantDays.map(d => dayNames[d]);
    const confidence = significantDays.reduce((sum, d) => sum + dayCounts[d], 0) / totalExpenses;

    return {
      type: 'context',
      description: `Most common on ${names.join(', ')}`,
      confidence: Math.min(0.9, confidence),
      data: {
        dayOfWeek: significantDays,
      },
    };
  }

  return null;
}

/**
 * Calculate trend compared to previous period
 */
function calculateTrend(expenses: Expense[]): { trend: 'increasing' | 'decreasing' | 'stable'; trendPercentage: number } {
  const now = new Date();
  const midpoint = new Date(now.getTime() - (DETECTION_WINDOW_DAYS / 2) * MS_PER_DAY);

  const recent = expenses.filter(e => e.date >= midpoint);
  const older = expenses.filter(e => e.date < midpoint);

  if (older.length === 0) {
    return { trend: 'stable', trendPercentage: 0 };
  }

  const recentTotal = recent.reduce((sum, e) => sum + e.amount, 0);
  const olderTotal = older.reduce((sum, e) => sum + e.amount, 0);

  // Normalize by period length
  const recentPerDay = recentTotal / (DETECTION_WINDOW_DAYS / 2);
  const olderPerDay = olderTotal / (DETECTION_WINDOW_DAYS / 2);

  if (olderPerDay === 0) {
    return { trend: 'stable', trendPercentage: 0 };
  }

  const changePercent = ((recentPerDay - olderPerDay) / olderPerDay) * 100;

  if (changePercent > 10) {
    return { trend: 'increasing', trendPercentage: Math.round(changePercent) };
  } else if (changePercent < -10) {
    return { trend: 'decreasing', trendPercentage: Math.round(Math.abs(changePercent)) };
  } else {
    return { trend: 'stable', trendPercentage: Math.round(Math.abs(changePercent)) };
  }
}

/**
 * Determine sentiment based on category and trend
 */
function determineSentiment(
  categoryId: string,
  monthlySpend: number,
  trend: 'increasing' | 'decreasing' | 'stable',
  bigLeakCents: number
): HabitSentiment {
  // Essential categories are generally neutral
  const essentialCategories = ['mortgage', 'utilities', 'healthcare', 'transportation'];
  if (essentialCategories.some(c => categoryId.toLowerCase().includes(c))) {
    return 'neutral';
  }

  // High discretionary spending that's increasing is potentially bad
  if (monthlySpend > bigLeakCents && trend === 'increasing') {
    return 'bad';
  }

  // Decreasing trend in discretionary categories is good
  if (trend === 'decreasing') {
    return 'good';
  }

  return 'neutral';
}

/**
 * Create habit name from merchant/title
 */
function createHabitName(merchant: string): string {
  // Capitalize first letter of each word
  return merchant
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Progress toward the first detection (P2-4, spec 05 section 5.2). Used by
 * the Habits tab pre-detection empty state ("Spotting your leak, n of 4
 * logs") so the copy is never a fabricated number: n is the largest
 * same-merchant group within the same detection window detectHabits() itself
 * uses, capped at the detection threshold since the UI never needs to show
 * more than "enough".
 */
export function progressTowardDetection(expenses: Expense[]): { n: number; threshold: number } {
  const recentExpenses = filterRecentExpenses(expenses);
  const merchantGroups = groupByMerchant(recentExpenses);
  let maxGroupSize = 0;
  for (const groupExpenses of merchantGroups.values()) {
    if (groupExpenses.length > maxGroupSize) maxGroupSize = groupExpenses.length;
  }
  return { n: Math.min(maxGroupSize, MIN_OCCURRENCES), threshold: MIN_OCCURRENCES };
}

/**
 * Main habit detection function
 */
export function detectHabits(
  expenses: Expense[],
  currency: CurrencyCode = DEFAULT_CURRENCY
): DetectedHabit[] {
  // Thresholds are authored in USD cents; scale them to the active currency so
  // detection stays meaningful in high-magnitude currencies (e.g. JPY).
  const minMonthlySpend = scaleThresholdCents(MIN_MONTHLY_SPEND_CENTS, currency);
  const bigLeakCents = scaleThresholdCents(10000, currency);

  // Step 1: Filter to recent expenses
  const recentExpenses = filterRecentExpenses(expenses);

  if (recentExpenses.length < MIN_OCCURRENCES) {
    return [];
  }

  // Step 2: Group by merchant pattern
  const merchantGroups = groupByMerchant(recentExpenses);

  // Step 3: Analyze each group
  const habits: DetectedHabit[] = [];

  for (const [merchant, groupExpenses] of merchantGroups) {
    // Skip groups with too few occurrences
    if (groupExpenses.length < MIN_OCCURRENCES) {
      continue;
    }

    // Calculate metrics
    const totalAmount = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
    const avgAmount = Math.round(totalAmount / groupExpenses.length);
    const { frequency, occurrencesPerPeriod, monthlyOccurrences } = calculateFrequency(groupExpenses);

    // Normalize to monthly spend from the single canonical rate.
    const monthlySpend = Math.round(avgAmount * monthlyOccurrences);

    // Skip low-value habits
    if (monthlySpend < minMonthlySpend) {
      continue;
    }

    // Analyze triggers
    const triggers: HabitTrigger[] = [];
    const timeTrigger = analyzeTimeTriggers(groupExpenses);
    if (timeTrigger) triggers.push(timeTrigger);
    const dayTrigger = analyzeDayOfWeekTriggers(groupExpenses);
    if (dayTrigger) triggers.push(dayTrigger);

    // Calculate overall confidence
    const occurrenceConfidence = Math.min(1, groupExpenses.length / 10);
    const triggerConfidence = triggers.length > 0
      ? triggers.reduce((sum, t) => sum + t.confidence, 0) / triggers.length
      : 0.5;
    const overallConfidence = (occurrenceConfidence + triggerConfidence) / 2;

    // Skip low confidence habits
    if (overallConfidence < MIN_CONFIDENCE) {
      continue;
    }

    // Calculate trend
    const { trend, trendPercentage } = calculateTrend(groupExpenses);

    // Determine sentiment
    const categoryId = groupExpenses[0].categoryId || groupExpenses[0].category;
    const sentiment = determineSentiment(categoryId, monthlySpend, trend, bigLeakCents);

    // Format monthly spend for description in the active currency
    const monthlySpendLabel = formatMoney(monthlySpend, currency, { compact: true });
    const habitName = createHabitName(merchant);

    habits.push({
      id: generateId(),
      name: `${habitName} Spending`,
      description: `You spend ~${monthlySpendLabel}/month on ${habitName.toLowerCase()}`,
      categoryId,
      merchantPattern: merchant,
      averageAmount: avgAmount,
      frequency,
      occurrencesPerPeriod,
      totalMonthlySpend: monthlySpend,
      trend,
      trendPercentage,
      triggers,
      status: 'discovered',
      sentiment,
      discoveredAt: new Date(),
    });
  }

  // Sort by monthly spend (highest first)
  habits.sort((a, b) => b.totalMonthlySpend - a.totalMonthlySpend);

  return habits;
}

/**
 * Check if a habit already exists for a merchant pattern
 */
export function findExistingHabit(
  habits: DetectedHabit[],
  merchantPattern: string
): DetectedHabit | undefined {
  const normalized = merchantPattern.toLowerCase().trim();
  return habits.find(h => h.merchantPattern?.toLowerCase() === normalized);
}

/**
 * Merge newly detected habits with existing ones
 */
export function mergeHabits(
  existing: DetectedHabit[],
  detected: DetectedHabit[]
): DetectedHabit[] {
  const result = [...existing];

  for (const habit of detected) {
    const existingHabit = findExistingHabit(result, habit.merchantPattern || '');

    if (!existingHabit) {
      // New habit
      result.push(habit);
    } else if (existingHabit.status === 'discovered' && !existingHabit.dismissedAt) {
      // Update existing discovered habit with new data
      const index = result.indexOf(existingHabit);
      result[index] = {
        ...existingHabit,
        averageAmount: habit.averageAmount,
        occurrencesPerPeriod: habit.occurrencesPerPeriod,
        totalMonthlySpend: habit.totalMonthlySpend,
        trend: habit.trend,
        trendPercentage: habit.trendPercentage,
        triggers: habit.triggers,
        description: habit.description,
      };
    }
    // Don't update habits that are being tracked/changed
  }

  return result;
}
