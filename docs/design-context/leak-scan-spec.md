# Leak Scan (CSV import) — v1 specification

Status: approved direction (Decision 2, plan-v2). Companion to P2-1b; supersedes the
column-mapper-wizard approach. Scope: CSV only, on-device, no network with file contents.
Door 1 (Leak Audit) remains the v1 ship gate; Leak Scan fails gracefully into it.

Gate: file pick → first insight on screen in under 60 seconds for a typical file.

---

## 1. Principles

1. **Resolve ambiguity algorithmically; ask the user only what heuristics cannot answer.**
   Target: zero questions for a well-formed file, never more than two.
2. **Half-right money math is worse than none.** Below the confidence floor, the scan
   declines to show numbers and exits gracefully (§7).
3. **Every output is correctable, and every correction is a persistent personal rule**
   that outranks the built-in ruleset on all future scans and manual logs (§8).
4. **Coverage honesty everywhere.** Every insight declares its evidence window. Days
   outside file coverage are visually distinct from zero-spend days.
5. **Privacy posture (D-9).** Telemetry is structural only: counts, rates, tiers,
   booleans. Never merchant strings, amounts, descriptions, or file contents.

---

## 2. Pipeline

### Stage 0 — Session
- Up to 5 files per import session. 10 MB / 50k-row caps per file.
- Transactional: session gets an `importId`; single-tap undo removes everything it wrote.
- Per-row failure, never per-file: unparseable rows go to a skipped-rows count surfaced
  in the results footer ("212 of 214 rows read").

### Stage 1 — Preflight
- Strip UTF-8/UTF-16 BOM (`\ufeff`). Normalize CRLF/CR to LF. Decode UTF-8, fall back
  latin-1.
- Formula-injection neutralization: cells starting with `=` `+` `-` `@` TAB CR are
  treated as text (per existing security list).
- Parse with PapaParse (quoted fields, embedded newlines, ragged rows). Never
  `split(',')`. Delimiter sniff: `,` `;` `\t` `|` — score by column-count consistency
  over first 50 rows.

### Stage 2 — Header & preamble detection
- Scan first 10 rows. Score each row as header candidate: (a) column count matches the
  modal count of the next 20 rows, (b) cells are short non-numeric strings, (c) no cell
  parses as a date or amount.
- Rows above the winning header are preamble → discard. (Real case: Scotiabank injects
  a `Custom filters, From date=…` string into row 1 of the data.)
- No header found but row 1 type-sniffs as data → synthesize `col_1..col_n`.

### Stage 3 — Column inference
Score every column 0–1 per role; assign role = argmax above threshold (0.9 date,
0.9 amount, best-remaining description):
- **date-ness**: parse rate across ISO 8601, `MM/DD/YYYY`, `DD/MM/YYYY`, `DD-MMM-YYYY`,
  `YYYYMMDD`. If two date columns exist (transaction vs posted), prefer the earlier-
  labeled/earlier-valued one; store the other as `postedDate`.
- **amount-ness**: numeric rate after stripping currency symbols, thousands separators,
  parentheses, trailing `-`, `CR`/`DR` suffixes. Handle both `1,234.56` and `1.234,56`
  (decide by which separator appears last).
- **description-ness**: string length + entropy.
- Recognize auxiliary columns by header keyword: balance, status (pending/posted),
  type (debit/credit), sub-description, currency.
