/**
 * Stage 0 (session guards) + Stage 1 (preflight & parse) of the Leak Scan.
 *
 * Preflight: strip BOM, normalize newlines, sniff delimiter, and neutralize
 * formula-injection cells. Parse with PapaParse (quoted fields, embedded newlines,
 * ragged rows). Never split(',').
 */

import Papa from 'papaparse';
import {
  MAX_FILE_BYTES,
  MAX_ROWS,
  type Delimiter,
  type ParseResult,
  type PreflightResult,
  type RawRow,
} from './types';

const DELIMITERS: Delimiter[] = [',', ';', '\t', '|'];

/** Formula-injection lead characters (existing security list): treat cell as text. */
const INJECTION_LEADS = ['=', '+', '-', '@', '\t', '\r'];

export class FileTooLargeError extends Error {
  constructor(public readonly bytes: number) {
    super(`File exceeds ${MAX_FILE_BYTES} byte cap (${bytes} bytes)`);
    this.name = 'FileTooLargeError';
  }
}

/**
 * Reject oversized files BEFORE reading their contents. `byteLength` is the file
 * size in bytes (from the OS / file picker), not the string length.
 */
export function assertFileSize(byteLength: number): void {
  if (byteLength > MAX_FILE_BYTES) throw new FileTooLargeError(byteLength);
}

/** Strip a leading UTF-8/UTF-16 BOM if present. */
export function stripBom(text: string): { text: string; hadBom: boolean } {
  if (text.charCodeAt(0) === 0xfeff) return { text: text.slice(1), hadBom: true };
  return { text, hadBom: false };
}

/** Normalize CRLF and lone CR to LF. */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/**
 * Neutralize a formula-injection cell: a cell that starts with = + - @ TAB or CR
 * is prefixed with a single quote so downstream consumers treat it as inert text.
 * A leading '-' that is part of a numeric value (e.g. "-42.10") is NOT neutralized,
 * so amount parsing still works; only non-numeric leading-'-' cells are quoted.
 */
export function neutralizeCell(cell: string): string {
  if (cell.length === 0) return cell;
  const lead = cell[0];
  if (!INJECTION_LEADS.includes(lead)) return cell;
  // Allow genuine negative numbers / parenthesized negatives through untouched.
  if (lead === '-' && /^-?[\d.,()\s$]+$/.test(cell)) return cell;
  return `'${cell}`;
}

/**
 * Sniff the delimiter by scoring column-count consistency over the first 50 rows.
 * The delimiter whose split yields the most consistent (modal) column count wins.
 */
export function sniffDelimiter(text: string): Delimiter {
  const sampleLines = text.split('\n').filter((l) => l.trim().length > 0).slice(0, 50);
  if (sampleLines.length === 0) return ',';

  let best: Delimiter = ',';
  let bestScore = -1;

  for (const delim of DELIMITERS) {
    const counts = sampleLines.map((line) => {
      // Naive split is only used for SCORING, not for the real parse.
      return line.split(delim).length;
    });
    // Modal column count and how many rows match it.
    const freq = new Map<number, number>();
    for (const c of counts) freq.set(c, (freq.get(c) ?? 0) + 1);
    let modalCount = 1;
    let modalHits = 0;
    for (const [count, hits] of freq) {
      if (count > 1 && hits > modalHits) {
        modalHits = hits;
        modalCount = count;
      }
    }
    // Consistency score: rows-at-modal * (columns produced). More columns and more
    // agreement both signal the true delimiter; a delimiter that never splits
    // scores modalCount 1 and loses.
    const score = modalCount > 1 ? modalHits * modalCount : 0;
    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }
  return best;
}

/** Stage 1 preflight: BOM strip, newline normalize, delimiter sniff. */
export function preflight(rawText: string): PreflightResult {
  const { text: noBom, hadBom } = stripBom(rawText);
  const normalized = normalizeNewlines(noBom);
  const delimiter = sniffDelimiter(normalized);
  return {
    text: normalized,
    hadBom,
    delimiter,
    // Encoding is assumed UTF-8 at the string boundary; the file reader handles the
    // latin-1 fallback before we ever see a string. Recorded for telemetry.
    encodingGuess: 'utf-8',
  };
}

/**
 * Parse preflighted text with PapaParse. Per-row failure only: rows PapaParse flags
 * as errors are counted as skipped, never aborting the whole file. Each surviving
 * cell is trimmed and formula-neutralized. Enforces the MAX_ROWS cap.
 */
export function parseCsv(pre: PreflightResult): ParseResult {
  const result = Papa.parse<string[]>(pre.text, {
    delimiter: pre.delimiter,
    skipEmptyLines: 'greedy',
    // We want arrays, not header-keyed objects: header detection is Stage 2's job.
    header: false,
    // Do not let a single bad row abort the file.
    // (PapaParse returns errors per row; we count and drop them.)
  });

  const badRowIndexes = new Set<number>();
  for (const err of result.errors) {
    if (typeof err.row === 'number') badRowIndexes.add(err.row);
  }

  const rows: RawRow[] = [];
  let skipped = 0;
  const data = result.data;
  for (let i = 0; i < data.length; i++) {
    if (rows.length >= MAX_ROWS) break; // row cap: stop ingesting past 50k
    if (badRowIndexes.has(i)) {
      skipped++;
      continue;
    }
    const row = data[i];
    if (!Array.isArray(row)) {
      skipped++;
      continue;
    }
    // A fully empty row (all blank cells) is not a data row.
    if (row.every((c) => (c ?? '').trim() === '')) continue;
    rows.push(row.map((c) => neutralizeCell((c ?? '').trim())));
  }

  return { rows, skippedRows: skipped, delimiter: pre.delimiter };
}
