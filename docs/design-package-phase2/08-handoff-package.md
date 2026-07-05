# Phase 2 design package: handoff to the planning/execution session

- **Date:** 2026-07-04
- **Status:** the consolidated build input. This is the file a planning session reads to convert the package into ADRs (0004+), a roadmap-banner update, and build branches.
- **Precondition met:** every open P2 design question is now specified. Direction C is locked. The only remaining Charen inputs are the `07-decisions-needed.md` lines (taxonomy, dark toggle, free-tier note, onboarding presets), all with recommendations this package assumes.

---

## 1. What the package contains

| File | What it specifies | Depends on |
|---|---|---|
| `00-overview.md` | Package map, connections, status | — |
| `01-habit-logging-spec.md` | Decision 1: check-in model, pick-one sheet, week strip, long arc + chapters, 3-state calendar (v2) | — |
| `02-p2-1-onboarding-leak-audit.md` | Two-door onboarding, Door 1 Leak Audit, formula, seeding, funnel | 01 (pick-one sheet), taxonomy (07-1) |
| `03-p2-1b-leak-scan-visuals.md` | Leak Scan results visuals for spec §5 | 01 (Track → pick-one), taxonomy, Direction C |
| `04-p2-2-coach-moments.md` | Coach card, trigger matrix, ~20 copies | 01 (slot + chapters) |
| `05-p2-4-design-unification.md` | Dark-toggle removal + revert, Settings, color rules, empty states, privacy overlay, hex sweep | Direction C (06), dark toggle (07-2) |
| `06-p2-4b-direction/` | 3 prototypes + comparison board + `comparison.md`; **Direction C locked** | — |
| `07-decisions-needed.md` | Charen-level calls with recommendations | — |
| `09-p2-5-accessibility-matrix.md` | A11y requirements per component + 3 must-pass VoiceOver flows | 01 to 05 |
| Prototypes | Habit Logging v1/v2, Onboarding options + Final, Leak Scan visuals options, Coach Moments options, 3 direction prototypes | — |

## 2. Build order (dependencies resolved)

Carried from `phase-2-next-steps.md` §4, now with each item pointing at its landed spec.

1. **Habit-logging surfaces** (pick-one sheet, check-in card with week strip, long arc + chapters, 3-state calendar). Spec: `01`. Unblocks 3, 5, and half of 9's screens. **Size: L.**
2. **Leak Scan pipeline** (stages 0-9 as pure utils + the 14 acceptance tests, synthetic fixtures only). Spec: `leak-scan-spec.md` (behavior, already landed). Branch reserved `task/p2-1b-leak-scan-pipeline`. **Size: XL.** Independent of visuals; can run parallel to 1.
3. **Leak Scan results screen + rule store wiring.** Specs: `03` (visuals) + `leak-scan-spec.md` §5-8. Needs 1 (Track opens the pick-one sheet) and 2 (data). **Size: L.**
4. **P2-1 onboarding** (routing fix index→/onboarding/welcome, delete stale welcome.tsx, two-door fork, Door 1 Leak Audit). Spec: `02`. Needs 2's utils only for the Door-2 branch; Door 1 is independent. **Size: L.**
5. **P2-2 Coach Moments.** Spec: `04`. Needs 1 (the slot). Remove `MICRO_LESSONS` + Learning section here. **Size: M.**
6. **P2-4 unification apply pass** (Direction C tokens + motion layer, dark-toggle removal, Settings cleanup, empty states, privacy overlay, hex sweep). Spec: `05`. Applies across all prior surfaces, so it runs after they exist. **Size: L.**
7. **P2-5 accessibility baseline.** Spec: `09`. Last, so the audit lands on final screens. **Size: M.**

Parallelizable: 1 and 2 have no dependency on each other. 4's Door 1 can start alongside 1. Everything else is gated as above.

## 3. Risk notes

- **Motion quality (Direction C).** The whole distinctiveness bet rides on the log-save and skip motion feeling crisp. Budget real time for 60fps + haptics tuning on device; jank reads worse than no motion. Reduced-motion path is non-optional and already specified.
- **Leak Scan parser breadth (item 2).** The 14 acceptance tests are derived from real Scotiabank exports; the parser will meet more formats in the wild. The confidence floor + graceful failure (`03` §9) is the safety net, so ship the floor conservatively rather than over-trusting.
- **Taxonomy timing (07-1).** Item 3 (results screen) and item 4 (onboarding seeding) both write categories; the taxonomy answer should land before either starts to avoid a migration. Recommendation is ready.
- **Currency correctness.** Every amount must render through `useCurrency().format`; zero-decimal (JPY) is shipped. The onboarding preset table is per-currency, never converted at runtime (`02` §7).
- **Privacy overlay ordering.** The cover must exist before the iOS snapshot; a late or animated cover leaks. Specified solid, instant (`05` §7).
- **Free-tier gate (07-4).** The pick-one sheet's "1 habit on the free plan" note interacts with Phase 3's paywall; keep it a quiet note + disabled Start in v1, not a hard block.

## 4. What a build session must read, per item

- Item 1: `01` + prototypes `Habit Logging Prototype v2.html`, `habit-logging-v2-app.jsx`.
- Item 2: `leak-scan-spec.md` (behavior + acceptance tests).
- Item 3: `03` + `leak-scan-spec.md` §5-8 + `prototypes/Leak Scan Visuals Options.html`.
- Item 4: `02` + `prototypes/Onboarding Leak Audit Options.html` (Final row).
- Item 5: `04` + `prototypes/Coach Moments Options.html`.
- Item 6: `05` + `06-p2-4b-direction/` (Direction C prototype as the token reference).
- Item 7: `09`.
- Cross-cutting: `07-decisions-needed.md` (answers), `habitcents-goals-v2.md` (North Star), the ADRs.

## 5. Phase 2 exit criteria (the whole package must satisfy)

1. A fresh install reaches its leak number in under 90 seconds, every step instrumented (`02` funnel). 
2. One visual language (Direction C), no placeholder content anywhere.
3. Privacy overlay present on backgrounding (`05` §7).
4. Charen-approved direction implemented (C, locked).
5. VoiceOver completes log, track, skip with no critical Accessibility Inspector issues (`09` §3).

## 6. Open items that must be answered before/at build start

All in `07-decisions-needed.md`, each with a recommendation this package assumes:
1. Category taxonomy + migration (blocks items 3, 4).
2. Dark-toggle removal (assumed in `05`).
3. Direction pick: **answered, C locked.**
4. Free-tier touchpoint wording on the pick-one sheet.
5. Onboarding preset table + vice set (money/taste sign-off).

Once these are answered, the package is a complete, unambiguous build input.
