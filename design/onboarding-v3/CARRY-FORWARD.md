# Onboarding v3.1: what is deliberately left undone

Everything here was found, judged, and consciously deferred rather than missed.
Copy into the umbrella PUNCHLIST when the ADR is promoted.

## Blocks shipping the carousel to users

1. **Beat captures.** Three flows, video plus poster still, per
   `design/captures/onboarding-beats/RUNBOOK.md`. Until they land, `BeatMedia`
   renders a labelled "Preview coming soon" frame, which is honest but not
   finished. Charen chose to ship the build with pending frames (2026-08-14),
   so this is expected in TestFlight, not a bug.
2. **`expo-video`.** Deliberately not added: it is a native module, so it forces
   the next build to be a fresh native build rather than an OTA update. There is
   no reason to pay that for an empty frame. `BeatAsset.video` already carries
   the contract, so adding it is additive.

## Owed before the metrics mean anything

3. **PostHog key.** Every `track()` is a no-op without
   `EXPO_PUBLIC_POSTHOG_API_KEY`; PostHog is not even imported. None of the
   month-3 criteria in `INSTRUMENTATION.md` produce data until a real build
   carries the key.

## Owed before the design is signed off

4. **Visual pass on six new screens.** Scope, deck, payoff, bills, carousel,
   and the empty-state CTAs all have component and flow tests against the real
   theme, but no human has looked at any of them.
5. **Sage-as-selection needs ratifying.** `ScopeScreen` rows and `BillsScreen`
   ticks tint sage when selected. The vocabulary scopes sage to "a kept outcome
   or the action that produces one", and a scope toggle is neither. Defensible
   by analogy to the active-tab tint, but it is a colour call a human should
   make rather than inherit.
6. **22pt check circles use `borderRadius: 11`**, which has no entry on the
   radii scale (`radii.pill` is the idiom for circles but is not sized for
   this). Left rather than guessed.

## Product work, sized as its own units

7. **Deck fallback 1, the habit template grid.** PRD sect 7.3 wants one when the
   scan finds no candidates; today that case falls through to the full
   breakdown, and `deck_exhausted` honestly reports `full_list` for both. It
   needs the Door 3 break plumbing extracted out of
   `app/(tabs)/index.tsx handleBreakSheetStart`, which is entangled with
   Today's own onboarding state. Duplicating it would fork habit creation.
8. **Food and Transportation taxonomy split.** Scope cannot express the PRD's
   tiers because groceries and eating out are both `Food`, transit and rideshare
   both `Transportation`. Read `scope_selected.used_defaults` first: heavy
   editing is the signal this matters.
9. **`beat_viewed` / `beat_swipe`.** Not built while the beats are placeholders,
   because per-beat engagement would measure a placeholder. Add with the
   captures.

## Small, safe, unprioritised

10. **`getScanSummary` casts `topLeaks`, `categories` and `projection`
    unvalidated** (`utils/storage.ts`), while `kpis` and `evidence` are revived
    field by field. A record missing `projection.lockedInCents` would reach
    `format(undefined)`. Same class of gap the `spanDays` fallback closes.
11. **Dead `coveredDays` fields.** `PulseData.coveredDays` and
    `KpiSummary.coveredDays` are no longer read for display after the UX-073
    divisor split. Harmless, but exactly the fields a future edit reaches for
    by name.
12. **Nineteen unreferenced `strings.onboarding` keys** (welcomeHeadline,
    valuePropLog, the nine intent-card strings, exampleSkips and friends). Kept
    deliberately: they are the revert path if the carousel is rolled back, and
    `onboardingCarousel.test.tsx` now asserts they do NOT render.
