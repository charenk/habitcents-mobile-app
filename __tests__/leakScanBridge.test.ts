import {
  categoryDisplayLabel,
  frequencyFromMonthlyRate,
  habitCandidateToDetectedHabit,
  scanHabitId,
} from '@/utils/leakScanBridge';
import type { HabitCandidate } from '@/utils/leakScan/types';

function candidate(overrides: Partial<HabitCandidate> = {}): HabitCandidate {
  return {
    merchantStem: 'shawarma',
    merchantDisplay: 'Shawarma Spot',
    category: 'Food',
    governClass: 'govern',
    tier: 'likely',
    occurrences: 41,
    activeDays: 22,
    totalCents: 61240,
    annualizedLeakCents: 734000,
    rankScore: 734000,
    topMerchants: ['Shawarma Spot', 'Hyderabad Cafe', 'Uber Eats'],
    // Default fixture is an ordinary behavioral leak, the deck's own shape.
    isBehavioral: true,
    isSubscription: false,
    ...overrides,
  };
}

describe('categoryDisplayLabel', () => {
  // Display renames (Charen, 2026-09-04): stored values stay frozen for
  // backward compatibility, the labels moved to Home / Subscriptions (no "/"
  // in any category name).
  it('renames the stored Mortgage value to Home', () => {
    expect(categoryDisplayLabel('Mortgage')).toBe('Home');
  });

  it('renames the stored Software & Subscriptions value to Subscriptions', () => {
    expect(categoryDisplayLabel('Software & Subscriptions')).toBe('Subscriptions');
  });

  it('passes every other category through unchanged', () => {
    expect(categoryDisplayLabel('Food')).toBe('Food');
    expect(categoryDisplayLabel('Other')).toBe('Other');
  });
});

describe('frequencyFromMonthlyRate', () => {
  it('buckets a high monthly rate as daily', () => {
    expect(frequencyFromMonthlyRate(25)).toBe('daily');
    expect(frequencyFromMonthlyRate(20)).toBe('daily');
  });

  it('buckets a mid monthly rate as weekly', () => {
    expect(frequencyFromMonthlyRate(8)).toBe('weekly');
    expect(frequencyFromMonthlyRate(4)).toBe('weekly');
  });

  it('buckets a low monthly rate as monthly', () => {
    expect(frequencyFromMonthlyRate(1)).toBe('monthly');
    expect(frequencyFromMonthlyRate(3.9)).toBe('monthly');
  });
});

describe('scanHabitId', () => {
  it('is stable and derived from the merchant stem, not random', () => {
    expect(scanHabitId('shawarma')).toBe(scanHabitId('shawarma'));
    expect(scanHabitId('shawarma')).not.toBe(scanHabitId('biryaniwalla'));
  });
});

describe('habitCandidateToDetectedHabit', () => {
  it('derives a stable id keyed to the merchant stem', () => {
    const habit = habitCandidateToDetectedHabit(candidate(), 30);
    expect(habit.id).toBe(scanHabitId('shawarma'));
  });

  it('computes monthly-equivalent spend from the evidence window, not raw total', () => {
    // 61240 total over a 30-day window annualizes to exactly the monthly figure.
    const habit = habitCandidateToDetectedHabit(candidate({ totalCents: 61240 }), 30);
    expect(habit.totalMonthlySpend).toBe(61240);
  });

  it('scales monthly spend down for a shorter evidence window', () => {
    // Same total over 15 covered days -> ~2x the monthly rate.
    const habit = habitCandidateToDetectedHabit(candidate({ totalCents: 30000 }), 15);
    expect(habit.totalMonthlySpend).toBe(60000);
  });

  it('computes averageAmount as total over occurrences', () => {
    const habit = habitCandidateToDetectedHabit(candidate({ totalCents: 4100, occurrences: 41 }), 30);
    expect(habit.averageAmount).toBe(100);
  });

  it('guards against a zero-day coverage window (no divide-by-zero)', () => {
    const habit = habitCandidateToDetectedHabit(candidate(), 0);
    expect(Number.isFinite(habit.totalMonthlySpend)).toBe(true);
    expect(Number.isFinite(habit.averageAmount)).toBe(true);
  });

  it('carries the category, merchant pattern, and starts status discovered', () => {
    const habit = habitCandidateToDetectedHabit(candidate(), 30);
    expect(habit.categoryId).toBe('Food');
    expect(habit.merchantPattern).toBe('shawarma');
    expect(habit.status).toBe('discovered');
    expect(habit.sentiment).toBe('neutral');
  });

  it('names top merchants in the description', () => {
    const habit = habitCandidateToDetectedHabit(candidate(), 30);
    expect(habit.description).toContain('Shawarma Spot');
    expect(habit.description).toContain('22');
  });
});
