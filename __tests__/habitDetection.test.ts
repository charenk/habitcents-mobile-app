import {
  detectHabits,
  medianCents,
  progressTowardDetection,
  MIN_SPAN_DAYS_FOR_RATE,
} from '@/utils/habitDetection';
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
  // The detection cutoff is computed a few ms AFTER this date, so a series
  // ending exactly 90 days back sits ms-outside the window and drops below
  // MIN_OCCURRENCES under CI load. Five minutes of margin keeps the docstring
  // true on any machine.
  date.setMinutes(date.getMinutes() + 5);
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
    // non-finite number.
    for (const h of habits) {
      expect(Number.isFinite(h.totalMonthlySpend)).toBe(true);
      expect(h.totalMonthlySpend).toBeGreaterThan(0);
    }
  });
});

/**
 * Observation vs projection (device feedback 2026-08-04).
 *
 * The predecessor of this block asserted only that a same-day cluster stayed
 * finite and under avg * 31, which certified the bug: Charen logged 5 Pizzahut
 * buys within minutes and the app answered "costs you about $522.00 a month,
 * you bought it 1 times in the last 30 days". A monthly rate is a claim about a
 * month, and one afternoon cannot support it.
 */
describe('observed evidence vs monthly projection', () => {
  /** Charen's real set: $22, $12, $4, $5, $44 at one merchant, minutes apart. */
  function pizzahutCluster() {
    return [2200, 1200, 400, 500, 4400].map((cents) => makeExpense('Pizzahut', cents, 0));
  }

  it('counts every buy in a same-day cluster and refuses to state a monthly rate', () => {
    const habits = detectHabits(pizzahutCluster());
    expect(habits).toHaveLength(1);
    const habit = habits[0];

    // The real count, not occurrencesPerPeriod (which is a per-day rate of 1).
    expect(habit.observedCount).toBe(5);
    expect(habit.observedTotal).toBe(8700);
    expect(habit.spanDays).toBe(0);
    // No monthly projection is presentable: 5 logs, 0 days of span.
    expect(habit.hasReliableRate).toBe(false);
  });

  it('keeps the leak detectable, so the 4-log promise still holds', () => {
    // The fix is about what we claim, not about hiding the leak.
    expect(detectHabits(pizzahutCluster())).toHaveLength(1);
  });

  it('presents observation, never the ~30x extrapolation of one afternoon', () => {
    const habit = detectHabits(pizzahutCluster())[0];
    // What the sheet and the leak card show while hasReliableRate is false.
    expect(habit.observedTotal).toBe(8700);
    expect(habit.description).toContain('across 5 buys');
    expect(habit.description).not.toContain('/month');
  });

  it('starts presenting a monthly rate once the span reaches the threshold', () => {
    // Same 5 buys, spread across 20 days instead of one afternoon.
    const spread = detectHabits(series('Pizzahut', 1740, 5, 5));
    expect(spread).toHaveLength(1);
    expect(spread[0].spanDays).toBeGreaterThanOrEqual(MIN_SPAN_DAYS_FOR_RATE);
    expect(spread[0].hasReliableRate).toBe(true);
    expect(spread[0].observedCount).toBe(5);
  });

  it('reports the buy range so the prefilled skip value can be explained', () => {
    const habit = detectHabits(pizzahutCluster())[0];
    expect(habit.minAmount).toBe(400);
    expect(habit.maxAmount).toBe(4400);
    // Median, not the $17.40 average one big order pulls it up to.
    expect(habit.medianAmount).toBe(1200);
  });
});

describe('medianCents', () => {
  it('returns the middle value for an odd count', () => {
    expect(medianCents([300, 100, 200])).toBe(200);
  });

  it('averages the middle pair for an even count', () => {
    expect(medianCents([100, 200, 300, 400])).toBe(250);
  });

  it('rounds a half-cent middle pair to whole cents', () => {
    expect(medianCents([100, 201])).toBe(151);
  });

  it('ignores an outlier the way an average cannot', () => {
    // Charen's set. Average is 1740; the buy he actually makes is 1200.
    expect(medianCents([2200, 1200, 400, 500, 4400])).toBe(1200);
  });

  it('returns 0 for an empty list', () => {
    expect(medianCents([])).toBe(0);
  });

  it('does not mutate the caller list', () => {
    const values = [300, 100, 200];
    medianCents(values);
    expect(values).toEqual([300, 100, 200]);
  });
});

describe('detectHabits guards', () => {

  it('returns nothing below the minimum-occurrence threshold', () => {
    expect(detectHabits(series('Rare', 5000, 5, 3))).toHaveLength(0);
  });

  it('does not fabricate a habit from expenses that have no merchant (H5)', () => {
    // Five daily expenses with no merchant set: previously these grouped by the
    // default title into a bogus habit. Now they are ignored by detection.
    const noMerchant = series('X', 500, 1, 6).map((e) => {
      e.merchant = undefined;
      e.title = 'New expense';
      return e;
    });
    expect(detectHabits(noMerchant)).toHaveLength(0);
  });

  it('ignores expenses older than the 90-day window', () => {
    const old = series('Old', 500, 1, 40).map((e) => {
      e.date.setDate(e.date.getDate() - 200);
      return e;
    });
    expect(detectHabits(old)).toHaveLength(0);
  });
});

describe('progressTowardDetection', () => {
  it('reports 0 of 4 with no expenses', () => {
    expect(progressTowardDetection([])).toEqual({ n: 0, threshold: 4 });
  });

  it('reports the largest same-merchant group size below the threshold', () => {
    const twoLogs = series('Coffee', 500, 1, 2);
    expect(progressTowardDetection(twoLogs)).toEqual({ n: 2, threshold: 4 });
  });

  it('caps n at the threshold once detection would already fire', () => {
    const habits = detectHabits(series('Coffee', 500, 1, 40));
    expect(habits).toHaveLength(1); // detection did fire
    expect(progressTowardDetection(series('Coffee', 500, 1, 40))).toEqual({ n: 4, threshold: 4 });
  });

  it('ignores expenses with no merchant, matching detectHabits (H5)', () => {
    const noMerchant = series('X', 500, 1, 3).map((e) => {
      e.merchant = undefined;
      return e;
    });
    expect(progressTowardDetection(noMerchant)).toEqual({ n: 0, threshold: 4 });
  });

  it('takes the max across merchants, not a sum', () => {
    const a = series('Coffee', 500, 1, 3);
    const b = series('Snacks', 300, 1, 1);
    expect(progressTowardDetection([...a, ...b])).toEqual({ n: 3, threshold: 4 });
  });
});
