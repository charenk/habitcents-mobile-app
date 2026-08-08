# Leak Scan eval harness (OB-2, ADR 0020)

A fixture-based evaluation harness for the leak-scan pipeline (`utils/leakScan`).
It runs the real pipeline (`runScan`) over a set of fixtures, scores the result
against each fixture's manifest, and asserts floors so a regression fails CI. This
unit does **not** fix pipeline code; it measures, so OB-3 can fix guided by real
numbers instead of guesses. It gates the Door 2 UX work: quality is measured
before more UI is built on top of it.

## Running it

```
npm test -- leakScanEval
```

or the equivalent alias:

```
npm run scan:eval
```

Both run `__tests__/leakScanEval.test.ts`, which asserts every fixture's floors
and prints a per-fixture score table via `console.table` (jest's `--silent=false`,
the default, lets it print; use `npm run scan:eval` which already passes
`--verbose`).

## Layout

- `eval.ts` -- pure scoring: given a fixture (files + manifest), runs `runScan`
  and computes rowParseRate, categorization tier shares, candidate recall
  (required expected candidates found), a candidate-precision proxy (unexpected
  candidates found, reported not failed), and graceful-failure correctness.
- `loadFixtures.ts` -- discovers `<name>.csv` + `<name>.expected.json` pairs from
  `fixtures/` (committed) and `private/` (gitignored, see below), plus builds the
  `private:combined` multi-file case.
- `adaptedFixtures.ts` -- wraps the 14 acceptance-test fixtures from
  `__tests__/leakScan/fixtures.ts` (spec section 9) with eval manifests, by
  **importing** those constants rather than re-typing their CSV text, so this
  suite never drifts from (or duplicates) the acceptance suite's synthetic data.
