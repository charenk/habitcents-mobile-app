# Onboarding v3.1: integration plan

How the PRD's flow lands on the shipped app. One phase = one PR, Lane 2 unless noted.
Prereqs and decisions: `DECISIONS-NEEDED.md`. Evidence: `AUDIT-VS-PRD.md`.
Phases 2-8 assume phase 1 merged. ADR 0026 was ratified in session on 2026-08-14
(`ADR-0026-DRAFT.md`), so nothing is gated on a decision any more; promoting that
draft into the ops repo's `docs/decisions/` is still owed.

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

## Phase 3: habit deck, SHIPPED (2026-08-14)

Delivered: `utils/leakScan/deck.ts` (behavioral-only eligibility,
frequency-first ranking with per-instance-cost tiebreak, cap 3, plus
`billsCandidates` as phase 5's source), `components/leak-scan/DeckScreen.tsx`,
a shared `useTrackLeak` hook now used by BOTH the deck and the results ladder,
`isBehavioral`/`isSubscription` carried on HabitCandidate, a new `deck` stage,
and the three deck events. Verification: tsc clean, 922/922 tests over three
consecutive runs (28 new), eval harness 71/71.

Notable: tracking a leak was extracted from ResultsScreen into `useTrackLeak`
rather than copied, because the phase 1 activation sequence (markHabitStarted
before completeOnboarding) now runs from two surfaces and a second copy is a
second chance to get its ordering wrong.

**Fallback 1 is NOT built.** PRD sect 7.3 wants a habit template grid when the
scan finds no candidates; today that case falls through to the full breakdown,
same as the all-dismissed case, and `deck_exhausted` honestly reports
`full_list` for both. The template grid needs the Door 3 break-habit
plumbing, which lives inside `app/(tabs)/index.tsx handleBreakSheetStart`
entangled with Today's own onboarding state (door3 coach flags, ribbons,
completeOnboarding). Extracting it safely is its own unit; duplicating it would
fork the habit-creation path. FOLLOW-UP: extract the pure
BreakHabitStartData -> seed-input mapping, then host BreakHabitSheet from the
scan route for the no-candidate case.

**Owed:** visual pass, same as phase 2.

The original plan for this phase follows, kept as the record of intent.


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

## Phase 4: activation + payoff, SHIPPED (2026-08-14)

Delivered: `first_kept` (once per install, from all three skip paths, behind a
persisted flag), `components/leak-scan/PayoffScreen.tsx`, a `payoff` stage
between the deck and the results ladder, and the activation definition below.
Verification: tsc clean, 933/933 tests over three consecutive runs (11 new),
eval harness 71/71.

**Activation, as built.** A habit exists and carries a skip value, guaranteed
atomically by `startBreakingHabit`. The scan route writes NO habit instances:
the evidence block certifies setup, which is exactly PRD sect 7.5's "certifies
setup, not engagement". Engagement is `first_kept`, and it means the same thing
on every route, so the scan-vs-habit comparison in sect 11 is like for like.

**The payoff is the quiet variant only.** Nothing has been kept at that moment,
so the kept band shows the user's true zero with its own first-skip caption
(honest-zero, ADR 0022). Every figure on the screen is observed (a count, a
total, a per-buy price), so no monthly rate appears and the UX-073 class of
error cannot express itself there. The celebratory variant belongs to a route
that can record a skip in-flow; the scan route cannot, and building an
unreachable state would be inventing a screen. NOT BUILT, deliberately.

`first_kept` carries no properties. It has no amount because the fact of it is
the signal, and no source because nothing on the goal records which route
created it; the cohort comes from the same device's earlier
`habit_tracking_started {source}`, which says it truthfully.

**Owed:** visual pass, now covering three new screens.

The original plan for this phase follows, kept as the record of intent.


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

## Phase 5: bills to Upcoming, SHIPPED (2026-08-14)

