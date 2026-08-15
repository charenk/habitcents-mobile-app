/**
 * The habit deck (PRD v3.1 sect 7.3, phase 3).
 *
 * Two properties carry the design: only behavioral spending reaches a card, and
 * the order is frequency first. Ranking by total spend was rejected because it
 * surfaces exactly the semi-essential spending the redesign exists to keep out,
 * and it is the same ordering that let rent lead the results screen.
 */
import type { HabitCandidate } from '@/utils/leakScan/types';
import {
  DECK_CAP,
  billsCandidates,
  deckCandidates,
  isDeckEligible,
  perInstanceCents,
  rankForDeck,
} from '@/utils/leakScan/deck';

function candidate(overrides: Partial<HabitCandidate> = {}): HabitCandidate {
  return {
    merchantStem: 'starbucks',
    merchantDisplay: 'Starbucks',
    category: 'Food',
    governClass: 'govern',
    tier: 'solid',
    occurrences: 12,
    activeDays: 10,
    totalCents: 7200,
    annualizedLeakCents: 84000,
    rankScore: 84000,
    topMerchants: ['Starbucks'],
    isBehavioral: true,
    isSubscription: false,
    ...overrides,
  };
}

describe('deck eligibility', () => {
  it('admits an ordinary behavioral leak', () => {
    expect(isDeckEligible(candidate())).toBe(true);
  });

  it('rejects a recurring commitment that is not behavioral', () => {
    // A monthly bill is real spending, but it is not a habit anyone skips.
    expect(isDeckEligible(candidate({ isBehavioral: false }))).toBe(false);
  });

  it('rejects a subscription, however behavioral it looks', () => {
    // Cancelled once, not skipped daily. It reaches the user through the bills
    // offer with its cadence attached.
    expect(isDeckEligible(candidate({ isSubscription: true }))).toBe(false);
  });

  it('rejects a fixed-class candidate', () => {
    // Every deck card carries a skippable action; a card the user cannot act
    // on is not a card.
    expect(isDeckEligible(candidate({ governClass: 'fixed' }))).toBe(false);
  });

  it('rejects an influence-class candidate', () => {
    // Its own card elsewhere offers Monitor, never Break it.
    expect(isDeckEligible(candidate({ governClass: 'influence' }))).toBe(false);
  });
});

describe('deck ranking', () => {
  it('ranks frequency first, not total spend', () => {
    // The PRD's own example: coffee at 14 x $6 outranks a weekly big-box run
    // at 4 x $40, even though the big-box run costs more in total.
    const coffee = candidate({ merchantStem: 'coffee', occurrences: 14, totalCents: 8400 });
    const bigBox = candidate({ merchantStem: 'bigbox', occurrences: 4, totalCents: 16000 });

    expect(rankForDeck([bigBox, coffee]).map((c) => c.merchantStem)).toEqual(['coffee', 'bigbox']);
  });

  it('breaks a frequency tie on per-instance cost', () => {
    const cheap = candidate({ merchantStem: 'cheap', occurrences: 10, totalCents: 2000 });
    const pricey = candidate({ merchantStem: 'pricey', occurrences: 10, totalCents: 9000 });

    expect(rankForDeck([cheap, pricey]).map((c) => c.merchantStem)).toEqual(['pricey', 'cheap']);
  });

  it('is stable when frequency and price both tie', () => {
    const a = candidate({ merchantStem: 'aaa', occurrences: 5, totalCents: 5000 });
    const b = candidate({ merchantStem: 'bbb', occurrences: 5, totalCents: 5000 });

    // Deterministic, so the deck does not reshuffle between renders or between
    // a scan and its re-run.
    expect(rankForDeck([b, a]).map((c) => c.merchantStem)).toEqual(['aaa', 'bbb']);
    expect(rankForDeck([a, b]).map((c) => c.merchantStem)).toEqual(['aaa', 'bbb']);
  });

  it('does not mutate its input', () => {
    const list = [candidate({ merchantStem: 'b', occurrences: 1 }), candidate({ merchantStem: 'a', occurrences: 9 })];
    rankForDeck(list);
    expect(list.map((c) => c.merchantStem)).toEqual(['b', 'a']);
  });

  it('computes per-instance cost as a price, not a rate', () => {
    expect(perInstanceCents(candidate({ occurrences: 14, totalCents: 8400 }))).toBe(600);
    // Guard the divide-by-zero rather than returning Infinity into a card.
    expect(perInstanceCents(candidate({ occurrences: 0, totalCents: 8400 }))).toBe(0);
  });
});

describe('the deck itself', () => {
  it('caps at three cards', () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      candidate({ merchantStem: `m${i}`, occurrences: 20 - i })
    );
    const deck = deckCandidates(many);

    expect(DECK_CAP).toBe(3);
    expect(deck).toHaveLength(3);
    expect(deck.map((c) => c.merchantStem)).toEqual(['m0', 'm1', 'm2']);
  });

  it('is empty when nothing is behavioral', () => {
    expect(
      deckCandidates([
        candidate({ merchantStem: 'rent', isBehavioral: false, governClass: 'fixed' }),
        candidate({ merchantStem: 'netflix', isSubscription: true }),
      ])
    ).toHaveLength(0);
  });

  it('keeps the non-deck findings for the bills offer instead of dropping them', () => {
    const rent = candidate({ merchantStem: 'rent', isBehavioral: false, governClass: 'fixed' });
    const netflix = candidate({ merchantStem: 'netflix', isSubscription: true });
    const coffee = candidate({ merchantStem: 'coffee' });

    const all = [rent, netflix, coffee];
    expect(deckCandidates(all).map((c) => c.merchantStem)).toEqual(['coffee']);
    // Nothing the scan found is silently discarded: what the deck passes over,
    // the bills offer picks up.
    expect(billsCandidates(all).map((c) => c.merchantStem)).toEqual(['rent', 'netflix']);
  });

  it('partitions candidates with no overlap and no loss', () => {
    const all = [
      candidate({ merchantStem: 'a' }),
      candidate({ merchantStem: 'b', isSubscription: true }),
      candidate({ merchantStem: 'c', governClass: 'influence' }),
      candidate({ merchantStem: 'd', isBehavioral: false }),
    ];

    const deckStems = deckCandidates(all).map((c) => c.merchantStem);
    const billStems = billsCandidates(all).map((c) => c.merchantStem);

    expect(deckStems.filter((s) => billStems.includes(s))).toEqual([]);
    expect([...deckStems, ...billStems].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
