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

# --- Added 2026-08-07 (phase DI: multi-branch simulator verification + scan eval) ---
# Per-branch simulator check without rebuilding (JS-only branches; one debug build serves all):
# git checkout --detach origin/<branch>            # in the REAL checkout (Metro cannot follow worktree symlinks)
# lsof -ti :8081 | xargs kill                      # free the Metro port first
# nohup npx expo start --port 8081 &               # Metro from the real checkout
# xcrun simctl terminate booted com.habitcents.app; xcrun simctl launch booted com.habitcents.app
xcrun simctl io booted screenshot out.png          # capture for PR what-to-test comments
npm test -- leakScanEval                           # scan pipeline eval harness (fixtures + scores)
# Real bank exports go ONLY in __tests__/leakScanEval/private/ (gitignored; verify with git check-ignore)

# --- Added 2026-08-13 (UX/UI audit + remediation: seeding + leak-scan sim testing) ---
# Seed rich demo data without branch surgery: Profile > Developer > "Persona: returning user" in-app.
# Copy an eval fixture CSV into every simulator app-group storage dir, then deep-link straight to intake:
# D=<simulator-udid>
# for dir in ~/Library/Developer/CoreSimulator/Devices/$D/data/Containers/Shared/AppGroup/*/File\ Provider\ Storage; do
#   cp __tests__/leakScanEval/fixtures/*.csv "$dir"/
# done
# xcrun simctl openurl $D "habitcents://leak-scan"   # tap through the "Open in HabitCents?" prompt
#
# Verify design/audit/UXUI_AUDIT.html's embedded findings array parses and has no duplicate/gap ids:
# node -e "const fs=require('fs');const h=fs.readFileSync('design/audit/UXUI_AUDIT.html','utf8');const m=h.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);const a=m[1].match(/const F = (\[[\s\S]*?\]);\n\nconst DIMS/);const F=eval(a[1]);const ids=F.map(f=>f.id);console.log('findings',F.length,'unique',new Set(ids).size===ids.length,'resolved',F.filter(f=>f.res).length);"

# --- Added 2026-09-04 (TestFlight from agent + routine watching) ---
npx eas-cli build -p ios --profile internal --non-interactive --no-wait --auto-submit   # TestFlight build, agent-permitted lane (ADR 0029)
npx eas-cli build:view <build-id>                  # build status
npx eas-cli submit:list --platform ios --limit 1   # submission status; "in queue" 30+ min is normal before upload
npm run ota:check -- <base> <head>                 # OTA vs native-build eligibility for a merged range
# Cloud routines (workers on routine/* branches + Fable 5 orchestrator): manage at https://claude.ai/code/routines
# Their state lives on-branch at docs/routines/PLAN.md and docs/routines/HANDOFF.md; daily board = "Routine status board" GitHub issue

# --- Added 2026-09-06 (leak scan dormancy gate + build 21 lane) ---
grep -rn SCAN_FLOW_ENABLED app components utils     # the COMPLETE set of leak-scan gates (same discipline as DEV_MENU_ENABLED)
# EXPO_PUBLIC_SCAN_FLOW=1                            # put in a local .env to wake the whole scan flow for rework
#   Off by default everywhere, dev included, on purpose: local Metro should show what TestFlight shows.
#   eas.json pins "0" on internal and production so a stray shell var cannot re-open it.
grep -rn "'/leak-scan'" app components               # entry points; the only one left is the gated re-scan button
npm run ota:check -- <base-sha> origin/main          # OTA vs native build; ANY eas.json edit forces a native build
# Build 21 lane (agent-permitted, ADR 0029; production stays human):
# npx eas-cli build -p ios --profile internal --non-interactive --no-wait --auto-submit
npx eas-cli build:list --platform ios --limit 3 --non-interactive --json   # build number, status, gitCommitHash
npx eas-cli submit:list --platform ios --limit 3 --non-interactive 2>/dev/null   # watch the ASC submission leg

# --- Added 2026-09-06 (navigation wave: grayscale gate, pager verification, branch hygiene) ---
# ADR 0037 GATE. The tab bar's selected state must survive desaturation (active sage vs
# inactive mist is only 1.12:1), so any change to TabBarIcon reruns this before merging:
# xcrun simctl io booted screenshot shot.png
# sips -c 210 1179 --cropOffset 2290 0 shot.png    # crop to the tab bar (iPhone 16, 1179x2556)
# sips --matchTo '/System/Library/ColorSync/Profiles/Generic Gray Profile.icc' shot.png
# Then look: the selected tab must be obvious with no colour at all.
xcrun simctl ui booted content_size accessibility-extra-extra-extra-large  # then relaunch; labels must stay whole words
xcrun simctl ui booted content_size medium                                 # reset afterwards
#
# Segment pagers ARE drivable from the agent side (native ScrollView paging, unlike a JS
# PanResponder). Keep swipe start/end >4pt from the screen edges or the OS eats the gesture:
# simulator swipe x 340 -> 50 at mid-pane height = one page forward.
# Verify per screen: swipe advances the control, a tap slides the pager, a vertical drag inside
# a pane does NOT move the pager (directionalLockEnabled), each pane keeps its scroll position,
# and a swipe past the last segment BOUNCES (cross-page swipe is rejected, see SegmentPager.md).
#
# BRANCH HYGIENE. A squash merge leaves its source branch looking permanently unmerged, because
# the squash commit has a different identity. `git log main..branch` will lie; diff CONTENT instead:
# git diff --stat origin/main <branch>              # what main has that the branch lacks, and vice versa
# git diff --stat <squash-sha> <branch>             # EMPTY = the branch is exactly what was merged
# List every local branch still holding commits off main (re-run after each cleanup, the list grows):
# for b in $(git for-each-ref --format='%(refname:short)' refs/heads/); do n=$(git rev-list --count origin/main..$b); [ "$n" != "0" ] && echo "$b: $n"; done
# Before deleting: record SHAs (unreferenced commits survive ~90 days), and check nothing is checked
# out in a worktree, which is easy to miss when several Claude sessions run at once:
# git worktree list
# git push origin --delete <branch> ...             # remote too; local -D alone leaves it on GitHub
