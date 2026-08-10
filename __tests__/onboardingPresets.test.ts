import {
  vicePresets,
  BAND_MIDPOINTS,
  VICE_IDS,
  habitLeakGlyph,
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

describe('habitLeakGlyph (build 8 release-gate punchlist: vice presets showed the wrong glyph)', () => {
  it('gives each vice preset its own glyph instead of the category emoji', () => {
    // Coffee and delivery both map to VICE_CATEGORIES.Food, so before this fix
    // both inherited categoryEmoji('Food') = the pizza slice.
    expect(habitLeakGlyph({ merchantPattern: 'coffee' }, '🍕')).toBe('☕');
    expect(habitLeakGlyph({ merchantPattern: 'delivery' }, '🍕')).toBe('🥡');
    expect(habitLeakGlyph({ merchantPattern: 'impulse' }, '🛍')).toBe('🛍️');
  });

  it('every vice preset gets a DIFFERENT glyph from each other', () => {
    const glyphs = VICE_IDS.map((id) => habitLeakGlyph({ merchantPattern: id }, '🍕'));
    expect(new Set(glyphs).size).toBe(VICE_IDS.length);
  });

  it('falls back to the category glyph for anything not a vice preset', () => {
    // Organic detection: merchantPattern is a real merchant name, not a ViceId.
    expect(habitLeakGlyph({ merchantPattern: 'Starbucks' }, '🍕')).toBe('🍕');
    // A custom-named break sheet pick has no merchantPattern at all.
    expect(habitLeakGlyph({}, '🍕')).toBe('🍕');
  });
});
