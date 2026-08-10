/**
 * Category identity config (U2 config fix: Car/Transportation shared a glyph
 * and a hue, Utilities borrowed Entertainment's, Other borrowed Car's).
 *
 * Pins every DEFAULT_CATEGORIES entry (types/category.ts, the ten stock
 * categories every install starts with) to a unique emoji+color pair, so the
 * drawer's category rail and the Categories tab (both read through
 * categoryEmoji()/categoryIdentityColor()) can never render two tiles that
 * look the same again.
 */
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { DEFAULT_CATEGORIES } from '@/types/category';

describe('categoryEmoji / categoryIdentityColor config uniqueness', () => {
  it('gives every default category its own emoji', () => {
    const emojis = DEFAULT_CATEGORIES.map((c) => categoryEmoji(c.name));
    expect(new Set(emojis).size).toBe(DEFAULT_CATEGORIES.length);
  });

  it('gives every default category its own identity color', () => {
    const colors = DEFAULT_CATEGORIES.map((c) => categoryIdentityColor(c.name));
    expect(new Set(colors).size).toBe(DEFAULT_CATEGORIES.length);
  });

  it('gives every default category a unique emoji+color pair (belt and suspenders)', () => {
    const pairs = DEFAULT_CATEGORIES.map(
      (c) => `${categoryEmoji(c.name)}::${categoryIdentityColor(c.name)}`
    );
    expect(new Set(pairs).size).toBe(DEFAULT_CATEGORIES.length);
  });

  it('Car keeps the car emoji and transport blue; Transportation gets its own bus glyph and hue', () => {
    expect(categoryEmoji('Car')).toBe('🚗');
    expect(categoryIdentityColor('Car')).toBe('#4A90D9');
    expect(categoryEmoji('Transportation')).not.toBe('🚗');
    expect(categoryIdentityColor('Transportation')).not.toBe(categoryIdentityColor('Car'));
  });

  it('Groceries keeps its color (#FF9F43), unchanged by the U2 fix', () => {
    expect(categoryIdentityColor('Groceries')).toBe('#FF9F43');
  });

  it('Utilities no longer borrows Entertainment\'s color', () => {
    expect(categoryIdentityColor('Utilities')).not.toBe(categoryIdentityColor('Entertainment'));
  });

  it('Other is a neutral tint, not Car/Transportation\'s hue', () => {
    const other = categoryIdentityColor('Other');
    expect(other).not.toBe(categoryIdentityColor('Car'));
    expect(other).not.toBe(categoryIdentityColor('Transportation'));
  });
});
