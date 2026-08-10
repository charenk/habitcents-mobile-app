import {
  vicePresets,
  BAND_MIDPOINTS,
  VICE_IDS,
} from '@/constants/onboardingPresets';
import { CURRENCIES } from '@/utils/currency';

describe('onboardingPresets config (ADR 0007 item 2)', () => {
  it('every supported currency has a full vice preset row (3 vices)', () => {
    for (const { code } of CURRENCIES) {
      expect(vicePresets(code)).toHaveLength(VICE_IDS.length);
      for (const p of vicePresets(code)) {
        expect(p.perItemCents).toBeGreaterThan(0);
      }
    }
  });

  it('USD vice preset amounts match the spec 02 section 3.4 table exactly', () => {
    const vices = vicePresets('USD');
    const viceById = Object.fromEntries(vices.map((v) => [v.id, v.perItemCents]));
    expect(viceById).toEqual({ coffee: 600, delivery: 1800, impulse: 1500 });
  });

  it('band midpoints match spec 02 section 4 exactly', () => {
    expect(BAND_MIDPOINTS).toEqual({ never: 0, oneToTwo: 1.5, threeToFive: 4, daily: 7 });
  });
});
