# HabitCents Mobile App: Primer

Quick-orient doc for `/start`. Product-wide tracking lives at the HabitCents umbrella:
`../PUNCHLIST.md` (punch list) and `../docs/decisions/` (decision log). This primer covers the mobile-app repo only.

Canonical direction: `CLAUDE.md` (direction lock) → `../docs/habitcents-goals-v2.md` (North Star) → `../docs/habitcents-plan-v2.html` (roadmap P0-x..P6-x) → `../docs/agent-execution-guide.md` (working rules) → `../PUNCHLIST.md` (running state).

## Project overview

Expo / React Native (SDK 54) personal-finance + habits app. Local-only (AsyncStorage, no backend, no Plaid). Repo: `habitcents-mobile-app`. Identity: name `habitcents`, bundle id `com.habitcents.app`, light mode only.

## Current project state (2026-07-15)

- **Status: PHASES 0-2 COMPLETE AND SIGNED OFF** (ADR 0008 defers only the on-device VoiceOver audit to Phase 4 beta). Main green at 292 tests: the full Phase 2 surface set on Direction C (habit-logging surfaces, Leak Scan pipeline + intake + results + rule store, two-door onboarding, Coach Moments, unification pass, accessibility baseline). BET-005 a11y code audit merged (PR #25); on-device VoiceOver walk deferred to TestFlight.
- **Phase 3 partial:** register backend **LIVE via Resend** (verified with real emails); P3-2 legal shipped (`/privacy` `/terms` `/support` live); P3-4 truth pass + P3-5 calculator shipped (website). **P3-1 RevenueCat: mock paywall + entitlement gating MERGED to main (PR #24)** and the iOS SDK key is in `.env`; behavior stays MOCK until `react-native-purchases` + a dev build + real products (prices pending Phase 3 decisions). Paywall is `app/paywall.tsx` (v1, needs design review); entitlement layer is `utils/purchases.ts` (mock returns free); gate = free 1 / premium 5 in `utils/habitLogging.ts`.
- **Brand refresh SHIPPED 2026-07-15 (PR #26):** same mark, new tile/color treatment. `assets/` icon system replaced (iOS light = off-white+green, dark = charcoal+white, tinted, Android adaptive over `#232323` + monochrome, splash green mark, favicon); `app.json` adaptive bg updated; `assets/brand/` holds SVG masters (canonical set in ops `docs/brand/`). In-app theme green stays `#4CAF50` (brand green `#41CE75` deferred to a later in-app pass). App icon verifies on-device at the first TestFlight build.
- **Phase 4 started:** `eas.json` merged (PR #22). First TestFlight build follows ops `docs/testflight-runbook.md`; **waiting only on Charen's Expo login.** This is the next priority task and also verifies the new app icons, RevenueCat sandbox, and VoiceOver.
- **Working mode:** the umbrella is the private ops repo `charenk/habitcents-ops`; work flows through the Notion OS (Your court, Decision inbox, Bets, QA intake, Content queue). Merges follow ADR 0012 two-lane (Lane 1 auto-merge CI-green; Lane 2 needs-user-test for anything user-visible plus pricing/payments/legal). Foundation-first: P3/P4 outrank discovery bets until beta-ready.
- **Domain DONE (2026-07-13):** habitcents.com is live on the correct Vercel project (`habit-cents-website`, account `charen-projects`). It had been stuck linked to another Vercel account; fixed by switching Namecheap nameservers to BasicDNS and adding fresh `_vercel` TXT tokens. Canonical public domain = habitcents.com per ADR 0013; `habitcents.app` is dead, bundle id `com.habitcents.app` stays. Mobile `settings.tsx` privacy link now points to the live `habitcents.com/privacy` (PR #23).
- **Blocked on Charen (Your court):** Expo login (gates TestFlight), Resend domain verify + `RESEND_API_KEY` (gates live register email), RevenueCat project + App Store agreements for BET-004, Phase 3 decisions a-d, Namecheap auto-renew, P0-2 secrets rotation, P0-3 repo archiving.
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
