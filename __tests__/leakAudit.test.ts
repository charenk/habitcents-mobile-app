import {
  computeProjection,
  roundToTen,
  subscriptionsMonthlyTotal,
  vicesWeeklyTotal,
  totalHasTilde,
  biggestLeakCandidate,
  candidateToSeedInput,
  resolveSubscriptionAnswers,
  resolveViceAnswers,
  type AuditSubscriptionAnswer,
  type AuditViceAnswer,
} from '@/utils/leakAudit';
import {
  subscriptionPresets,
  vicePresets,
  welcomePositioningCents,
  BAND_MIDPOINTS,
  SUBSCRIPTION_CHIP_IDS,
  VICE_IDS,
} from '@/constants/onboardingPresets';
import { CURRENCIES } from '@/utils/currency';
import type { AuditSubscriptionSelection, AuditViceSelection } from '@/types/onboarding';

function sub(name: string, amountCents: number, edited = false): AuditSubscriptionAnswer {
  return { id: name, name, amountCents, edited };
}

function vice(
  name: string,
  perItemCents: number,
  band: AuditViceAnswer['band'],
  edited = false,
  answered = true
): AuditViceAnswer {
  return { id: name, name, perItemCents, edited, band, answered };
}

describe('computeProjection: spec 02 section 4 worked examples', () => {
  it('example 1: all presets -> ~$2,930 a year', () => {
    const subs = [sub('Video streaming', 1200), sub('Music', 1100)];
    const vices = [
      vice('Coffee or tea out', 600, 'threeToFive'),
      vice('Food delivery', 1800, 'oneToTwo'),
      vice('Impulse buys', 1500, 'never'),
    ];
    const projection = computeProjection(subs, vices);
    expect(projection).not.toBeNull();
    expect(projection!.yearlyCents).toBe(293000); // $2,930.00
    expect(projection!.monthlyCents).toBe(Math.round(293000 / 12)); // ~$244
  });

  it('example 2: edited prices -> ~$2,920 a year', () => {
    const subs = [sub('Video streaming', 1549, true), sub('Music', 1099, true)];
    const vices = [
      vice('Coffee or tea out', 575, 'threeToFive', true),
      vice('Food delivery', 1800, 'oneToTwo'),
    ];
    const projection = computeProjection(subs, vices);
    expect(projection).not.toBeNull();
    expect(projection!.yearlyCents).toBe(292000); // $2,920.00
    expect(projection!.hasEdits).toBe(true);
  });

  it('example 3: no subs, coffee daily -> ~$2,180 a year', () => {
    const vices = [vice('Coffee or tea out', 600, 'daily')];
    const projection = computeProjection([], vices);
    expect(projection).not.toBeNull();
    expect(projection!.yearlyCents).toBe(218000); // $2,180.00
  });

  it('returns null for the both-empty edge case (section 8)', () => {
    const vices = [
      vice('Coffee or tea out', 600, 'never'),
      vice('Food delivery', 1800, 'never'),
      vice('Impulse buys', 1500, 'never'),
    ];
    expect(computeProjection([], vices)).toBeNull();
  });

  it('a selected but zero-amount subscription (unfinished "Something else") does not fake a non-empty projection', () => {
    const subs = [sub('Something else', 0, true)];
    expect(computeProjection(subs, [])).toBeNull();
  });

  it('breakdown includes a combined Subscriptions line and top-3 vice lines, sorted descending', () => {
    const subs = [sub('Video streaming', 1200), sub('Music', 1100)];
    const vices = [
      vice('Coffee or tea out', 600, 'threeToFive'),
      vice('Food delivery', 1800, 'oneToTwo'),
      vice('Impulse buys', 1500, 'daily'),
    ];
    const projection = computeProjection(subs, vices)!;
    expect(projection.breakdown).toHaveLength(3);
    expect(projection.breakdown.map((l) => l.source)).toEqual(
      [...projection.breakdown].sort((a, b) => b.yearlyCents - a.yearlyCents).map((l) => l.source)
    );
    expect(projection.nSources).toBe(4); // 3 vices + 1 combined subs line
  });

  it('omits the Subscriptions line entirely when there are no subscriptions', () => {
    const vices = [vice('Coffee or tea out', 600, 'threeToFive')];
    const projection = computeProjection([], vices)!;
    expect(projection.breakdown.every((l) => l.source !== 'Subscriptions')).toBe(true);
  });

  it('never band contributes zero and is excluded from the breakdown', () => {
    const vices = [vice('Impulse buys', 1500, 'never')];
    const projection = computeProjection([sub('Video streaming', 1200)], vices)!;
    expect(projection.breakdown.some((l) => l.source === 'Impulse buys')).toBe(false);
  });

  it('hasEdits is false when every counted item is an untouched preset', () => {
    const subs = [sub('Video streaming', 1200, false)];
    const vices = [vice('Coffee or tea out', 600, 'threeToFive', false)];
    expect(computeProjection(subs, vices)!.hasEdits).toBe(false);
  });

  it('an edited Never-band vice does not count as an edit (it contributes nothing)', () => {
    const vices = [vice('Impulse buys', 1500, 'never', true)];
    const projection = computeProjection([sub('Video streaming', 1200)], vices)!;
    expect(projection.hasEdits).toBe(false);
  });
});

