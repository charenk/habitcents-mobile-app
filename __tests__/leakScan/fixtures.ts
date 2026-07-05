/**
 * SYNTHETIC Leak Scan fixtures. These replicate the STRUCTURES the spec names
 * (BOM + preamble rows, opposite sign conventions, charge/refund pair, recurring
 * e-transfer, truncated export) using entirely invented data. NEVER real bank
 * statements. All merchants, amounts, and dates are made up for testing.
 */

const BOM = '﻿';

/**
 * Acceptance 1: BOM + a preamble filter-description string in data row 1, then a
 * real header, then chequing-style rows with a Balance column and negative debits.
 */
export const bomPreambleFile = {
  fileName: 'chequing.csv',
  text:
    BOM +
    'Custom filters, From date=2026-01-01, To date=2026-01-31\n' +
    'Date,Description,Amount,Balance\n' +
    '2026-01-05,Groceries Market,-52.40,1947.60\n' +
    '2026-01-08,Coffee Corner,-4.75,1942.85\n' +
    '2026-01-12,Payroll Deposit,2000.00,3942.85\n' +
    '2026-01-15,Hardware Store,-88.10,3854.75\n' +
    '2026-01-20,Pharmacy Plus,-23.30,3831.45\n' +
    '2026-01-25,Restaurant Bistro,-61.00,3770.45\n',
};

/**
 * Acceptance 2: chequing file, debits negative, Balance column present. Sign should
 * be proven via the balance walk with confidence 1.0 and no question asked.
 */
export const chequingBalanceFile = {
  fileName: 'chequing-account.csv',
  text:
    'Date,Description,Amount,Balance\n' +
    '2026-02-01,Opening,0.00,1000.00\n' +
    '2026-02-02,Grocery Market,-40.00,960.00\n' +
    '2026-02-03,Gas Station Shell,-30.00,930.00\n' +
    '2026-02-04,Coffee Corner,-5.00,925.00\n' +
    '2026-02-05,Payroll Deposit,1500.00,2425.00\n' +
    '2026-02-06,Pharmacy Plus,-25.00,2400.00\n' +
    '2026-02-07,Restaurant Bistro,-60.00,2340.00\n',
};

/**
 * Acceptance 3: card file, debits POSITIVE, a Type column, NO balance. Sign via type
 * correlation, no question asked.
 */
export const cardTypeFile = {
  fileName: 'credit-card.csv',
  text:
    'Date,Description,Type,Amount\n' +
    '2026-03-01,Online Shop,Debit,45.00\n' +
    '2026-03-02,Coffee Corner,Debit,5.50\n' +
    '2026-03-03,Statement Payment,Credit,200.00\n' +
    '2026-03-04,Grocery Market,Debit,72.25\n' +
    '2026-03-05,Gas Station Shell,Debit,38.00\n' +
    '2026-03-06,Restaurant Bistro,Debit,55.00\n',
};

/**
 * Acceptance 4: a card payment appears as a debit in chequing and a credit in the
 * card file, 0-1 days apart. Must net as internal.
 */
export const transferChequingFile = {
  fileName: 'chequing-transfer.csv',
  text:
    'Date,Description,Amount,Balance\n' +
    '2026-04-10,Grocery Market,-30.00,970.00\n' +
    '2026-04-15,Credit Card Payment,-500.00,470.00\n' +
    '2026-04-20,Coffee Corner,-6.00,464.00\n',
};
export const transferCardFile = {
  fileName: 'credit-card-transfer.csv',
  text:
    'Date,Description,Type,Amount\n' +
    '2026-04-16,Payment From Chequing,Credit,500.00\n' +
    '2026-04-12,Online Shop,Debit,42.00\n' +
    '2026-04-18,Restaurant Bistro,Debit,58.00\n',
};

/**
 * Acceptance 5: a charge and an equal refund 7 days apart at the same merchant.
 */
export const refundFile = {
  fileName: 'card-refund.csv',
  text:
    'Date,Description,Type,Amount\n' +
    '2026-06-19,Gadget Store Online,Debit,1806.87\n' +
    '2026-06-22,Coffee Corner,Debit,5.00\n' +
    '2026-06-26,Gadget Store Online,Credit,1806.87\n' +
    '2026-06-28,Grocery Market,Debit,44.00\n',
};

/**
 * Acceptance 6: a $11.00 e-transfer, monthly x7, with the day drifting 13th-20th.
 * Detected as a fixed monthly recurrence despite drift.
 */
export const etransferFile = {
  fileName: 'chequing-etransfer.csv',
  text:
    'Date,Description,Amount,Balance\n' +
    '2025-08-13,E-Transfer To Roommate,-11.00,500.00\n' +
    '2025-09-15,E-Transfer To Roommate,-11.00,489.00\n' +
    '2025-10-17,E-Transfer To Roommate,-11.00,478.00\n' +
    '2025-11-14,E-Transfer To Roommate,-11.00,467.00\n' +
    '2025-12-18,E-Transfer To Roommate,-11.00,456.00\n' +
    '2026-01-20,E-Transfer To Roommate,-11.00,445.00\n' +
    '2026-02-16,E-Transfer To Roommate,-11.00,434.00\n',
};

/**
 * Acceptance 7: a biweekly $293.80 loan payment. Projection for a 3-payment month
 * shows 3 hits + flag. Dates chosen so the following month has 3 biweekly hits.
 */
