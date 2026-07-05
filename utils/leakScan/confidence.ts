/**
 * Confidence model (spec 4). Per-file score is a weighted composite; the score maps
 * to one of three visible tiers (solid / likely / needs-review). A file below 0.60
 * is below the floor. If every file in the session is below the floor, the scan
 * fails gracefully (spec 7).
 */

import { scoreToTier, type ConfidenceTier } from './types';

export type ConfidenceInputs = {
  headerFound: boolean;
  dateParseRate: number; // 0..1
  amountParseRate: number; // 0..1
  signConfidence: number; // 0..1
  /** 1 when there are no unresolved balance contradictions, lower otherwise. */
  nettingConsistency: number; // 0..1
};

// Weights from spec 4.
const W_HEADER = 0.1;
const W_DATE = 0.25;
const W_AMOUNT = 0.25;
const W_SIGN = 0.25;
const W_NETTING = 0.15;

export const CONFIDENCE_FLOOR = 0.6;

/** Compute the 0..1 composite score for one file. */
export function confidenceScore(inputs: ConfidenceInputs): number {
  const header = inputs.headerFound ? 1 : 0;
  const score =
    W_HEADER * header +
    W_DATE * clamp01(inputs.dateParseRate) +
    W_AMOUNT * clamp01(inputs.amountParseRate) +
    W_SIGN * clamp01(inputs.signConfidence) +
    W_NETTING * clamp01(inputs.nettingConsistency);
  return clamp01(score);
}

export function tierFor(score: number): ConfidenceTier {
  return scoreToTier(score);
}

/** A file is below the floor when its score < 0.60. */
export function belowFloor(score: number): boolean {
  return score < CONFIDENCE_FLOOR;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
