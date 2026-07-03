# HabitCents Mobile App: Primer

Quick-orient doc for `/start`. Product-wide tracking lives at the HabitCents umbrella:
`../PUNCHLIST.md` (punch list) and `../docs/decisions/` (decision log). This primer covers the mobile-app repo only.

Canonical direction: `CLAUDE.md` (direction lock) → `../docs/habitcents-goals-v2.md` (North Star) → `../docs/habitcents-plan-v2.html` (roadmap P0-x..P6-x) → `../docs/agent-execution-guide.md` (working rules) → `../PUNCHLIST.md` (running state).

## Project overview

Expo / React Native (SDK 54) personal-finance + habits app. Local-only (AsyncStorage, no backend, no Plaid). Repo: `habitcents-mobile-app`. Identity: name `habitcents`, bundle id `com.habitcents.app`, light mode only.

## Current project state (2026-07-02)

- **Status: PHASE 1 COMPLETE, merged to `main` via PR #1 (commit 938431f).** The core loop is real end-to-end and browser-verified.
- **Working for real:** correct habit-detection math (was 30x off), live dollars-kept counter, real streak history, merchant-based detection, real categories + merchant field on the add form, expense edit/delete, corruption-hardened storage, and a **real Upcoming view** (recurring weekly/monthly → projected next occurrences). 34 unit tests (`npm test`), tsc clean.
- **Cut / do not re-add as fakes:** mic/voice FAB, reminder no-ops, budgets, Reports widget edit mode, progressive reveals, lessons library. Deferred to v1.x (real only): notifications, Upcoming calendar view, dark mode.
- **Branches:** `main` = production (no seed). `dev/seed-data` = main + flag-gated demo seeding for design review (never merge to main).
- **Next priority: Phase 2** — two-door onboarding (Leak Audit + on-device CSV import), PostHog instrumentation (env-gated, anonymous), design + accessibility pass. See plan HTML Phase 2 + decisions 0001 (PostHog) / 0002 (plan v2).
- **Blocked on Charen (Phase 0 leftovers):** rotate exposed secrets (P0-2); archive stale GitHub repos HabitCents-App-Web + habitcents-poc (P0-3, needs your OK); supply 1024×1024 icon + splash (P0-4).

## Recent session history

- 2026-07-02: Executed Phase 0 + Phase 1 (P0-1,P0-5,P1-1..P1-7) + rebuilt Upcoming as a real feature; merged via PR #1. Pruned stale worktree/branch. Docs updated.
- 2026-07-01: Set up lifecycle files. Decided feedback/instrumentation stack (PostHog + GitHub Issues, decision 0001).

## Dev

Quick start: `npm install` then `npm run web` / `npm run ios`. Tests: `npm test`. Type-check: `npx tsc --noEmit`.
To see the app populated with demo data: `git checkout dev/seed-data` then run (SEED_DEV_DATA flag in `utils/devSeed.ts`); return to `main` for a clean first-run.
