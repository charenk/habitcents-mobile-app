# Incident: build 5 crashes at launch on device (2026-07-31)

v1.0.0 build 5 (`d4152ed7-ead5-444e-8bc4-cfb051dbe77e`, the first build carrying the full 5-step redesign) installs over build 4 but crashes on open, with the iOS crash-share popup. The simulator DEV build of the same code is clean. Nobody ran a local RELEASE build before submitting; that gap is part of this incident.

Charen's data is safe: the crash happens at launch, before any write path runs, and the recurrence migration never rewrites storage. Do not delete the app from the device.

## What Fable's triage already ruled out (do not re-investigate)

- Reanimated remnants: zero `react-native-reanimated` / `react-native-worklets` imports anywhere in app code. The babel plugin (`react-native-worklets/plugin`) plus installed-but-unimported packages is a valid, non-crashing combination.
- Mixed animation drivers (the build-4 crash pattern): every Animated node uses one driver consistently. CheckInCard/Sheet/Toast native-only, LongArc JS-only on its own node.
- Import cycle through strings: `constants/strings.ts` imports nothing, so `utils/recurring.ts`'s top-level `strings.money.scheduleSeparator` cannot see an uninitialized module.
- Dev seed leaking into release: `DevSeedButton` and both `devSeed` entry points are `__DEV__`-gated.
- Config: `app.json` plugins are unchanged and correct (no plugin needed for svg or linear-gradient); `newArchEnabled` was already true in build 4.
- The exact native delta from working build 4: ADDED `react-native-svg@15.12.1` + `expo-linear-gradient@~15.0.8`; REMOVED `@expo/vector-icons`; everything else in the diff is JS-only (google-fonts assets, lucide).

## Ranked hypotheses

- H1: release-only failure in the launch render path. Prime suspects inside this bucket: react-native-svg's first render on New Arch in release (the tab bar renders lucide icons immediately), the font-gate in `app/_layout.tsx` (module-scope `preventAutoHideAsync`, `return null` until loaded), or expo-updates' native startup.
- H2: upgrade-data failure. Real build-4 data hits the new read paths at launch (context revive, `refreshHabits`). Dev-mode testing with legacy-seeded data passed, but Hermes release optimization can surface undefined-access latent in dev.
- H3: a stale/mismatched EAS Update applied on first launch (channel `production`, fingerprint policy). Unlikely because no update was published this cycle, but cheap to rule out.

## Diagnosis plan (run D1 and D2 in parallel; D1 is the decisive one)

- D1 (Charen, 2 minutes): on the iPhone, Settings > Privacy & Security > Analytics & Improvements > Analytics Data > newest `HabitCents-….ips` file > share it into the session. The exception type + top frames split H1/H2/H3 immediately. Symbolicate if needed with the dSYM from the EAS build page for `d4152ed7`.
- D2 (agent): local release repro, fresh data:
  `cd mobile-app && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --configuration Release --device <booted sim UDID>`
  (Locale vars are mandatory on this machine or pod install dies with an ASCII-8BIT error; see memory/native-build-locale-fix.) Build 4's crash reproduced under exactly this configuration, and this is the config gate that was skipped for build 5.
- D3 (agent, only if D2 fresh launch is clean): upgrade repro. Write legacy-format records (flat `recurrence` strings, no `recurrenceRule`) directly into the release app's AsyncStorage manifest (`Library/Application Support/com.habitcents.app/RCTAsyncLocalStorage_V1/manifest.json` inside the sim container), relaunch, watch launch + Money > Upcoming.
- D4 (agent, cheap): `eas update:list --branch production` and `eas build:view d4152ed7` — confirm no OTA exists that could have applied at first launch.

## Fix phase

1. Fix whatever D1/D2 point at. Expect a one-or-two-file change; do NOT refactor around it.
2. Verification gate, in order, all mandatory: `npx tsc --noEmit` clean; `npx jest` fully green (406); local RELEASE build boots, walks all four tabs, opens habit detail + paywall, logs an expense; then the D3 upgrade seed passes on the release build.
3. Lane 2 PR into main with the crash log excerpt + root cause in the description.
4. Bump to build 6, `eas build -p ios --profile production --auto-submit` (never an EAS Update: native modules changed in build 5).
5. Add the new standing rule to `design/REDESIGN_RUNBOOK.md` and the PR checklist: a local release-configuration boot test is REQUIRED before every `eas build` submit. Build 4 and build 5 both shipped crashes that a 10-minute local release run would have caught.

## Process notes for the executing session

- Work in a worktree off this branch (`fix/build5-launch-crash`), builder rules per ADR 0012.
- Opus for the debugging/fix work; Haiku for mechanical steps. Do not spend Fable.
- Log one line to umbrella `docs/runs.log` when the root cause is confirmed, and again when build 6 submits.
- Keep Charen's device untouched until the fix ships; all repro happens on the simulator.