- `fixtures/` -- committed synthetic fixtures, safe for CI:
  - the 15 fixtures adapted from the acceptance suite (13 of the 14 acceptance
    scenarios, plus 2 PapaParse-robustness fixtures already in fixtures.ts),
  - `chequing-split-mixed-dates.csv` -- a chequing export with a quoted preamble
    row, split Debit/Credit columns, three mixed date formats in one file (ISO,
    MDY slash, DD-Mon textual), a refund pair, a lone transfer leg, three months
    of history, and a merchant (Starbucks) written under three different
    store-suffix variants to stress merchant-suffix grouping.
  - `card-merchant-suffixes.csv` -- a credit-card export (Type column, debits
    positive) with a quoted preamble row, a monthly subscription, a refund pair,
    six interleaved one-off merchants, and a merchant (McDonald's) written half
    the time WITH an apostrophe and half WITHOUT, across three months, to expose
    whether merchant-stem grouping survives punctuation.
- `private/` -- **gitignored**. Charen's drop-in directory for sanitized real bank
  exports. Absent on a fresh checkout and in CI; the harness discovers whatever
  csv+json pairs are there and includes them in a LOCAL run only. The suite
  itself asserts this discovery never throws when the directory is empty or
  missing (`leakScanEval.test.ts`, "skips gracefully" test) -- that's the CI
  contract.

## Fixture format

`<name>.csv` -- the raw file text, exactly as `runScan` would receive it (BOM,
delimiter, quoting and all; the harness does not preprocess it).

`<name>.expected.json` -- a manifest:

```json
{
  "description": "...",
  "minRowsParsed": 180,
  "expectedCandidates": [
    { "merchantContains": "starbucks", "cadence": "monthly", "required": true }
  ],
  "maxNeedsReviewShare": 0.35,
  "expectGracefulFailure": false
}
```

- `minRowsParsed` -- floor on rows successfully parsed into `ScanRow`s (summed
  across every file in the fixture).
- `expectedCandidates` -- merchants the eval checks for in `result.recurring` /
  `result.habits`, matched by `merchantContains` (case-insensitive substring) +
  `cadence`. `required: true` fails the suite if not found; `required: false`
  is measured and printed but never fails the suite -- pair it with a `knownGap`
  string explaining why the pipeline doesn't find it yet. **Do not hide a real
  deficiency by omitting the candidate: mark it `required: false` with a
  `knownGap` so the gap is documented, not silent.**
  - Cadence convention (the manifest only names `daily`/`weekly`/`monthly`, but
    `RecurringItem.interval` also has `biweekly`/`annual`): `monthly` matches a
    detected `monthly` or `annual` interval; `weekly` matches `weekly` or
    `biweekly`; `daily` has no matching interval (the recurrence detector's
    shortest interval is weekly) and instead checks `result.habits` -- the
    behavioral-habit detector is exactly the "frequent, variable amount,
    discretionary" case a `daily` cadence implies.
- `maxNeedsReviewShare` -- ceiling on the share of rows landing in the
  needs-review category tier.
- `expectGracefulFailure` -- whether the fixture should trip graceful failure
  (spec 7: every file below the confidence floor, or zero rows survive).

A stray `.csv` with no matching `.expected.json` (or vice versa) is skipped by
discovery, not an error -- useful for a work-in-progress drop-in.

## Adding Charen's real exports locally

1. Copy the sanitized CSV into `__tests__/leakScanEval/private/<name>.csv`.
   Sanitize first: replace the account holder's name and any account/card
   numbers with placeholders; merchant strings and amounts can stay real (that's
   the point -- they're what the harness measures). Verify the copy is actually
   ignored before trusting it: `git check-ignore -v __tests__/leakScanEval/private/<name>.csv`.
2. Write `__tests__/leakScanEval/private/<name>.expected.json` per the format
   above. Set `minRowsParsed` from the file's real line count minus its header
   (and any preamble rows). Only add an `expectedCandidates` entry where a
   repeat merchant is obvious by eye in the raw file; anything the pipeline
   should plausibly find but measurably doesn't becomes `required: false` +
   `knownGap`, never a silently-omitted candidate.
3. `npm run scan:eval` and read the score table. Never paste real merchant
   strings or amounts from a private fixture into a PR description, commit
   message, or chat -- only the aggregate numbers the score table already
   reduces them to.

## Baseline (2026-08-04)

Measured by running `npm run scan:eval` against every fixture in this branch
(15 adapted acceptance fixtures, 2 new synthetic "realistic mess" fixtures, and
locally, 3 of Charen's real Scotia exports + a combined multi-file run). CI only
ever sees the first 17 rows (`private/` is absent there).

| fixture | status | rowsParsed | solid | likely | needsReview | required candidates | known gaps |
|---|---|---|---|---|---|---|---|
| adapted:bom-preamble | ok | 6/6 | 0% | 83% | 17% (floor <=35%) | 0/0 | 0 |
| adapted:sign-balance | ok | 7/7 | 0% | 86% | 14% (floor <=30%) | 0/0 | 0 |
| adapted:sign-type | ok | 6/6 | 0% | 83% | 17% (floor <=35%) | 0/0 | 0 |
| adapted:cross-account-transfer | ok | 6/6 | 0% | 100% | 0% (floor <=15%) | 0/0 | 0 |
| adapted:refund-pair | ok | 4/4 | 0% | 100% | 0% (floor <=15%) | 0/0 | 0 |
| adapted:etransfer-monthly | ok | 7/7 | 0% | 100% | 0% (floor <=15%) | 1/1 | 0 |
| adapted:biweekly-loan | ok | 5/5 | 0% | 100% | 0% (floor <=15%) | 1/1 | 0 |
| adapted:truncated-vs-sibling | ok | 112/100 | 0% | 11% | 89% (floor <=95%) | 0/0 | 2 |
| adapted:messy-merchant | ok | 2/2 | 0% | 100% | 0% (floor <=15%) | 0/0 | 0 |
| adapted:walmart-recategorize | ok | 4/4 | 75% | 25% | 0% (floor <=15%) | 1/1 | 0 |
| adapted:dupe-reimport | ok | 3/3 | 0% | 100% | 0% (floor <=15%) | 0/0 | 0 |
| adapted:garbage-failure | failed (expected) | 0/0 | -- | -- | 0% (floor <=100%) | 0/0 | 0 |
| adapted:jpy-zero-decimal | ok | 3/3 | 0% | 67% | 33% (floor <=50%) | 0/0 | 0 |
| adapted:quoted-fields | ok | 3/3 | 0% | 67% | 33% (floor <=50%) | 0/0 | 0 |
| adapted:semicolon-delimiter | ok | 3/3 | 0% | 100% | 0% (floor <=30%) | 0/0 | 0 |
| card-merchant-suffixes | ok | 28/26 | 39% | 36% | 25% (floor <=32%) | 1/1 | 1 |
| chequing-split-mixed-dates | ok | 29/27 | 52% | 31% | 17% (floor <=25%) | 2/2 | 0 |
| private:basic-2884 (local only) | ok | 1/1 | 0% | 100% | 0% | 0/0 | 3 |
| private:momentum-1026 (local only) | ok | 1/1 | 0% | 0% | 100% | 0/0 | 2 |
| private:passport-1023 (local only) | ok | 1/1 | 0% | 100% | 0% | 0/0 | 0 |
| private:combined (local only) | ok | 3/3 | 0% | 67% | 33% | 0/0 | 0 |

All floors pass (87/87 assertions green). The suite is deliberately green today
even though several rows below are ugly -- that's the point of a baseline: the
numbers are honest, and OB-3 fixes them against this yardstick.

## Known gaps (measured, not fixed here)

### 1. Amount/Description column-role swap when description values end in a digit -- CRITICAL

**This is the headline finding of this baseline.** `inferColumns()` (Stage 3,
`utils/leakScan/columns.ts`) scores every column's "amount-ness" via
`looksLikeAmount()`, which strips a cell down to its digits/commas/dots before
checking there's at least one digit left. Any text column whose values commonly
end in a trailing digit (`"Cafe Number 3"`, a store-number suffix, a reference
number) or that is mostly empty except for one cell that happens to contain a
digit, can score a **spurious 100% amount-parse-rate** that ties the real Amount
column's own 100% rate. `argmax()` breaks ties toward the **lower column index**,
so whichever of the two columns comes first in the file wins the `amountIndex`
role -- even when it's actually the description column.

Effect once it fires: every row's `rawDescription` becomes an amount-looking
string, `merchantStem` becomes noise, categorization has nothing to match on,
and (worse) most rows fail real amount parsing against the wrong column and are
silently dropped.

Measured twice in this baseline, by two independent mechanisms:

- **`adapted:truncated-vs-sibling`** (synthetic, committed, spec fixture): the
  100-row file's `"Cafe Number 0".."Cafe Number 4"` description values all end
  in a digit, tying a **dense** win against the real Amount column. Result: 89%
  needs-review, merchant stems that are just numbers (`"6 00"`, `"7 00"`, ...).
- **Every one of Charen's three real private exports**: each has a `Filter`
  column that is empty on every row except the first (which carries the
  export's own date-range note, itself containing digits). That single
  non-empty cell ties the real Amount column via a **sparse** 1-row "100%"
  parse rate. Result: **1 row out of 99 (or 26) survives parsing**, per file,
  and even that one surviving row's amount is wrong (parsed from the note text,
  not the transaction). Confirmed identical on `basic-2884`, `momentum-1026`,
  and `passport-1023` -- this is not a one-off, it's a structural weakness that
  a common, ordinary real-world column ("Filter", "Notes", any export-metadata
  column) reliably triggers.

This is why the private baseline rows above show `rowsParsed: 1/1`: the floor
is set to the measured (terrible) reality, honestly, not padded. Not fixed in
this unit -- OB-3 should treat this as its top-priority fix, most plausibly by
requiring a much larger sample before trusting a 100% parse rate (an n=1 or
even n=5 "perfect" score should not outrank a real column's n=90+ perfect
score), and/or breaking `argmax` ties by preferring a header keyword match
(`KW.description`) over column position.

### 2. Amount-variance recurrence tolerance excludes real, mildly-variable bills

`adapted:truncated-vs-sibling`'s sibling file has a `"Monthly Bill Utility"`
line that drifts about 5% month to month (spec caps fixed-recurrence variance at
2%), so it never registers as recurring; `Utilities` is also not a discretionary
category, so it can't register as a behavioral habit either. A realistic bill
that isn't perfectly flat is invisible to both detectors. `required: false`,
documented in `adaptedFixtures.ts`.

### 3. Punctuation splits a merchant's stem, undercounting its true frequency

`card-merchant-suffixes.csv`: `normalizeMerchant()` strips an apostrophe to a
space, so `"McDonald's"` tokenizes to `["mcdonald", "s"]` and stems to
`"mcdonald"` -- a different key than the punctuation-free `"mcdonalds"` that
`KNOWN_CHAINS` is keyed on. Measured: written 14 times across the fixture, split
8 (no apostrophe) / 6 (apostrophe). The no-apostrophe majority clears the
habit floor on its own and IS surfaced; the apostrophe minority stays under the
floor and is silently dropped. Net effect: the habit is found, but its
occurrence count and total undercount the merchant's true frequency by ~43%.
`required: false`, documented in `fixtures/card-merchant-suffixes.expected.json`.

### 4. "Uber Eats" (space-separated) miscategorizes as Transportation, not Food

Not asserted by any manifest (it's a category-*correctness* issue, not a
recall/tier-confidence one, so the current scoring schema can't express it), but
worth recording: `normalizeMerchant()`'s brand token is always the FIRST word,
so `"Uber Eats Toronto"` stems to `"uber"`, which hits `KNOWN_CHAINS['uber']` ->
`Transportation` (solid tier, confidently wrong) instead of the separate
`KNOWN_CHAINS['ubereats']` entry, which only ever matches a description with no
space (`"UberEats"`). Observed in both `chequing-split-mixed-dates.csv` and (by
description, before the column-swap bug above hides it) Charen's real
`momentum-1026` export.

### 5. Confidence score doesn't reflect row-level survival

A second-order consequence of gap #1: `private:basic-2884`'s single surviving
row still scores `confidenceScore: 0.975` / tier `solid`, because the composite
score is built from the (mis-selected) column's own internal parse consistency,
not from how many rows actually survived to become `ScanRow`s. A file that lost
99% of its rows should not present as high-confidence.

## Cross-account netting (private:combined)

Running all three of Charen's real exports as one multi-file `runScan` session
(`private:combined`) shows `transfers: 0, refunds: 0` -- but this is **not** a
netting-logic finding. Gap #1 above already discards 98/99, 98/99, and 25/26
rows per file before netting has anything to work with (3 total rows survive
across all three files combined). Netting itself cannot be meaningfully
evaluated here until gap #1 is fixed; re-run this fixture after OB-3 lands to
get a real read on whether the chequing-to-card payment transfers net instead
of double-counting.
