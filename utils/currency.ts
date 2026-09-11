/**
 * Multi-currency foundation (task P2-6).
 *
 * Amounts are stored internally as an integer number of hundredths of the major
 * unit ("cents"), regardless of the selected currency. Formatting divides by 100
 * and lets Intl.NumberFormat apply each currency's natural decimal places, so a
 * zero-decimal currency like JPY renders with no fraction digits automatically.
 *
 * usdScale is a rough magnitude factor (major units per 1 USD), used only to keep
 * detection thresholds sensible across currencies. It is not a live exchange rate.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'INR';

export type CurrencyMeta = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  decimals: number;
  usdScale: number;
};

export const CURRENCIES: CurrencyMeta[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', decimals: 2, usdScale: 1 },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'en-IE', decimals: 2, usdScale: 1 },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB', decimals: 2, usdScale: 1 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', decimals: 0, usdScale: 150 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', locale: 'en-CA', decimals: 2, usdScale: 1.4 },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', locale: 'en-AU', decimals: 2, usdScale: 1.5 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN', decimals: 2, usdScale: 83 },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export function currencyMeta(code: CurrencyCode): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return typeof v === 'string' && CURRENCIES.some((c) => c.code === v);
}

export type FormatMoneyOptions = {
  /** Render as a negative amount (e.g. an expense: "-$5.00"). */
  signed?: boolean;
  /** Drop fraction digits entirely (compact widget/threshold display). */
  compact?: boolean;
};

/**
 * Format an integer cents value as a localized currency string.
 * All money display in the app should go through this.
 */
export function formatMoney(
  cents: number,
  code: CurrencyCode = DEFAULT_CURRENCY,
  opts: FormatMoneyOptions = {}
): string {
  const meta = currencyMeta(code);
  const major = (Number.isFinite(cents) ? cents : 0) / 100;
  const value = opts.signed ? -Math.abs(major) : major;

  try {
    const fmt: Intl.NumberFormatOptions = { style: 'currency', currency: meta.code };
    if (opts.compact) {
      fmt.minimumFractionDigits = 0;
      fmt.maximumFractionDigits = 0;
    }
    return new Intl.NumberFormat(meta.locale, fmt).format(value);
  } catch {
    // Fallback if the runtime lacks Intl currency data for this locale.
    const digits = opts.compact ? 0 : meta.decimals;
    const body = Math.abs(value).toFixed(digits);
    return `${value < 0 ? '-' : ''}${meta.symbol}${body}`;
  }
}

/**
 * The AT-REST text for an amount INPUT: the same grouping and decimal count
 * `formatMoney` would use, without the currency symbol, because the field
 * draws the symbol itself beside the digits.
 *
 * Why this exists (C9): the field kept its editable string ("2100.00") on
 * screen even when nobody was typing, so a bill read "$2100.00" in the sheet
 * and "$2,100.00" in the row it came from. The editable form is correct while
 * a caret is in the field (grouping separators fight typing, and the keystroke
 * sanitizer treats a comma as the decimal key) and wrong the rest of the time.
 * It also picks up the currency's real decimal count, so a JPY amount stops
 * showing two decimals it does not have.
 *
 * Returns '' for zero, matching `centsToKeypadValue`, so the field shows its
 * placeholder rather than a formatted nothing.
 */
export function formatAmountAtRest(cents: number, code: CurrencyCode = DEFAULT_CURRENCY): string {
  if (!Number.isFinite(cents) || cents === 0) return '';
  const meta = currencyMeta(code);
  const major = cents / 100;

  try {
    return new Intl.NumberFormat(meta.locale, {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(major);
  } catch {
    // Same fallback shape as formatMoney: no Intl data for this locale.
    return major.toFixed(meta.decimals);
  }
}

/**
 * Scale a USD-denominated cents threshold into the given currency's magnitude,
 * so detection heuristics stay meaningful (e.g. a $20 floor is ~JPY 3000).
 */
export function scaleThresholdCents(usdCents: number, code: CurrencyCode = DEFAULT_CURRENCY): number {
  return Math.round(usdCents * currencyMeta(code).usdScale);
}
