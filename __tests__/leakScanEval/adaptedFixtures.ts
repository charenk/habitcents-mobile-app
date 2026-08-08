/**
 * Adapted fixtures: the eval harness's manifests laid over the 14 acceptance-test
 * fixtures already defined in __tests__/leakScan/fixtures.ts (spec section 9). This
 * IMPORTS those constants rather than re-typing their CSV text, so the eval suite
 * never drifts from (or duplicates) the acceptance suite's synthetic data.
 *
 * Floors here are set from what the acceptance tests already assert and guarantee
 * (see __tests__/leakScan/acceptance.test.ts) plus a first measured pass with the
 * eval harness itself; they are not hand-waved guesses.
 */

import type { FixtureCase } from './eval';
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
  quotedFieldsFile,
  semicolonFile,
} from '../leakScan/fixtures';

export const adaptedFixtures: FixtureCase[] = [
  {
    name: 'adapted:bom-preamble',
    files: [bomPreambleFile],
    manifest: {
      description: 'Acceptance 1: BOM + a preamble row above the real header (adapted from fixtures.ts).',
      minRowsParsed: 6,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.35,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:sign-balance',
    files: [chequingBalanceFile],
    manifest: {
      description: 'Acceptance 2: sign proven via the balance walk, confidence 1.0, no question asked.',
      minRowsParsed: 7,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.3,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:sign-type',
    files: [cardTypeFile],
    manifest: {
      description: 'Acceptance 3: sign proven via a Type column, no question asked.',
      minRowsParsed: 6,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.35,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:cross-account-transfer',
    files: [transferChequingFile, transferCardFile],
    manifest: {
      description: 'Acceptance 4: a credit-card payment nets as an internal transfer across two files in one session.',
      minRowsParsed: 6,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.15,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:refund-pair',
    files: [refundFile],
    manifest: {
      description: 'Acceptance 5: a charge/refund pair nets to zero.',
      minRowsParsed: 4,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.15,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:etransfer-monthly',
    files: [etransferFile],
    manifest: {
      description: 'Acceptance 6: a $11 e-transfer, monthly x7 with day-of-month drift, still detected as fixed monthly recurrence.',
      minRowsParsed: 7,
      expectedCandidates: [{ merchantContains: 'etransfer', cadence: 'monthly', required: true }],
      maxNeedsReviewShare: 0.15,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:biweekly-loan',
    files: [biweeklyLoanFile],
    manifest: {
      description:
        'Acceptance 7: a biweekly loan payment. The manifest schema only names daily/weekly/monthly cadences, so this checks against the "weekly" bucket, which the harness also matches against a detected biweekly interval (see eval.ts).',
      minRowsParsed: 5,
      expectedCandidates: [{ merchantContains: 'nissan', cadence: 'weekly', required: true }],
      maxNeedsReviewShare: 0.15,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:truncated-vs-sibling',
    files: [truncatedFile, yearSiblingFile],
    manifest: {
      description:
        'Acceptance 8: a 100-row ~30-day export ("Cafe Number 0".."Cafe Number 4", amount cycling $5-$24) beside a 12-month sibling. Was THE HEADLINE FINDING of the OB-2 baseline: inferColumns() swapped the Description and Amount column roles on the truncated file (a description column whose values end in a digit spuriously tied the real Amount column\'s parse rate; argmax broke the tie toward the lower column index), landing 89% of rows in needs-review with garbled merchant stems. Fixed in OB-3 by scoring the amount role on typed evidence (pure-numeric-ness, decimal shape, non-empty coverage, sample-size confidence, header hint) instead of the bare parse rate; both candidates below now pass.',
      minRowsParsed: 100,
      expectedCandidates: [
        {
          merchantContains: 'monthly',
          cadence: 'monthly',
          required: true,
        },
        {
          merchantContains: 'cafe',
          cadence: 'daily',
          required: true,
        },
      ],
      maxNeedsReviewShare: 0.15,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:messy-merchant',
    files: [messyMerchantFile],
    manifest: {
      description: 'Acceptance 10: a messy merchant string (city + Apple Pay tag) normalizes to a clean Food stem.',
      minRowsParsed: 2,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.15,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:walmart-recategorize',
    files: [walmartFile],
    manifest: {
      description: 'Acceptance 11: repeated Walmart rows under two different store-number suffixes group under one stem.',
      minRowsParsed: 4,
      expectedCandidates: [{ merchantContains: 'walmart', cadence: 'daily', required: true }],
      maxNeedsReviewShare: 0.15,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:dupe-reimport',
    files: [dupeFile],
    manifest: {
      description: 'Acceptance 9 setup file: a small chequing file re-imported to check duplicate merge (dedupe itself is exercised by the acceptance suite, not scored here).',
      minRowsParsed: 3,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.15,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:garbage-failure',
    files: [garbageFile],
    manifest: {
      description: 'Acceptance 12: a garbage file with no parseable structure fails gracefully with no partial numbers.',
      minRowsParsed: 0,
      expectedCandidates: [],
      maxNeedsReviewShare: 1,
      expectGracefulFailure: true,
    },
  },
  {
    name: 'adapted:jpy-zero-decimal',
    files: [jpyFile],
    manifest: {
      description: 'Acceptance 13: a JPY (zero-minor-unit) file parses to whole-yen amounts under a JPY home currency.',
      minRowsParsed: 3,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.5,
      expectGracefulFailure: false,
    },
    options: { homeCurrency: 'JPY' },
  },
  {
    name: 'adapted:quoted-fields',
    files: [quotedFieldsFile],
    manifest: {
      description: 'PapaParse robustness: quoted fields containing a comma and an embedded newline.',
      minRowsParsed: 3,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.5,
      expectGracefulFailure: false,
    },
  },
  {
    name: 'adapted:semicolon-delimiter',
    files: [semicolonFile],
    manifest: {
      description: 'Delimiter sniffing: a semicolon-delimited, European-formatted (1.234,56) export.',
      minRowsParsed: 3,
      expectedCandidates: [],
      maxNeedsReviewShare: 0.3,
      expectGracefulFailure: false,
    },
  },
];
