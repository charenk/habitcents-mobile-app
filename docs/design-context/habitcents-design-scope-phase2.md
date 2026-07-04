# HabitCents: Phase 2 design scope (P2-1, P2-1b, P2-2, P2-4, P2-4b, P2-5)

- **Date:** 2026-07-03
- **Author:** Fable 5 (session that shipped P2-3/P2-6 and integrated the Leak Scan spec)
- **Audience:** a fresh Claude Code session acting as the DESIGN session for Phase 2.
- **Mission:** produce a reviewable design package that closes every open design question for P2-1, P2-1b, P2-2, P2-4, P2-4b, and P2-5, so a later planning session can turn it into an execution plan without asking a single design question.

---

## 0. How to use this document (instructions to the design session)

1. Read this file fully, then read the reference documents in section 1. You are in the project folder; read them directly.
2. Restate the product's mental model in your own words before designing. If the restatement conflicts with section 3, stop and re-read.
3. Work in the order of section 6 (the habit-logging model unblocks the most downstream work; do it first).
4. Produce the output package exactly in the structure of section 7. Every deliverable is a markdown spec or an interactive HTML prototype; `docs/leak-scan-spec.md` is the quality bar for specs.
5. **Do NOT modify any app code.** This session designs; a later session builds. Do not touch `mobile-app/` source. Write only into `docs/design-package-phase2/`.
6. Hard writing rules: no em dashes anywhere (use commas, colons, periods); sentence case for all UI copy; amounts are formatted-by-the-app tokens, never hardcoded "$" or two-decimal assumptions (multi-currency incl. zero-decimal JPY is shipped).
7. Where a decision is genuinely Charen's (taste, scope, money), do not decide silently: put it in `07-decisions-needed.md` with a recommendation and the tradeoff.

## 1. Reference documents (read in this order)

| File | What it gives you |
|---|---|
| `docs/habitcents-goals-v2.md` | North Star: goal, principles, metrics, pricing |
| `docs/habitcents-plan-v2.html` | Full roadmap, keep/cut/fix verdicts, task acceptance criteria (Roadmap tab), current status banner |
| `docs/leak-scan-spec.md` | The finished P2-1b behavior spec; your quality bar; its section 5 lists results-screen components needing visual design |
| `docs/habit-logging-design-brief.md` | The dedicated Decision-1 brief: problem, fixed mental model, constraints, deliverables. Execute it as your first work item |
| `docs/phase-2-next-steps.md` | Open-questions table, build order, session-handoff facts, plus a condensed design brief in its section 6 |
| `docs/decisions/` (ADRs 0001-0003) | Locked decisions with reasoning |
| `mobile-app/CLAUDE.md` | Project rules and the DIRECTION LOCK block |
| `mobile-app/constants/strings.ts` | Every current user-facing string (centralized) |
| `mobile-app/constants/theme.ts` | The actual color tokens |

## 2. Product context

HabitCents is a privacy-first iOS app (Expo/React Native, light mode only in v1, all data on device, no accounts). It finds the one spending habit quietly costing $100+/month from the user's own 10-second manual logs, coaches them to break it, and shows the dollars they kept. Positioning gap: expense trackers have data but change nothing; impulse-blocker apps change behavior but have no data. HabitCents is the bridge, with a dollars-kept counter as the shareable artifact.

**Fixed vocabulary, used identically on every surface:** a **leak** is what detection finds. A **skip** is the coached positive action (did not spend). **Kept** is the running total of money not spent. A **slip** is buying it anyway.

**Tone:** honest, calm, native-iOS restraint. Money is framed honestly (tilde, "about", evidence windows). Apple-Design-Award calibration: winners are restrained and platform-native; bold treatments are accents to be judged in prototypes, not defaults.

**Business gates that constrain design:** onboarding must deliver the leak number in under 90 seconds (leak-audit completion target 60%+); D7 retention target 20%; logging friction under 10 seconds; free tier keeps 1 active habit + the counter; premium unlocks up to 5 habits.

## 3. Locked decisions (do not reopen any of these)

