# Onboarding v3.1: integration plan

How the PRD's flow lands on the shipped app. One phase = one PR, Lane 2 unless noted.
Prereqs and decisions: `DECISIONS-NEEDED.md`. Evidence: `AUDIT-VS-PRD.md`.
Phases 2-8 assume phase 1 merged. Phase 6 additionally gates on D1 (ADR 0026).

## Phase 1: honesty + plumbing preconditions (start immediately, no design dependency)

1. **UX-073, the divisor bug.** `sessionCoverage()` (`utils/leakScan/coverage.ts:63-73`)
   returns `coveredDays` = distinct transaction days; every monthly figure divides by it
   as if it were the calendar span. `rangeDays()` (`coverage.ts:37-42`) already computes
   the true span. Fix: expose span from coverage, sweep the divisor sites:
   `utils/leakScan/recurrence.ts:253,266`, `utils/leakScanBridge.ts:68-71`,
   `components/leak-scan/ResultsScreen.tsx:94,536`, `utils/leakScan/summarize.ts:38,44`,
   `utils/leakScan/resultsSummary.ts:42`. Keep distinct-day count where it is genuinely
   about data density (`hasReliableRate`, review copy). Acceptance: the
   `chequing-split-mixed-dates.csv` eval fixture's rent candidate reads about $1,200/mo,
   never $4,000. Re-run the full eval harness; update expected.json values that encoded
   the wrong divisor.
2. **UX-074.** ResultsScreen (and the leak-scan route generally) renders under the
   status bar: add safe-area insets in `app/leak-scan.tsx` /
   `components/leak-scan/ResultsScreen.tsx`.
3. **Scan-route completion hole.** `useCompleteScanOnboarding` fires only from
   "Bring in your last 30 days" and the graceful-failure hand-log exit. Call it from the
   track path too (`handlePickOneStart` in `ResultsScreen.tsx:335-349`), so tracking a
   leak completes onboarding, matching PRD activation.
4. **Suppression reaches future discovery.** `utils/habitDetection.ts` never reads
   `scanRules.suppressedHabits`, so a dismissed merchant resurfaces from logged
   expenses. Thread the suppression set into `detectHabits` callers (match on merchant
   stem via the same `normalizeMerchant`). This makes PRD 7.4's "never re-proposed"
   true. Schema already serves it; no migration.
5. **Fixed-class CTA bug.** Rent was observed with a "Break it" CTA. `HabitCard`
   suppresses CTAs for `governClass 'fixed'` (`HabitCard.tsx:91-106`) but the
   biggest-leak hero path does not: enforce the same rule on `BiggestLeakCard`
   selection or filter fixed-class candidates out of hero eligibility.

Tests: eval fixtures, unit tests per divisor site, regression test that a fixed-class
candidate can never be the hero with a break CTA.

## Phase 2: scope selection + locked tier

- New screen between extraction and results: "Where should we look?". Runs AFTER the
  pipeline (scope is a pure post-filter over candidates, exactly like rules re-runs in
  `ResultsScreen.tsx:207-220`; the pipeline itself does not change).
- Tiers (PRD 7.1) mapped to the shipped `ExpenseCategory` taxonomy:
  - Locked, visible, never offered: Mortgage/Rent, Utilities, Car (the CONTRACT set,
    `recurrence.ts:66-71`) plus Healthcare. Insurance, debt, childcare, education have
    no first-class categories: route them by keyword in `categorize.ts` keyword tables
    into locked buckets, or add categories (taxonomy decision, flag in PR).
  - Available, default off: Groceries-equivalent (Food subsplit does not exist; Food
    defaults ON per the discretionary set, so the off-tier here is Transportation,
    Utilities-adjacent, and Other). `Other` off is the misread-pharmacy containment.
  - Available, default on: the DISCRETIONARY set (`recurrence.ts:59-63`) plus
    Software & Subscriptions.
  - Reason line under the locked tier: "rent, medical, and childcare go to Upcoming,
    not to habits."
- Defaults fail closed; scope persisted with scan rules so re-scans remember it.
- Event: `scope_selected {categories_on, categories_off, used_defaults}`.

## Phase 3: habit deck

- Deck of at most 3 from in-scope candidates. Rank: occurrences desc, then per-instance
  cost (`averageAmount`) as tiebreak. `governClass 'fixed'` excluded upstream (exists),
  suppression respected (exists), threshold per D6 (recommend: keep rate-based gates).
- Card tap: keep `PickOneSheet` as the skipValue confirm (prefill `averageAmount`,
  already wired via `leakScanBridge`). Dismiss: existing `suppressHabit` + re-run.
- Fallback 1 (no candidates): template grid from the VICE presets + "Something else"
  (extract the chip set from `BreakHabitSheet` / `constants/onboardingPresets.ts`).
- Fallback 2 (all three dismissed): the existing ranked ladder as a terminal full list.
  One hop only; rejection there exits via skip.
- Events: `deck_card_shown {position, merchant_category, instances, total_cents}`,
  `deck_card_result {position, result}`, `deck_exhausted {fallback}`.
- Note: each dismissal currently overwrites the persisted ScanSummary via re-run;
  batch or debounce summary writes so deck churn does not thrash it.

## Phase 4: activation + payoff

