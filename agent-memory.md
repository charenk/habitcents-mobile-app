# HabitCents Mobile App: Agent Memory

Persistent facts for future sessions. Append new facts under a dated heading. Do not duplicate; preserve existing content.

## 2026-07-01 additions

- **Stack:** Expo SDK 54, React Native 0.81.5, expo-router v6, React 19. `newArchEnabled: true`. Persistence: `@react-native-async-storage/async-storage` only (no backend, no Plaid). Charts are custom components (no chart library).
- **Scripts:** `start`, `ios`, `android`, `web`, `lint` (all thin Expo wrappers). See `memory.sh`.
- **Not release-ready:** `app.json` has placeholder bundle identifiers `com.yourname.habitcent`; no `eas.json`; no CI/CD. Needs real identifiers + EAS setup before TestFlight/store.
- **Feedback + instrumentation decision (`../docs/decisions/0001`):** PostHog (in-app feedback + analytics + crash, free RN SDK) feeding GitHub Issues (free API, AI triage target). Public voting board deferred (Featurebase pre-picked for later). Sentry not needed (PostHog covers crash).
- **Product-wide tracking is at the umbrella, not this repo:** `../PUNCHLIST.md` and `../docs/decisions/`. This repo holds only its own primer/agent-memory/memory.sh.
- **Known cleanup items:** README.md (expenses-first) and CLAUDE.md (fuller feature set) describe divergent app scopes, reconcile. Stale worktree copy at `.claude/worktrees/brave-tharp/` to delete.
