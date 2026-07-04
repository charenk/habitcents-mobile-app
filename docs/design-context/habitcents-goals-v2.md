# HabitCents — North Star v2.0

*The canonical goals document. Adopted 2026-07-02 (decision 0002; full analysis in habitcents-plan-v2.html). Supersedes archive/habitcents-goals.md (v1.0, Feb 2026, retired).*

## The one-liner

HabitCents finds the one spending habit quietly costing you $100+/month from your own 10-second logs, helps you break it, and shows you the dollars you kept. Private by architecture: no bank linking, no account, your data never leaves your phone.

Shared vocabulary on every surface: **leak** (what detection finds), **skip** (the coached action), **kept** (the counted dollars).

## The goal

| Milestone | Target | Kill / pivot signal |
|---|---|---|
| Month 3 (post-launch) | 300+ downloads/mo organic, D7 ≥ 20%, ≥ 4 logs/user/wk | D7 < 12% after onboarding iteration: core loop not landing |
| Month 6 | $300-600 MRR, ≥ 25 paying | < 10 paying: premium value prop weak, revisit packaging |
| Month 12 | $1-2k MRR (stretch: $5k if a distribution lottery ticket hits) | < $500 MRR: honest pivot / persevere / sunset call |
| Month 24 | $5k MRR | |

Rationale: $5k/mo in year one is a ~1-in-10 base-rate outcome (RevenueCat 75k-app data). The stretch stays live through engineered upside (shareable dollars-kept counter, Apple editorial pitch, weekly content cadence), never as the load-bearing plan.

## Pricing

- **Free, forever useful:** unlimited logging, habit detection, 1 active habit + the dollars-kept counter (the counter stays free: it is the viral artifact), current-month report.
- **Premium: $3.99/mo · $29.99/yr (annual-first) · 14-day trial started at onboarding:** up to 5 active habits, full history + trends, widgets + iCloud backup (v1.x), CSV export.
- **Lifetime: $49.99.** Privacy-minded manual-tracker users disproportionately hate subscriptions; lifetime de-risks early cash flow.
- Apple Small Business Program (15% cut). Revisit pricing upward only after real trial-to-paid data exists.

## Non-negotiable principles

1. **Logging friction under 10 seconds.** Nothing else matters if this fails.
2. **Free tier is genuinely useful.** Premium unlocks depth, never the core loop.
3. **Instrument from day 1.** PostHog (anonymous-device-ID mode, inputs masked, no ATT) before beta, not after.
4. **One story everywhere.** Website, store listing, and first-run make the same promise in the same words. Any claim not true in the shipping build gets cut from marketing that week.
5. **Value in minute one.** Never make the user wait for detection: two onboarding doors (Leak Audit / on-device CSV import), each ending in a personal leak number and one practiced log.
6. **Local-only is the moat.** No accounts, no backend in v1. "Data Not Collected." RevenueCat without sign-in. Sync, when it comes, goes through the user's own iCloud.
7. **Ship a repaired v1 (~11-13 weeks), not a rebuild.** The hard parts are built; fixes are wiring.
8. **Capture anywhere, staged on the platform ladder.** v1: phone capture perfected. v1.x: iOS interactive widget (preset one-tap logs) + lock-screen widget + Control Center control + Siri/App Intents. v2 (after iCloud sync ships): watchOS quick-entry app + macOS menu bar capture. Never ahead of sync infrastructure; watch/Mac get prototype-first treatment.

## Coaching = Coach Moments

No lessons library. ~20 contextual one-liner cards on 5 triggers (first log, detection, skip, milestone, broken streak), personalized with the user's own numbers, every card a measurable event. Coaching is the product's voice at the moment of action, never a separate feature in any copy.

## Success metrics

| Metric | Target | Alarm |
|---|---|---|
| D7 retention | ≥ 20% | < 12% |
| D30 retention | ≥ 10% | < 6% |
| Logs / user / week | ≥ 4 | < 2 |
| Leak-audit completion in onboarding | ≥ 60% | < 35% |
| Users reaching first real detection by D14 | ≥ 30% | < 15% |
| Download → trial | ≥ 8% | < 4% |
| Trial → paid | ≥ 35% | < 20% |
| Monthly paid churn | ≤ 9% | > 13% |

## Operating model

Solo designer-founder. Fable 5 plans and orchestrates; low-cost agents execute per `agent-execution-guide.md`. Content commitments (X 3/wk, TikTok 1-2/wk, LinkedIn 1/wk, blog 2/mo, Reddit 2/wk) run through the content-scout system (`content-agent-spec.md`) at ~3-4 founder-hours/week. Decisions recorded in `decisions/`; state lives in `PUNCHLIST.md`.

## The one-line summary

> A financial habit app that turns "track your spending" into "break the one habit costing you $100+/month", private by architecture, shipped by repairing what exists, profitable at ~500 subscribers, aimed at $1-2k MRR in year one and $5k by year two.
