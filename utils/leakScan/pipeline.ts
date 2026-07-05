/**
 * Leak Scan orchestrator: run stages 0-9 over a session of files and produce a
 * ScanResult. Pure and UI-free. Graceful failure (spec 7) is a result state, not an
 * exception: when every file is below the confidence floor (or zero rows survive),
 * status is 'failed' and no numbers are trusted.
 *
 * The one/two permitted questions (DD/MM ambiguity, low-confidence sign) surface as
 * structured `questions` on the result, never as UI.
 */

import { emptyScanRules, type ScanRules } from '@/utils/scanRules';
import { DEFAULT_CURRENCY, type CurrencyCode } from '@/utils/currency';
import { confidenceScore, belowFloor } from './confidence';
import { detectHeader, headerFingerprint } from './header';
import { inferColumns } from './columns';
import { detectSign } from './sign';
import { buildRows } from './rows';
import { assertFileSize, parseCsv, preflight } from './preflight';
import { accountLabelFromFile, dedupeRows } from './merge';
import { netTransactions } from './netting';
import {
  fileDateRange,
  isTruncated,
  median,
  rangeDays,
  sessionCoverage,
} from './coverage';
import { detectHabitCandidates, detectRecurring } from './recurrence';
import { scoreToTier, MAX_FILES, type FileScan, type ScanQuestion, type ScanResult, type ScanRow, type ScanStatus } from './types';

export type ScanFileInput = {
  fileName: string;
  /** File contents already decoded to a string (reader handles latin-1 fallback). */
  text: string;
  /** File size in bytes, for the 10 MB guard. Optional; defaults to text length. */
  byteLength?: number;
};

export type RunScanOptions = {
  rules?: ScanRules;
  homeCurrency?: CurrencyCode;
  /** Deterministic import id (tests inject a fixed one). */
  importId?: string;
};

let importCounter = 0;
function makeImportId(): string {
  importCounter += 1;
  return `import-${Date.now()}-${importCounter}`;
}

/**
 * Run the full pipeline over up to 5 files. Files exceeding the 10 MB cap throw
 * before their contents are read; all other failures are per-row or per-file
 * confidence outcomes, never a thrown error.
 */
