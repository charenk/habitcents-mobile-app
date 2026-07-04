# HabitCents Mobile App: Agent Memory

Persistent facts for future sessions. Append new facts under a dated heading. Do not duplicate; preserve existing content.

## 2026-07-01 additions

- **Stack:** Expo SDK 54, React Native 0.81.5, expo-router v6, React 19. `newArchEnabled: true`. Persistence: `@react-native-async-storage/async-storage` only (no backend, no Plaid). Charts are custom components (no chart library).
- **Scripts:** `start`, `ios`, `android`, `web`, `lint` (all thin Expo wrappers). See `memory.sh`.
- **Not release-ready:** `app.json` has placeholder bundle identifiers `com.yourname.habitcent`; no `eas.json`; no CI/CD. Needs real identifiers + EAS setup before TestFlight/store.
- **Feedback + instrumentation decision (`../docs/decisions/0001`):** PostHog (in-app feedback + analytics + crash, free RN SDK) feeding GitHub Issues (free API, AI triage target). Public voting board deferred (Featurebase pre-picked for later). Sentry not needed (PostHog covers crash).
- **Product-wide tracking is at the umbrella, not this repo:** `../PUNCHLIST.md` and `../docs/decisions/`. This repo holds only its own primer/agent-memory/memory.sh.
- **Known cleanup items:** README.md (expenses-first) and CLAUDE.md (fuller feature set) describe divergent app scopes, reconcile. Stale worktree copy at `.claude/worktrees/brave-tharp/` to delete.

## 2026-07-04 additions

- **Analytics (P2-3, shipped):** `utils/analytics.ts` is an env-gated PostHog wrapper: complete no-op with zero network unless `EXPO_PUBLIC_POSTHOG_API_KEY` is set (gitignored `.env`, US region). Anonymous device id, PII keys blocked, amounts coarse-bucketed (`bucketCents`), dev debug logger prints `[analytics:sent|dry-run] event {props}` (on in dev, `EXPO_PUBLIC_ANALYTICS_DEBUG` overrides). The single sanctioned exception to the no-network rule. Device-verified end to end.
- **Multi-currency (P2-6, shipped):** `utils/currency.ts` (7 currencies, zero-decimal JPY) + `CurrencyContext`/`useCurrency().format`. Money derives from cents at render; the stored `amountDisplay` field was dropped. Detection thresholds scale via `scaleThresholdCents`. All user-facing strings live in `constants/strings.ts` (14 groups); never hardcode UI copy or "$".
- **Corrupt-asset lesson:** the original committed icons were 560-byte invalid PNGs that `file` called valid; they crashed `expo prebuild` with "Unsupported critical chunk type". Diagnose with `xxd`, not `file`. Valid 1024px placeholders are committed; real art is still P0-4.
- **Device-build path:** store Expo Go only runs the newest SDK. Native path: CocoaPods 1.16.2 installed (needs `LANG=en_US.UTF-8`), `npx expo run:ios --device <UDID>` (device names contain a curly apostrophe; use the UDID), keep the phone unlocked, and Metro must be running or a Debug build shows a white screen (`curl localhost:8081/status`).
- **Expenses sheet:** `TodayExpensesPanel` snaps at 18% (collapsed default) / 55% / 95%; the add-form scrolls with bottom padding so Save always clears the sheet (stopgap until P2-4).
- **Working mode (locked 2026-07-03): spec-first.** No code until the item's spec .md lands in `../docs/` plus an ADR. `../docs/leak-scan-spec.md` (ADR 0003) re-specifies P2-1b; `docs/design-context/` in THIS repo mirrors the design docs for GitHub-linked design sessions (umbrella `../docs/` stays canonical; re-sync after changes).
- **Content locations:** the 7 micro-lessons (Coach Moments source) live in `types/habit.ts`, not `data/`. `data/` holds only expense helpers.
- **Git workflow facts:** merging to `main` requires Charen's explicit per-PR OK (auto-mode blocks default-branch writes). Deleting a stacked PR's base branch auto-closes the child PR (happened to PR #4; recreated as #5). PRs #1-#8 all resolved as of today.
