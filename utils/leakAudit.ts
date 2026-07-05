/**
 * Door 1 Leak Audit: pure projection formula and seeding helpers
 * (docs/design-package-phase2/02-p2-1-onboarding-leak-audit.md sections 4-5).
 *
 * Every function here is pure (no storage, no analytics, no React) so the
 * formula and rounding can be unit tested directly against the spec's worked
 * examples.
 */

import {
  BAND_MIDPOINTS,
  subscriptionPresets,
  vicePresets,
  type FrequencyBand,
} from '@/constants/onboardingPresets';
import type { CurrencyCode } from '@/utils/currency';
import type { AuditSubscriptionSelection, AuditViceSelection } from '@/types/onboarding';

export type AuditSubscriptionAnswer = {
  id: string;
  name: string;
  /** Exact cents if the user edited the price, else the preset cents. */
  amountCents: number;
  /** True when amountCents came from the inline editor, not the preset. */
  edited: boolean;
};

export type AuditViceAnswer = {
  id: string;
  name: string;
  /** Per-item cents: exact if edited, else preset. */
  perItemCents: number;
  edited: boolean;
  band: FrequencyBand;
  /** True when the user actually interacted with this row's band control. */
  answered: boolean;
};

export type AuditBreakdownLine = {
  /** Vice name, or 'Subscriptions' for the combined subscriptions line. */
  source: string;
  yearlyCents: number;
};

export type AuditProjection = {
  yearlyCents: number;
  monthlyCents: number;
  /** Top-3 breakdown lines by size (section 3.5), already sorted descending. */
  breakdown: AuditBreakdownLine[];
  /** True when at least one counted subscription or vice was user-edited. */
  hasEdits: boolean;
  /** Number of distinct sources feeding the total (subs count as one). */
  nSources: number;
};

/**
 * Resolve persisted step-1 selections (types/onboarding.ts AuditSubscriptionSelection,
 * id + amount only) into formula-ready answers with display names, using the
 * active currency's preset config to look up chip names.
 */
export function resolveSubscriptionAnswers(
  selections: AuditSubscriptionSelection[],
  currency: CurrencyCode
): AuditSubscriptionAnswer[] {
  const presetsById = new Map(subscriptionPresets(currency).map((p) => [p.id, p]));
  return selections.map((s) => ({
    id: s.id,
    name: s.customName || presetsById.get(s.id as never)?.name || s.id,
    amountCents: s.amountCents,
    edited: s.edited,
  }));
}

/** Resolve persisted step-2 selections into formula-ready answers with display names. */
export function resolveViceAnswers(
  selections: AuditViceSelection[],
  currency: CurrencyCode
): AuditViceAnswer[] {
  const presetsById = new Map(vicePresets(currency).map((p) => [p.id, p]));
  return selections.map((s) => ({
    id: s.id,
    name: presetsById.get(s.id as never)?.name || s.id,
    perItemCents: s.perItemCents,
    edited: s.edited,
    band: s.band,
    answered: s.answered,
  }));
}

/**
 * Round to the nearest 10 major currency units (section 4). Operates on cents,
 * so "nearest 10" means nearest 1000 minor units for a 2-decimal currency. For
 * zero-decimal currencies (JPY) minor unit === major unit, so this still rounds
 * to the nearest 10 yen equivalently, since callers pass cents-equivalent
 * integers throughout and only formatting differentiates JPY.
 */
export function roundToTen(cents: number): number {
  const unit = 1000; // 10 major units, in cents
  return Math.round(cents / unit) * unit;
}

/**
 * The projection formula (section 4):
 *   yearlyLeak = roundTo10( sum(subscriptions monthly * 12) + sum(vices bandMidpoint * perItem * 52) )
 *
 * Returns null when both inputs are empty in the "both-empty" sense (section 8,
 * edge case "Both empty"): no subscriptions AND every vice is Never or
 * unanswered. Callers use null to trigger the honest no-number path instead of
 * a fabricated figure.
 */
export function computeProjection(
  subscriptions: AuditSubscriptionAnswer[],
  vices: AuditViceAnswer[]
): AuditProjection | null {
  const subsYearlyCents = subscriptions.reduce((sum, s) => sum + s.amountCents * 12, 0);

  const viceLines: AuditBreakdownLine[] = vices
    .filter((v) => v.band !== 'never')
    .map((v) => ({
      source: v.name,
      yearlyCents: Math.round(BAND_MIDPOINTS[v.band] * v.perItemCents * 52),
    }));

  const vicesYearlyCents = viceLines.reduce((sum, l) => sum + l.yearlyCents, 0);

  // A selected-but-zero-amount subscription (e.g. an unfinished "Something
  // else" chip) is not a real leak: guard on the total, not just presence, so
  // it can't fake a non-empty projection (section 8, "no fake number").
  const hasAnySubs = subsYearlyCents > 0;
  const hasAnyVice = viceLines.length > 0;

  if (!hasAnySubs && !hasAnyVice) {
    return null;
  }

  const yearlyCents = roundToTen(subsYearlyCents + vicesYearlyCents);
  const monthlyCents = Math.round(yearlyCents / 12);

  const breakdown: AuditBreakdownLine[] = [...viceLines];
  if (hasAnySubs) {
    breakdown.push({ source: 'Subscriptions', yearlyCents: Math.round(subsYearlyCents) });
  }
  breakdown.sort((a, b) => b.yearlyCents - a.yearlyCents);

  const hasEdits =
    subscriptions.some((s) => s.edited) || vices.some((v) => v.band !== 'never' && v.edited);

  return {
    yearlyCents,
    monthlyCents,
    breakdown: breakdown.slice(0, 3),
    hasEdits,
    nSources: breakdown.length,
  };
}

