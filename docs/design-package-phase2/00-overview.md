# Phase 2 design package: overview

- **Status:** in progress. This file tracks what is done and how the pieces connect.
- **Scope source:** `habitcents-design-scope-phase2.md` (mission doc)

## Package map

| File | Contents | Status |
|---|---|---|
| `01-habit-logging-spec.md` | Decision 1 spec: check-in model, pick-one sheet, 3-state calendar, copy, analytics | **Done** (updated to accepted v2: week rhythm + chapters) |
| `prototypes/Habit Logging Prototype.html` | Interactive v1: Habits tab, pick-one sheet, detail + calendar, slip/partial/backfill flows | **Done** |
| `prototypes/Habit Logging Prototype v2.html` | The accepted direction: E1 week strip, E2 identity arc, E3 kept-hero moment | **Done** |
| `02-p2-1-onboarding-leak-audit.md` | Welcome, two-door fork, Door 1 flow, projection formula, funnel | **Done** (Final = A chips + B inline edit, recognition framing) |
| `03-p2-1b-leak-scan-visuals.md` | Visual specs for leak-scan-spec section 5 components + option board | **Done** (Direction C) |
| `04-p2-2-coach-moments.md` | Card component, trigger matrix, ~20 copies + option board | **Done** (Direction C) |
| `05-p2-4-design-unification.md` | Dark toggle, Settings, empty states, privacy overlay, color rules, sweep checklist | **Done** (Direction C) |
| `06-p2-4b-direction/` | 3 direction prototypes + comparison board + `comparison.md` | **Done. Direction C locked (Charen, 2026-07-04)** |
| `07-decisions-needed.md` | Charen-level calls with recommendations | **Started** (taxonomy, dark toggle, direction pick, free tier, onboarding presets) |
| `08-handoff-package.md` | Build order, sizes, risks, reading list | **Done** |
| `09-p2-5-accessibility-matrix.md` | A11y matrix per component + 3 must-pass VoiceOver flows + rollup | **Done** |

## How the pieces connect

- 01 defines the check-in card, pick-one sheet, and day-state system. The Leak Scan's Track CTA (03), Coach Moment slot (04), and half the direction-prototype screens (06) inherit from it.
- 06 produces the visual direction; 03, 04, and 05 are written against the picked direction's tokens.
- 02 is behavior-first and direction-independent; its success screen appears in the 06 prototypes.
- The a11y matrix (P2-5) is embedded per spec and rolled up in 08.

## Working notes

- No em dashes anywhere; sentence case; amounts always as formatted tokens.
- Nothing here modifies app code. This package mirrors to `docs/design-package-phase2/` in the umbrella folder.
