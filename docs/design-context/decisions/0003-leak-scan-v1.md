# 0003. P2-1b re-specified: CSV import becomes the Leak Scan (auto-inference, results dashboard)

- **Date:** 2026-07-03
- **Status:** Accepted
- **Area:** Product / UX / Engineering
- **Deciders:** Charen (solutioned in a dedicated design session; spec authored there and adopted as docs/leak-scan-spec.md)

## Context
D-10 (decision 0002) approved a two-door onboarding with CSV import bounded to: CSV only, column-mapper UI, on-device parsing, ends at pick-one-habit. Detailed solutioning against three real Scotiabank exports (BOM + preamble rows, opposite sign conventions between chequing and card files, an Apple charge/refund pair, an $11/mo recurring e-transfer, a truncated Momentum export) showed a manual column mapper is both weaker UX and insufficient: the hard problems are sign conventions, transfer/refund netting, dedupe, and coverage honesty, none of which a mapper solves.

## Decision
Adopt docs/leak-scan-spec.md as the canonical P2-1b specification, superseding the column-mapper approach:
1. Nine-stage on-device pipeline with automatic column and sign inference. Heuristics resolve ambiguity; the user is asked at most two questions (DD/MM ambiguity, low-confidence sign confirmation).
2. Confidence model with three visible tiers (solid / likely / needs review) and a graceful "this one's on us" failure state that exits into Door 1 (the Leak Audit remains the v1 ship gate).
3. Results screen: KPI row, top-3 categories, adaptive spending pulse, up to 10 habit cards with a governability classifier (Govern / Influence / Fixed), and an auto-rendered next-month projection with save-to-recurring.
4. Post-scan handoff seeds the expense log with the last 15 days; detection and projection keep full-history basis.
5. Persistent local rule store (utils/scanRules.ts): every user correction becomes a personal rule that outranks built-ins on future scans and manual logs.
6. "Remind me the day before" ships as intent capture only in v1 (persists the preference, schedules nothing). Notification delivery stays v1.x, preserving the original P2-1b boundary and the no-network rule.
7. Anonymous, structural-only analytics events (no merchant strings, amounts, or file contents), consistent with D-9.

## Alternatives considered
- Column-mapper wizard (original D-10 shape): rejected; it pushes the hard work onto the user, does not address sign/netting/dedupe correctness, and produces half-right money math.
- Defer CSV import entirely to v1.x: rejected; it is the strongest cold-start solve (KILL-2) and the strongest form of the privacy moat ("your statement never leaves your phone").
- Wire local notifications now for the reminder toggle: rejected for v1; intent capture keeps scope bounded, and v1.x activation of saved intents is automatic.

## Consequences
- Easier: cold start (instant real detection on full history), privacy story, honest numbers (coverage windows, tier badges), parser improvement loop via correction telemetry.
- Harder / cost: P2-1b grows from ~1-1.5 weeks to roughly 2.5-3.5 solo weeks; adds a PapaParse dependency (on-device, MIT); new surfaces (SpendPulse, habit cards, projection) and a category-taxonomy extension (Software & Subscriptions, Mortgage/Rent naming, Transfers/Income/Cash-untracked classes) that require a mapping onto the existing ExpenseCategory type.
- Dependency: habit-card CTAs land on the Decision-1 pick-one confirmation sheet (habit-logging check-in model). That spec artifact must land in docs/ before the results-screen build; the pipeline stages (0-8) have no such dependency.
- Revisit at beta: whether the 15-day seed size and the +12% projection buffer match observed behavior.
