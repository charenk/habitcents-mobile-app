# HabitCents Mobile App: Primer

Quick-orient doc for `/start`. Product-wide tracking lives at the HabitCents umbrella:
`../PUNCHLIST.md` (punch list) and `../docs/decisions/` (decision log). This primer covers the mobile-app repo only.

Canonical direction: `CLAUDE.md` (direction lock) → `../docs/habitcents-goals-v2.md` (North Star) → `../docs/habitcents-plan-v2.html` (roadmap P0-x..P6-x) → `../docs/agent-execution-guide.md` (working rules) → `../PUNCHLIST.md` (running state).

## Project overview

Expo / React Native (SDK 54) personal-finance + habits app. Local-only (AsyncStorage, no backend, no Plaid). Repo: `habitcents-mobile-app`. Identity: name `habitcents`, bundle id `com.habitcents.app`, light mode only.

## Current project state (2026-07-24)

- **PHASE 4 MILESTONE: first TestFlight build SHIPPED (BET-002).** HabitCents v1.0.0 build 2 is installed on Charen's iPhone. The full EAS pipeline is proven and reusable: project bound via `eas init` (mobile PR #27, `extra.eas.projectId` = `ea39e317-4798-40fb-919f-30c300aabc27`); both `EXPO_PUBLIC_*` keys set as EAS production env vars; `eas build -p ios --profile production` (EAS auto-generated + stored the dist cert + provisioning profile); `eas submit` (EAS auto-created + stored an App Store Connect API Key, role App Manager). **Every future build is one command:** `eas build -p ios --profile production --auto-submit`. Full facts in `agent-memory.md` (2026-07-24).
- **P0 Habits-tab crash: FIXED and shipped** (build 4, 2026-07-24). Root cause was a Reanimated worklet serialization segfault on the skip action, release-only. The redesign later removed those animations entirely. On-device Tests B (paywall) + C (VoiceOver) are unblocked.
- **On-device verification (docs/accessibility-test-with-voiceover.md):** **Test A (app icons + splash) PASS** (green loop+check mark; light `icon.png` / dark `icon-dark.png` both correct; splash fast, no white flash). **Tests B + C blocked** by the crash above.
- **Status: PHASES 0-2 COMPLETE AND SIGNED OFF** (ADR 0008). Main green at 292 tests: the full Phase 2 surface on Direction C (habit-logging, Leak Scan pipeline + intake + results + rule store, two-door onboarding, Coach Moments, unification pass, a11y baseline). BET-005 a11y code audit merged (PR #25); on-device VoiceOver is the deferred Test C.
- **Phase 3 partial:** register backend **LIVE via Resend**; P3-2 legal live; P3-4 truth pass + P3-5 calculator shipped (website). **P3-1 RevenueCat: mock paywall + entitlement gating on main (PR #24)**, SDK key in `.env`, and now flowing into the TestFlight build via the EAS env var; behavior stays MOCK until `react-native-purchases` + real products (prices pending Phase 3 decisions a-d). Paywall = `app/paywall.tsx` (v1, needs design review); entitlement layer = `utils/purchases.ts` (mock returns free); gate = free 1 / premium 5 in `utils/habitLogging.ts`, opens the paywall on starting a 2nd habit.
- **Brand refresh live (PR #26), icon confirmed on device.** In-app theme green stays `#4CAF50` (brand green `#41CE75` deferred to a later in-app pass).
- **Working mode:** umbrella = private ops repo `charenk/habitcents-ops`; work flows through the Notion OS; merges follow ADR 0012 two-lane. Foundation-first: P3/P4 outrank discovery until beta-ready. Interactive credential-bearing CLI flows (EAS login/build/submit) are run by Charen with the AI coaching each prompt (the AI never types Apple credentials and has no interactive TTY).
- **Domain DONE:** habitcents.com live (ADR 0013); `habitcents.app` dead; bundle id `com.habitcents.app` stays; mobile privacy link points to `habitcents.com/privacy` (PR #23).
- **Blocked on Charen (Your court):** Phase 3 decisions a-d, RevenueCat real products (post-prices), Namecheap auto-renew, P0-2 secrets rotation, P0-3 repo archiving. (Expo login + first TestFlight build now DONE.)
- **Branches:** `main` = production (no seed). `dev/seed-data` = flag-gated demo seeding (never merge to main).

## Recent session history

- 2026-07-14/15: Long live session. Wave 0 handoffs (Resend live + verified, RevenueCat account chain to SDK key, App Store Connect app record + Bundle ID + IAP key). Shipped: RevenueCat mock paywall (#24), blog auto-publish pipeline (ADR 0014, scribe Wed 03:30 + dispatcher sweep), Slack signup notify (#17) + its route-wiring fix found by a full-state audit (#18). Full-pass audit reconciled Notion/PUNCHLIST/roadmap. Brand refresh shipped and LIVE: website favicon + theme-adaptive nav/footer wordmark logo (#19, on habitcents.com), mobile app-icon system (#26), ops masters (#5). All PRs merged; #24 needed an a11y merge-conflict resolution (kept both RevenueCat wiring and #25's a11y labels/hitSlop).
- 2026-07-13: Domain + web foundation sprint (mostly website/ops; one mobile change). Connected habitcents.com to the correct Vercel project, then shipped Wave 1 as parallel worktree agents: legal pages P3-2, `.app`->`.com` standardization (ADR 0013), a11y 91->100, dynamic OG card via next/og (auto-syncs to hero copy), favicon brand mark. Mobile: U2 fixed the Settings privacy link to the live habitcents.com/privacy (PR #23, 282 tests green).
- 2026-07-02..04: Shipped P2-3 (PostHog, device-verified) + P2-6 (currency + strings) + fixes (expenses sheet, icons); merged PRs #2-#8. Integrated the Leak Scan spec (ADR 0003), locked spec-first mode, produced the Phase 2 design briefs + design-context mirror for Charen's design session.
- 2026-07-02: Executed Phase 0 + Phase 1 (P0-1,P0-5,P1-1..P1-7) + rebuilt Upcoming as a real feature; merged via PR #1. Pruned stale worktree/branch. Docs updated.
- 2026-07-01: Set up lifecycle files. Decided feedback/instrumentation stack (PostHog + GitHub Issues, decision 0001).

## Dev

Quick start: `npm install` then `npm run web` / `npm run ios`. Tests: `npm test`. Type-check: `npx tsc --noEmit`.
To see the app populated with demo data: `git checkout dev/seed-data` then run (SEED_DEV_DATA flag in `utils/devSeed.ts`); return to `main` for a clean first-run.