- **The one permitted question**: if every date value has both fields ≤ 12 →
  "Is 03/04 March 4th or April 3rd?" (one tap, asked once per session, answer stored
  as a personal rule keyed to the file's header fingerprint).
- Split debit/credit **columns** (two amount columns): merge into signed amount,
  debit = outflow.

### Stage 4 — Sign convention (per file, never shared)
Detection ladder:
1. **Balance column exists** → provable: verify `balance[i-1] − balance[i] == outflow`
   over a 20-row sample (account for sort order; detect sort by date monotonicity).
   Confidence 1.0.
2. **Type column exists** (`debit`/`credit`, `D`/`C`) → correlate sign with type over
   sample. Confidence 0.95.
3. **Neither** → majority-sign heuristic (most rows in a personal account are
   spending) + keyword anchors (`payroll`, `deposit`, `refund` should be inflows).
   If resulting confidence < 0.8 → one confirmation chip: "Purchases in this file look
   like negative numbers — right?"
- Real case: Scotiabank chequing debits are negative; its card debits are positive.
  Never assume a convention is shared across files in one session.

### Stage 5 — Cross-file merge & dedupe
- **Same-account overlap** (user exports overlapping ranges twice): row hash =
  `sha1(dateISO|amountCents|normalizedDesc)`; drop exact-hash duplicates across files;
  count surfaced ("14 duplicate rows merged").
- **Account identity**: infer from filename tokens + header fingerprint + convention;
  label accounts A/B/C for display, user can rename.

### Stage 6 — Netting (non-negotiable core)
- **Internal transfers**: chequing debit ↔ card credit matched on amountCents +
  ±3-day window + keyword set (`payment`, `transfer`, `credit card`, `loc pay`,
  `payment from`). Mark `internal: true`, exclude from all spend math, show in a
  collapsed "moved between your accounts" group.
- **Refund netting**: same normalized merchant, offsetting amounts within 14 days →
  pair as `reversed`, net contribution zero, badge on both rows. (Real case: Apple
  $1,806.87 charged Jun 19, refunded Jun 26.)
- Ambiguous matches (multiple candidates) → flag `needs-review`, do not auto-net.

### Stage 7 — Merchant normalization & categorization
- Normalize: uppercase → strip location suffixes (`Waterloo On`), payment-method
  suffixes (`(Apple Pay)`), phone numbers, store numbers, trailing punctuation/URLs
  (`.Comca`); cluster on normalized stem (exact + prefix match).
- Categorize in tiers (categories: Mortgage/Rent, Car, Food, Shopping, Utilities,
  Healthcare, Transportation, Entertainment, Software & Subscriptions, Transfers,
  Income, Other):
  - **solid** — personal-rule hit or known-chain exact match
  - **likely** — keyword/pattern token match
  - **needs-review** — no match
- Review queue: top **10** unknown merchants ranked by absolute dollar impact.
  Everything below the top 10 defaults to Other, correctable later from any
  transaction row. Sized as a 60-second task, never homework.

### Stage 8 — Coverage & truncation
- Per-file date range = min/max parsed dates. Session coverage = union, with gaps.
- **Truncation heuristic**: row count ∈ {100, 250, 500, 1000} AND range < 40% of the
  sibling files' median range → banner: "This export looks cut off — it covers
  {range} only. Re-export a wider range for the full picture."
- Every downstream insight carries its evidence window string
  ("based on 30 days of card data + 6 months of chequing").

### Stage 9 — Recurrence & habit detection (runs on FULL history)
- **Fixed recurrence**: same merchant stem, amount variance ≤ 2%, interval regularity
  (monthly ±4d, biweekly ±2d, weekly ±1d, annual ±10d), ≥ 3 occurrences (≥ 2 for
  annual). Detects: rent, loan payments, insurance, subscriptions, and small fixed
  transfers (real case: the $11/mo e-transfer — small + fixed + monthly is a
  recurrence regardless of size).
- **Biweekly cadence** flags 3-payment months in the projection (real case: Nissan
  loan, 3 hits in July).
- **Behavioral habit**: merchant stem or category with ≥ 4 occurrences/month,
  variable amounts, discretionary category.
- **Governability classifier**:

| Class | Rule | CTA |
|---|---|---|
| Govern | discretionary + frequent + variable, or renewing subscription | Track this leak |
| Influence | necessary category, behavior-shaped (trip frequency, order size) | Monitor |
| Fixed | amount variance ≤2%, regular date, contract category | tip card only |

- Rank habit candidates by `annualizedLeak × governabilityWeight`
  (govern 1.0, influence 0.5, fixed 0.15). Cap list at **10**. Pre-select none.

---

## 3. Edge-case & attribute coverage table

| Attribute | Handling |
|---|---|
| BOM (UTF-8/16) | strip in preflight |
| Preamble/filter rows in data | Stage 2 header scoring |
| Ragged/truncated rows | per-row skip + count |
| Quoted fields, embedded newlines | PapaParse |
| Delimiters `,` `;` `\t` `\|` | sniff by consistency |
| Date formats (ISO, US, EU, textual) | multi-format parse race |
| DD/MM vs MM/DD ambiguity | the one permitted question |
| Parentheses negatives, trailing minus, CR/DR | amount normalizer |
| Thousands separators `1,234.56` / `1.234,56` | last-separator rule |
| Currency symbols / currency column | strip; if column exists and ≠ home currency → convert nothing, badge rows "foreign", exclude from totals with a count |
| Zero-decimal currencies (JPY) | respect `useCurrency` minor-unit config (ties to AmountInput punchlist fix) |
| Opposite sign conventions per file | Stage 4 ladder |
| Split debit/credit columns | merge to signed |
| Pending vs posted status | ingest posted; pending shown grayed, excluded from totals |
| Statement vs transaction date | prefer transaction; store both |
| Internal transfers (cc payments) | Stage 6 pairing |
| Refund/chargeback pairs | Stage 6 netting |
| Duplicate rows across overlapping exports | Stage 5 hash dedupe |
| Multi-account sessions | per-file account identity |
| ATM/cash withdrawals | category "Cash — untracked"; excluded from habit detection (spend content unknown) |
| Income (payroll, rebates, interest) | classified Income; excluded from spend; enables projection slack line (v1.x) |
| Interest charges & bank fees | Utilities/Fees keywords |
| E-transfers | Transfers class; fixed-recurrence detection still applies |
| Annual renewals | recurrence detector with 2-occurrence annual floor; single occurrences of subscription-keyword merchants → "possible annual" hint, low confidence |
| Truncated exports (row-cap) | Stage 8 heuristic + banner |
| Formula injection | preflight neutralization |
| 10MB / 50k rows / 5 files | session caps |

---

## 4. Confidence model

Per-file score = weighted composite:

| Signal | Weight |
|---|---|
| header found (bool) | 0.10 |
| date column parse rate | 0.25 |
| amount column parse rate | 0.25 |
| sign convention confidence | 0.25 |
| netting consistency (no unresolved balance contradictions) | 0.15 |

- **≥ 0.85** → full results.
- **0.60–0.85** → results with a "some rows need your eyes" banner + review queue
  prioritized; totals render with the `likely` tier badge.
- **< 0.60 on every file in the session** → graceful failure (§7). If at least one
  file passes, proceed with passing files and name the one that didn't.

Confidence is surfaced as three visual tiers only — **solid / likely / needs review** —
never a raw percentage.

---

## 5. Results screen — component spec

Order top-to-bottom. Every number renders through `useCurrency().format`.

### 5.1 KPI row
- **Total spent** — net of internal transfers and reversals; subtitle = evidence
  window ("Jul 1 – Jun 30 · 3 accounts").
- **Per day** — total ÷ covered days (covered = days inside file ranges only).
- **Transactions** — outflow count; subtitle "x.x purchases/day".
- Each KPI carries the tier badge of its weakest input.

### 5.2 Categories (top 3 + View more)
- Top 3 by net spend: name, amount, % of total, tier badge, horizontal bar.
- **View more** expands full list. Fire `scan_categories_expanded`.
- Row tap → transaction list for that category; every row's category chip is
  tap-to-correct (§8).

### 5.3 Spending pulse (streak layout)
Reusable component `<SpendPulse granularity>`; shared visual grammar with the habit
streak calendar but distinct semantics (spend intensity vs skip/slip/no-log).
- **Granularity auto-select by coverage**: ≤ 45 days → daily squares; ≤ 14 months →
  monthly squares; user toggle Day / Month / Year overrides.
- Year view = GitHub-style 7×53 micro-grid (only when coverage ≥ 10 months).
- Color: single red ramp, sqrt-scaled to session max. **Zero-spend day = neutral
  fill. Out-of-coverage day = hatched/empty — never the same as zero.**
- Tap a cell → detail sheet: date, total, merchant list. Fire `scan_pulse_day_opened`.
- Caption: "You transacted on {n} of {covered} days."

### 5.4 Habit cards (max 10, one per discovery)
Card anatomy:
- Rank + class badge (Govern / Influence / Fixed) + tier badge.
- Title (plain-language habit name).
- Stats row: **{orders} orders · {days}/{coveredDays} days · {monthTotal} in {month}**.
- One-sentence description naming top merchants
  ("Shawarma spots, Hyderabad cafés, Uber Eats — restaurant food landed 2 of every
  3 days").
- **Yearly pace pill**: "≈ {annualized}/yr pace" (annualized from evidence window,
  tilde mandatory).
- CTAs by class: Govern → **Track this leak** (opens the Decision-1 confirmation
  sheet: detection evidence, editable per-skip value prefilled from the user's own
  average, cadence question routing to check-in vs "I skipped one"). Influence →
  **Monitor** (creates monitor-only habit, no skip loop). Fixed → tip card, no
  tracking CTA ("July is a 3-payment month for this loan — plan for the extra
  {amount}").
- Overflow menu → **"Not a habit"** (dismiss = suppression rule + feedback signal)
  and **"Wrong details"** (opens correction sheet).

### 5.5 Next-month projection (auto-rendered)
- Renders only when coverage ≥ 1 full calendar month; otherwise placeholder:
  "One full month of data unlocks your projection."
- **Recurring — locked in**: detected fixed recurrences with next expected date;
  biweekly items show payment count for the month (3-payment months flagged ⚠).
- **Variable — run-rate**: per governable/influence category, median of full covered
  months (fallback: single-month run-rate, tier `likely`).
- **Buffer**: +12% of subtotal, one line, labeled "irregulars & annual renewals".
- Primary CTA: **"Save to HabitCents"** → writes each recurring item to recurring
  expenses (`source: 'import'`, cadence, amount, next date) and stores the category
  baselines. Fire `scan_projection_saved`.
- Secondary per-item toggle: **"Remind me the day before"** → v1: intent capture
  only. Persists `remindBefore: true` on the recurring expense; no notification is
  scheduled in v1 (P2-1b scope boundary: notifications are v1.x). When v1.x wires
  expo-notifications (local-only, respects no-network rule), every saved intent
  activates automatically. Fire `scan_reminder_intent_set`.

### 5.6 Footer
- Rows read / skipped / duplicates merged / transfers netted, per file.
- "Undo this import" (transactional, uses `importId`).

### Post-scan handoff
Continue CTA: **"Bring in your last 15 days"** → seeds the expense log with the most
recent 15 days of categorized rows (keeps Reporting at manual-log scale). Detection
and projection retain full-history basis regardless of the 15-day seed. Then route to
habit pick (max 2 recommended) → Decision-1 sheet → done. The Door-2 exit and the
Door-1 exit land on the same screen.

---

## 6. Feedback architecture (accuracy loop)

Local rule store `utils/scanRules.ts`, persisted with app data, applied at the top of
Stage 7 and to all future manual logs:

| User action | Rule written | Precedence |
|---|---|---|
| Recategorize a merchant | `merchantStem → category` | overrides built-ins |
| Rename a merchant | `rawStem → displayName` | display only |
| Confirm/deny transfer pair | `pairSignature → internal:bool` | overrides Stage 6 |
| Confirm/deny refund pair | same | overrides Stage 6 |
| Dismiss habit ("Not a habit") | `habitSignature → suppressed` | Stage 9 filter |
| DD/MM answer | `headerFingerprint → dateOrder` | Stage 3 |
| Sign confirmation | `headerFingerprint → signConvention` | Stage 4 |
| Rename account | `fileFingerprint → accountLabel` | display only |

- Rules are visible and deletable in Settings → "My corrections" (v1.x; store the
  data model now).
- Structural telemetry per correction: `scan_correction {stage, fromTier}` — no
  strings, no amounts. This is the parser-health dashboard: correction rate per
  stage per app version tells you which ruleset to improve next release.

---

## 7. Graceful failure ("it's not you, it's us")

Trigger: every file in session scores < 0.60, or zero rows survive parsing.

Screen copy:
> **This one's on us.**
> We couldn't read this file confidently enough to trust the numbers — and
> half-right money math is worse than none. Your data is fine; our reader just
> isn't fluent in this format yet.

Next-best actions (in order):
1. **Try a different export** — hint text: "Banks usually offer a few download
   formats. CSV works best; a shorter date range sometimes exports cleaner."
2. **Start with the 90-second Leak Audit** → Door 1, primed with anything the scan
   *did* confidently find (if partial).
3. **Log your first expense by hand** → guided first log.

Telemetry: `scan_failed {nFiles, encodingGuess, delimiterGuess, headerFound,
dateParseRate, amountParseRate, signConfidence}` — structural fingerprint only,
never contents. Do not retain the file.

---

## 8. Analytics events (all anonymous, structural)

`scan_started {nFiles}` · `scan_file_parsed {rows, skipped, confidenceTier,
signMethod, truncationFlag}` · `scan_question_shown {type}` · `scan_completed
{coverageDays, nAccounts, nHabitsFound, tierBreakdown}` · `scan_failed {…§7}` ·
`scan_categories_expanded` · `scan_pulse_day_opened` · `scan_habit_tracked
{class, cadenceRoute}` · `scan_habit_dismissed {class}` · `scan_correction
{stage, fromTier}` · `scan_projection_saved {nRecurring}` ·
`scan_reminder_intent_set` · `scan_seed15_applied {rows}` · `scan_undone`

---

## 9. Acceptance tests (derived from three real Scotiabank exports)

1. BOM + preamble: file with `\ufeff` and a filter-description string in data row 1
   parses; preamble discarded; header found.
2. Chequing (debits negative, Balance column) → sign proven via balance walk,
   confidence 1.0, no question asked.
3. Card file (debits positive, Type column, no balance) → sign via type correlation,
   no question asked.
4. Card payment appears in chequing (debit) and card (credit), 0–1 days apart →
   netted as internal; session total excludes both; "moved between accounts" group
   shows the pair.
5. $1,806.87 charge + $1,806.87 refund 7 days apart, same merchant → paired
   `reversed`, net zero, both rows badged.
6. $11.00 e-transfer monthly ×7, dates drifting 13th–20th → detected as fixed
   monthly recurrence despite date drift (±4d window).
7. Biweekly $293.80 loan → projection for a 3-payment month shows 3 hits + ⚠ flag.
8. 100-row export covering 30 days alongside a 12-month sibling → truncation banner
   fires; pulse renders pre-coverage days hatched, not clean.
9. Same file imported twice in one session → 100% duplicate merge, totals unchanged.
10. Merchant "BIRYANIWALLA CAMBRIDGE Cambridge On (Apple Pay)" → stem
    `biryaniwalla`, location/method stripped, categorized Food (likely tier).
11. Recategorizing one Walmart row to Shopping → all Walmart rows recategorized,
    rule persists to a second scan in a new session.
12. Garbage file (random text) → §7 failure screen, `scan_failed` fired, no partial
    numbers shown anywhere.
13. JPY-configured account → amounts enter/display with zero minor units.
14. Undo after full import → expense log, recurring expenses, habits, and baselines
    all reverted.

---

## 10. Scope boundaries

In v1: everything above. Out (v1.x): PDF/OFX/QIF, bank sync, notification *delivery*
(intent capture only), foreign-currency conversion, "My corrections" management UI,
income/slack line in projection. Hard constraints unchanged: no network with file
contents; PostHog anonymous-only; light mode.
