import { detectHabits } from '@/utils/habitDetection';
import type { Expense } from '@/types/expense';

/**
 * Build an expense. amount is in cents. daysAgo places it relative to now so it
 * falls inside the 90-day detection window.
 */
function makeExpense(
  merchant: string,
  amountCents: number,
  daysAgo: number,
  time = '9:00 AM'
): Expense {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `${merchant}-${daysAgo}`,
    title: merchant,
    amount: amountCents,
    amountDisplay: `-$${(amountCents / 100).toFixed(2)}`,
    category: 'Food',
    categoryId: 'food',
    merchant,
    date,
    time,
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
  };
}

/** A run of expenses every `gapDays` apart, `count` of them, ending near today. */
function series(merchant: string, amountCents: number, gapDays: number, count: number): Expense[] {
  return Array.from({ length: count }, (_, i) =>
    makeExpense(merchant, amountCents, Math.round((count - 1 - i) * gapDays))
  );
}

function dollars(cents: number): number {
  return cents / 100;
}

describe('detectHabits monthly spend math', () => {
  it('reports a $5/day coffee habit as ~$150/month, not 30x that', () => {
    // 40 daily $5 coffees over the window.
    const habits = detectHabits(series('Coffee', 500, 1, 40));
    expect(habits).toHaveLength(1);
    const spend = dollars(habits[0].totalMonthlySpend);
    // ~$150; the old bug produced ~$4,500.
    expect(spend).toBeGreaterThan(140);
    expect(spend).toBeLessThan(160);
    expect(habits[0].frequency).toBe('daily');
    expect(habits[0].occurrencesPerPeriod).toBe(1); // 1x per day, not 30x
  });

  it('reports a ~$20/week habit at roughly $80-90/month', () => {
    const habits = detectHabits(series('Takeout', 2000, 7, 10));
    expect(habits).toHaveLength(1);
    const spend = dollars(habits[0].totalMonthlySpend);
    expect(spend).toBeGreaterThan(75);
    expect(spend).toBeLessThan(95);
    expect(habits[0].frequency).toBe('weekly');
  });

  it('reports a ~$50/month habit at about $50/month', () => {
    const habits = detectHabits(series('Streaming', 5000, 30, 4));
    expect(habits).toHaveLength(1);
    const spend = dollars(habits[0].totalMonthlySpend);
    expect(spend).toBeGreaterThan(40);
    expect(spend).toBeLessThan(60);
    expect(habits[0].frequency).toBe('monthly');
  });

  it('handles same-day clustered expenses without Infinity/NaN (divide-by-zero guard)', () => {
    // 5 expenses all on the same day: avg gap is 0.
    const habits = detectHabits(series('Bar', 1000, 0, 5));
    // May or may not surface as a habit, but must never crash or produce a
    // non-finite / absurd number.
    for (const h of habits) {
      expect(Number.isFinite(h.totalMonthlySpend)).toBe(true);
      expect(h.totalMonthlySpend).toBeGreaterThan(0);
      // Bounded: at most avg amount times the daily-rate cap (~30/month).
      expect(h.totalMonthlySpend).toBeLessThanOrEqual(1000 * 31);
    }
  });

  it('returns nothing below the minimum-occurrence threshold', () => {
    expect(detectHabits(series('Rare', 5000, 5, 3))).toHaveLength(0);
  });

  it('ignores expenses older than the 90-day window', () => {
    const old = series('Old', 500, 1, 40).map((e) => {
      e.date.setDate(e.date.getDate() - 200);
      return e;
    });
    expect(detectHabits(old)).toHaveLength(0);
  });
});
