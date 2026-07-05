/**
 * Leak Scan analytics event payloads (spec 8). ALL structural only: counts, rates,
 * tiers, booleans. Never merchant strings, amounts, descriptions, or file contents.
 * These builders return plain serializable objects; wiring them to the app-wide
 * PostHog logger is the results-screen task (item 3), not the pipeline.
 */

import type { ConfidenceTier, ScanResult, SignMethod } from './types';

export type ScanStartedEvent = { event: 'scan_started'; nFiles: number };

export type ScanFileParsedEvent = {
  event: 'scan_file_parsed';
  rows: number;
  skipped: number;
  confidenceTier: ConfidenceTier;
  signMethod: SignMethod;
  truncationFlag: boolean;
};

export type ScanQuestionShownEvent = { event: 'scan_question_shown'; type: 'date-order' | 'sign-confirmation' };

export type ScanCompletedEvent = {
  event: 'scan_completed';
  coverageDays: number;
  nAccounts: number;
  nHabitsFound: number;
  tierBreakdown: Record<ConfidenceTier, number>;
};

export type ScanFailedEvent = {
  event: 'scan_failed';
  nFiles: number;
  encodingGuess: string;
  delimiterGuess: string;
  headerFound: boolean;
  dateParseRate: number;
  amountParseRate: number;
  signConfidence: number;
};

export type ScanCorrectionEvent = {
  event: 'scan_correction';
  stage: string;
  fromTier: ConfidenceTier;
};

/** Build the scan_started payload. */
export function scanStarted(nFiles: number): ScanStartedEvent {
  return { event: 'scan_started', nFiles };
}

/** Build a scan_file_parsed payload from a file's structural outcome. */
export function scanFileParsed(args: {
  rows: number;
  skipped: number;
  confidenceTier: ConfidenceTier;
  signMethod: SignMethod;
  truncationFlag: boolean;
}): ScanFileParsedEvent {
  return { event: 'scan_file_parsed', ...args };
}

/** Build the scan_completed payload from a finished result (no strings/amounts). */
export function scanCompleted(result: ScanResult): ScanCompletedEvent {
  const tierBreakdown: Record<ConfidenceTier, number> = { solid: 0, likely: 0, 'needs-review': 0 };
  for (const f of result.files) tierBreakdown[f.confidenceTier]++;
  const accounts = new Set(result.files.map((f) => f.account));
  return {
    event: 'scan_completed',
    coverageDays: result.coverage?.coveredDays ?? 0,
    nAccounts: accounts.size,
    nHabitsFound: result.habits.length,
    tierBreakdown,
  };
}

/** Build the scan_failed payload (structural fingerprint only, never contents). */
export function scanFailed(args: {
  nFiles: number;
  encodingGuess: string;
  delimiterGuess: string;
  headerFound: boolean;
  dateParseRate: number;
  amountParseRate: number;
  signConfidence: number;
}): ScanFailedEvent {
  return { event: 'scan_failed', ...args };
}
