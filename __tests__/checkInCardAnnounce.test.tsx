/**
 * CheckInCard announce-once regression tests (UX-011,
 * components/habit-logging/CheckInCard.tsx).
 *
 * The check-in confirmation speaks to VoiceOver/TalkBack via
 * AccessibilityInfo.announceForAccessibility. Two bugs were found in review
 * and fixed, neither with test coverage until now:
 *
 *   1. Cross-instance dedupe. The same goal's CheckInCard can be mounted
 *      twice at once (Today stays mounted under a habit-detail push), and
 *      both instances observe the same answer change. Without the
 *      module-level `lastAnnouncedAnswerByGoal` guard (see the comment above
 *      it in the source), both instances would call announceForAccessibility
 *      for one answer: an interrupted utterance on iOS, a doubled queue on
 *      TalkBack.
 *   2. Event-token dedupe, not headline-text dedupe. A weekly/monthly habit
 *      allows several skips in one period, and every repeat after the first
 *      resolves to the identical headline string ("+$5.00 kept."). The
 *      original code deduped on that headline text, so it went silent after
 *      the first repeat. The fix dedupes on `answerToken`
 *      (`dayLogs.length:totalSkips:kept`), which moves on every real answer
 *      even when the spoken string does not.
 *
 * Module-map isolation: `lastAnnouncedAnswerByGoal` is keyed by goal.id and
 * lives at module scope for the lifetime of this test file, which is the
 * point of guarantee 1 (it is how two sibling instances agree). To keep
 * tests independent under any run order, every test below uses its own
 * goal id, so no test can read or clobber another test's entry in that map.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { formatMoney } from '@/utils/currency';
import { strings } from '@/constants/strings';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';

function makeHabit(overrides: Partial<DetectedHabit> = {}): DetectedHabit {
  return {
    id: 'h1',
    name: 'Coffee runs',
    description: 'Weekday coffee habit',
    categoryId: 'food',
    averageAmount: 600,
    frequency: 'daily',
    occurrencesPerPeriod: 5,
    totalMonthlySpend: 12000,
    observedTotal: 12000,
    observedCount: 20,
    spanDays: 30,
    hasReliableRate: true,
    medianAmount: 600,
    minAmount: 400,
    maxAmount: 900,
    trend: 'stable',
    trendPercentage: 0,
    triggers: [],
    status: 'changing',
    sentiment: 'neutral',
    discoveredAt: new Date('2026-07-01T12:00:00Z'),
    ...overrides,
  };
}

function makeGoal(overrides: Partial<HabitChangeGoal> = {}): HabitChangeGoal {
  return {
    id: 'g1',
    habitId: 'h1',
    targetType: 'eliminate',
    startDate: new Date('2026-07-10T12:00:00Z'),
    currentStreak: 0,
    longestStreak: 0,
    savingsGoal: 0,
    actualSavings: 0,
    milestones: [],
    logs: [],
    skipValue: 500,
    kept: 0,
    totalSkips: 0,
    highestMilestoneReached: 0,
    trackingStart: new Date('2026-07-10T12:00:00Z'),
    dayLogs: [],
    firstRun: true,
    backfillUsed: false,
    ...overrides,
  };
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}

const noop = () => {};

// A tracking start comfortably in the past so trackingStart/backfill logic
// never fights the fixtures below.
const PAST = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

const cardProps = {
  milestoneJustHit: null,
  onSkip: noop,
  onSlip: noop,
  onChangeAnswer: noop,
  onBackfill: noop,
  onOpenPartial: noop,
};

afterEach(() => {
  // AccessibilityInfo.announceForAccessibility is already a jest.fn() from
  // react-native's own jest preset (node_modules/react-native/jest/mocks/
  // AccessibilityInfo.js), not a plain method. jest.spyOn on an
  // already-mocked function returns that SAME mock rather than wrapping it,
  // so jest.restoreAllMocks() has no distinct original to restore to and
  // leaves its call history intact. mockClear() is what actually resets it;
  // without this, one test's announce call bleeds into the next test's
  // count via the shared underlying mock.
  (AccessibilityInfo.announceForAccessibility as jest.Mock).mockClear();
  cleanup();
});

describe('CheckInCard announce-once guarantees (UX-011)', () => {
  it('announces once when the same goal is mounted twice', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    // Unique goal id: isolates this test's module-map entry from every other
    // test in this file (see file header).
    const habit = makeHabit({ id: 'h-mount-twice', frequency: 'daily' });

    // Today keeps its CheckInCard mounted while habit detail pushes a second
    // one for the same goal (stack push, not a replace). Both instances
    // receive the same goal prop on every render.
    function TwoCards({ goal }: { goal: HabitChangeGoal }) {
      return (
        <Providers>
          <CheckInCard habit={habit} goal={goal} {...cardProps} />
          <CheckInCard habit={habit} goal={goal} {...cardProps} />
        </Providers>
      );
    }

    const unanswered = makeGoal({ id: 'g-mount-twice', habitId: habit.id, trackingStart: PAST });
    const view = await render(<TwoCards goal={unanswered} />);
    // Mounting unanswered is not an answer event either way; sanity check
    // before the real assertion below.
    expect(spy).not.toHaveBeenCalled();

    const answered = makeGoal({
      id: 'g-mount-twice',
      habitId: habit.id,
      trackingStart: PAST,
      dayLogs: [{ date: new Date(), state: 'skipped' }],
      totalSkips: 1,
      kept: 500,
    });
    await view.rerender(<TwoCards goal={answered} />);

    // Both mounted instances observed the identical answer event. This is
    // the assertion that catches bug 1: without the cross-instance
    // lastAnnouncedAnswerByGoal guard, each instance's own per-render refs
    // would independently see "not first render, token changed, headline
    // present" and both would call announceForAccessibility, making this 2.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(strings.habitLogging.skipConfirmationFirstEver(formatMoney(500)));
  });

  it('announces again on a second same-headline skip on a weekly goal', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const habit = makeHabit({ id: 'h-weekly-repeat', frequency: 'weekly' });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // The goal already carries one skip from earlier in the period, so the
    // upcoming skip below is NOT firstEver: firstEver copy
    // ("skipConfirmationFirstEver") differs from the repeat-skip headline
    // ("+$5.00 kept."), and it is the repeat headline this test needs
    // identical across two announces.
    const base = makeGoal({
      id: 'g-weekly-repeat',
      habitId: habit.id,
      trackingStart: PAST,
      dayLogs: [{ date: yesterday, state: 'skipped' }],
      totalSkips: 1,
      kept: 500,
    });

    function OneCard({ goal }: { goal: HabitChangeGoal }) {
      return (
        <Providers>
          <CheckInCard habit={habit} goal={goal} {...cardProps} />
        </Providers>
      );
    }

    const view = await render(<OneCard goal={base} />);
    expect(spy).not.toHaveBeenCalled();

    const expectedRepeatHeadline = strings.today.keptAdded(formatMoney(500));

    const secondSkip = makeGoal({
      ...base,
      dayLogs: [...base.dayLogs, { date: new Date(), state: 'skipped' }],
      totalSkips: 2,
      kept: 1000,
    });
    await view.rerender(<OneCard goal={secondSkip} />);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenNthCalledWith(1, expectedRepeatHeadline);

    const thirdSkip = makeGoal({
      ...base,
      dayLogs: [...secondSkip.dayLogs, { date: new Date(), state: 'skipped' }],
      totalSkips: 3,
      kept: 1500,
    });
    await view.rerender(<OneCard goal={thirdSkip} />);

    // This is the assertion that catches bug 2: the third skip's headline is
    // byte-identical to the second skip's ("+$5.00 kept." both times). Code
    // that deduped on headline text would swallow this announce; deduping on
    // the answer-event token still fires it, so the count below must be 2,
    // not 1.
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(2, expectedRepeatHeadline);
  });

  it('does not announce when mounting a goal that is already answered', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const habit = makeHabit({ id: 'h-already-answered', frequency: 'daily' });
    const alreadyAnswered = makeGoal({
      id: 'g-already-answered',
      habitId: habit.id,
      trackingStart: PAST,
      dayLogs: [{ date: new Date(), state: 'skipped' }],
      totalSkips: 1,
      kept: 500,
    });

    await render(
      <Providers>
        <CheckInCard habit={habit} goal={alreadyAnswered} {...cardProps} />
      </Providers>
    );

    // Returning to an already-answered card (e.g. navigating back to Today)
    // must stay silent: the wasFirstRender guard should suppress this,
    // never announcing an answer the user already heard confirmed earlier.
    expect(spy).not.toHaveBeenCalled();
  });
});
