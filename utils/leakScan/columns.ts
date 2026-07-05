/**
 * Stage 3: column inference.
 *
 * Score every column 0..1 per role and assign role = argmax above threshold
 * (0.9 date, 0.9 amount, best-remaining description). Recognize auxiliary columns
 * (balance, type, status, posted-date, currency) by header keyword. Resolve the
 * DD/MM date order, surfacing the one permitted question when it is genuinely
 * ambiguous. Detect split debit/credit columns.
 */

import { looksLikeAmount, looksLikeDate, parseDateParts } from './parsers';
import type { ColumnRoles, DateOrder, RawRow } from './types';

const DATE_THRESHOLD = 0.9;
const AMOUNT_THRESHOLD = 0.9;
const SAMPLE = 200; // rows to sample for parse-rate scoring

type Keyword = { re: RegExp };
const KW = {
  balance: /\bbalance\b/i,
  type: /\b(type|dr\/cr|debit\/credit|transaction type)\b/i,
  status: /\b(status|pending|posted)\b/i,
  debit: /\b(debit|withdrawal|out|payment out|money out)\b/i,
  credit: /\b(credit|deposit|in|money in)\b/i,
  postedDate: /\b(posted|posting|settlement|book(ing)? date)\b/i,
  transDate: /\b(transaction date|trans date|date)\b/i,
  currency: /\b(currency|ccy|iso currency)\b/i,
  description: /\b(description|details|memo|narrative|payee|merchant|name)\b/i,
} satisfies Record<string, RegExp>;

function parseRate(cells: string[], test: (c: string) => boolean): number {
  const nonEmpty = cells.filter((c) => c.trim().length > 0);
  if (nonEmpty.length === 0) return 0;
  const hits = nonEmpty.filter(test).length;
  return hits / nonEmpty.length;
}

/** Average string length + a crude entropy proxy: description-ness. */
function descriptionScore(cells: string[]): number {
  const nonEmpty = cells.filter((c) => c.trim().length > 0);
  if (nonEmpty.length === 0) return 0;
  const avgLen = nonEmpty.reduce((s, c) => s + c.length, 0) / nonEmpty.length;
  const distinct = new Set(nonEmpty.map((c) => c.toLowerCase())).size;
  const variety = distinct / nonEmpty.length; // high when values differ a lot
  const lenScore = Math.min(1, avgLen / 20);
  return 0.5 * lenScore + 0.5 * variety;
}

function column(rows: RawRow[], index: number): string[] {
  const out: string[] = [];
  const limit = Math.min(rows.length, SAMPLE);
  for (let i = 0; i < limit; i++) out.push(rows[i][index] ?? '');
  return out;
}

/**
 * Determine whether the numeric date fields are DD/MM ambiguous, and resolve the
 * order when possible. If ANY row has a first field > 12, order is MDY-impossible
 * unless swapped: a value >12 in position `a` proves `a` is the day (DMY); >12 in
 * `b` proves MDY. If every row has both fields <= 12, it is genuinely ambiguous.
 */
export function resolveDateOrder(
  rows: RawRow[],
  dateIndex: number,
  ruleOrder: DateOrder | undefined
): { order: DateOrder | null; ambiguous: boolean } {
  if (ruleOrder) return { order: ruleOrder, ambiguous: false };

  let aOver12 = false;
  let bOver12 = false;
  let anyOrderFree = false;

  const limit = Math.min(rows.length, SAMPLE);
  for (let i = 0; i < limit; i++) {
    const parts = parseDateParts(rows[i][dateIndex] ?? '');
    if (!parts || parts.orderFixed) continue;
    anyOrderFree = true;
    if (parts.a > 12) aOver12 = true;
    if (parts.b > 12) bOver12 = true;
  }

  if (!anyOrderFree) {
    // All dates were order-fixed (ISO/textual): order is irrelevant, not ambiguous.
    return { order: 'MDY', ambiguous: false };
  }
  if (aOver12 && !bOver12) return { order: 'DMY', ambiguous: false };
  if (bOver12 && !aOver12) return { order: 'MDY', ambiguous: false };
  if (aOver12 && bOver12) return { order: 'MDY', ambiguous: false }; // contradictory; MDY default
  // Every field <= 12 across the file: the one permitted question.
  return { order: null, ambiguous: true };
}

/**
 * Infer column roles. `ruleDateOrder` is a persisted answer to the DD/MM question,
 * keyed on the header fingerprint (spec 6); when present, no question is raised.
 */
