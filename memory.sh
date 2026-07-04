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
