/**
 * The bills offer (PRD v3.1 sect 8, phase 5).
 *
 * Governing rule: **tracking an essential is fine, proposing you skip it is
 * not.** Same data, different verb. Everything the deck passed over as
 * un-skippable is still real money on a real schedule, so instead of being
 * discarded it is offered to Upcoming, where the app simply keeps track of it.
 *
 * This is the screen where both halves of the positioning are visible at once:
 * leaks go to habits, bills go to Upcoming, nothing is thrown away.
 */

import type { ExpenseCategory } from '@/types/expense';
import type { RecurringItem, ScanResult } from './types';
import { isSubscriptionStem } from './recurrence';
import { isLocked } from './scope';

/**
 * A subscription is grouped apart from a bill because the action differs: you
 * cancel a subscription, you plan for a bill. Both are tracked, neither is
 * proposed as a habit.
 */
export type BillGroup = 'bill' | 'subscription';

export type BillsOffer = {
  /** Essentials and other fixed commitments: rent, utilities, insurance. */
  bills: RecurringItem[];
  /** Renewing subscriptions, the cancellable half. */
  subscriptions: RecurringItem[];
};

export function billGroupOf(item: RecurringItem): BillGroup {
  return isSubscriptionStem(item.merchantStem, item.category) ? 'subscription' : 'bill';
}

/**
 * Is this recurring item something the user actually PAYS?
 *
 * detectRecurring runs over every non-internal row, not just outflows, so a
 * fortnightly payroll deposit or a standing transfer is exactly as "recurring"
 * as rent. Offering to add someone's salary to their upcoming expenses would be
 * absurd, so spend is the gate. This is the one filter the existing
 * "Save to HabitCents" path in ProjectionSection does not apply.
 */
export function isPayable(item: RecurringItem): boolean {
  return item.rowClass === 'spend' && item.amountCents > 0;
}

/**
 * Build the offer.
 *
 * `excludeStems` carries the merchants the deck already dealt: whatever the
 * user tracked or dismissed as a habit must not reappear here asking to be
 * filed as a bill, which would be the app proposing the same merchant twice
 * under two different verbs.
 *
 * Deliberately drawn from `result.recurring`, which is never scope-filtered.
 * Out-of-scope and locked-category spending is precisely what this screen
 * exists to catch: scope decides what may be PROPOSED as a habit, not what the
 * app is willing to help you track.
 */
export function buildBillsOffer(
  result: ScanResult,
  excludeStems: Iterable<string> = []
): BillsOffer {
  const excluded = new Set(excludeStems);
  const offer: BillsOffer = { bills: [], subscriptions: [] };

  for (const item of result.recurring) {
    if (!isPayable(item)) continue;
    if (excluded.has(item.merchantStem)) continue;
    if (billGroupOf(item) === 'subscription') offer.subscriptions.push(item);
    else offer.bills.push(item);
  }

  // Largest first within each group: the rows worth checking are the ones worth
  // the most, and a stable secondary key keeps the order fixed across renders.
  const byAmount = (a: RecurringItem, b: RecurringItem) =>
    b.amountCents - a.amountCents || a.merchantStem.localeCompare(b.merchantStem);
  offer.bills.sort(byAmount);
  offer.subscriptions.sort(byAmount);

  return offer;
}

/** Every item in the offer, bills first, in display order. */
export function offerItems(offer: BillsOffer): RecurringItem[] {
  return [...offer.bills, ...offer.subscriptions];
}

export function offerCount(offer: BillsOffer): number {
  return offer.bills.length + offer.subscriptions.length;
}

/**
 * The default selection: everything on, which is what "propose, don't ask"
 * means. The user unticks what they do not want rather than hunting for what
 * they do.
 *
 * Note this is the opposite default from scope, and deliberately so. Scope
 * fails closed because the risk there is the app PROPOSING something it should
 * not. Here the risk is only bookkeeping the user can undo in one tap, and the
 * cost of an empty list is that the screen looks like work for nothing.
 */
export function defaultSelection(offer: BillsOffer): Set<string> {
  return new Set(offerItems(offer).map((i) => i.merchantStem));
}

/**
 * A locked-category item, for the copy that explains why rent is here rather
 * than in the deck. Purely presentational; the offer includes it either way.
 */
export function isEssentialBill(item: RecurringItem): boolean {
  return isLocked(item.category as ExpenseCategory);
}
