/**
 * Leak Scan pipeline types (P2-1b). Canonical spec: docs/design-context/leak-scan-spec.md.
 *
 * The pipeline is a set of pure, individually testable stages (0-9). Nothing here
 * touches the network, screens, or contexts: it takes raw file bytes/strings in and
 * produces a structured ScanResult out. All amounts are integer cents, matching the
 * app-wide convention. No merchant strings or amounts ever leave the device (D-9).
 */

import type { ExpenseCategory, ExpenseClass } from '@/types/expense';

// ---------------------------------------------------------------------------
// Confidence tiers
// ---------------------------------------------------------------------------

// Surfaced to the user as three visual tiers only, never a raw percentage (spec 4).
export type ConfidenceTier = 'solid' | 'likely' | 'needs-review';

/** Map a 0..1 composite score to a per-file tier (spec 4 thresholds). */
export function scoreToTier(score: number): ConfidenceTier {
  if (score >= 0.85) return 'solid';
  if (score >= 0.6) return 'likely';
  return 'needs-review';
}

// ---------------------------------------------------------------------------
// Stage 0 / 1: session, preflight, parse
// ---------------------------------------------------------------------------

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (spec Stage 0)
export const MAX_ROWS = 50_000; // per-file row cap (spec Stage 0)
export const MAX_FILES = 5; // per import session (spec Stage 0)

export type Delimiter = ',' | ';' | '\t' | '|';

export type PreflightResult = {
  /** File contents with BOM stripped and newlines normalized to LF. */
  text: string;
  /** True if a UTF-8/UTF-16 BOM was present and stripped. */
  hadBom: boolean;
  /** Detected field delimiter (sniffed by column-count consistency). */
  delimiter: Delimiter;
  encodingGuess: 'utf-8' | 'latin-1';
};

/** A single parsed CSV row: array of cell strings. Ragged rows keep their length. */
export type RawRow = string[];

export type ParseResult = {
  rows: RawRow[];
  /** Rows PapaParse could not read at all (per-row failure, never per-file). */
  skippedRows: number;
  delimiter: Delimiter;
};

// ---------------------------------------------------------------------------
// Stage 2: header & preamble
// ---------------------------------------------------------------------------

export type HeaderResult = {
  /** Index into rows of the winning header row, or -1 if header was synthesized. */
  headerIndex: number;
  /** Column names (either from the header row or synthesized col_1..col_n). */
  headers: string[];
  /** Whether a real header row was found (feeds the confidence composite). */
  headerFound: boolean;
  /** Data rows below the header, preamble discarded. */
  dataRows: RawRow[];
  /** Count of preamble rows discarded above the header. */
  preambleDiscarded: number;
};

// ---------------------------------------------------------------------------
// Stage 3: column inference
// ---------------------------------------------------------------------------

export type DateOrder = 'MDY' | 'DMY';

export type ColumnRoles = {
  dateIndex: number;
  amountIndex: number; // single signed amount column, or -1 if split debit/credit
  debitIndex: number; // -1 if not split
  creditIndex: number; // -1 if not split
  descriptionIndex: number;
  balanceIndex: number; // -1 if absent
  typeIndex: number; // debit/credit type column, -1 if absent
  statusIndex: number; // pending/posted, -1 if absent
  postedDateIndex: number; // secondary date column, -1 if absent
  currencyIndex: number; // -1 if absent
  /** Parse rates 0..1 for the winning date/amount columns (confidence inputs). */
  dateParseRate: number;
  amountParseRate: number;
  /** Resolved date order, or null when DD/MM is genuinely ambiguous. */
  dateOrder: DateOrder | null;
  /** True when every date value has both fields <= 12 (the one permitted question). */
  dateOrderAmbiguous: boolean;
};

// ---------------------------------------------------------------------------
// Stage 4: sign convention
// ---------------------------------------------------------------------------

export type SignMethod = 'balance' | 'type' | 'heuristic';

export type SignConvention = {
  /** Multiply a raw parsed amount by this to get a signed cents value where
   *  outflow (spending) is NEGATIVE. */
  outflowSign: 1 | -1;
  method: SignMethod;
  confidence: number; // 0..1
  /** True when heuristic confidence < 0.8 and a confirmation chip is warranted. */
  needsConfirmation: boolean;
};

// ---------------------------------------------------------------------------
// Normalized transaction row (the pipeline's internal currency)
// ---------------------------------------------------------------------------