// Last hit is 2026-06-19 so the following month (July) lands 3 biweekly hits:
// 07-03, 07-17, 07-31.
export const biweeklyLoanFile = {
  fileName: 'chequing-loan.csv',
  text:
    'Date,Description,Amount,Balance\n' +
    '2026-04-24,Nissan Auto Loan,-293.80,2000.00\n' +
    '2026-05-08,Nissan Auto Loan,-293.80,1706.20\n' +
    '2026-05-22,Nissan Auto Loan,-293.80,1412.40\n' +
    '2026-06-05,Nissan Auto Loan,-293.80,1118.60\n' +
    '2026-06-19,Nissan Auto Loan,-293.80,824.80\n',
};

/**
 * Acceptance 8: a 100-row export covering ~30 days, alongside a 12-month sibling.
 * Truncation banner should fire; pre-coverage days render hatched (out-of-coverage).
 */
function makeHundredRowMonth(): string {
  let out = 'Date,Description,Amount,Balance\n';
  let balance = 5000;
  // Exactly 100 data rows across ~30 days (Jan 2026).
  for (let i = 0; i < 100; i++) {
    const day = (i % 28) + 1;
    const amount = -(5 + (i % 20));
    balance += amount;
    const dd = String(day).padStart(2, '0');
    out += `2026-01-${dd},Cafe Number ${i % 5},${amount.toFixed(2)},${balance.toFixed(2)}\n`;
  }
  return out;
}
function makeYearSibling(): string {
  let out = 'Date,Description,Amount,Balance\n';
  let balance = 20000;
  // One row per month across 12 months (2025).
  for (let m = 1; m <= 12; m++) {
    const amount = -(100 + m);
    balance += amount;
    const mm = String(m).padStart(2, '0');
    out += `2025-${mm}-15,Monthly Bill Utility,${amount.toFixed(2)},${balance.toFixed(2)}\n`;
  }
  return out;
}
export const truncatedFile = { fileName: 'card-truncated.csv', text: makeHundredRowMonth() };
export const yearSiblingFile = { fileName: 'chequing-year.csv', text: makeYearSibling() };

/**
 * Acceptance 10: a messy merchant with location + payment method to normalize.
 */
export const messyMerchantFile = {
  fileName: 'card-merchants.csv',
  text:
    'Date,Description,Type,Amount\n' +
    '2026-03-10,BIRYANIWALLA CAMBRIDGE Cambridge On (Apple Pay),Debit,18.50\n' +
    '2026-03-11,Coffee Corner,Debit,4.00\n',
};

/**
 * Acceptance 11: several Walmart rows; recategorizing one should move all Walmart
 * rows, and the rule persists to a second scan.
 */
export const walmartFile = {
  fileName: 'card-walmart.csv',
  text:
    'Date,Description,Type,Amount\n' +
    '2026-04-01,WALMART SUPERCENTER #123,Debit,60.00\n' +
    '2026-04-08,WALMART SUPERCENTER #123,Debit,45.00\n' +
    '2026-04-15,WALMART SUPERCENTER #456,Debit,80.00\n' +
    '2026-04-22,Coffee Corner,Debit,4.00\n',
};

/**
 * Acceptance 9: a file that will be imported twice in one session (full duplicate).
 */
export const dupeFile = {
  fileName: 'chequing-dupe.csv',
  text:
    'Date,Description,Amount,Balance\n' +
    '2026-02-01,Grocery Market,-40.00,960.00\n' +
    '2026-02-02,Gas Station Shell,-30.00,930.00\n' +
    '2026-02-03,Coffee Corner,-5.00,925.00\n',
};

/**
 * Acceptance 12: a garbage file of random text (no parseable structure).
 */
export const garbageFile = {
  fileName: 'garbage.txt',
  text:
    'the quick brown fox jumps over the lazy dog\n' +
    'lorem ipsum dolor sit amet consectetur\n' +
    'zzz qqq www random noise here and there\n' +
    'nothing here parses as a date or an amount at all\n',
};

/**
 * Acceptance 13: a JPY-style file (zero minor units). Amounts are whole yen.
 */
export const jpyFile = {
  fileName: 'jpy-card.csv',
  text:
    'Date,Description,Type,Amount,Currency\n' +
    '2026-05-01,Ramen Shop Tokyo,Debit,1200,JPY\n' +
    '2026-05-02,Convenience Store,Debit,540,JPY\n' +
    '2026-05-03,Bookstore Ginza,Debit,3300,JPY\n',
};

/**
 * A subscription file for recurrence + governability (Software & Subscriptions).
 */
export const subscriptionFile = {
  fileName: 'card-subs.csv',
  text:
    'Date,Description,Type,Amount\n' +
    '2025-12-05,NETFLIX.COM,Debit,15.99\n' +
    '2026-01-05,NETFLIX.COM,Debit,15.99\n' +
    '2026-02-05,NETFLIX.COM,Debit,15.99\n' +
    '2026-03-05,NETFLIX.COM,Debit,15.99\n',
};

/** A quoted-field + embedded-newline file for the PapaParse robustness check. */
export const quotedFieldsFile = {
  fileName: 'quoted.csv',
  text:
    'Date,Description,Amount,Balance\n' +
    '2026-01-05,"Store, With Comma",-20.00,980.00\n' +
    '2026-01-06,"Multi\nLine Desc",-15.00,965.00\n' +
    '2026-01-07,Coffee Corner,-4.00,961.00\n',
};

/** A semicolon-delimited file for delimiter sniffing. */
export const semicolonFile = {
  fileName: 'euro-bank.csv',
  text:
    'Date;Description;Amount;Balance\n' +
    '2026-01-05;Grocery Market;-1.234,56;8.765,44\n' +
    '2026-01-06;Coffee Corner;-4,00;8.761,44\n' +
    '2026-01-07;Gas Station;-45,00;8.716,44\n',
};
