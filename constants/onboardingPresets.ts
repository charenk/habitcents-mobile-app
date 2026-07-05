/**
 * Door 1 Leak Audit preset config (docs/design-package-phase2/02-p2-1-onboarding-leak-audit.md
 * section 3.3/3.4, ADR 0007 item 2).
 *
 * Amounts are per-currency config, hand-authored to feel local, NEVER converted
 * at runtime from a USD base (ADR 0007 / spec 02 section 7 "Currency"). Adding a
 * currency here means adding a full row, not a multiplier.
 *
 * All values are integer cents (minor units), zero-decimal currencies (JPY)
 * simply have their minor unit equal to the major unit.
 */

import type { CurrencyCode } from '@/utils/currency';
import type { ExpenseCategory } from '@/types/expense';

export type SubscriptionChipId =
  | 'video'
  | 'music'
  | 'cloud'
  | 'gaming'
  | 'news'
  | 'fitness'
  | 'dating';

export type ViceId = 'coffee' | 'delivery' | 'impulse';

export type FrequencyBand = 'never' | 'oneToTwo' | 'threeToFive' | 'daily';

/** Section 4 formula: bandMidpoints. */
export const BAND_MIDPOINTS: Record<FrequencyBand, number> = {
  never: 0,
  oneToTwo: 1.5,
  threeToFive: 4,
  daily: 7,
};

export const FREQUENCY_BANDS: FrequencyBand[] = ['never', 'oneToTwo', 'threeToFive', 'daily'];

export type SubscriptionPreset = {
  id: SubscriptionChipId;
  /** Display name (section 3.3 chip grid), regional-neutral, no brand names. */
  name: string;
  /** Monthly preset, integer cents. */
  monthlyCents: number;
};

export type VicePreset = {
  id: ViceId;
  /** Display name (section 3.4 vice rows). */
  name: string;
  /** Per-item preset, integer cents. */
  perItemCents: number;
};

type CurrencyPresetTable = {
  subscriptions: Record<SubscriptionChipId, number>;
  vices: Record<ViceId, number>;
};

// Hand-authored per currency (ADR 0007 item 2). USD is the spec's source table;
// other rows are locally-sensible amounts, not a converted multiple of USD.
const PRESET_TABLE: Record<CurrencyCode, CurrencyPresetTable> = {
  USD: {
    subscriptions: { video: 1200, music: 1100, cloud: 300, gaming: 1000, news: 800, fitness: 1500, dating: 2000 },
    vices: { coffee: 600, delivery: 1800, impulse: 1500 },
  },
  EUR: {
    subscriptions: { video: 1200, music: 1100, cloud: 300, gaming: 1000, news: 800, fitness: 1500, dating: 2000 },
    vices: { coffee: 600, delivery: 1800, impulse: 1500 },
  },
  GBP: {
    subscriptions: { video: 1200, music: 1100, cloud: 300, gaming: 1000, news: 800, fitness: 1500, dating: 2000 },
    vices: { coffee: 600, delivery: 1800, impulse: 1500 },
  },
  // Zero-decimal: minor unit === major unit, so "cents" here are whole yen.
  JPY: {
    subscriptions: { video: 1800, music: 1650, cloud: 450, gaming: 1500, news: 1200, fitness: 2250, dating: 3000 },
    vices: { coffee: 900, delivery: 2700, impulse: 2250 },
  },
  CAD: {
    subscriptions: { video: 1700, music: 1500, cloud: 400, gaming: 1400, news: 1100, fitness: 2100, dating: 2800 },
    vices: { coffee: 800, delivery: 2500, impulse: 2100 },
  },
  AUD: {
    subscriptions: { video: 1800, music: 1700, cloud: 500, gaming: 1500, news: 1200, fitness: 2300, dating: 3000 },
    vices: { coffee: 900, delivery: 2700, impulse: 2300 },
  },
  INR: {
    subscriptions: { video: 100000, music: 91000, cloud: 25000, gaming: 83000, news: 66000, fitness: 124000, dating: 166000 },
    vices: { coffee: 50000, delivery: 149000, impulse: 124000 },
  },
};

// Welcome screen positioning figure (section 3.1: "quietly costing you $100 a
// month"). A fixed, localized headline number, not a computed projection.
const WELCOME_POSITIONING_CENTS: Record<CurrencyCode, number> = {
  USD: 10000,
  EUR: 10000,
  GBP: 10000,
  JPY: 1500000,
  CAD: 14000,
  AUD: 15000,
  INR: 830000,
};

export function welcomePositioningCents(currency: CurrencyCode): number {
  return WELCOME_POSITIONING_CENTS[currency] ?? WELCOME_POSITIONING_CENTS.USD;
}

const SUBSCRIPTION_NAMES: Record<SubscriptionChipId, string> = {
  video: 'Video streaming',
  music: 'Music',
  cloud: 'Cloud storage',
  gaming: 'Gaming',
  news: 'News',
  fitness: 'Fitness',
  dating: 'Dating',
};

const VICE_NAMES: Record<ViceId, string> = {
  coffee: 'Coffee or tea out',
  delivery: 'Food delivery',
  impulse: 'Impulse buys',
};

export const SUBSCRIPTION_CHIP_IDS: SubscriptionChipId[] = [
  'video', 'music', 'cloud', 'gaming', 'news', 'fitness', 'dating',
];

export const VICE_IDS: ViceId[] = ['coffee', 'delivery', 'impulse'];

/** Category every seeded subscription recurring expense writes to (ADR 0006). */
export const AUDIT_SUBSCRIPTION_CATEGORY: ExpenseCategory = 'Software & Subscriptions';

/** Lookup: the preset table for the given currency (falls back to USD row shape). */
function tableFor(currency: CurrencyCode): CurrencyPresetTable {
  return PRESET_TABLE[currency] ?? PRESET_TABLE.USD;
}

/** All 7 subscription presets for the active currency, in spec 3.3 order. */
export function subscriptionPresets(currency: CurrencyCode): SubscriptionPreset[] {
  const table = tableFor(currency);
  return SUBSCRIPTION_CHIP_IDS.map((id) => ({
    id,
    name: SUBSCRIPTION_NAMES[id],
    monthlyCents: table.subscriptions[id],
  }));
}

/** All 3 vice presets for the active currency, in spec 3.4 order. */
export function vicePresets(currency: CurrencyCode): VicePreset[] {
  const table = tableFor(currency);
  return VICE_IDS.map((id) => ({
    id,
    name: VICE_NAMES[id],
    perItemCents: table.vices[id],
  }));
}
