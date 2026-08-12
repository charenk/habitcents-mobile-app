/**
 * Color helpers.
 */

/** Expand a 3- or 6-digit hex (with or without #) to 6 digits. */
function normalizeHex(hex: string): string {
  const raw = hex.replace(/^#/, '');
  if (raw.length === 3) {
    return raw
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (raw.length === 6) return raw;
  throw new Error(`normalizeHex: invalid hex "${hex}" (expected 3 or 6 digits)`);
}

/**
 * WCAG 2.1 relative luminance.
 *
 * Lives here rather than in a component because two separate audit fixes
 * needed it in the same pass (the category-swatch checkmark and the category
 * identity icon), and each had started its own private copy.
 */
export function relativeLuminance(hex: string): number {
  const full = normalizeHex(hex);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = channel(parseInt(full.slice(0, 2), 16));
  const g = channel(parseInt(full.slice(2, 4), 16));
  const b = channel(parseInt(full.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two hex colors. Order does not matter. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Parse a 6-digit hex (with or without a leading #) into 0-255 RGB channels. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace(/^#/, '');
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

/** Format RGB channels (clamped to 0-255, rounded) as a 6-digit hex string. */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Alpha-composites fgHex at `alpha` over bgHex, both opaque, returning the
 * resulting solid hex (matches what a semi-transparent fgHex actually paints
 * on screen over that background).
 */
export function compositeOver(fgHex: string, alpha: number, bgHex: string): string {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  return rgbToHex(
    fg.r * alpha + bg.r * (1 - alpha),
    fg.g * alpha + bg.g * (1 - alpha),
    fg.b * alpha + bg.b * (1 - alpha)
  );
}

/** Linearly interpolate between two hex colors; t=0 is hexA, t=1 is hexB. */
export function mixHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

/**
 * Convert a hex color to an rgba() string with the given alpha.
 * Accepts 3- or 6-digit hex, with or without a leading #.
 * Alpha is clamped to [0, 1] and formatted to two decimals when needed.
 * Throws on an invalid hex length.
 */
export function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace(/^#/, '');

  let full: string;
  if (raw.length === 3) {
    full = raw
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (raw.length === 6) {
    full = raw;
  } else {
    throw new Error(`withAlpha: invalid hex "${hex}" (expected 3 or 6 digits)`);
  }

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  const clamped = Math.min(1, Math.max(0, alpha));
  // Trim trailing zeros so 0.12 stays 0.12 and 1 stays 1.
  const a = parseFloat(clamped.toFixed(2));

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