describe('roundToTen', () => {
  it('rounds to the nearest 10 major units (1000 cents)', () => {
    expect(roundToTen(293000)).toBe(293000); // already a multiple
    expect(roundToTen(291776)).toBe(292000);
    expect(roundToTen(218400)).toBe(218000);
    expect(roundToTen(0)).toBe(0);
  });
});

describe('running totals', () => {
  it('subscriptionsMonthlyTotal sums selected chip amounts', () => {
    expect(subscriptionsMonthlyTotal([{ amountCents: 1200 }, { amountCents: 1100 }])).toBe(2300);
    expect(subscriptionsMonthlyTotal([])).toBe(0);
  });

  it('vicesWeeklyTotal uses band midpoints and ignores Never', () => {
    const total = vicesWeeklyTotal([
      { band: 'threeToFive', perItemCents: 600 }, // 4 * 6 = 24
      { band: 'never', perItemCents: 1500 }, // 0
    ]);
    expect(total).toBe(2400); // $24.00
  });

  it('totalHasTilde is true whenever any counted item is still a preset', () => {
    expect(totalHasTilde([{ edited: false }])).toBe(true);
    expect(totalHasTilde([{ edited: true }, { edited: false }])).toBe(true);
    expect(totalHasTilde([{ edited: true }, { edited: true }])).toBe(false);
    // empty selection: no keyboard has been shown, so still tilde-true by
    // convention (nothing user-set yet).
    expect(totalHasTilde([])).toBe(true);
  });
});

describe('biggestLeakCandidate', () => {
  it('picks the largest subscription chip when subscriptions dominate', () => {
    const subs = [sub('Video streaming', 1200), sub('Music', 300)];
    const candidate = biggestLeakCandidate(subs, []);
    expect(candidate).not.toBeNull();
    expect(candidate!.name).toBe('Video streaming');
    expect(candidate!.frequency).toBe('monthly');
    expect(candidate!.averageAmountCents).toBe(1200);
  });

  it('picks the biggest vice when vices dominate', () => {
    const subs = [sub('Cloud storage', 300)];
    const vices = [vice('Coffee or tea out', 600, 'daily')];
    const candidate = biggestLeakCandidate(subs, vices);
    expect(candidate).not.toBeNull();
    expect(candidate!.name).toBe('Coffee or tea out');
    expect(candidate!.frequency).toBe('daily');
  });

  it('returns null when there is nothing to plug', () => {
    expect(biggestLeakCandidate([], [])).toBeNull();
    expect(biggestLeakCandidate([], [vice('Coffee or tea out', 600, 'never')])).toBeNull();
  });

  it('a weekly-band vice (not daily) reports a weekly frequency', () => {
    const candidate = biggestLeakCandidate([], [vice('Food delivery', 1800, 'oneToTwo')]);
    expect(candidate!.frequency).toBe('weekly');
  });

  it('a zero-amount subscription never beats "nothing" or a real vice', () => {
    // Regression: an unfinished "Something else" chip (amountCents 0) used to
    // pass the `subsYearlyTotal > biggestViceYearly` check (0 > -1) and get
    // returned as the candidate even with no vices answered.
    expect(biggestLeakCandidate([sub('Something else', 0, true)], [])).toBeNull();

    const vices = [vice('Coffee or tea out', 600, 'daily')];
    const candidate = biggestLeakCandidate([sub('Something else', 0, true)], vices);
    expect(candidate!.name).toBe('Coffee or tea out');
  });
});