export function inferColumns(
  headers: string[],
  rows: RawRow[],
  ruleDateOrder?: DateOrder
): ColumnRoles {
  const nCols = headers.length;

  const dateScores: number[] = [];
  const amountScores: number[] = [];
  const descScores: number[] = [];

  for (let c = 0; c < nCols; c++) {
    const cells = column(rows, c);
    dateScores.push(parseRate(cells, looksLikeDate));
    amountScores.push(parseRate(cells, looksLikeAmount));
    descScores.push(descriptionScore(cells));
  }

  // Auxiliary columns by header keyword.
  const findHeader = (re: RegExp) => headers.findIndex((h) => re.test(h));
  const balanceIndex = findHeader(KW.balance);
  const typeIndex = findHeader(KW.type);
  const statusIndex = findHeader(KW.status);
  const currencyIndex = findHeader(KW.currency);

  // Split debit/credit columns: two amount-ish columns whose headers name debit and
  // credit. Only when both exist and neither is the balance column.
  let debitIndex = -1;
  let creditIndex = -1;
  const debitHdr = headers.findIndex((h) => KW.debit.test(h) && !KW.credit.test(h));
  const creditHdr = headers.findIndex((h) => KW.credit.test(h) && !KW.debit.test(h));
  if (
    debitHdr >= 0 &&
    creditHdr >= 0 &&
    debitHdr !== creditHdr &&
    debitHdr !== balanceIndex &&
    creditHdr !== balanceIndex &&
    amountScores[debitHdr] > 0.3 &&
    amountScores[creditHdr] > 0.3
  ) {
    debitIndex = debitHdr;
    creditIndex = creditHdr;
  }

  // Date column: argmax over date-ness above threshold, preferring the transaction
  // date over a posted date. When two strong date columns exist, the transaction one
  // (earlier-labeled/earlier-valued) is primary and the other becomes postedDate.
  const dateCandidates = dateScores
    .map((s, i) => ({ i, s }))
    .filter((x) => x.s >= DATE_THRESHOLD && x.i !== balanceIndex)
    .sort((a, b) => b.s - a.s);

  let dateIndex = dateCandidates.length > 0 ? dateCandidates[0].i : argmax(dateScores, [balanceIndex]);
  let postedDateIndex = -1;
  if (dateCandidates.length >= 2) {
    // Prefer the column whose header looks like a transaction date; the other is posted.
    const transHdr = dateCandidates.find((x) => KW.transDate.test(headers[x.i]) && !KW.postedDate.test(headers[x.i]));
    const postedHdr = dateCandidates.find((x) => KW.postedDate.test(headers[x.i]));
    if (transHdr && postedHdr && transHdr.i !== postedHdr.i) {
      dateIndex = transHdr.i;
      postedDateIndex = postedHdr.i;
    } else {
      // No header hint: earlier-valued column is the transaction date.
      const [first, second] = dateCandidates;
      dateIndex = first.i;
      postedDateIndex = second.i;
    }
  }

  // Amount column: argmax over amount-ness, excluding balance/date/split columns.
  const excluded = new Set([balanceIndex, dateIndex, postedDateIndex, debitIndex, creditIndex].filter((i) => i >= 0));
  let amountIndex = -1;
  if (debitIndex < 0) {
    amountIndex = argmax(amountScores, [...excluded]);
    if (amountIndex >= 0 && amountScores[amountIndex] < AMOUNT_THRESHOLD) {
      // Below threshold: keep the best candidate anyway so a weak file still yields
      // an amount column; the low parse rate flows into the confidence score.
    }
  }

  // Description column: best-remaining by description-ness, excluding assigned roles.
  const assigned = new Set(
    [dateIndex, postedDateIndex, amountIndex, debitIndex, creditIndex, balanceIndex, typeIndex, statusIndex, currencyIndex].filter(
      (i) => i >= 0
    )
  );
  let descriptionIndex = -1;
  let descBest = -1;
  for (let c = 0; c < nCols; c++) {
    if (assigned.has(c)) continue;
    if (descScores[c] > descBest) {
      descBest = descScores[c];
      descriptionIndex = c;
    }
  }
  if (descriptionIndex < 0) {
    // Fall back to a keyword-named description column even if it was assigned.
    const kwDesc = headers.findIndex((h) => KW.description.test(h));
    if (kwDesc >= 0) descriptionIndex = kwDesc;
  }

  const { order, ambiguous } = resolveDateOrder(rows, dateIndex, ruleDateOrder);

  const dateParseRate = dateIndex >= 0 ? dateScores[dateIndex] : 0;
  const amountParseRate =
    debitIndex >= 0
      ? Math.max(amountScores[debitIndex], amountScores[creditIndex])
      : amountIndex >= 0
      ? amountScores[amountIndex]
      : 0;

  return {
    dateIndex,
    amountIndex,
    debitIndex,
    creditIndex,
    descriptionIndex,
    balanceIndex,
    typeIndex,
    statusIndex,
    postedDateIndex,
    currencyIndex,
    dateParseRate,
    amountParseRate,
    dateOrder: order,
    dateOrderAmbiguous: ambiguous,
  };
}

/** Argmax over scores, skipping any excluded indexes. Returns -1 for empty. */
function argmax(scores: number[], exclude: number[]): number {
  const ex = new Set(exclude.filter((i) => i >= 0));
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < scores.length; i++) {
    if (ex.has(i)) continue;
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      best = i;
    }
  }
  return best;
}
