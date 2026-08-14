# Onboarding v3.1: integration plan

How the PRD's flow lands on the shipped app. One phase = one PR, Lane 2 unless noted.
Prereqs and decisions: `DECISIONS-NEEDED.md`. Evidence: `AUDIT-VS-PRD.md`.
Phases 2-8 assume phase 1 merged. Phase 6 gates on ADR 0026 ratification
(`ADR-0026-DRAFT.md`; D1 resolved in-session 2026-08-14, round 2).

## Phase 1: honesty + plumbing preconditions, SHIPPED (commit c6d75a7, 2026-08-14)

All five items merged to `design/onboarding-exploration`. Verification: tsc clean,
843/843 tests over three consecutive runs (20 new), eval harness 71/71, every new test
confirmed to fail on revert. Headline result: the rent fixture now reads $1,241.38 a
month instead of $4,000.00 (true rent $1,200, an 87-day window that was being divided
by 27). The original plan for this phase follows, kept as the record of intent.


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

## Phase 2: scope selection + locked tier, SHIPPED (2026-08-14)

Delivered: `utils/leakScan/scope.ts` (tiers, fail-closed defaults, the
essential-merchant guard, `applyScope`, `scopeFromRules`),
`components/leak-scan/ScopeScreen.tsx`, a new `scope` stage in
`useLeakScanIntake`, scope persistence in `ScanRules`
(`scope` + `scopeAnswered`), scope re-application on ResultsScreen re-runs,
and the `scope_selected` event. Verification: tsc clean, 894/894 tests over
three consecutive runs (51 new), eval harness 71/71.

**Known limitation, deliberately not fixed here.** The PRD's tiers assume a
finer taxonomy than the app ships (ADR 0006, ten categories):
- Groceries and eating out are both `Food`, so Food is on (that is where the
  behavioral leaks live).
- Transit and rideshare are both `Transportation`, so it fails closed and is
  off; a rideshare user turns it on in one tap.
Splitting either is a taxonomy change with migration cost across the category
picker and stored data. FOLLOW-UP BET: split Food into groceries vs eating out
and Transportation into transit vs rideshare, then revisit these defaults. Read
`scope_selected.used_defaults` first; heavy editing is the signal that this
matters.

**Owed:** visual pass on the new screen. It has a component test against the
real theme and an end-to-end flow test against the real pipeline, but no human
has looked at it. Needs a CSV in the simulator's Files app (or a device), so it
belongs with the Lane 2 pass.

The original plan for this phase follows, kept as the record of intent.


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
  suppression respected (exists). Threshold per D6 (RESOLVED): rate-based gates stay, no
  fixed >=8; the deck is behavioral-only. The full five-layer essential guarantee is in
  `DECISIONS-NEEDED.md` D6. Detected subscriptions do NOT enter the deck; they route to
  the phase 5 bills screen as their own group.
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
  PRD 7.5's letter is formally amended (D-round 2, recorded in `DECISIONS-NEEDED.md` and
  the ADR 0026 draft): statement rows never enter dayLogs; the kept counter only moves
  on a real skip.
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
- Two row groups per the D6 subscription ruling: "bills" (essentials and other fixed
  cadence rows) and "subscriptions" (subscription-classed cadence rows, cancellable,
  visually distinct from essentials). The deck never shows subscriptions; this screen
  is where they surface during onboarding.
- Reposition ProjectionSection's in-ladder bulk save for the onboarding path (keep for
  in-app re-scans, or retire once this screen also serves Insights re-scans).
- Events: `bills_offered {count_proposed}`, `bills_imported {count_accepted}`; never
  touches activation.
- Undo coherence: bills rows share the scan `importId`; undo must keep removing them
  (it does today; add a regression test).

## Phase 6: carousel + beat 1 (gated on ADR 0026 ratification)

Beat design per D1 (round 2): each beat is a pre-recorded capture FROM the real app,
a looping video with hook text below; tapping the beat triggers the real workflow.
Workflows are always the real ones; simulated interactive UI stays banned (ADR 0022
survives as an amendment, not a reversal).

- Carousel: three beats; no auto-advance, rubber-band both ends, dots; ghost
  "I'll explore on my own" = existing skip. Two-level back: route screens pop to the
  carousel; carousel back exits to the app; back never steps between beats.
- Beat media: looping HEVC/MP4 via expo-video, 3-5 second loops, never GIF (binary
  size, battery, JS-thread decode). Reduced motion = static poster frame per beat
  (the video's first frame). Beats-as-video removes reanimated scene work from the
  carousel, so the release-only animation crash class does not apply to the beats;
  carousel paging itself stays trivial.
- Capture runbook: `design/captures/onboarding-beats/RUNBOOK.md` records which flows,
  seed data, device frame, light mode. Re-capture is a named release-checklist item
  whenever an onboarding-visible surface changes. No invented totals inside a
  recording: example-scale seed data; the hook text under the video carries the
  "for example" framing (ADR 0022's rule extends to marketing surfaces).
- Beat 1 host: the real LogExpenseSheet (native decimal pad, ADR 0023) on a dedicated
  onboarding route; the saved amount is a REAL expense (D4). "Is this a regular thing?"
  = the restyled break-or-watch nudge; "Track it" -> the existing
  `seedDiscoveredHabit` + `startBreakingHabit` path.
- Resume routing: extend STEP_ROUTE (`app/onboarding/welcome.tsx:20-36`) for any new
  persisted steps AND keep all stale-step mappings. The build 5 crash class stays
  impossible.
- Any remaining reanimated work (payoff, transitions) keeps the hard constraints:
  runOnUI, one driver per node, reduced-motion paths (two prior release-only crashes).
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
- Release-only animation crashes (payoff is the remaining animation-heavy surface; the
  beats are video and exempt).
- Stale beat videos: a re-capture miss ships an outdated preview. Mitigated by the
  runbook being a release-checklist item, not a memory.
- ScanSummary churn from deck dismiss re-runs (phase 3 note).
- Undo-import vs accepted bills (phase 5 note).
- Android predictive back semantics documented, not built (iOS-first).
- Dark-mode onboarding stays deferred (light-only direction lock; matches PRD punchlist).