1. **Light mode only in v1** (D-6). The app still ships a dark theme + Appearance toggle; whether to remove the toggle is YOUR call to make in P2-4 (recommend removal), but dark mode itself is not a v1 deliverable.
2. **Coach Moments, not a lessons library** (D-5): ~20 contextual one-line cards on 5 triggers (first log, detection, skip, milestone, broken streak). The lessons library gets removed.
3. **Anonymous, structural-only analytics** (D-9): no merchant strings, amounts, or PII in any event you design.
4. **Two-door onboarding** (D-10): Door 1 = Leak Audit (start fresh), Door 2 = Leak Scan (CSV import). Concierge onboarding stays email-only, never in-app UI.
5. **Decision 1, habit-logging mechanics** (see `habit-logging-design-brief.md` section 4 for the full list): the skip is the win; slips never subtract from Kept; goal creation only via an explicit pick-one sheet with an editable "one skip keeps $X" value; three honest day-states (skipped / slipped / no log); daily check-in for daily leaks, event-based "I skipped one" for weekly/monthly; milestones count skips in a row; no aggregate cross-habit streak; Coach Moments mount in the answer-confirmation slot.
6. **Decision 2, the Leak Scan** (`leak-scan-spec.md`, ADR 0003): behavior fully specified; only its visual design is open.
7. **Spec-first working mode:** nothing gets built until its spec .md exists in docs/. Your package IS those specs.
8. Identity: name habitcents, bundle `com.habitcents.app`. Pricing: $3.99/mo, $29.99/yr, $49.99 lifetime, 14-day trial (paywall design is Phase 3, not yours).

## 4. Current app state (what exists on main today)

- **Working core loop (Phase 1):** 10-second expense logging (amount-first form, real categories, merchant autocomplete), edit/delete, correct habit detection (merchant-stem based, 4+ occurrences), live dollars-kept counter, real streak history, real recurring/Upcoming view, hardened storage.
- **P2-3 shipped:** PostHog analytics, env-gated, anonymous; event catalog exists in `mobile-app/utils/analytics.ts` (onboarding funnel, log/edit/delete, detection, skip, milestone, paywall, import events all pre-declared).
- **P2-6 shipped:** multi-currency (7 currencies, zero-decimal JPY) via `useCurrency().format`; all user-facing strings centralized in `constants/strings.ts`.
- **Tabs:** Expenses (log form + collapsible Recent/Upcoming sheet), Reports (category bars + projection widgets), Categories (CRUD), Habits (Kept hero, detected leaks, tracked habits), Settings (currency, appearance, some dead rows).
- **Known design debt you will fix on paper:** the habit surfaces carry the inverted-positive language (see the habit-logging brief); onboarding screens exist under `app/onboarding/*` but nothing routes to them (users hit a stale welcome screen); two competing welcome screens; Settings has dead rows (Profile, Notifications, Privacy) and a Developer section; hardcoded hexes remain in places; no empty state for zero expenses; no privacy overlay on backgrounding.
- **Current light tokens** (evolve deliberately or match): background #F8F8F8, card #FFFFFF, text #212121 / secondary #757575 / tertiary #9E9E9E, border #E5E7EB, primary green #4CAF50 (green = brand/positive ONLY), muted green #B2DFB6, danger #DC2626, amber #FFB74D on #FFF3E0. Icons: Ionicons today; an icon-system change is in scope for P2-4b.

## 5. Design scope per task

### 5.0 Prerequisite: habit-logging model (cross-cutting; do first)
Execute `docs/habit-logging-design-brief.md` in full. Output: `habit-logging-spec.md` + prototype. Everything below that touches habit surfaces inherits from it.

### 5.1 P2-1: Onboarding, two doors + Door 1 Leak Audit
**Goal:** a fresh install reaches "you're leaking about $X/yr" in under 90 seconds and ends with one practiced log and a primed Kept counter.
**Design:** welcome screen (one screen, honest tagline, no voice-input promises); the two-door fork (Start fresh / Bring your statements) with honest framing of each; Door 1 flow: preset subscription grid (decide contents: which subscriptions, regional-neutral), weekly vice estimates (coffee, delivery, impulse; decide the input pattern: chips, steppers, sliders), the leak-projection math and its honest framing (tilde mandatory; decide and document the formula), seeding audit items as recurring expenses, guided first expense, success screen with primed counter and the trial touchpoint placeholder (paywall itself is Phase 3).
**Constraints:** every step emits a funnel event (names already exist in analytics.ts); completion target 60%+; skippable without dead ends; Door 2's graceful-failure state re-enters here primed with anything the scan found.
**Acceptance for your spec:** step-by-step flow with copy, the formula documented with worked examples, per-step analytics, edge cases (user has zero subscriptions, user skips estimates, user abandons mid-flow and reopens).

