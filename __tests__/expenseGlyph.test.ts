/**
 * The per-bill glyph override (2026-09-11).
 *
 * A typed name like "Amazon Prime" has no category that describes it, so every
 * subscription inherited the same 📱. Same complaint `habitLeakGlyph` already
 * answers one level up ("Coffee or tea out" inheriting a pizza), and this file
 * is deliberately the same test shape: the override wins, and absence falls
 * back rather than rendering nothing.
 */
import { SPEND_GLYPHS, categoryEmoji, expenseGlyph } from '@/constants/categoryEmoji';
import { strings } from '@/constants/strings';

describe('expenseGlyph', () => {
  it("uses the bill's own glyph when it has one", () => {
    expect(expenseGlyph({ emoji: '📦', category: 'Software & Subscriptions' })).toBe('📦');
  });

  it('falls back to the category when the bill has none', () => {
    expect(expenseGlyph({ category: 'Food' })).toBe(categoryEmoji('Food'));
    expect(expenseGlyph({ emoji: undefined, category: 'Car' })).toBe(categoryEmoji('Car'));
  });

  /**
   * `?.trim() ||` rather than `??`. Storage spreads unknown keys straight
   * through, so a hand-edited or half-written row can carry an empty string,
   * and `??` would let it render a blank tile.
   */
  it('falls back for an empty or whitespace-only override', () => {
    expect(expenseGlyph({ emoji: '', category: 'Food' })).toBe(categoryEmoji('Food'));
    expect(expenseGlyph({ emoji: '   ', category: 'Food' })).toBe(categoryEmoji('Food'));
  });

  it('still falls back for a category it does not know', () => {
    expect(expenseGlyph({ category: 'Not a category' })).toBe(categoryEmoji('Other'));
  });
});

describe('the glyph set the picker offers', () => {
  it('has no duplicates', () => {
    expect(new Set(SPEND_GLYPHS).size).toBe(SPEND_GLYPHS.length);
  });

  // A 24-cell grid a VoiceOver user has to walk needs a word per cell, and an
  // unnamed glyph would speak as itself, which is silence or a codepoint.
  it('names every glyph it offers', () => {
    for (const glyph of SPEND_GLYPHS) {
      expect(strings.addUpcoming.iconNames[glyph]).toBeTruthy();
    }
  });

  /**
   * Three rails on that sheet can carry the same word: "Gym" is a name preset
   * AND a glyph, "Utilities" is a preset AND a category. The suffix is what
   * keeps the cells distinguishable from the chips by accessible name.
   */
  it('speaks every glyph as an icon, never as a bare word', () => {
    for (const glyph of SPEND_GLYPHS) {
      const spoken = strings.addUpcoming.iconLabel(strings.addUpcoming.iconNames[glyph]);
      expect(spoken.endsWith(' icon')).toBe(true);
    }
  });
});
