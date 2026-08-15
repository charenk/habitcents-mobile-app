/**
 * The bills offer (PRD v3.1 sect 8, phase 5).
 *
 * Governing rule: tracking an essential is fine, proposing you skip it is not.
 * Same data, different verb. These tests pin the two things that make the offer
 * safe to show: it only ever offers money the user actually PAYS, and it never
 * asks about a merchant the deck already dealt.
 */
import type { RecurringItem, ScanResult } from '@/utils/leakScan/types';
import {
  billGroupOf,
  buildBillsOffer,
  defaultSelection,
  isEssentialBill,
  isPayable,
  offerCount,
  offerItems,
} from '@/utils/leakScan/bills';

function item(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    merchantStem: 'hydro',
    merchantDisplay: 'Hydro One',
    category: 'Utilities',
    rowClass: 'spend',
    amountCents: 8500,
    interval: 'monthly',
    occurrences: 3,
    lastDateISO: '2026-06-01',
    nextDateISO: '2026-07-01',
    nextMonthHits: 1,
    ...overrides,
  };
}

function scanResult(recurring: RecurringItem[]): ScanResult {
  return {
    importId: 'imp-1',
    status: 'ok',
    files: [],
    rows: [],
    questions: [],
    transfers: [],
    refunds: [],
    duplicatesMerged: 0,
    recurring,
    habits: [],
    coverage: { startISO: '2026-04-01', endISO: '2026-06-30', spanDays: 91, coveredDays: 27 },
    tier: 'solid',
    gracefulFailure: false,
  };
}

describe('what may be offered', () => {
  it('offers spending', () => {
    expect(isPayable(item())).toBe(true);
  });

  // detectRecurring runs over every non-internal row, not just outflows, so a
  // fortnightly payroll deposit is exactly as "recurring" as rent. Offering to
  // add someone's salary to their upcoming expenses would be absurd.
  it('never offers income', () => {
    expect(isPayable(item({ rowClass: 'income', merchantStem: 'payroll' }))).toBe(false);
  });

  it('never offers transfers or cash withdrawals', () => {
    expect(isPayable(item({ rowClass: 'transfer' }))).toBe(false);
    expect(isPayable(item({ rowClass: 'cash' }))).toBe(false);
  });

  it('never offers a zero-amount row', () => {
    expect(isPayable(item({ amountCents: 0 }))).toBe(false);
  });

  it('keeps non-spend rows out of the built offer', () => {
    const offer = buildBillsOffer(
      scanResult([
        item({ merchantStem: 'rent', category: 'Mortgage', amountCents: 120000 }),
        item({ merchantStem: 'payroll', rowClass: 'income', amountCents: 400000 }),
      ])
    );

    expect(offerItems(offer).map((i) => i.merchantStem)).toEqual(['rent']);
  });
});

describe('grouping', () => {
  it('separates subscriptions from bills', () => {
    expect(billGroupOf(item({ merchantStem: 'netflix' }))).toBe('subscription');
    expect(billGroupOf(item({ category: 'Software & Subscriptions' }))).toBe('subscription');
    expect(billGroupOf(item({ merchantStem: 'hydro' }))).toBe('bill');
  });

  it('puts each into its own list, largest first', () => {
    const offer = buildBillsOffer(
      scanResult([
        item({ merchantStem: 'hydro', amountCents: 8500 }),
        item({ merchantStem: 'rent', category: 'Mortgage', amountCents: 120000 }),
        item({ merchantStem: 'netflix', amountCents: 1899 }),
        item({ merchantStem: 'spotify', amountCents: 1199 }),
      ])
    );

    expect(offer.bills.map((i) => i.merchantStem)).toEqual(['rent', 'hydro']);
    expect(offer.subscriptions.map((i) => i.merchantStem)).toEqual(['netflix', 'spotify']);
    expect(offerCount(offer)).toBe(4);
  });

  it('marks the locked-category rows so the copy can explain them', () => {
    expect(isEssentialBill(item({ category: 'Mortgage' }))).toBe(true);
    expect(isEssentialBill(item({ category: 'Healthcare' }))).toBe(true);
    expect(isEssentialBill(item({ category: 'Utilities' }))).toBe(false);
  });
});

describe('what the deck already dealt', () => {
  // Proposing the same merchant twice under two different verbs ("break this"
  // then "file this") would read as the app not remembering the last screen.
  it('excludes merchants the deck offered', () => {
    const offer = buildBillsOffer(
      scanResult([
        item({ merchantStem: 'starbucks', category: 'Food', amountCents: 600 }),
        item({ merchantStem: 'rent', category: 'Mortgage', amountCents: 120000 }),
      ]),
      ['starbucks']
    );

    expect(offerItems(offer).map((i) => i.merchantStem)).toEqual(['rent']);
  });
});

describe('the offer is scope-blind, on purpose', () => {
  // Scope decides what may be PROPOSED as a habit, not what the app will help
  // you track. Locked and out-of-scope spending is exactly what this screen
  // exists to catch, which is why it draws from result.recurring rather than
  // the scope-filtered candidates.
  it('offers locked-category and out-of-scope recurring spending', () => {
    const offer = buildBillsOffer(
      scanResult([
        item({ merchantStem: 'rent', category: 'Mortgage', amountCents: 120000 }),
        item({ merchantStem: 'clinic', category: 'Healthcare', amountCents: 9000 }),
        item({ merchantStem: 'transit', category: 'Transportation', amountCents: 15600 }),
      ])
    );

    expect(offerItems(offer).map((i) => i.merchantStem).sort()).toEqual([
      'clinic',
      'rent',
      'transit',
    ]);
  });
});

describe('the default selection', () => {
  // "Propose, don't ask": everything starts ticked and the user unticks what
  // they do not want. The opposite default from scope, and deliberately so:
  // there the risk is proposing something the app should not, here the only
  // risk is bookkeeping the user can undo in one tap.
  it('starts with every row on', () => {
    const offer = buildBillsOffer(
      scanResult([item({ merchantStem: 'rent' }), item({ merchantStem: 'netflix' })])
    );

    expect(defaultSelection(offer)).toEqual(new Set(['rent', 'netflix']));
  });

  it('is empty for an empty offer', () => {
    const offer = buildBillsOffer(scanResult([]));
    expect(offerCount(offer)).toBe(0);
    expect(defaultSelection(offer).size).toBe(0);
  });
});
