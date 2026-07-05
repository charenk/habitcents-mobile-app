import {
  cardText,
  createInitialCoachMomentState,
  isMilestoneCard,
  selectBrokenStreakMoment,
  selectCheckInMoment,
  selectDetectionMoment,
  selectFirstLogMoment,
  selectMilestoneMoment,
  selectSkipMoment,
  type CoachMomentState,
} from '@/utils/coachMoments';

describe('createInitialCoachMomentState', () => {
  it('starts with nothing shown and rotation at zero', () => {
    const state = createInitialCoachMomentState();
    expect(state.firstLogShown).toBe(false);
    expect(state.detectionShown).toBe(false);
    expect(state.firstSkipShown).toBe(false);
    expect(state.skipRotationIndex).toBe(0);
    expect(state.brokenStreakRotationIndex).toBe(0);
    expect(state.milestonesShownByGoal).toEqual({});
  });
});

describe('selectFirstLogMoment (FL-1, once ever)', () => {
  it('fires FL-1 the first time', () => {
    const state = createInitialCoachMomentState();
    const selection = selectFirstLogMoment(state);
    expect(selection).not.toBeNull();
    expect(selection?.result).toEqual({ trigger: 'first_log', cardId: 'FL-1' });
    expect(selection?.nextState.firstLogShown).toBe(true);
  });

  it('never fires again once shown', () => {
    const shown: CoachMomentState = { ...createInitialCoachMomentState(), firstLogShown: true };
    expect(selectFirstLogMoment(shown)).toBeNull();
  });
});

describe('selectDetectionMoment (DT-1, once ever)', () => {
  it('fires DT-1 the first time', () => {
    const state = createInitialCoachMomentState();
    const selection = selectDetectionMoment(state);
    expect(selection?.result).toEqual({ trigger: 'detection', cardId: 'DT-1' });
    expect(selection?.nextState.detectionShown).toBe(true);
  });

  it('never fires again once shown', () => {
    const shown: CoachMomentState = { ...createInitialCoachMomentState(), detectionShown: true };
    expect(selectDetectionMoment(shown)).toBeNull();
  });
});

describe('selectSkipMoment (SK-0 first-ever, then rotate SK-1..SK-6)', () => {
  it('uses SK-0 for the very first skip ever', () => {
    const state = createInitialCoachMomentState();
    const selection = selectSkipMoment(state);
    expect(selection.result).toEqual({ trigger: 'skip', cardId: 'SK-0' });
    expect(selection.nextState.firstSkipShown).toBe(true);
  });

  it('rotates SK-1..SK-6 in order after the first-ever skip, with no repeat until the pool exhausts', () => {
    let state: CoachMomentState = { ...createInitialCoachMomentState(), firstSkipShown: true };
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      const selection = selectSkipMoment(state);
      seen.push(selection.result.cardId);
      state = selection.nextState;
    }
    expect(seen).toEqual(['SK-1', 'SK-2', 'SK-3', 'SK-4', 'SK-5', 'SK-6']);
    // no repeat within one full pass of the pool
    expect(new Set(seen).size).toBe(6);
  });

  it('wraps back to SK-1 after the pool exhausts', () => {
    let state: CoachMomentState = { ...createInitialCoachMomentState(), firstSkipShown: true };
    for (let i = 0; i < 6; i++) {
      state = selectSkipMoment(state).nextState;
    }
    const seventh = selectSkipMoment(state);
    expect(seventh.result.cardId).toBe('SK-1');
  });
});

describe('selectMilestoneMoment (once per threshold per habit)', () => {
  it('fires the card for a fresh threshold on a goal', () => {
    const state = createInitialCoachMomentState();
    const selection = selectMilestoneMoment(state, 'goal-1', 10);
    expect(selection?.result).toEqual({ trigger: 'milestone', cardId: 'MS-10' });
    expect(selection?.nextState.milestonesShownByGoal['goal-1']).toEqual([10]);
  });

  it('maps every threshold to its card', () => {
    const state = createInitialCoachMomentState();
    expect(selectMilestoneMoment(state, 'g', 10)?.result.cardId).toBe('MS-10');
    expect(selectMilestoneMoment(state, 'g', 30)?.result.cardId).toBe('MS-30');
    expect(selectMilestoneMoment(state, 'g', 50)?.result.cardId).toBe('MS-50');
    expect(selectMilestoneMoment(state, 'g', 66)?.result.cardId).toBe('MS-66');
  });

  it('never re-fires the same threshold for the same goal', () => {
    const state = createInitialCoachMomentState();
    const first = selectMilestoneMoment(state, 'goal-1', 10)!;
    const second = selectMilestoneMoment(first.nextState, 'goal-1', 10);
    expect(second).toBeNull();
  });

  it('fires independently per goal (each habit has its own arc)', () => {
    const state = createInitialCoachMomentState();
    const goal1 = selectMilestoneMoment(state, 'goal-1', 10)!;
    const goal2 = selectMilestoneMoment(goal1.nextState, 'goal-2', 10);
    expect(goal2).not.toBeNull();
    expect(goal2?.result.cardId).toBe('MS-10');
  });

  it('tracks multiple thresholds per goal independently', () => {
    const state = createInitialCoachMomentState();
    const after10 = selectMilestoneMoment(state, 'goal-1', 10)!;
    const after30 = selectMilestoneMoment(after10.nextState, 'goal-1', 30)!;
    expect(after30.nextState.milestonesShownByGoal['goal-1']).toEqual([10, 30]);
    // 10 still cannot re-fire for this goal
    expect(selectMilestoneMoment(after30.nextState, 'goal-1', 10)).toBeNull();
  });
});

