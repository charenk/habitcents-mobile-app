# 0001. Feedback and instrumentation stack: PostHog + GitHub Issues

- **Date:** 2026-07-01
- **Status:** Accepted
- **Area:** Engineering / Product
- **Deciders:** Charen

## Context

HabitCents needs a way to collect user feedback and route it to an AI triage agent (the "solo founder flow"). Requirements: works in a React Native / Expo app, has an API/webhook so feedback can flow to automation, fits a pre-launch, pre-revenue, minimal-vendor budget. The mobile app currently has zero telemetry (no analytics, no crash monitoring) and no feedback channel exists anywhere.

Research (July 2026) surfaced the deciding constraint: on the polished public-board tools, the API/webhooks needed for automation sit behind the expensive tier. Canny API is Pro only ($79/mo yearly) and scales by tracked users; Featurebase API is Professional ($59/seat/mo). Paying $59 to $79/mo for automation before having a single user is premature.

## Decision

Start lean with two tools already in the stack, defer a public voting board until there is user volume:

1. **PostHog** for in-app feedback and surveys (React Native SDK, free tier is generous: ~1,500 survey responses/mo, plus 1M analytics events, session replay, feature flags, error/crash tracking, API/webhooks). One vendor covers instrumentation AND feedback capture.
2. **GitHub Issues** as the triage store and the target the AI agent writes to (free, native API/webhooks, lives where the code is).
3. **Public voting board: deferred.** When beta-user volume makes voting meaningful, add Featurebase (best free board, upgrade to $59 Pro only when the API/MCP is actually needed). Reserve Canny for if the integration ecosystem is later worth $79/mo.

## Alternatives considered

- **Canny:** best integration ecosystem, but API is $79/mo and pricing scales by tracked users. Too costly pre-launch.
- **Featurebase:** strongest free public board (unlimited submitters), but API/webhooks require $59/seat/mo. Kept as the future board of choice.
- **UserJot / Frill:** flat or low monthly board pricing ($25 to $29), but still a paid vendor for something not yet needed.
- **Fider (self-host):** free public board with an API, but adds hosting/ops the solo founder would maintain.
- **Sentry (crash) as a separate tool:** not needed initially since PostHog covers error tracking; avoids a second vendor.

## Consequences

- **Easier:** $0/mo to start; automation-ready immediately (PostHog + GitHub both have free APIs); vendor count stays minimal; instrumentation gap (analytics + crash) is closed by the same choice.
- **Harder / later:** no public community voting board yet, so community-driven prioritization waits. Migrating to a dedicated board later means wiring a second intake source into the triage agent.
- **Revisit when:** beta users exist and community feature-voting would add value, or PostHog free limits are exceeded. At that point, evaluate Featurebase Pro.
