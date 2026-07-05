import {
  addDays,
  arcProgress,
  atMidnight,
  canBackfillYesterday,
  chapterForTotal,
  countTotalSkips,
  dayStateFor,
  displayChapter,
  identityLineForTotal,
  isSameDay,
  milestoneCrossed,
  partialSlipCredit,
  slipFollowsStreak,
  startOfWeek,
  weekStats,
  weekStrip,
} from '@/utils/habitLogging';
import type { HabitLogEntry } from '@/types/habit';

// A fixed Wednesday so week-boundary tests are deterministic.
// 2026-07-01 is a Wednesday.
const WED = new Date('2026-07-01T09:00:00');
const MON_OF_WEEK = new Date('2026-06-29T00:00:00');
const SUN_OF_WEEK = new Date('2026-07-05T00:00:00');

function entry(dateStr: string, state: 'skipped' | 'slipped', extra: Partial<HabitLogEntry> = {}): HabitLogEntry {
  return { date: new Date(dateStr), state, ...extra };
}

describe('day/week primitives', () => {
  it('isSameDay ignores time of day', () => {
    expect(isSameDay(new Date('2026-07-01T00:00:00'), new Date('2026-07-01T23:59:00'))).toBe(true);
    expect(isSameDay(new Date('2026-07-01T00:00:00'), new Date('2026-07-02T00:00:00'))).toBe(false);
  });

  it('addDays adds calendar days at midnight', () => {
    const d = addDays(new Date('2026-07-01T15:00:00'), 2);
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(3);
  });

  it('startOfWeek returns the Monday for any day in the week (Mon to Sun)', () => {
    expect(isSameDay(startOfWeek(WED), MON_OF_WEEK)).toBe(true);
    expect(isSameDay(startOfWeek(MON_OF_WEEK), MON_OF_WEEK)).toBe(true);
    expect(isSameDay(startOfWeek(SUN_OF_WEEK), MON_OF_WEEK)).toBe(true);
  });
});

describe('dayStateFor', () => {
  it('returns no-log when there is no entry for the day', () => {
    expect(dayStateFor([], WED)).toBe('no-log');
  });

  it('returns skipped for a skip entry', () => {
    const logs = [entry('2026-07-01T10:00:00', 'skipped')];
    expect(dayStateFor(logs, WED)).toBe('skipped');
  });

  it('returns slipped for a slip entry, distinct from no-log (acceptance test 7)', () => {
    const logs = [entry('2026-07-01T10:00:00', 'slipped')];
    const state = dayStateFor(logs, WED);
    expect(state).toBe('slipped');
    expect(state).not.toBe('no-log');
  });
});

describe('weekStrip', () => {
  const trackingStart = new Date('2026-06-01T00:00:00');

  it('produces 7 Mon-Sun cells', () => {
    const cells = weekStrip([], WED, trackingStart);
    expect(cells).toHaveLength(7);
    expect(isSameDay(cells[0].date, MON_OF_WEEK)).toBe(true);
    expect(isSameDay(cells[6].date, SUN_OF_WEEK)).toBe(true);
  });

  it('marks days after today as future, not answerable', () => {
    const cells = weekStrip([], WED, trackingStart);
    // WED is index 2 (Mon=0). Thu/Fri/Sat/Sun (indices 3-6) are future.
    expect(cells[2].isToday).toBe(true);
    expect(cells[3].isFuture).toBe(true);
    expect(cells[3].state).toBe('no-log');
  });

  it('marks days before tracking start as out of range', () => {
    const lateStart = new Date('2026-07-01T00:00:00'); // starts today (Wed)
    const cells = weekStrip([], WED, lateStart);
    expect(cells[0].isOutOfRange).toBe(true); // Monday, before start
    expect(cells[2].isOutOfRange).toBe(false); // today
  });

  it('reflects real log entries for past days in the week', () => {
    const logs = [entry('2026-06-29T08:00:00', 'skipped'), entry('2026-06-30T08:00:00', 'slipped')];
    const cells = weekStrip(logs, WED, trackingStart);
    expect(cells[0].state).toBe('skipped'); // Monday
    expect(cells[1].state).toBe('slipped'); // Tuesday
  });
});

describe('weekStats', () => {
  const trackingStart = new Date('2026-06-01T00:00:00');
  const skipValue = 600;

  it('counts skips, answered days, and week-kept', () => {
    const logs = [
      entry('2026-06-29T08:00:00', 'skipped'),
      entry('2026-06-30T08:00:00', 'slipped'),
      entry('2026-07-01T08:00:00', 'skipped'), // today, Wed
    ];
    const stats = weekStats(logs, WED, trackingStart, skipValue);
    expect(stats.skips).toBe(2);
    expect(stats.answered).toBe(3);
    expect(stats.weekKept).toBe(1200);
  });

  it('is zero when the week has no answers yet', () => {
    const stats = weekStats([], WED, trackingStart, skipValue);
    expect(stats.skips).toBe(0);
    expect(stats.answered).toBe(0);
    expect(stats.weekKept).toBe(0);
  });

  it('resets at the week boundary: prior week entries do not leak in', () => {
    const logs = [entry('2026-06-22T08:00:00', 'skipped')]; // Monday, prior week
    const stats = weekStats(logs, WED, trackingStart, skipValue);
    expect(stats.answered).toBe(0);
  });
});

