/**
 * The habit deck (PRD v3.1 sect 7.3, phase 3).
 *
 * At most three cards, each one a decision rather than a reading assignment.
 * The results dashboard is an analyst's report handed to a minute-two user;
 * this is the same evidence shaped as "track it or dismiss it".
 *
 * Two rules do the work:
 *
 * 1. BEHAVIORAL ONLY. A candidate is admitted to the pipeline as a recurring
 *    commitment, a behavioral habit, or a renewing subscription. Only the
 *    middle one is a habit anybody can skip. Commitments and subscriptions are
 *    real spending and are not discarded, they belong to the bills offer,
 *    where the verb is "track" rather than "skip".
 *
 * 2. FREQUENCY FIRST, per-instance cost as the tiebreak. High frequency times
 *    small ticket is the discretionary signature: coffee at 14 x $6 outranks a
 *    weekly big-box run at 4 x $40. Ranking by total spend was rejected because
 *    it surfaces exactly the semi-essential spending the redesign exists to
 *    keep out of the deck, and it is also the ordering that let rent lead the
 *    results screen.
 */

import type { HabitCandidate } from './types';

/** PRD sect 7.3: "Maximum three cards." */
export const DECK_CAP = 3;

/** Per-instance cost, the tiebreak. A price, so it divides by the count. */
export function perInstanceCents(candidate: HabitCandidate): number {
  if (candidate.occurrences <= 0) return 0;
  return Math.round(candidate.totalCents / candidate.occurrences);
}

/**
 * Is this candidate a habit the deck may propose?
 *
 * Governability is checked here as well as upstream on purpose: `fixed` means
 * a commitment, and the whole point of the deck is that every card carries a
 * skippable action. A card the user cannot act on is not a card.
 */
export function isDeckEligible(candidate: HabitCandidate): boolean {
  if (!candidate.isBehavioral) return false;
  // A subscription is cancelled once, not skipped daily. It reaches the user
  // through the bills offer with its cadence attached.
  if (candidate.isSubscription) return false;
  return candidate.governClass === 'govern';
}

/**
 * Order candidates the way the deck presents them: most frequent first, then
 * the pricier per buy. Total spend is deliberately NOT a term.
 *
 * Stable for equal pairs (merchant stem breaks the final tie) so the deck does
 * not reshuffle between renders or between a scan and its re-run.
 */
export function rankForDeck(candidates: HabitCandidate[]): HabitCandidate[] {
  return candidates.slice().sort((a, b) => {
    const byFrequency = b.occurrences - a.occurrences;
    if (byFrequency !== 0) return byFrequency;
    const byPrice = perInstanceCents(b) - perInstanceCents(a);
    if (byPrice !== 0) return byPrice;
    return a.merchantStem.localeCompare(b.merchantStem);
  });
}

/**
 * The deck: at most three eligible candidates, best first.
 *
 * Expects a scope-filtered result's candidates (applyScope has already run), so
 * scope, the locked tier, the essential-merchant guard, and merchant
 * suppression are all upstream of this call.
 */
export function deckCandidates(candidates: HabitCandidate[]): HabitCandidate[] {
  return rankForDeck(candidates.filter(isDeckEligible)).slice(0, DECK_CAP);
}

/**
 * Candidates that are real findings but not deck material: commitments and
 * subscriptions. Kept so the bills offer (phase 5) has its source and nothing
 * the scan found is silently dropped.
 */
export function billsCandidates(candidates: HabitCandidate[]): HabitCandidate[] {
  return candidates.filter((c) => !isDeckEligible(c));
}
