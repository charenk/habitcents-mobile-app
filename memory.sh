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
