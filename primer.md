# HabitCents Mobile App: Primer

Quick-orient doc for `/start`. Product-wide tracking lives at the HabitCents umbrella:
`../PUNCHLIST.md` (punch list) and `../docs/decisions/` (decision log). This primer covers the mobile-app repo only.

Canonical direction: `CLAUDE.md` (direction lock) → `../docs/habitcents-goals-v2.md` (North Star) → `../docs/habitcents-plan-v2.html` (roadmap P0-x..P6-x) → `../docs/agent-execution-guide.md` (working rules) → `../PUNCHLIST.md` (running state).

## Project overview

Expo / React Native (SDK 54) personal-finance + habits app. Local-only (AsyncStorage, no backend, no Plaid). Repo: `habitcents-mobile-app`. Identity: name `habitcents`, bundle id `com.habitcents.app`, light mode only.

## Current project state (2026-08-07)

- **PHASE DI (design improvements) FULLY BUILT, awaiting Charen's device pass.** Sixteen Lane 2 PRs open with captures, what-to-test checklists, and green CI. The Today stack merges in order: #58 headers > #60 Profile > #64 Spent/Kept > #65 break-another > #66 swipe > #68 scoreboard > #78 Door 1 > #79 Door 3. Independent: #56 category title, #57 row extraction, #59 scan-loop fix, #63 Money Habits, #74 honest-zero welcome, #75 scan quality, #76 First scan segment, #77 results ladder (merge after #75). Ratified in ADRs 0018-0022 (ops repo); visual rules in `design/PATTERN_VOCABULARY.md`.
- **Onboarding doors v2 (ADR 0022, "the app is the onboarding"):** guided-log, audit-subs, audit-vices, reveal, and success screens are deleted on the stack; every door lands on real components with one coaching line; the step machine migrates any stored retired step to the intent picker.
- **Scan engine verified on real bank data (PR #75):** Charen's three Scotia exports parse 100% (was 1 row); cross-account transfer netting confirmed (13 pairs). Eval harness at `__tests__/leakScanEval/` gates future pipeline work; known remaining gap = Canadian merchant-chain categorization coverage (documented, not hidden). ScanSummary persists per scan and feeds Insights' First scan segment (#76).
- **TestFlight: build 6 submitted 2026-08-04** (after the build 5 launch crash: pre-v2 habit goal with undefined dayLogs; fixed via storage v2 backfill #51, icon fallback #52, quick-log merchant #53). Every build is one command: `eas build -p ios --profile production --auto-submit`. The next build after the DI stack merges must be a fresh native build only if native deps change; phase DI adds ZERO native deps.
- **Phases 0-2 complete and signed off (ADR 0008); Phase 3 partial:** legal + register live; RevenueCat still mock (paywall #24, SDK key in EAS env; live wiring needs `react-native-purchases` + real products, prices pending Phase 3 decisions a-d).
- **Working mode:** umbrella = private ops repo `charenk/habitcents-ops`; ADR 0012 two-lane merges; foundation-first. Main green at 500+ tests across the stack tips; CI flakes fixed on main (#62, #70).
- **Blocked on Charen (Your court):** device pass of the 16-PR queue; Phase 3 decisions a-d; RevenueCat real products; P0-2 secrets rotation; P0-3 repo archiving.
- **Branches:** `main` = production (no seed). `dev/seed-data` = flag-gated demo seeding (never merge to main). Dev builds have a Developer section in Profile (personas, restart onboarding, wipe).

## Recent session history

- 2026-07-14/15: Long live session. Wave 0 handoffs (Resend live + verified, RevenueCat account chain to SDK key, App Store Connect app record + Bundle ID + IAP key). Shipped: RevenueCat mock paywall (#24), blog auto-publish pipeline (ADR 0014, scribe Wed 03:30 + dispatcher sweep), Slack signup notify (#17) + its route-wiring fix found by a full-state audit (#18). Full-pass audit reconciled Notion/PUNCHLIST/roadmap. Brand refresh shipped and LIVE: website favicon + theme-adaptive nav/footer wordmark logo (#19, on habitcents.com), mobile app-icon system (#26), ops masters (#5). All PRs merged; #24 needed an a11y merge-conflict resolution (kept both RevenueCat wiring and #25's a11y labels/hitSlop).
- 2026-07-13: Domain + web foundation sprint (mostly website/ops; one mobile change). Connected habitcents.com to the correct Vercel project, then shipped Wave 1 as parallel worktree agents: legal pages P3-2, `.app`->`.com` standardization (ADR 0013), a11y 91->100, dynamic OG card via next/og (auto-syncs to hero copy), favicon brand mark. Mobile: U2 fixed the Settings privacy link to the live habitcents.com/privacy (PR #23, 282 tests green).
- 2026-07-02..04: Shipped P2-3 (PostHog, device-verified) + P2-6 (currency + strings) + fixes (expenses sheet, icons); merged PRs #2-#8. Integrated the Leak Scan spec (ADR 0003), locked spec-first mode, produced the Phase 2 design briefs + design-context mirror for Charen's design session.
- 2026-07-02: Executed Phase 0 + Phase 1 (P0-1,P0-5,P1-1..P1-7) + rebuilt Upcoming as a real feature; merged via PR #1. Pruned stale worktree/branch. Docs updated.
- 2026-07-01: Set up lifecycle files. Decided feedback/instrumentation stack (PostHog + GitHub Issues, decision 0001).

## Dev

Quick start: `npm install` then `npm run web` / `npm run ios`. Tests: `npm test`. Type-check: `npx tsc --noEmit`.
To see the app populated with demo data: `git checkout dev/seed-data` then run (SEED_DEV_DATA flag in `utils/devSeed.ts`); return to `main` for a clean first-run.
