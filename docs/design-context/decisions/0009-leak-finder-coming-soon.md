# 0009. The leak scan is wrapped as coming soon and goes dormant behind a flag

- **Date:** 2026-09-05
- **Status:** Accepted
- **Area:** Product / Design / Engineering
- **Deciders:** Charen

## Context
The Leak Scan (P2-1b, decision 0003) shipped in Phase 2: a nine-stage on-device CSV pipeline, an intake flow with at most two disambiguation questions, a results ladder, a personal rule store, and 273 tests. It is reachable from four places: the onboarding carousel's scan beat, a cold-start resume for a persisted `statements` door, the Insights first scan empty state, and the snapshot card's "Run a new scan".

The first scan and "Scan my statement" flow has technical and logistical problems, and the increments needed to fix them properly would take real time. Shipping it as it stands means a first impression built on the weakest surface in the app, on the exact path a new user is invited down during onboarding.

## Decision
Wrap the first scan as coming soon rather than ship it rough, and turn the pause into research recruitment.

1. `SCAN_FLOW_ENABLED` (`utils/scanFlow.ts`) gates the flow, set by `EXPO_PUBLIC_SCAN_FLOW` and explicitly "0" on the `internal` and `production` EAS profiles. `app/leak-scan.tsx` keeps the whole flow compiled and redirects to Insights when the flag is off.
2. Insights' "First scan" segment becomes "Leak finder" with a "Soon" badge, and its zero state becomes `LeakFinderTeaser`: the same art and hook, what the leak finder will do, an invitation to help build it, and a "Count me in" button that records interest on device.
3. The onboarding carousel loses its scan beat and runs on two, plus Skip. The cold-start resume for a `statements` door goes with it.
4. Nothing is deleted. The pipeline, intake, results, rule store, bridge and all 273 tests stay; the flow's own tests run with the gate mocked on, so the preserved code cannot rot behind the flag.

Deliberately no `__DEV__` term in the gate, unlike `DEV_MENU_ENABLED`: what a developer sees running Metro should be what a TestFlight user sees. Resuming the rework is one line in a local `.env`.

## Alternatives considered
- Fix the scan now and ship it: the honest option, and the reason this is a wrap rather than a cut. Rejected on timing, not on merit.
- Delete the scan code and rebuild later: throws away a working pipeline with 273 tests over a UX and logistics problem, and guarantees the rebuild starts from nothing.
- Leave the flow reachable but hide the entry points: the route is file-based, so `habitcents://leak-scan` still resolves. That is the bug class that crashed build 5, which is why the route redirects rather than merely losing its links.
- Keep the scan beat in onboarding as a coming soon teaser: rejected. ADR 0026's rule is that every beat starts its real workflow, and a beat that cannot is exactly what that ADR forbids.
- Bend `EmptyState` to carry the teaser: rejected. It would make the one-hook rule (ADR 0037) negotiable for every other pane to accommodate one exception.

## Consequences
- A user meets an honest "not yet" instead of a flow that fails on their statement, and the app collects a list of people who want it.
- An install that already scanned keeps its snapshot in full (ADR 0020, kept until replaced); only the footer's re-scan offer and its "updated when you run a new scan" caption go, replaced by "Saved from your last scan."
- An install that updated mid-scan carries a `statements` door that no longer routes. It revives on the carousel, which is correct: the flow it would resume into is dormant.
- The analytics contract is unchanged. `onboarding_intent_selected`'s `scan` and `door_chosen`'s `statements` stay declared and simply stop firing, so the funnel remains readable across the change. One new event, `leak_finder_interest_recorded`, structural and payload-free.
- `expo-document-picker` stays a dependency; it is used only inside the dormant intake.
- Risk accepted: gated code is code nobody exercises by hand. Mitigated by the flow's tests running with the gate mocked on, and by the flag being one line to flip locally.

## Human gates cleared with this decision
- The reward line ("Join the research and you could win six months of HabitCents") is promotional wording touching pricing, and needs Charen's approval verbatim before merge.
- The new analytics event name and its empty payload need Charen's sign-off as an analytics contract change.
