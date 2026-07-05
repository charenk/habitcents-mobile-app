/**
 * Leak Scan pipeline public surface (P2-1b). Pure, on-device, UI-free utils.
 * Canonical spec: docs/design-context/leak-scan-spec.md.
 */

export * from './types';
export { runScan } from './pipeline';
export type { ScanFileInput, RunScanOptions } from './pipeline';

// Stage-level exports for the results screen and for testing individual stages.
export { assertFileSize, FileTooLargeError, preflight, parseCsv, stripBom, normalizeNewlines, neutralizeCell, sniffDelimiter } from './preflight';
export { detectHeader, headerFingerprint } from './header';
export { inferColumns, resolveDateOrder } from './columns';
export { detectSign } from './sign';
export { buildRows, hashRow } from './rows';
export { normalizeMerchant, categorize, classifyRow, displayName, stemKey } from './categorize';
export { dedupeRows, accountLabelFromFile } from './merge';
export { netTransactions, spendableRows, totalSpendCents, pairSignature } from './netting';
export { fileDateRange, rangeDays, isTruncated, sessionCoverage, median } from './coverage';
export { detectRecurring, detectHabitCandidates } from './recurrence';
export { confidenceScore, tierFor, belowFloor, CONFIDENCE_FLOOR } from './confidence';
export type { ConfidenceInputs } from './confidence';
export {
  parseAmount,
  parseDateParts,
  resolveDate,
  isValidYMD,
  toISO,
  looksLikeAmount,
  looksLikeDate,
} from './parsers';
export { rowToExpense, seedLast15Days, recurringToExpenses, undoImport } from './importWrite';
export * as scanAnalytics from './analytics';

// Results-screen support (build item 3): pure SpendPulse cell derivation
// (results 5.3). Lives alongside the pipeline types it consumes; still UI-free.
export { autoGranularity, buildSpendPulse } from './spendPulse';
export type { PulseCell, PulseCellState, PulseData, PulseGranularity } from './spendPulse';
