/**
 * The 14 Leak Scan acceptance tests (spec section 9), 1:1 with the spec list. Every
 * fixture is SYNTHETIC (see fixtures.ts). No real bank data anywhere.
 */

// scanRules imports AsyncStorage at module load; mock it (matches storage.test.ts).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  runScan,
  seedLast15Days,
  recurringToExpenses,
  undoImport,
  headerFingerprint,
  detectHeader,
  preflight,
  parseCsv,
  spendableRows,
  totalSpendCents,
} from '@/utils/leakScan';
import { scanFailed } from '@/utils/leakScan/analytics';
import {
  emptyScanRules,
  setMerchantCategory,
} from '@/utils/scanRules';
import {
  bomPreambleFile,
  chequingBalanceFile,
  cardTypeFile,
  transferChequingFile,
  transferCardFile,
  refundFile,
  etransferFile,
  biweeklyLoanFile,
  truncatedFile,
  yearSiblingFile,
  messyMerchantFile,
  walmartFile,
  dupeFile,
  garbageFile,
  jpyFile,
} from './fixtures';

describe('Leak Scan acceptance tests (spec section 9)', () => {
  // 1. BOM + preamble.
  it('1. parses a BOM + preamble file; preamble discarded; header found', () => {
    const pre = preflight(bomPreambleFile.text);
    expect(pre.hadBom).toBe(true);
    const parsed = parseCsv(pre);
    const header = detectHeader(parsed.rows);
    expect(header.headerFound).toBe(true);
    expect(header.preambleDiscarded).toBeGreaterThanOrEqual(1);
    expect(header.headers).toEqual(['Date', 'Description', 'Amount', 'Balance']);

    const result = runScan([bomPreambleFile]);
    expect(result.status).not.toBe('failed');
    expect(result.rows.length).toBeGreaterThan(0);
  });

  // 2. Chequing, debits negative, Balance column -> sign proven, confidence 1.0, no question.
  it('2. proves sign via the balance walk with confidence 1.0 and asks no question', () => {
    const result = runScan([chequingBalanceFile]);
    const file = result.files[0];
    expect(file.sign.method).toBe('balance');
    expect(file.sign.confidence).toBe(1);
    // Debits negative in file -> outflow already negative -> outflowSign +1.
    expect(file.sign.outflowSign).toBe(1);
    expect(result.questions).toHaveLength(0);
    // Spend rows carry negative signed cents.
    expect(spendableRows(result.rows).every((r) => r.amountCents < 0)).toBe(true);
  });

  // 3. Card file, debits positive, Type column, no balance -> sign via type, no question.
  it('3. detects sign via the type column with no question asked', () => {
    const result = runScan([cardTypeFile]);
    const file = result.files[0];
    expect(file.sign.method).toBe('type');
    // Debits positive in file -> outflow positive -> outflowSign -1.
    expect(file.sign.outflowSign).toBe(-1);
    expect(result.questions).toHaveLength(0);
    // A debit purchase becomes a negative (outflow) signed amount.
    const shop = result.rows.find((r) => r.rawDescription.includes('Online Shop'));
    expect(shop?.amountCents).toBeLessThan(0);
    // The statement payment (credit) is an inflow / transfer, not spend.
    const payment = result.rows.find((r) => r.rawDescription.includes('Statement Payment'));
    expect(payment?.amountCents).toBeGreaterThan(0);
  });

  // 4. Card payment in chequing (debit) and card (credit) 0-1 days apart -> netted internal.
  it('4. nets a cross-account card payment as an internal transfer', () => {
    const result = runScan([transferChequingFile, transferCardFile]);
    expect(result.transfers.length).toBe(1);
    const pair = result.transfers[0];
    expect(pair.amountCents).toBe(50000); // $500.00
    // Both legs marked internal and excluded from spend totals.
    const legs = result.rows.filter((r) => r.id === pair.outflowRowId || r.id === pair.inflowRowId);
    expect(legs.every((r) => r.internal)).toBe(true);
    const spendTitles = spendableRows(result.rows).map((r) => r.rawDescription);
    expect(spendTitles.some((t) => /Credit Card Payment|Payment From Chequing/.test(t))).toBe(false);
  });

  // 5. Equal charge + refund 7 days apart, same merchant -> paired reversed, net zero.
  it('5. nets a charge/refund pair to zero and badges both rows', () => {
    const result = runScan([refundFile]);
    expect(result.refunds.length).toBe(1);
    const pair = result.refunds[0];
    expect(pair.amountCents).toBe(180687);
    const both = result.rows.filter((r) => r.id === pair.chargeRowId || r.id === pair.refundRowId);
    expect(both.length).toBe(2);
    expect(both.every((r) => r.reversed)).toBe(true);
    // The reversed charge does not count toward spend.
    const spend = spendableRows(result.rows);
    expect(spend.some((r) => Math.abs(r.amountCents) === 180687)).toBe(false);
  });

  // 6. $11 e-transfer monthly x7 with date drift -> fixed monthly recurrence.
  it('6. detects the $11 monthly e-transfer despite 13th-20th date drift', () => {
    const result = runScan([etransferFile]);
    const rec = result.recurring.find((r) => r.amountCents === 1100);
    expect(rec).toBeDefined();
    expect(rec?.interval).toBe('monthly');
    expect(rec?.occurrences).toBe(7);
  });

  // 7. Biweekly loan -> 3-payment-month projection shows 3 hits + flag.
  it('7. flags a 3-payment month for the biweekly loan', () => {
    const result = runScan([biweeklyLoanFile]);
    const loan = result.recurring.find((r) => r.interval === 'biweekly');
    expect(loan).toBeDefined();
    expect(loan?.amountCents).toBe(29380);
    // The month after the last hit (2026-06-26) is July, which has 3 biweekly hits.
    expect(loan?.nextMonthHits).toBe(3);
  });

  // 8. 100-row 30-day export beside a 12-month sibling -> truncation banner fires.
  it('8. fires the truncation flag on the cut-off export', () => {
    const result = runScan([truncatedFile, yearSiblingFile]);
    const trunc = result.files.find((f) => f.fileName === truncatedFile.fileName);
    expect(trunc?.truncated).toBe(true);
    // The sibling covering a full year is not flagged.
    const sibling = result.files.find((f) => f.fileName === yearSiblingFile.fileName);
    expect(sibling?.truncated).toBe(false);
  });

  // 9. Same file twice in one session -> 100% duplicate merge, totals unchanged.
  it('9. merges a fully duplicated re-import; totals unchanged', () => {
    const once = runScan([dupeFile]);
    const twice = runScan([dupeFile, { ...dupeFile, fileName: 'chequing-dupe-copy.csv' }]);
    expect(twice.duplicatesMerged).toBe(3);
    expect(totalSpendCents(twice.rows)).toBe(totalSpendCents(once.rows));
    expect(twice.rows.length).toBe(once.rows.length);
  });

  // 10. Messy merchant -> stem normalized, location/method stripped, Food (likely).
  it('10. normalizes "BIRYANIWALLA CAMBRIDGE ... (Apple Pay)" to a Food stem', () => {
    const result = runScan([messyMerchantFile]);
    const row = result.rows.find((r) => r.rawDescription.includes('BIRYANIWALLA'));
    expect(row).toBeDefined();
    expect(row?.merchantStem).toBe('biryaniwalla');
    expect(row?.category).toBe('Food');
    expect(row?.categoryTier).toBe('likely');
  });

  // 11. Recategorize one Walmart row -> all Walmart rows move; rule persists to a new scan.
  it('11. a Walmart recategorization moves all Walmart rows and persists across scans', () => {
    const first = runScan([walmartFile]);
    const walmartRow = first.rows.find((r) => r.merchantStem.startsWith('walmart'));
    expect(walmartRow).toBeDefined();
    // Built-in maps Walmart to Shopping already; user recategorizes to Food.
    const rules = setMerchantCategory(emptyScanRules(), walmartRow!.merchantStem, 'Food');

    // Second scan, brand-new session, applying the persisted rule.
    const second = runScan([walmartFile], { rules });
    const walmartRows = second.rows.filter((r) => r.merchantStem.startsWith('walmart'));
    expect(walmartRows.length).toBeGreaterThanOrEqual(3);
    expect(walmartRows.every((r) => r.category === 'Food')).toBe(true);
    expect(walmartRows.every((r) => r.categoryTier === 'solid')).toBe(true);
  });

  // 12. Garbage file -> graceful failure, scan_failed fired, no partial numbers.
  it('12. fails gracefully on a garbage file with no partial numbers shown', () => {
    const result = runScan([garbageFile]);
    expect(result.status).toBe('failed');
    expect(result.gracefulFailure).toBe(true);
    expect(result.rows).toHaveLength(0);
    expect(result.habits).toHaveLength(0);
    expect(result.recurring).toHaveLength(0);
    expect(result.coverage).toBeNull();

    // scan_failed telemetry is structural only (no strings/amounts/contents).
    const failed = result.files[0];
    const event = scanFailed({
      nFiles: 1,
      encodingGuess: 'utf-8',
      delimiterGuess: ',',
      headerFound: failed?.headerFound ?? false,
      dateParseRate: 0,
      amountParseRate: 0,
      signConfidence: failed?.sign.confidence ?? 0,
    });
    expect(event.event).toBe('scan_failed');
    expect(Object.values(event).every((v) => typeof v !== 'string' || !/\$|\d{2}:\d{2}/.test(v))).toBe(true);
  });

  // 13. JPY-configured account -> zero-minor-unit amounts.
  it('13. handles a JPY (zero-decimal) file with whole-yen amounts', () => {
    const result = runScan([jpyFile], { homeCurrency: 'JPY' });
    expect(result.status).not.toBe('failed');
    const ramen = result.rows.find((r) => r.rawDescription.includes('Ramen'));
    // 1200 yen stored as 120000 "cents" (integer * 100), consistent with the app.
    expect(ramen?.amountCents).toBe(-120000);
    // Not flagged foreign: currency column matches the home JPY.
    expect(result.rows.every((r) => !r.foreign)).toBe(true);
  });

  // 14. Undo after a full import reverts log, recurring, habits, and baselines.
  it('14. undo removes every expense a full import wrote, leaving other data intact', () => {
    const result = runScan([subscriptionFileForUndo()]);
    const seeded = seedLast15Days(result, new Date('2026-03-10'));
    const recurringExpenses = recurringToExpenses(result);
    const preExisting = [manualExpense()];

    const log = [...preExisting, ...seeded, ...recurringExpenses];
    expect(log.length).toBeGreaterThan(preExisting.length);
    expect(log.every((e) => e.source === 'import' ? e.importId === result.importId : true)).toBe(true);

    const afterUndo = undoImport(log, result.importId);
    expect(afterUndo).toEqual(preExisting);
    // No imported rows survive undo.
    expect(afterUndo.some((e) => e.importId === result.importId)).toBe(false);
  });
});

// --- Local helpers for test 14 (kept out of the shared fixtures file). ---

function subscriptionFileForUndo() {
  return {
    fileName: 'chequing-undo.csv',
    text:
      'Date,Description,Amount,Balance\n' +
      '2026-03-01,Grocery Market,-40.00,960.00\n' +
      '2026-03-03,Coffee Corner,-5.00,955.00\n' +
      '2026-01-05,NETFLIX.COM,-15.99,1000.00\n' +
      '2026-02-05,NETFLIX.COM,-15.99,984.01\n' +
      '2026-03-05,NETFLIX.COM,-15.99,968.02\n',
  };
}

function manualExpense() {
  return {
    id: 'manual-1',
    title: 'Manual Coffee',
    amount: 450,
    category: 'Food' as const,
    date: new Date('2026-03-09'),
    time: '9:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    source: 'manual' as const,
    iconVariant: 'yellow' as const,
  };
}