export function runScan(files: ScanFileInput[], options: RunScanOptions = {}): ScanResult {
  const rules = options.rules ?? emptyScanRules();
  const homeCurrency = options.homeCurrency ?? DEFAULT_CURRENCY;
  const importId = options.importId ?? makeImportId();

  const capped = files.slice(0, MAX_FILES);

  // --- Per-file: stages 0-4 + 7 (row assembly). Collect raw file scans first so the
  // truncation heuristic can compare against sibling ranges.
  type Interim = {
    input: ScanFileInput;
    account: string;
    headerFound: boolean;
    sign: FileScan['sign'];
    rows: ScanRow[];
    rowsRead: number;
    rowsSkipped: number;
    dateRange: { startISO: string; endISO: string } | null;
    score: number;
  };

  const interim: Interim[] = [];
  const questions: ScanQuestion[] = [];

  capped.forEach((file, index) => {
    // Stage 0 guard.
    assertFileSize(file.byteLength ?? file.text.length);

    // Stage 1: preflight + parse.
    const pre = preflight(file.text);
    const parsed = parseCsv(pre);

    // Stage 2: header & preamble.
    const header = detectHeader(parsed.rows);
    const fp = headerFingerprint(header.headers);

    // Stage 3: columns (+ DD/MM question).
    const ruleDateOrder = rules.dateOrder[fp];
    const roles = inferColumns(header.headers, header.dataRows, ruleDateOrder);
    if (roles.dateOrderAmbiguous) {
      questions.push({
        type: 'date-order',
        fileName: file.fileName,
        headerFingerprint: fp,
        prompt: 'Is 03/04 March 4th or April 3rd?',
      });
    }
    const order = roles.dateOrder ?? 'MDY';

    // Stage 4: sign convention.
    const ruleSign = rules.signConvention[fp];
    const sign = detectSign(header.dataRows, roles, order, ruleSign);
    if (sign.needsConfirmation) {
      questions.push({
        type: 'sign-confirmation',
        fileName: file.fileName,
        headerFingerprint: fp,
        prompt: 'Purchases in this file look like negative numbers, right?',
      });
    }

    // Stage 7 (row assembly + categorization).
    const account = rules.accountLabel[fp] ?? accountLabelFromFile(file.fileName, index);
    const { rows, skipped } = buildRows(
      file.fileName,
      account,
      header.dataRows,
      roles,
      order,
      sign,
      rules,
      homeCurrency
    );

    const rowsRead = rows.length;
    const rowsSkipped = parsed.skippedRows + skipped;
    const dateRange = fileDateRange(rows);

    const score = confidenceScore({
      headerFound: header.headerFound,
      dateParseRate: roles.dateParseRate,
      amountParseRate: roles.amountParseRate,
      signConfidence: sign.confidence,
      nettingConsistency: 1, // netting runs at session scope; assume consistent pre-merge
    });

    interim.push({
      input: file,
      account,
      headerFound: header.headerFound,
      sign,
      rows,
      rowsRead,
      rowsSkipped,
      dateRange,
      score,
    });
  });

  // --- Truncation heuristic needs sibling median range.
  const siblingRanges = interim.map((f) => rangeDays(f.dateRange)).filter((d) => d > 0);
  const medianRange = median(siblingRanges);

  // --- Assemble FileScans; decide which files pass the confidence floor.
  const fileScans: FileScan[] = interim.map((f) => {
    const truncated = isTruncated(f.rowsRead, rangeDays(f.dateRange), medianRange);
    const below = belowFloor(f.score);
    return {
      fileName: f.input.fileName,
      account: f.account,
      rows: f.rows,
      rowsRead: f.rowsRead,
      rowsSkipped: f.rowsSkipped,
      headerFound: f.headerFound,
      sign: f.sign,
      confidenceScore: f.score,
      confidenceTier: scoreToTier(f.score),
      dateRange: f.dateRange,
      truncated,
      belowFloor: below,
    };
  });

  // Passing files are those at or above the floor with at least one row.
  const passing = fileScans.filter((f) => !f.belowFloor && f.rows.length > 0);
  const allBelowFloor = fileScans.length > 0 && passing.length === 0;
  const anyRows = fileScans.some((f) => f.rows.length > 0);

  // --- Graceful failure (spec 7): every file below floor, or zero rows survived.
  if (allBelowFloor || !anyRows) {
    return {
      importId,
      status: 'failed',
      files: fileScans,
      rows: [],
      questions,
      transfers: [],
      refunds: [],
      duplicatesMerged: 0,
      recurring: [],
      habits: [],
      coverage: null,
      tier: 'needs-review',
      gracefulFailure: true,
    };
  }

  // --- Stage 5: merge + dedupe across passing files.
  const allRows = passing.flatMap((f) => f.rows);
  const { rows: deduped, duplicatesMerged } = dedupeRows(allRows);

  // --- Stage 6: netting (transfers + refunds).
  const { rows: netted, transfers, refunds } = netTransactions(deduped, rules);

  // --- Stage 8: coverage.
  const coverage = sessionCoverage(netted);
  const coveredDays = coverage?.coveredDays ?? 0;

  // --- Stage 9: recurrence + habits (full history).
  const recurring = detectRecurring(netted.filter((r) => !r.internal && !r.reversed));
  const habits = detectHabitCandidates(netted, coveredDays, rules);

  // Session tier = weakest passing file (spec 5.1).
  const tierRank: Record<string, number> = { solid: 0, likely: 1, 'needs-review': 2 };
  const weakest = passing.reduce((worst, f) => (tierRank[f.confidenceTier] > tierRank[worst] ? f.confidenceTier : worst), 'solid' as FileScan['confidenceTier']);

  // Status: partial when some files fell below the floor but others passed.
  const status: ScanStatus = passing.length < fileScans.length ? 'partial' : 'ok';

  return {
    importId,
    status,
    files: fileScans,
    rows: netted,
    questions,
    transfers,
    refunds,
    duplicatesMerged,
    recurring,
    habits,
    coverage,
    tier: weakest,
    gracefulFailure: false,
  };
}