### 5.2 P2-1b: Leak Scan, visual design only
**Goal:** visual treatment for the components already behavior-specified in `leak-scan-spec.md` section 5.
**Design:** KPI row with tier badges (solid / likely / needs review, never percentages); top-3 categories with bars + View more; the SpendPulse day/month/year grid (zero-spend vs out-of-coverage MUST be visually distinct, hatched); habit cards (rank, Govern/Influence/Fixed class badge, tier badge, stats row, yearly-pace pill, class-dependent CTAs); the next-month projection list (locked-in vs run-rate vs buffer, 3-payment-month flag); results footer (rows read/skipped/merged, undo); the "This one's on us" graceful-failure screen; the merchant review queue (a 60-second task, never homework); the two permitted questions as one-tap chips.
**Constraints:** every number renders through the app's currency formatter; the Track CTA opens the Decision-1 pick-one sheet from 5.0; tier badges are a system you define once and reuse.
**Do not** re-specify behavior; the spec owns it. Flag any behavior gap you find in `07-decisions-needed.md` instead of changing it.

### 5.3 P2-2: Coach Moments
**Goal:** coaching as the product's voice at the moment of action, not a destination.
**Design:** the card component (visual treatment that is not a toast and not a modal; it mounts in the answer-confirmation slot from 5.0 and at the four other triggers), dismissal behavior, once-per-event rules, and the full copy set: ~20 cards across the 5 triggers, reusing the psychology content of the existing lessons (source material: the 7 micro-lessons in `mobile-app/types/habit.ts`, plus `mobile-app/constants/strings.ts`). Each card is one or two sentences, leak/skip/kept vocabulary, identity beats at milestones ("You're becoming someone who decides where money goes").
**Constraints:** every card shows once per triggering event; a card never blocks the primary action; each render fires `coach_moment_shown` (already declared).
**Acceptance:** trigger-to-card matrix, all copy final, component states (entering, idle, dismissed), and the removal note for the lessons library section.

### 5.4 P2-4: Design unification pass (the decisions and the inventory)
**Goal:** the app reads as one product.
**Design/decide:** the dark-toggle call (recommend: remove for v1 per D-6, Appearance row goes; document the revert path for v1.x); Settings final layout (keep Currency, privacy policy link, version; remove Profile/Notifications/Privacy dead rows and the Developer section); color-semantics audit rules (green strictly brand/positive; slips are honest, not errors: define what danger red is actually for); the empty-state set (zero expenses, pre-detection "2 of 4 logs", pre-coverage projection placeholder); the privacy overlay that hides amounts in the iOS app switcher (design the cover treatment); a hardcoded-hex inventory checklist the build session will sweep.
**Acceptance:** a screen-by-screen checklist the build session can execute mechanically, with before/after notes for each decided item.

### 5.5 P2-4b: Visual direction (prototype-first, Charen approves)
**Goal:** one distinctive, restrained visual direction applied consistently.
**Design:** 2 to 3 interactive HTML prototypes (single-file, iPhone frame, light mode), each applying its direction to the SAME four screens for honest comparison: expenses log form, Habits tab (Kept hero + check-in card from 5.0), habit detail (3-state calendar), onboarding success. Candidate directions (from D-4): (a) refined native-first: SF-Symbol-weight iconography, depth via materials and soft shadows; (b) bolder dimensional-icon accent system; (c) motion/haptics language concentrated on the log and skip moments (can be folded into a or b as a layer). You may propose a different third direction if you believe in it.
**Acceptance:** the prototypes, a one-page comparison (what each direction says about the brand, cost to implement, ADA-restraint fit), and your recommendation. Charen picks; the pick becomes part of the package.