- Activation = `habit_tracking_started` (any source) with skipValue > 0. Scan route
  writes NO habit instances: the evidence block (observedCount/observedTotal/
  averageAmount) certifies setup, matching PRD 7.5's "certifies setup, not engagement".
  Deliberate deviation from PRD's letter (no dayLogs entries; statement rows are past
  spends, not skips; the kept counter stays honest).
- New event `first_kept {}`: first `skip_logged` per install, the engagement metric for
  all routes.
- Payoff screen (gated on D1): quiet variant renders the real-history line ("Coffee, 14
  times, $84 last month. Skip it once and $6 comes back.") from the evidence block,
  correct only after phase 1. Celebratory variant only when a skip was recorded
  in-flow. Palette per D2: sage, house motion budget, reduced-motion path.

## Phase 5: bills -> Upcoming offer

- New post-payoff screen listing `RecurringItem`s NOT consumed by the deck (fixed
  class, out-of-scope, non-candidates): cadence pre-answered from `detectRecurring`
  (exists), per-row untick, one "Add to Upcoming" confirm ->
  `recurringToExpenses` + `filterAlreadyImported` (both exist in
  `utils/leakScan/importWrite.ts`). Skippable, one screen.
- Reposition ProjectionSection's in-ladder bulk save for the onboarding path (keep for
  in-app re-scans, or retire once this screen also serves Insights re-scans).
- Events: `bills_offered {count_proposed}`, `bills_imported {count_accepted}`; never
  touches activation.
- Undo coherence: bills rows share the scan `importId`; undo must keep removing them
  (it does today; add a regression test).

## Phase 6: carousel + beat 1 (gated on D1 / ADR 0026)

- Carousel: three beats carrying the shipped intent content; no auto-advance,
  rubber-band both ends, dots; ghost "I'll explore on my own" = existing skip.
  Two-level back: route screens pop to the carousel; carousel back exits to the app;
  back never steps between beats.
- **Drift rule (the ADR 0026 clause): beats render real components, never simulated
  mockups.** The app went through a redesign and a 74-finding audit in one month;
  simulated frames would already have drifted twice.
- Beat 1 host: the real LogExpenseSheet (native decimal pad, ADR 0023) on a dedicated
  onboarding route; the saved amount is a REAL expense (D4). "Is this a regular thing?"
  = the restyled break-or-watch nudge; "Track it" -> the existing
  `seedDiscoveredHabit` + `startBreakingHabit` path.
- Resume routing: extend STEP_ROUTE (`app/onboarding/welcome.tsx:20-36`) for any new
  persisted steps AND keep all stale-step mappings. The build 5 crash class stays
  impossible.
- Animation constraints are hard: runOnUI, one driver per node, reduced-motion static
  frames (two prior release-only crashes).
- The welcome aurora exploration resolves into the carousel's first frame, closing the
  open ADR 0022 welcome question from the punchlist.

## Phase 7: empty states as onboarding surfaces

Add a concrete first action to every skipper-reachable empty state (only Today > Kept
has one today):

| Surface | Current | Add |
|---|---|---|
| Money > Spent (`SpentList.tsx:180`) | copy only | "Log an expense" -> log drawer |
| Money > Upcoming (`UpcomingList.tsx:140`) | copy only | "Add an upcoming expense" -> AddUpcomingSheet |
| Money > Habits (`HabitsList.tsx:36-47`) | copy only | break-habit entry (gate-aware) |
| Insights > Leaks (`LeaksCard.tsx:39`) | copy only | break-habit entry or "Run a scan" |
| Categories (`categories.tsx:143-147`) | instructional copy | "Add category" action |

Event: `skip_activation {surface}` on the first activation-relevant act from each.

## Phase 8: instrumentation reconciliation

- Mapping table, old name kept wherever one exists (ADR 0020 stability rule):
  `beat_viewed/beat_swipe` -> new (carousel is new); `intent_selected` ->
  `onboarding_intent_selected` (keep); `carousel_skipped` ->
  `onboarding_intent_skipped` (keep); `activation` -> derived from
  `habit_tracking_started`; `route_milestone` -> map onto existing step events.
- Genuinely new: `scope_selected`, `deck_card_shown`, `deck_card_result`,
  `deck_exhausted`, `bills_offered`, `bills_imported`, `skip_activation`,
  `first_kept`. User property `recurring_expense_count` (D5: instrument only).
- Success-criteria queries (PRD sect 11) documented against final names.

## Verification (every phase)

- Jest green three consecutive runs + tsc clean before any PR.
- Eval harness re-run whenever leak-scan math or filters change.
- Simulator walk of all three routes + skip, seeded data + a real CSV scan.
- Release-configuration build (`expo run:ios --configuration Release`) before merging
  any carousel/payoff animation work.
- VoiceOver pass on every new screen (scope, deck, payoff, bills, carousel).
- Both-themes rule is moot (light-only lock) but reduced motion is checked per screen.

## Risks

- STEP_ROUTE stale-step revival (build 5 crash class).
- Release-only animation crashes (carousel and payoff are the animation-heavy surfaces).
- ScanSummary churn from deck dismiss re-runs (phase 3 note).
- Undo-import vs accepted bills (phase 5 note).
- Android predictive back semantics documented, not built (iOS-first).
- Dark-mode onboarding stays deferred (light-only direction lock; matches PRD punchlist).
