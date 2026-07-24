#!/usr/bin/env bash
# HabitCents Mobile App: command reference.
# Not meant to be run end-to-end; copy the line you need.

# --- Setup ---
npm install                 # install dependencies

# --- Dev ---
npm start                   # Expo dev server (choose platform in the CLI)
npm run ios                 # open iOS simulator
npm run android             # open Android emulator
npm run web                 # run in the browser
npm run lint                # lint

# --- Later: instrumentation (per decision 0001) ---
# npx expo install posthog-react-native   # add PostHog SDK when wiring Phase 2

# --- Added 2026-07-04 (P2-3/P2-6 era) ---
npm test                                   # jest suite (59 tests)
npx tsc --noEmit                           # type-check (run before done, always)
npx expo start -c                          # restart bundler with cleared cache (required after .env changes)
curl -s http://localhost:8081/status       # "packager-status:running" = Metro is up (white screen on device = Metro down)
# Device build (Expo Go store app only runs the newest SDK):
# export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8   # CocoaPods needs UTF-8
# npx pod-install                              # after prebuild/native dep changes
# xcrun xctrace list devices                   # find the iPhone UDID (names have curly apostrophes; use UDID)
# npx expo run:ios --device <UDID>             # build + install to the connected iPhone
# open ios/HabitCents.xcworkspace              # Xcode path (never open the .xcodeproj; pods live in the workspace)

# --- Added 2026-07-24 (EAS / TestFlight, BET-002; project already bound: @charen/habitcents) ---
npx eas-cli whoami                             # confirm Expo login (auth is global in ~/.expo, not per-directory)
# npx eas-cli login                            # interactive login (email+password, or --sso browser flow); AI cannot run this
# npx eas-cli init                             # one-time: writes extra.eas.projectId + owner into app.json
npx eas-cli env:list production                # list EAS env vars for an environment
# npx eas-cli env:create --environment production --name NAME --value VAL --visibility sensitive --type string --non-interactive
#   (deprecated alias; newer form: eas env:set)  EXPO_PUBLIC_* vars embed in the client bundle by design.
npx eas-cli build:list --platform ios --limit 1 --non-interactive   # check latest iOS build status
# --- Interactive (Charen runs these in his own terminal; keep phone handy for Apple 2FA) ---
# npx eas-cli build --platform ios --profile production   # first build: say yes to generate dist cert + provisioning profile
# npx eas-cli submit --platform ios --latest              # first submit: EAS auto-creates + stores an ASC API Key (App Manager)
# --- Every build after the first: one command (build number auto-increments) ---
# npx eas-cli build -p ios --profile production --auto-submit
# EAS_BUILD_NO_EXPO_GO_WARNING=true            # silence the benign "Expo Go not recommended for production" warning