export type ScanRow = {
  id: string;
  /** ISO date (yyyy-mm-dd) of the transaction. */
  dateISO: string;
  date: Date;
  /** Statement/posted date if a second date column existed. */
  postedDateISO?: string;
  /** Signed amount in integer cents. Outflow (spend) negative, inflow positive. */
  amountCents: number;
  rawDescription: string;
  /** Normalized merchant stem (Stage 7). */
  merchantStem: string;
  /** Display merchant name (Stage 7, after rename rules). */
  merchantDisplay: string;
  category: ExpenseCategory;
  categoryTier: ConfidenceTier;
  rowClass: ExpenseClass;
  /** Account label (A/B/C or renamed) this row belongs to. */
  account: string;
  /** Pending rows are ingested but excluded from totals. */
  pending: boolean;
  /** Foreign-currency row: excluded from totals, badged. */
  foreign: boolean;
  /** Stage 6: part of an internal transfer pair (excluded from spend). */
  internal: boolean;
  /** Stage 6: part of a refund/reversal pair (net contribution zero). */
  reversed: boolean;
  /** Stage 6: multiple candidate matches, do not auto-net. */
  needsReview: boolean;
  /** sha1-style row hash for cross-file dedupe (Stage 5). */
  hash: string;
};

// ---------------------------------------------------------------------------
// Stage 5/8: per-file & session metadata
// ---------------------------------------------------------------------------

export type FileScan = {
  fileName: string;
  account: string;
  rows: ScanRow[];
  rowsRead: number;
  rowsSkipped: number;
  headerFound: boolean;
  sign: SignConvention;
  confidenceScore: number;
  confidenceTier: ConfidenceTier;
  dateRange: { startISO: string; endISO: string } | null;
  truncated: boolean;
  /** True if this file scored below the confidence floor (spec 4). */
  belowFloor: boolean;
};

export type TransferPair = {
  outflowRowId: string;
  inflowRowId: string;
  amountCents: number;
};

export type RefundPair = {
  chargeRowId: string;
  refundRowId: string;
  amountCents: number;
  merchantStem: string;
};

// ---------------------------------------------------------------------------
// Stage 9: recurrence & habits
// ---------------------------------------------------------------------------

export type RecurrenceInterval = 'weekly' | 'biweekly' | 'monthly' | 'annual';

export type RecurringItem = {
  merchantStem: string;
  merchantDisplay: string;
  category: ExpenseCategory;
  rowClass: ExpenseClass;
  /** Median amount in cents (outflow magnitude, positive). */
  amountCents: number;
  interval: RecurrenceInterval;
  occurrences: number;
  /** ISO of the last observed occurrence. */
  lastDateISO: string;
  /** ISO of the next expected occurrence. */
  nextDateISO: string;
  /** For biweekly items, number of hits expected in the next calendar month. */
  nextMonthHits: number;
};

export type GovernClass = 'govern' | 'influence' | 'fixed';

export type HabitCandidate = {
  merchantStem: string;
  merchantDisplay: string;
  category: ExpenseCategory;
  governClass: GovernClass;
  tier: ConfidenceTier;
  occurrences: number;
  /** Days on which this merchant/category appeared. */
  activeDays: number;
  /** Total outflow magnitude in cents over the evidence window. */
  totalCents: number;
  /** Projected annual leak in cents (annualized from the evidence window). */
  annualizedLeakCents: number;
  /** Ranking score = annualizedLeak * governabilityWeight. */
  rankScore: number;
  topMerchants: string[];
};

// ---------------------------------------------------------------------------
// Final result / graceful failure
// ---------------------------------------------------------------------------

export type ScanQuestionType = 'date-order' | 'sign-confirmation';

/** A structured question the pipeline could not resolve on its own (max 2). NOT UI. */
export type ScanQuestion = {
  type: ScanQuestionType;
  fileName: string;
  headerFingerprint: string;
  /** Prompt copy the UI may render; the pipeline stays UI-free. */
  prompt: string;
};

export type ScanStatus = 'ok' | 'partial' | 'failed';

export type CoverageWindow = {
  startISO: string;
  endISO: string;
  coveredDays: number;
};

export type ScanResult = {
  importId: string;
  status: ScanStatus;
  files: FileScan[];
  /** All surviving, netted, categorized rows across every passing file. */
  rows: ScanRow[];
  questions: ScanQuestion[];
  transfers: TransferPair[];
  refunds: RefundPair[];
  duplicatesMerged: number;
  recurring: RecurringItem[];
  habits: HabitCandidate[];
  coverage: CoverageWindow | null;
  /** Session-level tier = weakest passing file (spec 5.1). */
  tier: ConfidenceTier;
  /** True when every file scored below the floor or zero rows survived (spec 7). */
  gracefulFailure: boolean;
};
