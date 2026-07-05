/** SYNTHETIC fixtures built directly at the ScanRow shape. */
import { buildReviewQueue } from '@/utils/leakScan/reviewQueue';
import type { ScanRow } from '@/utils/leakScan/types';

let rowCounter = 0;
function row(overrides: Partial<ScanRow> = {}): ScanRow {
  rowCounter += 1;
  return {
    id: `r${rowCounter}`,
    dateISO: '2026-01-01',
    date: new Date('2026-01-01'),
    amountCents: -1000,
    rawDescription: 'Test Merchant',
    merchantStem: 'test',
    merchantDisplay: 'Test Merchant',
    category: 'Other',
    categoryTier: 'needs-review',
    rowClass: 'spend',
    account: 'A',
    pending: false,
    foreign: false,
    internal: false,
    reversed: false,
    needsReview: false,
    hash: `h${rowCounter}`,
    ...overrides,
  };
}

describe('buildReviewQueue', () => {
  it('includes only needs-review rows', () => {
    const rows = [
      row({ merchantStem: 'unknown1', categoryTier: 'needs-review' }),
      row({ merchantStem: 'known1', categoryTier: 'solid' }),
    ];
    const queue = buildReviewQueue(rows);
    expect(queue).toHaveLength(1);
    expect(queue[0].merchantStem).toBe('unknown1');
  });

  it('groups by merchant stem and sums dollar impact', () => {
    const rows = [
      row({ merchantStem: 'unknown1', amountCents: -1000 }),
      row({ merchantStem: 'unknown1', amountCents: -2000 }),
    ];
    const queue = buildReviewQueue(rows);
    expect(queue).toHaveLength(1);
    expect(queue[0].totalCents).toBe(3000);
  });

  it('ranks by absolute dollar impact descending', () => {
    const rows = [
      row({ merchantStem: 'small', amountCents: -500 }),
      row({ merchantStem: 'big', amountCents: -50000 }),
    ];
    const queue = buildReviewQueue(rows);
    expect(queue[0].merchantStem).toBe('big');
    expect(queue[1].merchantStem).toBe('small');
  });

  it('caps the queue at 10 merchants', () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      row({ merchantStem: `merchant${i}`, amountCents: -(i + 1) * 100 })
    );
    const queue = buildReviewQueue(rows);
    expect(queue).toHaveLength(10);
  });

  it('excludes internal/reversed/non-spend rows even if flagged needs-review', () => {
    const rows = [
      row({ merchantStem: 'internal1', internal: true }),
      row({ merchantStem: 'reversed1', reversed: true }),
      row({ merchantStem: 'transfer1', rowClass: 'transfer' }),
    ];
    const queue = buildReviewQueue(rows);
    expect(queue).toHaveLength(0);
  });

  it('returns an empty queue when there is nothing to review', () => {
    const rows = [row({ categoryTier: 'solid' })];
    expect(buildReviewQueue(rows)).toHaveLength(0);
  });
});