### 5.6 P2-5: Accessibility baseline (spec now, execute after P2-4 lands)
**Goal:** VoiceOver completes log, track, skip; no critical Accessibility Inspector issues on core screens.
**Design:** the a11y requirements matrix for every component in this package: labels for every control (FAB, chevrons, eye/trash icons), button fallbacks for every swipe action, 44pt targets, Dynamic Type behavior on core screens (define where text scales and where it truncates), contrast fixes for tertiary text (#9E9E9E on #F8F8F8 fails; propose the fix), focus order per screen.
**Constraint:** write it against YOUR new designs (that is why it is last), so the build session executes it once, not twice.

## 6. Working order

1. Habit-logging model (5.0), it unblocks 5.2, 5.3, and half of 5.5's screens.
2. P2-1 Door 1 + onboarding (5.1), plus resolve the category-taxonomy question below.
3. P2-4b direction prototypes (5.5), pause for Charen's pick.
4. P2-4 unification decisions (5.4) written against the picked direction.
5. P2-1b visuals (5.2) and P2-2 Coach Moments (5.3) in the picked direction.
6. P2-5 a11y matrix (5.6) across everything.

**Also resolve (small but blocking):** the category taxonomy. `leak-scan-spec.md` uses Mortgage/Rent, adds "Software & Subscriptions", and treats Transfers/Income/Cash-untracked as classes. The app's `ExpenseCategory` type has: Mortgage, Car, Entertainment, Food, Shopping, Utilities, Healthcare, Transportation, Other. Propose the final list + the migration mapping in `07-decisions-needed.md`.

## 7. Required output package (write into `docs/design-package-phase2/`)

Each file self-contained, `leak-scan-spec.md` as the quality bar (principles, flows, component specs with exact copy, states, edge cases, analytics events, acceptance criteria, decided-vs-open list at the end).

| File | Contents | Review focus for Charen |
|---|---|---|
| `00-overview.md` | Package map, what was decided vs deferred, how the pieces connect | Completeness |
| `01-habit-logging-spec.md` | The Decision-1 spec (from the brief) + prototype link | The 5-second comprehension test; slip feels safe |
| `02-p2-1-onboarding-leak-audit.md` | Welcome, fork, Door 1 flow, formula, copy, funnel | 90-second gate; honesty of the projection |
| `03-p2-1b-leak-scan-visuals.md` | Visual specs for every leak-scan-spec section 5 component | Tier-badge system; coverage honesty; density |
| `04-p2-2-coach-moments.md` | Card component + trigger matrix + all ~20 copies | Voice; never blocks action; copy quality |
| `05-p2-4-design-unification.md` | Dark-toggle call, Settings layout, empty states, privacy overlay, color rules, sweep checklist | Each decision + its reasoning |
| `06-p2-4b-direction/` | 2-3 HTML prototypes + `comparison.md` + recommendation | Pick one direction |
| `07-decisions-needed.md` | Everything only Charen can decide, each with a recommendation and tradeoff (taxonomy, dark toggle if contested, direction pick, any scope calls) | Answer every line |
| `08-handoff-package.md` | The planning-session input: consolidated build order with dependencies, per-item size estimates, risk notes, and the list of spec files a build session must read | Sanity of sequencing |
| Prototypes | Single-file HTML, iPhone frame, light mode, real copy (never lorem ipsum), tappable states | Feel |

## 8. Review loop and what happens after

1. The design session produces the package and stops.
2. Charen reviews section by section (the "review focus" column above), answers `07-decisions-needed.md`, and requests revisions.
3. Once approved, `08-handoff-package.md` plus the approved specs are the complete input for a planning/execution session: it converts them into ADRs (0004+), a roadmap-banner update, and build branches per the build order already sketched in `phase-2-next-steps.md` section 4 (habit surfaces, then Leak Scan pipeline, then results screen, then onboarding, then Coach Moments, then the P2-4 apply pass, then P2-5 last).
4. Phase 2 exit criteria the whole package must satisfy: leak number under 90 seconds fully instrumented; one visual language, no placeholder content anywhere; privacy overlay present; Charen-approved direction implemented; VoiceOver completes the core loop.

## 9. Anti-goals (reject on sight, in any section)

- Any labeling where the positive action reads as "I did the habit".
- Hidden or shame-framed slip paths; fake continuity (streak freezes, grace tokens).
- Budgets, bank linking, accounts, notifications delivery, voice input (all cut or v1.x).
- Generic-AI visual tropes: gradient blobs, unearned glassmorphism, confetti, centered-everything.
- Reopening locked decisions (section 3), silently deciding Charen-level questions (route them to 07), or specifying behavior that contradicts `leak-scan-spec.md`.
- Em dashes in anything.
