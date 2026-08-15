# 0026. Onboarding v3.1: preview carousel, real workflows, payoff revival (DRAFT)

- **Date:** 2026-08-14 (draft; ratify by moving to habitcents-ops `docs/decisions/`)
- **Status:** Ratified in session by Charen on 2026-08-14 (by authorising phase 4,
  which builds the payoff this ADR revives). STILL TO DO: promote this file into
  the umbrella repo's `docs/decisions/0026-...md` on its own branch, since ADRs
  live in habitcents-ops and this worktree cannot commit there.
- **Area:** Design / Product / UX
- **Deciders:** Charen (PRD v3.1 + two decision rounds in session, 2026-08-14)
- **Amends:** ADR 0022 (the app is the onboarding), ADR 0020 (success screen retired),
  ADR 0018 (visual system of record, palette confirmation only)

## Context

Charen's onboarding PRD v3.1 replaces the two-screen welcome + intent picker with a
three-beat carousel, adds scope selection and a habit deck to the scan route, revives a
payoff screen, and adds a bills-to-Upcoming offer. Parts of it conflict with ADRs 0020
and 0022; the session audit (`design/onboarding-v3/AUDIT-VS-PRD.md` in mobile-app)
mapped the PRD onto the shipped app and resolved the conflicts with Charen across two
decision rounds on 2026-08-14. This ADR records the resolutions so the build does not
drift past ratified decisions silently.

## Decision

1. **ADR 0022 is amended, not reversed.** Its rule survives in sharpened form:
   *workflows are always the real ones; preview media may demonstrate them; simulated
   interactive UI stays banned.* Each carousel beat is a pre-recorded capture FROM the
   real app (a looping video) with hook text below; tapping a beat triggers the real
   workflow (the real log sheet, the real scan). Conditions:
   - A capture runbook lives at `design/captures/onboarding-beats/RUNBOOK.md` (flows,
     seed data, device frame, light mode). Re-capture is a named release-checklist item
     whenever an onboarding-visible surface changes.
   - No invented totals inside recordings: example-scale seed data only; the hook text
     carries the "for example" framing. ADR 0022's no-invented-totals rule extends to
     these recordings as marketing-adjacent surfaces.
   - Beat media is looping HEVC/MP4 via expo-video (3 to 5 second loops), never GIF.
   - Reduced motion renders the static poster frame per beat.
2. **The payoff screen returns (amending ADR 0020).** The scan route's quiet variant
   renders real history from the habit's evidence block ("Coffee, 14 times, $84 last
   month. Skip it once and $6 comes back."). A celebratory variant appears only when a
   real skip was recorded in-flow. Palette is the ratified system: sage, ink, slate; the
   PRD's gold/rose rules are superseded (decision round 1, 2026-08-14).
3. **Import-as-instance is adopted in spirit, amended in letter (PRD sect 7.5).**
   Statement occurrences live on the habit's evidence block (observedTotal /
   observedCount / averageAmount) and, when the user takes the 30-day import, in the
   expense ledger as real spends. They never enter `dayLogs`: the shipped model has no
   neutral instance state, and statement rows rendered as day-one slips would open the
   coaching relationship with a wall of failures. skipValue auto-derives from
   averageAmount, editable at confirm. Activation = habit + value + observedCount >= 1.
   The kept counter only ever moves on a real skip.
4. **The fixed >=8-instance threshold is replaced by a five-layer guarantee** that
   essential spending is never proposed as a habit: (a) user-declared scope with a
   locked essential tier and fail-closed defaults; (b) contract-class (`fixed`)
   candidates never enter the deck; (c) the behavioral rate gate (about 4+ purchases a
   month, price variance, discretionary category), which one-instance-per-cycle
   essentials cannot satisfy; (d) permanent merchant suppression, extended to log-based
   discovery; (e) cadence routing: monthly/annual cadence in essential or locked
   categories goes to the bills offer, never the deck. The deck is behavioral-only;
   detected subscriptions surface in the bills screen as their own group.
5. **Beat 1's saved amount is a real expense** through the real log sheet (no
   throwaway store, native decimal pad per ADR 0023). AS BUILT the beat deep-links
   into Today, which opens that real sheet over it, rather than hosting a second copy
   on a dedicated onboarding route as PRD sect 6 asks: the user sees the sheet, not an
   empty page, and a parallel pad would be exactly the surface rule 1 preserves.
   Revisit if the device pass shows the Today background reads as disorienting.
   Beat 2 is the existing CSV leak-scan pipeline restyled with scope selection and the
   deck; no new extractor.

## Alternatives considered

- Simulated component scenes for the beats (PRD's mini device frame as live UI):
  rejected; they drift with every redesign (two would-be invalidations in the last
  month alone) and reintroduce the release-only animation crash class.
- Recording statement occurrences into `dayLogs` with a new neutral state: rejected;
  it ripples through seven-plus trust-sensitive surfaces and dilutes what a history
  entry means.
- Keeping the fixed >=8 floor: rejected; it punishes short statements, duplicates the
  rate gate, and would have banned subscriptions from the deck while scope defaults
  them on (an internal PRD inconsistency).
- Gold/rose palette per PRD sect 10: rejected round 1; onboarding teaching a color
  story the app does not speak breaks at the moment of activation.

## Consequences

- The carousel gains a standing maintenance duty: the capture runbook and re-capture
  checklist item. A stale video is a checklist miss, not silent drift.
- PRD v3.1 sections 6, 7.2, 7.5, and 10 are read through this ADR's amendments.
- ADR 0022's welcome-screen question (the aurora exploration flagged in the punchlist)
  closes by RETIRING the aurora: the carousel replaces the splash it decorated, so no
  screen renders it. `components/onboarding/AuroraBackground.tsx` is kept unreferenced
  as the documented revert path, the same way `darkTheme` is. The carousel's first
  frame is a beat poster once captures land. `design/PATTERN_VOCABULARY.md` follows:
  one decorative gradient remains (the premium upsell hero).
- The onboarding step machine gets SIMPLER, not more complex: the routing table is
  deleted outright. The carousel is the only onboarding destination, so whatever step
  is stored, landing there shows it and re-picking is an honest resume;
  `app/onboarding/intent.tsx` stays registered as a redirect so a persisted deep link
  resolves. That is a stronger guarantee than a table nobody can forget to maintain
  (the build 5 lesson stands, discharged differently).
- D5 resolved: the free-tier recurring cap stays UNCAPPED and instrumented. The PRD
  asks for `recurring_expense_count` as a person property, which this app cannot set:
  person properties key off `identify()`, and D-9's anonymous-device-ID posture
  forbids calling it. It ships as a once-per-session snapshot EVENT carrying the same
  number. Decide the cap on month 3/6 data.
