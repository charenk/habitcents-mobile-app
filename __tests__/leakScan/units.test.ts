/**
 * Stage-level unit tests for the Leak Scan (spec section 3 attribute coverage). These
 * exercise the individually-testable pure functions the pipeline is built from. All
 * data is SYNTHETIC.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  parseAmount,
  looksLikeAmount,
  parseDateParts,
  resolveDate,
  stripBom,
  normalizeNewlines,
  neutralizeCell,
  sniffDelimiter,
  preflight,
  parseCsv,
  detectHeader,
  inferColumns,
  normalizeMerchant,
  categorize,
  displayName,
  classifyRow,
  dedupeRows,
  isTruncated,
  median,
  confidenceScore,
  tierFor,
  belowFloor,
  runScan,
  FileTooLargeError,
  assertFileSize,
} from '@/utils/leakScan';
import { emptyScanRules, setMerchantCategory, setDateOrder } from '@/utils/scanRules';
import { quotedFieldsFile, semicolonFile } from './fixtures';

describe('preflight', () => {
  it('strips a UTF-8 BOM', () => {
    const { text, hadBom } = stripBom('﻿hello');
    expect(hadBom).toBe(true);
    expect(text).toBe('hello');
  });

  it('normalizes CRLF and lone CR to LF', () => {
    expect(normalizeNewlines('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('neutralizes formula-injection cells but not real negatives', () => {
    expect(neutralizeCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(neutralizeCell('@import')).toBe("'@import");
    expect(neutralizeCell('+cmd')).toBe("'+cmd");
    // A genuine negative amount is left alone so parsing still works.
    expect(neutralizeCell('-42.10')).toBe('-42.10');
    expect(neutralizeCell('normal')).toBe('normal');
  });

  it('sniffs the delimiter by column consistency', () => {
    expect(sniffDelimiter('a,b,c\n1,2,3\n4,5,6')).toBe(',');
    expect(sniffDelimiter('a;b;c\n1;2;3\n4;5;6')).toBe(';');
    expect(sniffDelimiter('a|b|c\n1|2|3')).toBe('|');
  });

  it('survives quoted fields with commas and embedded newlines', () => {
    const parsed = parseCsv(preflight(quotedFieldsFile.text));
    // The "Multi\nLine Desc" cell must not split the row.
    const dataRows = parsed.rows.filter((r) => r.length === 4);
    expect(dataRows.length).toBeGreaterThanOrEqual(3);
    const comma = parsed.rows.find((r) => r[1] === 'Store, With Comma');
    expect(comma).toBeDefined();
  });
});

describe('amount parsing', () => {
  it('parses parentheses negatives', () => {
    expect(parseAmount('(123.45)')).toEqual({ cents: 12345, cellSign: -1 });
  });
  it('parses trailing minus and CR/DR', () => {
    expect(parseAmount('42.10-')).toEqual({ cents: 4210, cellSign: -1 });
    expect(parseAmount('100.00 DR')).toEqual({ cents: 10000, cellSign: -1 });
    expect(parseAmount('100.00 CR')).toEqual({ cents: 10000, cellSign: 1 });
  });
  it('strips currency symbols and thousands separators (1,234.56)', () => {
    expect(parseAmount('$1,234.56')).toEqual({ cents: 123456, cellSign: 1 });
  });
  it('handles European format 1.234,56 by last-separator rule', () => {
    expect(parseAmount('1.234,56')).toEqual({ cents: 123456, cellSign: 1 });
    expect(parseAmount('-1.234,56')).toEqual({ cents: 123456, cellSign: -1 });
  });
  it('rejects non-numeric and neutralized cells', () => {
    expect(parseAmount('hello')).toBeNull();
    expect(parseAmount("'=SUM(A1)")).toBeNull();
  });

  // A lone comma used to be read as a decimal point no matter what followed it,
  // so a whole-dollar grouped amount parsed 1000 times too small: $1,234 rent
  // imported as $1.23. The digit groups decide now.
  it('reads a lone comma with a full group of three as a thousands separator', () => {
    expect(parseAmount('1,234')).toEqual({ cents: 123400, cellSign: 1 });
    expect(parseAmount('$1,500')).toEqual({ cents: 150000, cellSign: 1 });
    expect(parseAmount('-1,200')).toEqual({ cents: 120000, cellSign: -1 });
    expect(parseAmount('(2,500)')).toEqual({ cents: 250000, cellSign: -1 });
  });

  it('handles several thousands groups, which replace(",") only half-fixed', () => {
    expect(parseAmount('1,234,567')).toEqual({ cents: 123456700, cellSign: 1 });
  });

  it('reads dot-grouped thousands, which used to parse as NaN and drop', () => {
    expect(parseAmount('1.234.567')).toEqual({ cents: 123456700, cellSign: 1 });
  });

  it('still reads a single non-grouping comma as an EU decimal point', () => {
    expect(parseAmount('4,00')).toEqual({ cents: 400, cellSign: 1 });
    expect(parseAmount('12,5')).toEqual({ cents: 1250, cellSign: 1 });
    expect(parseAmount('0,99')).toEqual({ cents: 99, cellSign: 1 });
  });

  it('leaves separator-free and single-dot cells alone', () => {
    expect(parseAmount('1234')).toEqual({ cents: 123400, cellSign: 1 });
    expect(parseAmount('1.234')).toEqual({ cents: 123, cellSign: 1 });
  });

  it('rejects a comma shape that is neither a grouping nor a decimal', () => {
    expect(parseAmount('1,23,45')).toBeNull();
  });

  it('rejects scientific notation instead of silently losing the exponent', () => {
    // The character strip deletes the e before Number() runs, so these used to
    // come back as 1500, 1500 and 153 cents with isFinite none the wiser.
    expect(parseAmount('1e5')).toBeNull();
    expect(parseAmount('1E5')).toBeNull();
    expect(parseAmount('1.5e300')).toBeNull();
    expect(parseAmount('2.5E-3')).toBeNull();
    expect(looksLikeAmount('1e5')).toBe(false);
  });

  it('does not let a currency code containing e look like an exponent', () => {
    expect(parseAmount('100 SEK')).toEqual({ cents: 10000, cellSign: 1 });
    expect(parseAmount('1.50 EUR')).toEqual({ cents: 150, cellSign: 1 });
  });

  it('rounds a third decimal by its digits, not by a float product', () => {
    // 0.145 * 100 is 14.499999999999998, so Math.round gave 14 cents for an
    // amount whose written form says 15.
    expect(parseAmount('0.145')).toEqual({ cents: 15, cellSign: 1 });
    expect(parseAmount('0.144')).toEqual({ cents: 14, cellSign: 1 });
    expect(parseAmount('1.005')).toEqual({ cents: 101, cellSign: 1 });
    expect(parseAmount('2.675')).toEqual({ cents: 268, cellSign: 1 });
  });

  it('keeps ordinary two-decimal and whole amounts exact', () => {
    expect(parseAmount('0.29')).toEqual({ cents: 29, cellSign: 1 });
    expect(parseAmount('19.99')).toEqual({ cents: 1999, cellSign: 1 });
    expect(parseAmount('0.1')).toEqual({ cents: 10, cellSign: 1 });
    expect(parseAmount('.50')).toEqual({ cents: 50, cellSign: 1 });
  });
});

describe('date parsing', () => {
  it('parses ISO with fixed order', () => {
    const p = parseDateParts('2026-03-04')!;
    expect(p.orderFixed).toBe(true);
    expect(resolveDate(p, 'MDY')).toEqual({ y: 2026, mo: 3, d: 4 });
  });
  it('parses textual month DD-MMM-YYYY', () => {
    const p = parseDateParts('04-Mar-2026')!;
    expect(resolveDate(p, 'DMY')).toEqual({ y: 2026, mo: 3, d: 4 });
  });
  it('leaves numeric MM/DD ambiguous for the caller to resolve', () => {
    const p = parseDateParts('03/04/2026')!;
    expect(p.orderFixed).toBe(false);
    expect(resolveDate(p, 'MDY')).toEqual({ y: 2026, mo: 3, d: 4 });
    expect(resolveDate(p, 'DMY')).toEqual({ y: 2026, mo: 4, d: 3 });
  });
});

describe('column inference and the DD/MM question', () => {
  it('raises the date-order question only when every field <= 12', () => {
    const headers = ['Date', 'Description', 'Amount'];
    const rows = [
      ['03/04/2026', 'Coffee', '-5.00'],
      ['05/06/2026', 'Lunch', '-12.00'],
    ];
    const roles = inferColumns(headers, rows);
    expect(roles.dateOrderAmbiguous).toBe(true);
    expect(roles.dateOrder).toBeNull();
  });

  it('resolves DMY when a day > 12 appears', () => {
    const headers = ['Date', 'Description', 'Amount'];
    const rows = [
      ['13/04/2026', 'Coffee', '-5.00'],
      ['05/06/2026', 'Lunch', '-12.00'],
    ];
    const roles = inferColumns(headers, rows);
    expect(roles.dateOrderAmbiguous).toBe(false);
    expect(roles.dateOrder).toBe('DMY');
  });

  it('honors a persisted date-order rule (no question)', () => {
    const headers = ['Date', 'Description', 'Amount'];
    const rows = [['03/04/2026', 'Coffee', '-5.00']];
    const roles = inferColumns(headers, rows, 'DMY');
    expect(roles.dateOrder).toBe('DMY');
    expect(roles.dateOrderAmbiguous).toBe(false);
  });
});

describe('merchant normalization & categorization', () => {
  it('strips location, payment method, and store numbers', () => {
    expect(normalizeMerchant('STARBUCKS #4821 Waterloo On (Apple Pay)')).toBe('starbucks');
    expect(normalizeMerchant('NETFLIX.COM')).toBe('netflix');
  });
  it('maps streaming to Software & Subscriptions (taxonomy v2)', () => {
    const rules = emptyScanRules();
    const r = categorize('NETFLIX.COM', normalizeMerchant('NETFLIX.COM'), -1599, rules);
    expect(r.category).toBe('Software & Subscriptions');
  });
  it('maps rent keywords to Mortgage/Rent id', () => {
    const rules = emptyScanRules();
    const r = categorize('MONTHLY RENT LANDLORD', normalizeMerchant('MONTHLY RENT LANDLORD'), -150000, rules);
    expect(r.category).toBe('Mortgage');
  });
  it('classifies transfers, income, and cash as row classes, never categories', () => {
    expect(classifyRow('INTERAC E-TRANSFER')).toBe('transfer');
    expect(classifyRow('PAYROLL DEPOSIT')).toBe('income');
    expect(classifyRow('ATM CASH WITHDRAWAL')).toBe('cash');
    expect(classifyRow('COFFEE CORNER')).toBe('spend');
  });
  it('personal rule outranks the built-in category', () => {
    const rules = setMerchantCategory(emptyScanRules(), 'walmart', 'Food');
    const r = categorize('WALMART SUPERCENTER', 'walmart', -6000, rules);
    expect(r.category).toBe('Food');
    expect(r.tier).toBe('solid');
  });

  it('does not read a merchant stem off the object prototype', () => {
    // A rule map is a plain object, so an unset key that happens to name a
    // prototype member used to resolve to the inherited value: 'constructor'
    // returned the Object constructor, which is truthy, so a FUNCTION was
    // handed back as the category and the display name. Merchant stems come
    // from bank-statement text, so these are reachable names.
    const rules = emptyScanRules();
    for (const stem of ['constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
      const r = categorize(stem.toUpperCase() + ' SUPPLY CO', stem, -2500, rules);
      expect(typeof r.category).toBe('string');
      expect(r.category).toBe('Other');
      expect(r.tier).toBe('needs-review');
      expect(typeof displayName(stem, rules)).toBe('string');
    }
  });

  it('still honours a real rule stored under a prototype-shaped name', () => {
    // The guard must not make such a key unusable, only stop the inherited one.
    const rules = setMerchantCategory(emptyScanRules(), 'constructor', 'Food');
    expect(categorize('CONSTRUCTOR SUPPLY CO', 'constructor', -2500, rules).category).toBe('Food');
  });
});

describe('dedupe, truncation, confidence', () => {
  it('drops exact-hash duplicates', () => {
    const rows = [
      { hash: 'a' } as any,
      { hash: 'a' } as any,
      { hash: 'b' } as any,
    ];
    const { rows: out, duplicatesMerged } = dedupeRows(rows);
    expect(out.length).toBe(2);
    expect(duplicatesMerged).toBe(1);
  });
  it('flags truncation only for suspicious row counts below 40% of sibling range', () => {
    expect(isTruncated(100, 30, 365)).toBe(true);
    expect(isTruncated(137, 30, 365)).toBe(false); // not a round number
    expect(isTruncated(100, 200, 365)).toBe(false); // not short enough
  });
  it('computes median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
  it('maps confidence scores to tiers and the floor', () => {
    const high = confidenceScore({ headerFound: true, dateParseRate: 1, amountParseRate: 1, signConfidence: 1, nettingConsistency: 1 });
    expect(high).toBeGreaterThanOrEqual(0.85);
    expect(tierFor(high)).toBe('solid');
    const low = confidenceScore({ headerFound: false, dateParseRate: 0.2, amountParseRate: 0.2, signConfidence: 0.3, nettingConsistency: 0 });
    expect(belowFloor(low)).toBe(true);
    expect(tierFor(low)).toBe('needs-review');
  });
});

describe('session guards', () => {
  it('rejects a file over the 10 MB cap before reading', () => {
    expect(() => assertFileSize(11 * 1024 * 1024)).toThrow(FileTooLargeError);
    expect(() => assertFileSize(1024)).not.toThrow();
  });
  it('caps a session at 5 files', () => {
    const one = { fileName: 'f.csv', text: 'Date,Description,Amount,Balance\n2026-01-01,Coffee,-5.00,100.00\n' };
    const files = Array.from({ length: 8 }, (_, i) => ({ ...one, fileName: `f${i}.csv` }));
    const result = runScan(files);
    expect(result.files.length).toBe(5);
  });
});

describe('European delimiter + amount end-to-end', () => {
  it('parses a semicolon-delimited European-format file', () => {
    const result = runScan([semicolonFile]);
    expect(result.status).not.toBe('failed');
    const row = result.rows.find((r) => r.rawDescription.includes('Grocery'));
    // -1.234,56 -> 123456 cents magnitude, outflow negative.
    expect(row?.amountCents).toBe(-123456);
  });
});

describe('scanRules writers are pure', () => {
  it('does not mutate the input rules', () => {
    const base = emptyScanRules();
    const next = setDateOrder(base, 'fp', 'DMY');
    expect(base.dateOrder).toEqual({});
    expect(next.dateOrder).toEqual({ fp: 'DMY' });
  });
});