describe('candidateToSeedInput', () => {
  it('maps a BiggestLeakCandidate to seedDiscoveredHabit input with the given category', () => {
    const candidate = biggestLeakCandidate([sub('Video streaming', 1200)], [])!;
    const input = candidateToSeedInput(candidate, 'cat-other-id');
    expect(input).toEqual({
      merchantPattern: candidate.key,
      name: 'Video streaming',
      description: '',
      categoryId: 'cat-other-id',
      averageAmount: 1200,
      frequency: 'monthly',
      occurrencesPerPeriod: 1,
      totalMonthlySpend: 1200,
    });
  });
});

describe('resolveSubscriptionAnswers / resolveViceAnswers', () => {
  it('resolves persisted selections to display names via the preset config', () => {
    const selections: AuditSubscriptionSelection[] = [
      { id: 'video', amountCents: 1500, edited: true },
    ];
    const resolved = resolveSubscriptionAnswers(selections, 'USD');
    expect(resolved[0].name).toBe('Video streaming');
    expect(resolved[0].amountCents).toBe(1500);
  });

  it('falls back to the typed custom name for "Something else"', () => {
    const selections: AuditSubscriptionSelection[] = [
      { id: 'custom', customName: 'Parking pass', amountCents: 5000, edited: true },
    ];
    const resolved = resolveSubscriptionAnswers(selections, 'USD');
    expect(resolved[0].name).toBe('Parking pass');
  });

  it('resolves vice selections to display names', () => {
    const selections: AuditViceSelection[] = [
      { id: 'coffee', perItemCents: 600, edited: false, band: 'threeToFive', answered: true },
    ];
    const resolved = resolveViceAnswers(selections, 'USD');
    expect(resolved[0].name).toBe('Coffee or tea out');
  });
});

describe('onboardingPresets config (ADR 0007 item 2)', () => {
  it('every supported currency has a full preset row (7 subs, 3 vices)', () => {
    for (const { code } of CURRENCIES) {
      expect(subscriptionPresets(code)).toHaveLength(SUBSCRIPTION_CHIP_IDS.length);
      expect(vicePresets(code)).toHaveLength(VICE_IDS.length);
      for (const p of subscriptionPresets(code)) {
        expect(p.monthlyCents).toBeGreaterThan(0);
      }
      for (const p of vicePresets(code)) {
        expect(p.perItemCents).toBeGreaterThan(0);
      }
    }
  });

  it('USD preset amounts match the spec 02 section 3.3/3.4 table exactly', () => {
    const subs = subscriptionPresets('USD');
    const byId = Object.fromEntries(subs.map((s) => [s.id, s.monthlyCents]));
    expect(byId).toEqual({
      video: 1200,
      music: 1100,
      cloud: 300,
      gaming: 1000,
      news: 800,
      fitness: 1500,
      dating: 2000,
    });

    const vices = vicePresets('USD');
    const viceById = Object.fromEntries(vices.map((v) => [v.id, v.perItemCents]));
    expect(viceById).toEqual({ coffee: 600, delivery: 1800, impulse: 1500 });
  });

  it('JPY presets are zero-decimal-scale whole numbers, never a runtime USD conversion', () => {
    // Presets are hand-authored per currency (ADR 0007): assert they are
    // stable literal config, not derived from scaleThresholdCents at call time.
    const jpy = subscriptionPresets('JPY');
    const usd = subscriptionPresets('USD');
    expect(jpy.find((p) => p.id === 'video')!.monthlyCents).toBe(1800);
    expect(usd.find((p) => p.id === 'video')!.monthlyCents).toBe(1200);
  });

  it('band midpoints match spec 02 section 4 exactly', () => {
    expect(BAND_MIDPOINTS).toEqual({ never: 0, oneToTwo: 1.5, threeToFive: 4, daily: 7 });
  });

  it('welcomePositioningCents returns a positive figure for every currency', () => {
    for (const { code } of CURRENCIES) {
      expect(welcomePositioningCents(code)).toBeGreaterThan(0);
    }
  });
});