Delivered: `utils/leakScan/bills.ts` (bill vs subscription grouping, the
spend-only guard, deck exclusion, propose-don't-ask default),
`components/leak-scan/BillsScreen.tsx`, a `bills` stage AFTER the payoff, an
`onlyStems` filter on `recurringToExpenses` for the per-row untick, and the
`bills_offered` / `bills_imported` events. Verification: tsc clean, 955/955
tests over three consecutive runs (21 new), eval harness 71/71.

**A real bug caught on the way in.** `detectRecurring` runs over every
non-internal row, not just outflows, so a fortnightly payroll deposit is
exactly as "recurring" as rent. The offer therefore filters to
`rowClass === 'spend'` with a positive amount. NOTE: the pre-existing in-ladder
"Save to HabitCents" path (`ProjectionSection` -> `recurringToExpenses` with no
filter) does NOT apply this guard, so it can still write a recurring income row
into Upcoming as an expense. Out of scope here because it is an older path with
its own tests; FOLLOW-UP: apply `isPayable` there too, or move that CTA onto
this screen.

**Scope-blind on purpose.** The offer draws from `result.recurring`, which is
never scope-filtered, because scope decides what may be PROPOSED as a habit and
not what the app will help you track. Locked and out-of-scope recurring spending
is exactly what this screen exists to catch.

**Opposite default from scope, deliberately.** Everything starts ticked. Scope
fails closed because its risk is the app proposing something it should not;
here the only risk is bookkeeping the user can undo in one tap.

**Coupling correction made during the build.** The accept handler first lived in
the intake hook and took the expense contexts from the route, which forced every
leak-scan test (intake, questions, graceful failure) to acquire providers it had
no use for and broke five of them. The write moved into `BillsScreen`, the only
surface that needs those contexts, exactly as `DeckScreen` owns `useTrackLeak`.

**Owed:** visual pass, now covering four new screens.

The original plan for this phase follows, kept as the record of intent.


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

## Phase 6: carousel, SHIPPED STRUCTURALLY, BLOCKED ON ASSETS (2026-08-14)

Delivered: `components/onboarding/OnboardingCarousel.tsx` (three beats, no
auto-advance, platform rubber-band, dots, ghost skip),
`components/onboarding/BeatMedia.tsx`, the carousel hosted at
`app/onboarding/welcome.tsx`, `app/onboarding/intent.tsx` reduced to a redirect,
Android two-level back, and the capture runbook at
`design/captures/onboarding-beats/RUNBOOK.md`. Verification: tsc clean, 956/956
tests over three consecutive runs, eval harness 71/71.

**BLOCKED: the beat captures do not exist, and cannot be faked.** ADR 0026
requires recordings of the real app; fabricating them is the one thing the ADR
exists to prevent. `BeatMedia` therefore renders an honest labelled empty frame
("Preview coming soon"), pinned by a test, so the carousel is visibly
incomplete rather than quietly showing a mock-up. The runbook says exactly what
to record. THIS IS NOT SHIPPABLE TO USERS until those files land.

**`expo-video` was deliberately NOT added.** Playback needs a native module,
and adding one forces the next build to be a fresh native build rather than an
OTA update. There is no reason to pay that cost for an empty frame, so it is
left to whoever lands the captures. `BeatAsset.video` already carries the
contract, so that change is additive.

**Deviation from PRD sect 6, deliberate.** The PRD wants beat 1 to host its own
amount pad on an onboarding route rather than routing into Today. The shipped
track beat deep-links to Today, which opens the REAL log sheet over it, so the
user sees the sheet rather than an empty page and the saved amount is a real
expense (D4). Building a second onboarding-owned pad would create the parallel
surface ADR 0022 bans and ADR 0026 explicitly preserved. Flagged rather than
silently skipped; revisit if the device pass shows the Today background reads
as disorienting.

**Resume routing got stronger, not weaker.** The carousel is now the only
onboarding destination, so there is no resume table left to get wrong: whatever
`currentStep` is stored, landing there shows the carousel and re-picking is an
honest resume. The revive suite's assertions moved from "redirects to the intent
picker" to "renders, and navigates nowhere at all". `intent.tsx` stays
registered as a redirect so any persisted deep link still resolves (build 5
crash class).

**Retired suites:** `intentPicker.test.tsx` and `welcomeHero.test.tsx` are
replaced by `onboardingCarousel.test.tsx`, which carries every behavioural
contract they pinned (accessible names, per-intent analytics, replace-not-push
routing, skip) plus the new carousel rules.

The original plan for this phase follows, kept as the record of intent.


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

## Phase 7: SHIPPED 2026-08-14

Five empty states gained a concrete first action: Money Spent (log), Money
Upcoming (add, in place), Money Habits (break, gate-aware), Insights Leaks
(log), Categories (add, in place). `HabitsList` swapped its bespoke Text pair
for the house `EmptyState` primitive on the way.

**Two states deliberately left WITHOUT a CTA, and asserted so it reads as a
decision:** Insights Pace is empty until a month of data exists, and Where it
went is empty for the CHOSEN RANGE. Neither resolves with a tap, so a button
would promise something it cannot deliver.

**New `?sheet=log|break` deep link.** The existing `firstLog`/`breakEntry`
params carry onboarding semantics and are guarded on `isOnboardingComplete()`,
so they go inert exactly when an empty state needs them. The new param carries
no onboarding meaning, and `break` routes through `handleBreakAnother` so the
free-tier gate holds on this path too.

**`skip_activation` fires at CTA press, for skippers only**, and the event
comment says so: attributing all the way to activation would mean carrying the
surface across a sheet, a navigation, and an async write, where a dropped
hand-off would look identical to a skipper who never acted. Conversion is the
join against the activation events that follow.

Five existing suites gained `OnboardingProvider` in their wrappers rather than
the hook tolerating a missing provider, which would have hidden real wiring
bugs. Verification: tsc clean, 966/966 over three runs, eval harness 71/71.

The original plan for this phase follows.

## Phase 7 (original plan): empty states as onboarding surfaces

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

## Phase 8: SHIPPED 2026-08-14 (final phase)

Reference doc: `design/onboarding-v3/INSTRUMENTATION.md` (PRD name to shipped
name for every sect 11 event, plus the exact query for each of the four month-3
criteria).

**Fixed a gap phase 4 left.** `first_kept` fired with no properties, so the
PRD's HEADLINE criterion (scan-route vs habit-route first-kept, within 20%) was
not computable at all. The start source is now persisted on `HabitChangeGoal`
and carried as `first_kept { route }`. Read off the goal rather than inferred
from the nearest preceding `habit_tracking_started`, because a first skip can
land days later and after a second habit was started. Pre-upgrade goals report
'unknown', kept separable so that cohort can be excluded instead of skewing the
comparison.

**`recurring_expense_count` ships as an event, not a person property (D5).**
Person properties key off `identify()`, which D-9's anonymous-device-ID posture
forbids. A once-per-session snapshot after hydration carries the same number.
Counts parents only: materialized children are occurrences of a schedule, not
schedules, and counting them would inflate the number against the very cap
decision it exists to inform. Raw count rather than a bucket, because
`bucketCount`'s 1-9 / 10-49 boundary sits exactly where the cap decision is and
would pre-commit the answer.

**Not built, deliberately:** `beat_viewed` / `beat_swipe` (the beats are
placeholders until the captures land, so per-beat engagement would measure a
placeholder), `permission_prompted` (the document picker raises no permission
dialog; the PRD's Permission step is a prototype artifact), and a separate
`activation` event (that moment is `habit_tracking_started`; a parallel name is
two chances to disagree).

Verification: tsc clean, 970/970 over three consecutive runs, eval harness
71/71.

The original plan for this phase follows.

## Phase 8 (original plan): instrumentation reconciliation

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