describe('countTotalSkips and chapters', () => {
  it('counts only skipped entries, not slips', () => {
    const logs = [entry('2026-06-01', 'skipped'), entry('2026-06-02', 'slipped'), entry('2026-06-03', 'skipped')];
    expect(countTotalSkips(logs)).toBe(2);
  });

  it.each([
    [0, 'Deciding'],
    [9, 'Deciding'],
    [10, 'Rhythm'],
    [29, 'Rhythm'],
    [30, 'Cruising'],
    [49, 'Cruising'],
    [50, 'Rewiring'],
    [65, 'Rewiring'],
    [66, 'Rewired'],
    [100, 'Rewired'],
  ])('chapterForTotal(%i) === %s', (total, chapter) => {
    expect(chapterForTotal(total)).toBe(chapter);
  });

  it('identityLineForTotal never mentions streak/success/completed language', () => {
    for (const n of [0, 10, 30, 50, 66]) {
      const line = identityLineForTotal(n);
      expect(line.toLowerCase()).not.toMatch(/streak|success|completed/);
    }
  });

  it('displayChapter never moves backward after a same-day correction', () => {
    // User reached 30 (Cruising), then corrected today's skip to a slip,
    // dropping totalSkips to 29. The displayed chapter must stay Cruising.
    expect(displayChapter(29, 30)).toBe('Cruising');
    expect(displayChapter(30, 30)).toBe('Cruising');
  });

  it('arcProgress caps at 1 beyond 66 and is proportional below it', () => {
    expect(arcProgress(0)).toBe(0);
    expect(arcProgress(33)).toBeCloseTo(0.5, 2);
    expect(arcProgress(66)).toBe(1);
    expect(arcProgress(100)).toBe(1);
  });
});

describe('milestoneCrossed', () => {
  it.each([
    [9, 10, 10],
    [29, 30, 30],
    [49, 50, 50],
    [65, 66, 66],
  ])('fires when crossing from %i to %i', (before, after, expected) => {
    expect(milestoneCrossed(before, after)).toBe(expected);
  });

  it('does not fire when not crossing a threshold', () => {
    expect(milestoneCrossed(11, 12)).toBeNull();
    expect(milestoneCrossed(5, 9)).toBeNull();
  });

  it('does not re-fire when already past the threshold (fires once per threshold)', () => {
    expect(milestoneCrossed(10, 11)).toBeNull();
    expect(milestoneCrossed(30, 35)).toBeNull();
  });

  it('fires only the lowest newly crossed threshold on a big jump (backfill edge case)', () => {
    expect(milestoneCrossed(5, 30)).toBe(10);
  });
});

describe('canBackfillYesterday', () => {
  const trackingStart = new Date('2026-06-01T00:00:00');

  it('is eligible when yesterday has no log and backfill unused', () => {
    expect(canBackfillYesterday([], WED, trackingStart, false)).toBe(true);
  });

  it('is not eligible once backfill has been used', () => {
    expect(canBackfillYesterday([], WED, trackingStart, true)).toBe(false);
  });

  it('is not eligible when yesterday already has an answer', () => {
    const logs = [entry('2026-06-30T08:00:00', 'skipped')];
    expect(canBackfillYesterday(logs, WED, trackingStart, false)).toBe(false);
  });

  it('is not eligible when yesterday is before tracking started', () => {
    const startsToday = new Date('2026-07-01T00:00:00');
    expect(canBackfillYesterday([], WED, startsToday, false)).toBe(false);
  });
});

describe('partialSlipCredit', () => {
  it('credits the difference when spend is under the usual amount', () => {
    expect(partialSlipCredit(600, 200)).toBe(400);
  });

  it('never credits negative when spend is at or above the usual amount', () => {
    expect(partialSlipCredit(600, 600)).toBe(0);
    expect(partialSlipCredit(600, 900)).toBe(0);
  });
});

describe('slipFollowsStreak', () => {
  it('is true when a slip follows 3+ consecutive skips', () => {
    const logs = [
      entry('2026-06-28T08:00:00', 'skipped'),
      entry('2026-06-29T08:00:00', 'skipped'),
      entry('2026-06-30T08:00:00', 'skipped'),
    ];
    // Slip lands on 2026-07-01 (not yet in logs); check the days before it.
    expect(slipFollowsStreak(logs, new Date('2026-07-01T08:00:00'))).toBe(true);
  });

  it('is false when fewer than 3 consecutive skips precede it', () => {
    const logs = [entry('2026-06-30T08:00:00', 'skipped')];
    expect(slipFollowsStreak(logs, new Date('2026-07-01T08:00:00'))).toBe(false);
  });

  it('is false when the immediately preceding day was itself a slip', () => {
    const logs = [
      entry('2026-06-28T08:00:00', 'skipped'),
      entry('2026-06-29T08:00:00', 'skipped'),
      entry('2026-06-30T08:00:00', 'slipped'),
    ];
    expect(slipFollowsStreak(logs, new Date('2026-07-01T08:00:00'))).toBe(false);
  });
});

describe('atMidnight', () => {
  it('zeroes out time components', () => {
    const d = atMidnight(new Date('2026-07-01T23:45:12'));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });
});
