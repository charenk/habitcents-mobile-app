# HabitCents Mobile App: Primer

Quick-orient doc for `/start`. Product-wide tracking lives at the HabitCents umbrella:
`../PUNCHLIST.md` (punch list) and `../docs/decisions/` (decision log). This primer covers the mobile-app repo only.

Canonical direction: `CLAUDE.md` (direction lock) → `../docs/habitcents-goals-v2.md` (North Star) → `../docs/habitcents-plan-v2.html` (roadmap P0-x..P6-x) → `../docs/agent-execution-guide.md` (working rules) → `../PUNCHLIST.md` (running state).

## Project overview

Expo / React Native (SDK 54) personal-finance + habits app. Local-only (AsyncStorage, no backend, no Plaid). Repo: `habitcents-mobile-app`. Identity: name `habitcents`, bundle id `com.habitcents.app`, light mode only.

## Current project state (2026-07-13)

- **Status: PHASES 0-2 COMPLETE AND SIGNED OFF** (ADR 0008 defers only the on-device VoiceOver audit to Phase 4 beta). Main is green through PR #22: the full Phase 2 surface set ships on Direction C: habit-logging surfaces (week strip, chapters arc, kept hero, 3-state calendar), the Leak Scan (pipeline stages 0-9 + intake + results + rule store), two-door onboarding with the Door 1 Leak Audit, Coach Moments (MICRO_LESSONS removed), the unification pass (motion/haptics on log-save and skip only, privacy overlay, Settings cleanup), the accessibility baseline, and real icon art (P0-4 done).
- **Phase 3 partial:** P3-4 truth pass + P3-5 leak calculator + P3-3 register backend shipped in the WEBSITE repo (live on Vercel; register in mock mode until `RESEND_API_KEY` lands). Remaining, tracked as bets: P3-1 RevenueCat (BET-004; wires into the already-built free-tier gate in `PickOneSheet` + `FREE_TIER_HABIT_LIMIT`) and P3-2 legal (BET-003).
- **Phase 4 started:** `eas.json` merged (PR #22, BET-002). First TestFlight build follows ops `docs/testflight-runbook.md`; **waiting only on Charen's Expo login.** This is the next priority task.
- **Working mode:** the umbrella is the private ops repo `charenk/habitcents-ops`; work flows through the Notion OS (Your court, Decision inbox, Bets, QA intake, Content queue). Merges follow ADR 0012 two-lane (Lane 1 auto-merge CI-green; Lane 2 needs-user-test for anything user-visible plus pricing/payments/legal). Foundation-first: P3/P4 outrank discovery bets until beta-ready.
- **Blocked on Charen (Your court):** Expo login (gates TestFlight), `habitcents.app` DNS + Resend key (gates live register email), RevenueCat + App Store agreements for BET-004, P0-2 secrets rotation, P0-3 repo archiving.
- **Branches:** `main` = production (no seed). `dev/seed-data` = flag-gated demo seeding (never merge to main).

## Recent session history

- 2026-07-02..04: Shipped P2-3 (PostHog, device-verified) + P2-6 (currency + strings) + fixes (expenses sheet, icons); merged PRs #2-#8. Integrated the Leak Scan spec (ADR 0003), locked spec-first mode, produced the Phase 2 design briefs + design-context mirror for Charen's design session.
- 2026-07-02: Executed Phase 0 + Phase 1 (P0-1,P0-5,P1-1..P1-7) + rebuilt Upcoming as a real feature; merged via PR #1. Pruned stale worktree/branch. Docs updated.
- 2026-07-01: Set up lifecycle files. Decided feedback/instrumentation stack (PostHog + GitHub Issues, decision 0001).

## Dev

Quick start: `npm install` then `npm run web` / `npm run ios`. Tests: `npm test`. Type-check: `npx tsc --noEmit`.
To see the app populated with demo data: `git checkout dev/seed-data` then run (SEED_DEV_DATA flag in `utils/devSeed.ts`); return to `main` for a clean first-run.
