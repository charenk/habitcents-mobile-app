# HabitCents Mobile App: Primer

Quick-orient doc for `/start`. Product-wide tracking lives at the HabitCents umbrella:
`../PUNCHLIST.md` (punch list) and `../docs/decisions/` (decision log). This primer covers the mobile-app repo only.

Canonical direction: `CLAUDE.md` (direction lock) → `../docs/habitcents-goals-v2.md` (North Star) → `../docs/habitcents-plan-v2.html` (roadmap P0-x..P6-x) → `../docs/agent-execution-guide.md` (working rules) → `../PUNCHLIST.md` (running state).

## Project overview

Expo / React Native (SDK 54) personal-finance + habits app. Local-only (AsyncStorage, no backend, no Plaid). Repo: `habitcents-mobile-app`. Identity: name `habitcents`, bundle id `com.habitcents.app`, light mode only.

## Current project state (2026-07-04)

- **Status: PHASE 2 IN PROGRESS; PRs #1-#8 all merged to `main`.** Fully working: Phase 1 core loop, **P2-3 analytics** (env-gated anonymous PostHog, device-verified; key in gitignored `.env`), **P2-6 complete** (multi-currency incl. zero-decimal JPY via `useCurrency().format`; all UI strings in `constants/strings.ts`), expenses Save-button fix (collapsible sheet), valid 1024px placeholder icons (build unblocked). 59 unit tests, tsc clean.
- **Working mode (locked): spec-first.** No code until the item's spec .md lands in `../docs/` + ADR. P2-1b is re-specified as the **Leak Scan** (`../docs/leak-scan-spec.md`, ADR 0003); **no Leak Scan code exists** (a premature start was fully rolled back).
- **In progress (design track):** Charen runs a GitHub-linked design session against `docs/design-context/habitcents-design-scope-phase2.md` (mirrors of the canonical umbrella docs). Expected output: `docs/design-package-phase2/` covering habit-logging spec, Door 1 Leak Audit, Leak Scan visuals, Coach Moments, P2-4 unification calls, P2-4b direction prototypes, a11y matrix.
- **Next priority for a build session:** integrate the returned design package (ADRs 0004+, roadmap update), then build in order: habit surfaces, Leak Scan pipeline (branch reserved `task/p2-1b-leak-scan-pipeline`), results screen, onboarding, Coach Moments, P2-4 apply, P2-5 a11y last.
- **Open decisions (route to Charen):** category taxonomy migration, dark-toggle removal (D-6 says light-only but the toggle still ships), visual-direction pick.
- **Blocked on Charen:** P0-2 rotate secrets; P0-3 archive stale repos; P0-4 real icon art; the design package itself.
- **Branches:** `main` = production (no seed). `dev/seed-data` = flag-gated demo seeding (never merge to main).

## Recent session history

- 2026-07-02..04: Shipped P2-3 (PostHog, device-verified) + P2-6 (currency + strings) + fixes (expenses sheet, icons); merged PRs #2-#8. Integrated the Leak Scan spec (ADR 0003), locked spec-first mode, produced the Phase 2 design briefs + design-context mirror for Charen's design session.
- 2026-07-02: Executed Phase 0 + Phase 1 (P0-1,P0-5,P1-1..P1-7) + rebuilt Upcoming as a real feature; merged via PR #1. Pruned stale worktree/branch. Docs updated.
- 2026-07-01: Set up lifecycle files. Decided feedback/instrumentation stack (PostHog + GitHub Issues, decision 0001).

## Dev

Quick start: `npm install` then `npm run web` / `npm run ios`. Tests: `npm test`. Type-check: `npx tsc --noEmit`.
To see the app populated with demo data: `git checkout dev/seed-data` then run (SEED_DEV_DATA flag in `utils/devSeed.ts`); return to `main` for a clean first-run.
