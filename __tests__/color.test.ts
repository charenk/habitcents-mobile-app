import { withAlpha } from '@/utils/color';

describe('withAlpha', () => {
  it('converts a 6-digit hex to rgba at the given alpha', () => {
    expect(withAlpha('#FF6B6B', 0.12)).toBe('rgba(255, 107, 107, 0.12)');
  });

  it('accepts a hex without a leading #', () => {
    expect(withAlpha('FF6B6B', 0.12)).toBe('rgba(255, 107, 107, 0.12)');
  });

  it('expands a 3-digit hex', () => {
    // #0f0 -> #00ff00
    expect(withAlpha('#0f0', 1)).toBe('rgba(0, 255, 0, 1)');
    expect(withAlpha('fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('clamps alpha into [0, 1]', () => {
    expect(withAlpha('#000000', 2)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('#000000', -1)).toBe('rgba(0, 0, 0, 0)');
  });

  it('throws on an invalid hex length', () => {
    expect(() => withAlpha('#FF', 0.5)).toThrow();
    expect(() => withAlpha('#FF6B6', 0.5)).toThrow();
  });
});
