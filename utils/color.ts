/**
 * Color helpers.
 */

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
