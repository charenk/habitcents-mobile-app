import {
  subscriptionPresets,
  vicePresets,
  welcomePositioningCents,
  BAND_MIDPOINTS,
  SUBSCRIPTION_CHIP_IDS,
  VICE_IDS,
} from '@/constants/onboardingPresets';
import { CURRENCIES } from '@/utils/currency';

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
