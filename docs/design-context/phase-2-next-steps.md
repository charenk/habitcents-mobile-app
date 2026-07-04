# Phase 2: solution goal, next steps, and design-exploration brief

- **Date:** 2026-07-03 (session close)
- **Author:** Fable 5, from the session that shipped P2-3/P2-6 and integrated the Leak Scan spec
- **Canonical companions:** `habitcents-plan-v2.html` (roadmap), `habitcents-goals-v2.md` (North Star), `leak-scan-spec.md` (P2-1b), `decisions/` (ADRs 0001-0003), `../PUNCHLIST.md`

---

## 1. Goal, objective, outcome

**Goal.** Close Phase 2's remaining gaps spec-first: every open design question is solutioned into a canonical `.md` (like `leak-scan-spec.md`) BEFORE any build session writes code, so implementation becomes unambiguous execution.

**Objective.** Land spec artifacts for the seven open questions below, recorded as ADRs where they amend prior decisions, then run the build order in section 4.

**Outcome.** Phase 2 exit criteria met: a fresh install reaches its leak number in under 90 seconds with every step instrumented; the app reads as one product (one visual dialect, no placeholder content, privacy overlay on backgrounding); Charen has approved one visual direction from prototypes; VoiceOver completes log, track, skip with no critical Accessibility Inspector issues. That unlocks Phase 3 (monetization + legal + website convergence).

**Working mode (locked this session).** Solution externally (Charen + Claude design session), land the spec `.md` in `docs/`, integrate + ADR it, only then build. Code does not start before its spec lands. The Leak Scan (Decision 2) proved this loop.

## 2. Open questions: status and sequence

| # | Question | Status | Blocks |
|---|---|---|---|
| 1 | Habit-logging model (Decision 1): check-in labels, pick-one sheet, 3-state calendar, cadence routing | **Design brief ready: `docs/habit-logging-design-brief.md`** (problem/goal/outcome + full constraints). Run it in the design session; output = `docs/habit-logging-spec.md` | Leak Scan results screen, P2-2, habit surfaces |
| 2 | Door 1 Leak Audit (P2-1): preset grid, projection formula, 90-second flow, copy | Open; **next to solution** | P2-1 build (the v1 ship gate) |
| 3 | Category taxonomy: Software & Subscriptions, Mortgage/Rent, Transfers/Income/Cash classes + migration | Open; small, fold into #2's session | Leak Scan Stage 7 mapping |
| 4 | Coach Moments (P2-2): ~20 card copies + trigger/dedup rules | Blocked on #1 (cards mount on the check-in surface) | P2-2 build |
| 5 | Visual direction (P2-4b): choose from 2-3 prototyped directions | Open; prototype-first | P2-4 apply pass |
| 6 | Dark mode: app still ships a dark theme + toggle despite D-6 light-only | Open; recommend remove for v1 | P2-4 |
| 7 | Settings production cleanup: dead rows, Developer section | Open; fold into P2-4 spec | P2-4 |

**Synthesis order:** 1 (just land the artifact) then 2+3 (one session) then 5+6+7 (one design-pass spec) then 4 (after 1 lands).

## 3. Immediate next steps

> **Master design-scope document (added later on 2026-07-03):** `docs/habitcents-design-scope-phase2.md`. It supersedes the step ordering below for the design track: it scopes ALL of P2-1, P2-1b, P2-2, P2-4, P2-4b, P2-5 for a single Claude Code design session and defines the reviewable output package (`docs/design-package-phase2/`). The briefs referenced below are its inputs and remain canonical.

1. **Charen, in the Claude design session:** start with `docs/habit-logging-design-brief.md` (the dedicated Decision-1 brief: problem, goal, outcome, fixed mental model, constraints, deliverables). Its output is the canonical `docs/habit-logging-spec.md`. Then run the broader design-exploration brief in section 6 to produce the Door-1 Leak Audit spec and the P2-4b direction prototypes.
2. **Next Claude Code session:** integrate each landed spec (analysis vs North Star, ADR 0004+, roadmap banner update), exactly as this session did for `leak-scan-spec.md`.
3. **Only after specs land, start the build order in section 4.** First code PR should also carry the currently uncommitted `mobile-app/CLAUDE.md` direction-lock update (see section 5).

