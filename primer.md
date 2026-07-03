# HabitCents Mobile App: Primer

Quick-orient doc for `/start`. Product-wide tracking lives at the HabitCents umbrella:
`../PUNCHLIST.md` (punch list) and `../docs/decisions/` (decision log). This primer covers the mobile-app repo only.

## Project overview

Expo / React Native (SDK 54) personal-finance + habits app, cross-platform iOS + Android. Data is currently mock + AsyncStorage (no backend, no Plaid). Custom chart components (no charting lib). Repo: `habitcents-mobile-app`.

## Current project state

- **Status:** Feature-complete core (habits, categories, reports, onboarding) on mock data. Not yet instrumented or release-ready.
- **Fully working:** type definitions, context providers, habit-detection algorithm, Categories CRUD, Habits screen, Reports screen, onboarding flow, habit/category detail screens, custom charts.
- **In progress:** feedback + instrumentation setup (Phase 2 of the solo-founder flow).
- **Blocked / gaps:** zero telemetry (no analytics/crash); not release-ready (placeholder bundle IDs `com.yourname.habitcent`, no `eas.json`).
- **Next priority:** wire PostHog into the app (`posthog-react-native` SDK, env-gated) on a branch, and set real app identifiers. See `../docs/decisions/0001`.
- **Open decisions:** none open. Feedback/instrumentation stack decided in `../docs/decisions/0001` (PostHog + GitHub Issues; public board deferred).

## Recent session history

- 2026-07-01: Set up lifecycle files (primer/agent-memory/memory.sh). Decided feedback + instrumentation stack (PostHog + GitHub Issues, decision 0001). Queued PostHog wiring as the next task.

## Dev

See `memory.sh` for commands. Quick start: `npm install` then `npm start` (Expo dev server), or `npm run ios` / `npm run android` / `npm run web`.