describe('selectBrokenStreakMoment (BR-1 run-break fixed; BR-2..BR-4 rotate for a plain slip)', () => {
  it('uses the fixed BR-1 card when a run of 3+ skips just broke', () => {
    const state = createInitialCoachMomentState();
    const selection = selectBrokenStreakMoment(state, true);
    expect(selection.result).toEqual({ trigger: 'broken_streak', cardId: 'BR-1' });
    expect(selection.nextState.runBreakShown).toBe(true);
  });

  it('always returns BR-1 for repeated run-breaks (not once-only)', () => {
    const state = createInitialCoachMomentState();
    const first = selectBrokenStreakMoment(state, true);
    const second = selectBrokenStreakMoment(first.nextState, true);
    expect(second.result.cardId).toBe('BR-1');
  });

  it('rotates BR-2..BR-4 in order for a plain slip', () => {
    let state = createInitialCoachMomentState();
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const selection = selectBrokenStreakMoment(state, false);
      seen.push(selection.result.cardId);
      state = selection.nextState;
    }
    expect(seen).toEqual(['BR-2', 'BR-3', 'BR-4']);
  });

  it('wraps back to BR-2 after the plain-slip pool exhausts', () => {
    let state = createInitialCoachMomentState();
    for (let i = 0; i < 3; i++) {
      state = selectBrokenStreakMoment(state, false).nextState;
    }
    const fourth = selectBrokenStreakMoment(state, false);
    expect(fourth.result.cardId).toBe('BR-2');
  });
});

describe('selectCheckInMoment: full priority stack (milestone > run-break > first-time > rotation)', () => {
  it('milestone wins even when the answer is a skip that would otherwise rotate', () => {
    const state = createInitialCoachMomentState();
    const selection = selectCheckInMoment(state, 'goal-1', 'skipped', { milestone: 10 });
    expect(selection?.result.trigger).toBe('milestone');
    expect(selection?.result.cardId).toBe('MS-10');
  });

  it('milestone wins even when the answer is a slip with a run-break', () => {
    const state = createInitialCoachMomentState();
    const selection = selectCheckInMoment(state, 'goal-1', 'slipped', { milestone: 30, runBreak: true });
    expect(selection?.result.cardId).toBe('MS-30');
  });

  it('falls through to the ordinary skip/slip card if the milestone already fired for this goal', () => {
    const state = createInitialCoachMomentState();
    const already = selectMilestoneMoment(state, 'goal-1', 10)!.nextState;
    const selection = selectCheckInMoment(already, 'goal-1', 'skipped', { milestone: 10 });
    // MS-10 cannot re-fire; falls through to the skip trigger (SK-0, first skip ever)
    expect(selection?.result.trigger).toBe('skip');
    expect(selection?.result.cardId).toBe('SK-0');
  });

  it('run-break beats a plain slip and beats rotation when no milestone crossed', () => {
    const state = createInitialCoachMomentState();
    const selection = selectCheckInMoment(state, 'goal-1', 'slipped', { runBreak: true });
    expect(selection?.result).toEqual({ trigger: 'broken_streak', cardId: 'BR-1' });
  });

  it('a plain slip (no run-break, no milestone) rotates the broken-streak pool', () => {
    const state = createInitialCoachMomentState();
    const selection = selectCheckInMoment(state, 'goal-1', 'slipped', {});
    expect(selection?.result.cardId).toBe('BR-2');
  });

  it('first-time (SK-0) beats rotation for the very first skip ever', () => {
    const state = createInitialCoachMomentState();
    const selection = selectCheckInMoment(state, 'goal-1', 'skipped', {});
    expect(selection?.result).toEqual({ trigger: 'skip', cardId: 'SK-0' });
  });

  it('subsequent skips (no milestone) rotate the skip pool', () => {
    const afterFirst = selectCheckInMoment(createInitialCoachMomentState(), 'goal-1', 'skipped', {})!.nextState;
    const selection = selectCheckInMoment(afterFirst, 'goal-1', 'skipped', {});
    expect(selection?.result.cardId).toBe('SK-1');
  });
});

describe('cardText', () => {
  it('resolves every card id to a non-empty string', () => {
    const ids: Parameters<typeof cardText>[0][] = [
      'FL-1', 'DT-1',
      'SK-0', 'SK-1', 'SK-2', 'SK-3', 'SK-4', 'SK-5', 'SK-6',
      'MS-10', 'MS-30', 'MS-50', 'MS-66',
      'BR-1', 'BR-2', 'BR-3', 'BR-4',
    ];
    for (const id of ids) {
      const text = cardText(id);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('never contains an em dash (hard rule: no em dashes anywhere)', () => {
    const ids: Parameters<typeof cardText>[0][] = [
      'FL-1', 'DT-1',
      'SK-0', 'SK-1', 'SK-2', 'SK-3', 'SK-4', 'SK-5', 'SK-6',
      'MS-10', 'MS-30', 'MS-50', 'MS-66',
      'BR-1', 'BR-2', 'BR-3', 'BR-4',
    ];
    for (const id of ids) {
      expect(cardText(id)).not.toContain('—');
    }
  });
});

describe('isMilestoneCard', () => {
  it('is true only for the four milestone cards', () => {
    expect(isMilestoneCard('MS-10')).toBe(true);
    expect(isMilestoneCard('MS-30')).toBe(true);
    expect(isMilestoneCard('MS-50')).toBe(true);
    expect(isMilestoneCard('MS-66')).toBe(true);
    expect(isMilestoneCard('SK-0')).toBe(false);
    expect(isMilestoneCard('BR-1')).toBe(false);
    expect(isMilestoneCard('FL-1')).toBe(false);
    expect(isMilestoneCard('DT-1')).toBe(false);
  });
});