## 4. Build order (once specs are landed)

1. Habit-logging surfaces: pick-one sheet, check-in card, 3-state calendar (Decision-1 spec).
2. Leak Scan pipeline stages 0-9 as pure utils + the 14 acceptance tests, synthetic fixtures only (spec ready today; branch name reserved: `task/p2-1b-leak-scan-pipeline`).
3. Leak Scan results screen + rule store wiring (needs 1).
4. P2-1 onboarding: routing fix (index to /onboarding/welcome, delete stale welcome.tsx), two-door fork, Door 1 Leak Audit (needs #2 spec).
5. P2-2 Coach Moments (needs #4 copy set).
6. P2-4 design unification applying the approved P2-4b direction (incl. dark-toggle decision, settings cleanup, empty states, privacy overlay).
7. P2-5 accessibility baseline, last, so the audit lands on final screens.

## 5. Session-close state (handoff facts)

- Repo `charenk/habitcents-mobile-app`, `main` at the PR #7 merge. PRs #1-#7 all resolved (#4 auto-closed, superseded by #5). Merged: Phase 1, P2-3 analytics (device-verified), expenses Save-button fix, P2-6 currency + strings, valid 1024px placeholder icons.
- **No Leak Scan code exists.** A build was started prematurely and fully rolled back (no branch, no papaparse, no files). Do not assume otherwise.
- Working tree: one intentional uncommitted change, `mobile-app/CLAUDE.md` (Phase 2 status + Leak Scan re-spec in the direction lock). Fold it into the next PR.
- PostHog key lives in gitignored `mobile-app/.env` (US region). Dev seeding stays on `dev/seed-data`, never main.
- Merges to `main` require Charen's explicit per-PR authorization.
- Still Charen-only: P0-2 rotate secrets, P0-3 archive 2 stale GitHub repos, P0-4 real icon art.
- Never commit real bank statements; Leak Scan tests use synthetic fixtures replicating the structures named in the spec.

---

## 6. Design-exploration brief (paste this whole section into the Claude design session)

### Product context
HabitCents is a privacy-first iOS money app (Expo/React Native, light mode only in v1, all data on device). It finds the one spending habit quietly costing $100+/month from 10-second manual logs, coaches the user to break it, and counts the money kept. Fixed vocabulary, used everywhere: **leak** (what detection finds), **skip** (the coached positive action), **kept** (the dollars counted). Tone: honest, calm, native-iOS restraint. Calibration: Apple Design Award winners are restrained and platform-native; bold treatments are accents to be judged in prototypes, not defaults.

### Current design language (match or deliberately evolve, do not ignore)
- Light tokens: background #F8F8F8, surface/card #FFFFFF, text #212121, secondary #757575, tertiary #9E9E9E, border #E5E7EB, primary green #4CAF50 (green means brand/positive ONLY), primary muted #B2DFB6, danger #DC2626, icon amber #FFB74D on #FFF3E0.
- Cards: white, 12-16px radius, soft borders. Icons: Ionicons today (an icon-system change is in scope for direction work). Type: system font, one clear primary action per screen, 4/8 spacing scale, 44pt touch targets, motion 150-250ms with purpose.
- States are part of the design: empty, loading, error, first-run, and out-of-coverage must be designed, never left blank.

### Already decided, do not reopen
- Decision 1 (habit logging): daily check-in question model. Card asks "Did you skip it today?"; primary filled button "Skipped it +$6.00" (the win, adds to Kept); always-visible secondary "I bought it" (the slip: streak resets, kept dollars NEVER decrease, and the copy says so). Confirmed goal creation via a pick-one sheet with an editable "One skip keeps $X" value (no silent auto-goals). Streak calendar has three states: skipped, slipped, no-log. Weekly/monthly leaks use an event-based "I skipped one" variant, not a daily question. Milestones count "skips in a row".
- Decision 2 (Leak Scan): CSV import per `docs/leak-scan-spec.md`. Its results screen components are specified there (section 5) and need visual design, not re-specification.
- D-5: coaching is ~20 contextual Coach Moment cards on 5 triggers (first log, detection, skip, milestone, broken streak); no lessons library.
- D-6: light mode only in v1. D-9: anonymous, structural-only analytics.
- Rules for all produced copy: no em dashes ever (use commas, colons, periods); sentence case; currency amounts always presented as formatted-by-the-app values, never hardcoded $ assumptions in logic (multi-currency shipped, including zero-decimal JPY).

### Design gaps to explore (produce one spec .md per numbered item, leak-scan-spec.md is the quality bar: principles, component specs with exact copy, states, edge cases, acceptance criteria)

1. **Door 1, the Leak Audit (highest priority, the v1 ship gate).** A 90-second first-run flow: tap through known recurring spends (preset subscription grid + estimated weekly vices like coffee/delivery/impulse) producing "You're leaking about $1,860/yr", then one practiced manual log, then a success screen with the Kept counter primed. Open: grid contents and layout, the estimation input pattern (chips, steppers, sliders), the projection formula and how honestly it is framed (tilde, "about"), per-step copy, and how audit items seed recurring expenses. Must emit a per-step analytics funnel. Gate: leak number on screen in under 90 seconds, audit completion target 60%+.
2. **Category taxonomy.** Proposed: add "Software & Subscriptions", use "Mortgage/Rent", and treat Transfers, Income, and Cash-untracked as non-spend classes rather than user categories. Current app type has 9 categories (Mortgage, Car, Entertainment, Food, Shopping, Utilities, Healthcare, Transportation, Other). Decide the final list + migration mapping.
3. **Visual direction (2-3 interactive HTML prototypes for approval).** Candidates: (a) refined native-first: SF-Symbol-weight iconography, depth via materials and soft shadows; (b) bolder dimensional-icon accent system; (c) a motion/haptics language concentrated on the log and skip moments. Apply each candidate to the same 4 screens for honest comparison: expenses (log form), habits tab (Kept hero + check-in card), habit detail (3-state calendar), onboarding success.
4. **Coach Moment card.** One component, five trigger contexts, ~20 copies reusing existing lesson content. It mounts in the check-in confirmation slot. Needs: visual treatment that reads as the product's voice (not a toast, not a modal), dismissal, and once-per-event rules.
5. **Leak Scan results screen visuals** (components already specified in leak-scan-spec.md section 5): KPI row with tier badges, top-3 category bars, the SpendPulse day/month/year grid (zero-spend vs out-of-coverage must be visually distinct, hatched), habit cards with Govern/Influence/Fixed class badges and solid/likely/needs-review tier badges, the projection list with a 3-payment-month flag, the footer with undo, and the "This one's on us" graceful-failure screen.
6. **Settings, production layout.** Keep: Currency, privacy policy link, version. Decide: remove the Appearance row (per D-6) or keep it hidden until v1.x dark. Remove: dead Profile/Notifications/Privacy rows and the Developer section.
7. **System states.** Zero-expense empty state, pre-detection progress ("2 of 4 logs until analysis"), pre-coverage projection placeholder, and the privacy overlay that hides amounts in the iOS app switcher.

### What to hand back
One spec `.md` per item (or sensible bundles: 1+2 together, 3+6+7 as a design-pass spec), each self-contained enough that an engineering session can build without asking design questions. Interactive HTML mockups for item 3 (and anywhere visual judgment is needed). Every spec ends with acceptance criteria and the analytics events its surfaces emit.
