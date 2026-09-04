# HabitCents Mobile App: Primer

Quick-orient doc for `/start`. Product-wide tracking lives at the HabitCents umbrella:
`../PUNCHLIST.md` (punch list) and `../docs/decisions/` (decision log). This primer covers the mobile-app repo only.

Canonical direction: `CLAUDE.md` (direction lock) → `../docs/habitcents-goals-v2.md` (North Star) → `../docs/habitcents-plan-v2.html` (roadmap P0-x..P6-x) → `../docs/agent-execution-guide.md` (working rules) → `../PUNCHLIST.md` (running state).

## Project overview

Expo / React Native (SDK 54) personal-finance + habits app. Local-only (AsyncStorage, no backend, no Plaid). Repo: `habitcents-mobile-app`. Identity: name `habitcents`, bundle id `com.habitcents.app`, light mode only.

## Current project state (2026-09-04)

- **Design refresh wave SHIPPED as TestFlight build 18 (v1.0.0), Charen testing on device.** Merged to main today (PRs #126-#131, #128): FTE Today empty states; chips not-started placeholders (ADR 0030); the SheetHeader save convergence across all five form sheets (ADR 0031); category renames Home/Subscriptions with the frozen-stored-value mapping and the spend-matching fix (ADR 0032); category detail back-arrow gutter fix (ScreenHeader pushed mode), merged three-column stat band, baseline trend bars, unified merchant/log rows. 1069 tests, tsc clean.
- **Three cloud worker routines + a Fable 5 orchestrator are LIVE** (every 6h offset / daily 12:00 UTC): localization (10 languages, branch routine/localization), iPad adaptability (routine/ipad), core P3 monetization+legal (routine/core-p3). Workers never merge; state in docs/routines/PLAN.md + HANDOFF.md per branch; the orchestrator reviews commits, maintains the "Routine status board" GitHub issue, queues DECISIONS NEEDED for Charen, and files ADR PRs. Manage at claude.ai/code/routines.
- **Watch for:** the localization stream rewrites constants/strings.ts wholesale; any local session adding strings should expect rebase friction until it lands. The iPad stream will flip supportsTablet (native fingerprint change: next TestFlight build required for device testing).
- **Blocked on Charen:** build 18 device pass (chips placeholders on fresh install, header saves on every form sheet, Home/Subscriptions with intact totals, category detail refresh); the routine DECISIONS NEEDED queue as it fills (localization glossary for leak/skip/kept/slip, monetization pricing options, iPad device pass).
- **Still open from before:** UX-073 leak-scan monthly-rate overstatement (P1, unverified); UX-074 leak-scan safe-area; Sheet grab-handle swipe promise (partially honored: swipe exists since UX-041); RevenueCat live wiring awaits products + pricing decisions.
- **Working mode:** umbrella = private ops repo `charenk/habitcents-ops`; ADR 0012 two-lane merges; foundation-first; ADR 0029 release boundary (agents: preview/internal; production: human).
- **Branches:** `main` = production. Routine branches: routine/localization, routine/ipad, routine/core-p3 (long-lived, review via their draft PRs). `dev/seed-data` remains STALE, do not merge; seed via Profile > Developer persona.

## Recent session history

- 2026-07-14/15: Long live session. Wave 0 handoffs (Resend live + verified, RevenueCat account chain to SDK key, App Store Connect app record + Bundle ID + IAP key). Shipped: RevenueCat mock paywall (#24), blog auto-publish pipeline (ADR 0014, scribe Wed 03:30 + dispatcher sweep), Slack signup notify (#17) + its route-wiring fix found by a full-state audit (#18). Full-pass audit reconciled Notion/PUNCHLIST/roadmap. Brand refresh shipped and LIVE: website favicon + theme-adaptive nav/footer wordmark logo (#19, on habitcents.com), mobile app-icon system (#26), ops masters (#5). All PRs merged; #24 needed an a11y merge-conflict resolution (kept both RevenueCat wiring and #25's a11y labels/hitSlop).
- 2026-07-13: Domain + web foundation sprint (mostly website/ops; one mobile change). Connected habitcents.com to the correct Vercel project, then shipped Wave 1 as parallel worktree agents: legal pages P3-2, `.app`->`.com` standardization (ADR 0013), a11y 91->100, dynamic OG card via next/og (auto-syncs to hero copy), favicon brand mark. Mobile: U2 fixed the Settings privacy link to the live habitcents.com/privacy (PR #23, 282 tests green).
- 2026-07-02..04: Shipped P2-3 (PostHog, device-verified) + P2-6 (currency + strings) + fixes (expenses sheet, icons); merged PRs #2-#8. Integrated the Leak Scan spec (ADR 0003), locked spec-first mode, produced the Phase 2 design briefs + design-context mirror for Charen's design session.
- 2026-07-02: Executed Phase 0 + Phase 1 (P0-1,P0-5,P1-1..P1-7) + rebuilt Upcoming as a real feature; merged via PR #1. Pruned stale worktree/branch. Docs updated.
- 2026-07-01: Set up lifecycle files. Decided feedback/instrumentation stack (PostHog + GitHub Issues, decision 0001).

## Dev

Quick start: `npm install` then `npm run web` / `npm run ios`. Tests: `npm test`. Type-check: `npx tsc --noEmit`.
To see the app populated with demo data: `git checkout dev/seed-data` then run (SEED_DEV_DATA flag in `utils/devSeed.ts`); return to `main` for a clean first-run.
