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
- D4 (agent, cheap): `eas update:list --branch production` and `eas build:view d4152ed7`: confirm no OTA exists that could have applied at first launch.

## Fix phase

1. Fix whatever D1/D2 point at. Expect a one-or-two-file change; do NOT refactor around it.
2. Verification gate, in order, all mandatory: `npx tsc --noEmit` clean; `npx jest` fully green (406); local RELEASE build boots, walks all four tabs, opens habit detail + paywall, logs an expense; then the D3 upgrade seed passes on the release build.
3. Lane 2 PR into main with the crash log excerpt + root cause in the description.
4. Bump to build 6, `eas build -p ios --profile production --auto-submit` (never an EAS Update: native modules changed in build 5).
5. Add the new standing rule to `design/REDESIGN_RUNBOOK.md` and the PR checklist: a local release-configuration boot test is REQUIRED before every `eas build` submit. Build 4 and build 5 both shipped crashes that a 10-minute local release run would have caught.

## Round 2 findings (2026-08-03, Opus). Status: root cause NOT confirmed, crash not reproducible locally

### The first local release repro was invalid

`ios/` is gitignored and was prebuilt **2026-07-03**, before commit 517907a added `updates.url` to `app.json`. So the generated `Expo.plist` still had `EXUpdatesEnabled=false`, and the release build that "passed" never ran expo-updates at all: the exact subsystem the crash log points at. It also shipped no `EXUpdates.bundle/app.manifest`.

Re-ran after `npx expo prebuild -p ios --clean`. The regenerated `Expo.plist` has `EXUpdatesEnabled=true`, `EXUpdatesURL`, `EXUpdatesRuntimeVersion=file:fingerprint`, and the built `.app` now carries `EXUpdates.bundle/app.manifest` (42 assets) and `EXUpdates.bundle/fingerprint` = `843f117720eaf792e0f95b5fcd2f3ac9bc4e8ac8`, **identical to the Runtime Version EAS reports for build 5**. The local build is therefore a faithful replica of build 5's inputs.

**It still boots clean.** Verified on the release build: Today, Money (Spent and Upcoming), Insights, Categories, settings sheet, paywall. Then seeded legacy build-4-shaped AsyncStorage (`@habitcents_onboarded='true'`, flat `recurrence` strings with no `recurrenceRule`, ionicon-name category icons) and relaunched: boots to Today, Money > Upcoming projects Gym weekly/Car wash biweekly/Rent + Netflix monthly correctly, no duplicates, no crash. `npx tsc --noEmit` clean, `npx jest` 406/406.

### Ruled out with evidence

- **Stale OTA (H3).** `eas update:list --branch production` returns zero update groups. Nothing could have applied at first launch.
- **expo-updates config / embedded manifest (B2).** Config now matches EAS exactly, manifest and fingerprint present, app launches.
- **Toolchain drift.** Both build 4 (working) and build 5 (crashing) were built on `macos-sequoia-15.6-xcode-26.0`, Xcode 26.0. Not a variable.
- **Dependency drift.** Diffing the CocoaPods install lines out of both EAS build logs, the entire native delta from build 4 to build 5 is `+ RNSVG 15.12.1` and `+ ExpoLinearGradient 15.0.8`. All 92 other pods are identical versions.
- **Upgrade data (H2)** on iOS 18.3: passes, see above.
- **expo-updates as the cause.** Build 3 (commit 517907a) introduced expo-updates and build 4 shipped with it and works on the same device.

### What the crash log actually says

Both `.ips` files are the same crash. The four app frames (`+304160`, `+299544`, `+298968`, `+95796` under `-[NSException raise]`, on `expo.controller.errorRecoveryQueue`) match, frame for frame, expo-updates' own re-raise path: a dispatched block into `ErrorRecovery.runNextTask()` -> `ErrorRecovery.crash()` -> `StartupProcedure.throwException(_:)` -> `exception.raise()`. `ErrorRecovery.crash()` rethrows `encounteredErrors.first`, i.e. **the original RCT fatal, unchanged**. expo-updates is the messenger, not the cause.

Timing from `procStartAbsTime`/`procExitAbsTime` at 24 MHz: first crash **1.33 s** after launch (the primary), second crash **0.209 s** (the cascade, after the first launch was marked failed in the updates database; thread 5 is caught mid-`sqlite3_step` writing that marker). At the moment of death the JS thread is idle in its runloop and the Hermes GC thread exists, so the runtime came up and then something fataled before `RCTContentDidAppear`.

**The NSException reason string is what names the root cause, and iOS 26 strips it from the `.ips`.** Without it, any fix is a guess.

### Why it cannot be reproduced here

The only variables left between the local replica and the crashing build are the **iOS 26.5.2 device runtime vs the iOS 18.3 simulator**, device arm64 vs simulator arm64, and App Store re-signing/thinning. Local Xcode is 16.2 and ships only the iOS 18.3 simulator runtime, so an iOS-26-only failure is untestable on this machine. The native delta (`react-native-svg`, `expo-linear-gradient`) is the prime remaining suspect precisely because it is the only thing build 5 added below the JS line.

### Next step, and it is Charen's (2 minutes)

Plug the iPhone into the Mac, open **Console.app**, select the device, filter on `HabitCents`, then launch build 5. The line to capture is:

```
*** Terminating app due to uncaught exception '<NAME>', reason: '<REASON>'
```

That string names the failing module and, if it is an `RCTFatalException`, carries the JS stack. Paste it into the session. Until then this incident stays open and build 6 must not ship, because there is nothing to fix yet.

Alternative if Console.app is awkward: expo-updates persists its own log at `Library/Application Support/dev.expo.modules.core.logging.expo-updates.txt` inside the app container, and it records the error with its reason. Reaching it needs either a development build or `UIFileSharingEnabled`, so Console.app is the cheaper path.

## Process notes for the executing session

- Work in a worktree off this branch (`fix/build5-launch-crash`), builder rules per ADR 0012.
- Opus for the debugging/fix work; Haiku for mechanical steps. Do not spend Fable.
- Log one line to umbrella `docs/runs.log` when the root cause is confirmed, and again when build 6 submits.
- Keep Charen's device untouched until the fix ships; all repro happens on the simulator.