/** Running total footer for step 1 (section 3.3): sum of selected subscription chips. */
export function subscriptionsMonthlyTotal(subscriptions: Pick<AuditSubscriptionAnswer, 'amountCents'>[]): number {
  return subscriptions.reduce((sum, s) => sum + s.amountCents, 0);
}

/**
 * Running total footer for step 2 (section 3.4): weekly cost added by the
 * currently-selected bands. Never-band and unanswered rows contribute 0.
 */
export function vicesWeeklyTotal(vices: Pick<AuditViceAnswer, 'band' | 'perItemCents'>[]): number {
  return Math.round(
    vices.reduce((sum, v) => sum + BAND_MIDPOINTS[v.band] * v.perItemCents, 0)
  );
}

/**
 * Whether the running total should show a tilde (section 3.3): true whenever
 * at least one counted price is still a preset (not user-edited). Only every
 * counted price being user-set drops the tilde.
 */
export function totalHasTilde(items: Pick<AuditSubscriptionAnswer, 'edited'>[]): boolean {
  if (items.length === 0) return true;
  return items.some((i) => !i.edited);
}

/** Representative occurrences/period for a vice band, for the pick-one sheet evidence line. */
const BAND_OCCURRENCES_PER_WEEK: Record<FrequencyBand, number> = {
  never: 0,
  oneToTwo: 2,
  threeToFive: 4,
  daily: 7,
};

export type BiggestLeakCandidate = {
  /** Stable merchant-like key for HabitsContext.seedDiscoveredHabit matching. */
  key: string;
  name: string;
  averageAmountCents: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  occurrencesPerPeriod: number;
  totalMonthlySpendCents: number;
};

/**
 * The single concrete habit behind the reveal's biggest breakdown line
 * (section 3.5, "Plug the biggest leak"). The breakdown's "Subscriptions" line
 * is a combined bucket; the pick-one sheet needs one concrete habit, so when
 * subscriptions is biggest this picks the single largest subscription chip.
 * Returns null only when there is nothing to plug (both-empty case).
 */
export function biggestLeakCandidate(
  subscriptions: AuditSubscriptionAnswer[],
  vices: AuditViceAnswer[]
): BiggestLeakCandidate | null {
  const answeredVices = vices.filter((v) => v.band !== 'never');
  const biggestVice = answeredVices.reduce<AuditViceAnswer | null>((max, v) => {
    const yearly = BAND_MIDPOINTS[v.band] * v.perItemCents * 52;
    const maxYearly = max ? BAND_MIDPOINTS[max.band] * max.perItemCents * 52 : -1;
    return yearly > maxYearly ? v : max;
  }, null);
  const biggestViceYearly = biggestVice
    ? BAND_MIDPOINTS[biggestVice.band] * biggestVice.perItemCents * 52
    : -1;

  const subsYearlyTotal = subscriptions.reduce((sum, s) => sum + s.amountCents * 12, 0);

  // A zero-amount subscription (e.g. an unfinished "Something else" chip) is
  // not a real leak to plug: only prefer subscriptions when they actually
  // carry a positive total, otherwise fall through to the vice branch (or to
  // null, the honest both-empty path) rather than seeding a $0 habit.
  if (subsYearlyTotal > 0 && subsYearlyTotal > biggestViceYearly) {
    const biggestSub = subscriptions.reduce((max, s) => (s.amountCents > max.amountCents ? s : max));
    return {
      key: `audit-sub-${biggestSub.id}`,
      name: biggestSub.name,
      averageAmountCents: biggestSub.amountCents,
      frequency: 'monthly',
      occurrencesPerPeriod: 1,
      totalMonthlySpendCents: biggestSub.amountCents,
    };
  }

  if (biggestVice) {
    const occurrencesPerWeek = BAND_OCCURRENCES_PER_WEEK[biggestVice.band];
    const isDaily = biggestVice.band === 'daily';
    return {
      key: `audit-vice-${biggestVice.id}`,
      name: biggestVice.name,
      averageAmountCents: biggestVice.perItemCents,
      frequency: isDaily ? 'daily' : 'weekly',
      occurrencesPerPeriod: isDaily ? 1 : occurrencesPerWeek,
      totalMonthlySpendCents: Math.round(
        BAND_MIDPOINTS[biggestVice.band] * biggestVice.perItemCents * (52 / 12)
      ),
    };
  }

  return null;
}

/**
 * The seedDiscoveredHabit input shape for a BiggestLeakCandidate (reveal's
 * "Plug the biggest leak" and success's "Break it" both call this rather than
 * each hand-building the object literal, so the mapping can't drift between
 * the two screens).
 */
export function candidateToSeedInput(candidate: BiggestLeakCandidate, categoryId: string) {
  return {
    merchantPattern: candidate.key,
    name: candidate.name,
    description: '',
    categoryId,
    averageAmount: candidate.averageAmountCents,
    frequency: candidate.frequency,
    occurrencesPerPeriod: candidate.occurrencesPerPeriod,
    totalMonthlySpend: candidate.totalMonthlySpendCents,
  };
}
