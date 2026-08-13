# HabitCents Mobile App: Primer

Quick-orient doc for `/start`. Product-wide tracking lives at the HabitCents umbrella:
`../PUNCHLIST.md` (punch list) and `../docs/decisions/` (decision log). This primer covers the mobile-app repo only.

Canonical direction: `CLAUDE.md` (direction lock) → `../docs/habitcents-goals-v2.md` (North Star) → `../docs/habitcents-plan-v2.html` (roadmap P0-x..P6-x) → `../docs/agent-execution-guide.md` (working rules) → `../PUNCHLIST.md` (running state).

## Project overview

Expo / React Native (SDK 54) personal-finance + habits app. Local-only (AsyncStorage, no backend, no Plaid). Repo: `habitcents-mobile-app`. Identity: name `habitcents`, bundle id `com.habitcents.app`, light mode only.

## Current project state (2026-08-13)

- **UX/UI audit + full remediation SHIPPED as TestFlight build 13, awaiting Charen's device pass.** Mobile PR #109 merged to main (`8f218a8`). 74 findings (`design/audit/UXUI_AUDIT.md` + interactive `UXUI_AUDIT.html`), 67 resolved, health score 13/20 to 19/20. Seven phases: A honesty/correctness, B contrast (brand sage unchanged, CTA label ink not white), C+D type/spacing scale ratified from actual usage, F performance (memoized providers, first React.memo, Spent history virtualized), Round 2 accessibility flow (core loop + leak-scan flow now announce for VoiceOver) + vocabulary cleanup. 823 tests green, tsc clean.
- **Blocked on Charen: the device pass.** Install build 13 OVER the existing app (never delete first, data is on-device only); first check Money > Upcoming still projects with no duplicates (closes the owed recurrence upgrade test); then the PR #109 what-to-test list.
- **Open findings routed to a separate bet, not fixed this session:** UX-073 (P1) the leak-scan biggest-leak card's monthly-rate formula appears to overstate by ~3.3x (traced to `utils/leakScanBridge.ts:71`, not yet pipeline-verified); UX-074 (P2) the leak-scan results screen has no safe-area handling, confirmed pre-existing on main.
- **Four design decisions still open, deliberately left unresolved rather than guessed:** the Sheet's grab handle promises a swipe-to-dismiss nothing implements; `PATTERN_VOCABULARY.md` should ratify the serif sheet title as the one Money-sheet header; "stop breaking" renders slate against `theme.ts`'s own coral/destructive documentation; the welcome splash is still knowingly off ADR 0022.
- **Phase DI (the prior design-improvements wave) is fully merged** and superseded as the resume point by the audit above; its architecture (ScreenHeader, Spent/Kept split, onboarding doors v2, Money Habits segment) is the baseline the audit built on top of.
- **Scan engine verified on real bank data (PR #75, earlier):** cross-account transfer netting confirmed; eval harness at `__tests__/leakScanEval/` gates pipeline work; known gap = Canadian merchant-chain categorization coverage (documented).
- **Phases 0-2 complete and signed off (ADR 0008); Phase 3 partial:** legal + register live; RevenueCat still mock, live wiring needs `react-native-purchases` + real products, prices pending Phase 3 decisions a-d.
- **Working mode:** umbrella = private ops repo `charenk/habitcents-ops`; ADR 0012 two-lane merges; foundation-first.
- **Branches:** `main` = production (no seed). `dev/seed-data` is STALE, do not merge (merge-base predates the leak-scan engine). Seed demo data in-app instead: Profile > Developer > "Persona: returning user".

## Recent session history

- 2026-07-14/15: Long live session. Wave 0 handoffs (Resend live + verified, RevenueCat account chain to SDK key, App Store Connect app record + Bundle ID + IAP key). Shipped: RevenueCat mock paywall (#24), blog auto-publish pipeline (ADR 0014, scribe Wed 03:30 + dispatcher sweep), Slack signup notify (#17) + its route-wiring fix found by a full-state audit (#18). Full-pass audit reconciled Notion/PUNCHLIST/roadmap. Brand refresh shipped and LIVE: website favicon + theme-adaptive nav/footer wordmark logo (#19, on habitcents.com), mobile app-icon system (#26), ops masters (#5). All PRs merged; #24 needed an a11y merge-conflict resolution (kept both RevenueCat wiring and #25's a11y labels/hitSlop).
- 2026-07-13: Domain + web foundation sprint (mostly website/ops; one mobile change). Connected habitcents.com to the correct Vercel project, then shipped Wave 1 as parallel worktree agents: legal pages P3-2, `.app`->`.com` standardization (ADR 0013), a11y 91->100, dynamic OG card via next/og (auto-syncs to hero copy), favicon brand mark. Mobile: U2 fixed the Settings privacy link to the live habitcents.com/privacy (PR #23, 282 tests green).
- 2026-07-02..04: Shipped P2-3 (PostHog, device-verified) + P2-6 (currency + strings) + fixes (expenses sheet, icons); merged PRs #2-#8. Integrated the Leak Scan spec (ADR 0003), locked spec-first mode, produced the Phase 2 design briefs + design-context mirror for Charen's design session.
- 2026-07-02: Executed Phase 0 + Phase 1 (P0-1,P0-5,P1-1..P1-7) + rebuilt Upcoming as a real feature; merged via PR #1. Pruned stale worktree/branch. Docs updated.
- 2026-07-01: Set up lifecycle files. Decided feedback/instrumentation stack (PostHog + GitHub Issues, decision 0001).

## Dev

Quick start: `npm install` then `npm run web` / `npm run ios`. Tests: `npm test`. Type-check: `npx tsc --noEmit`.
To see the app populated with demo data: `git checkout dev/seed-data` then run (SEED_DEV_DATA flag in `utils/devSeed.ts`); return to `main` for a clean first-run.
