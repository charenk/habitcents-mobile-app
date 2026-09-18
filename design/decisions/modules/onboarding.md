# Onboarding (app/onboarding/, components/onboarding/)

## Direction (current)
The app is the onboarding (ADR 0022, amended by 0026). One surface stands between install and the app: a three-beat, hook-first carousel (break, track, bills; arc v2, 2026-09-18) whose CTAs start the real workflows, never a preview or a practice run. Every route after that beat is the app itself, so there is no chain of onboarding screens to maintain and no simulated UI to drift.

Onboarding completes at the first terminal action in the real app, whichever way it goes: the first expense saved, the first habit started, or the sheet dismissed without either. Nothing traps the user, and nothing here ever shows an invented total.

The reason the flow is this shape rather than a resume table: build 5 crashed on a stale persisted step routing to a deleted screen. `currentStep` no longer routes anywhere. Whatever is stored, a cold start lands on the carousel and re-picking is an honest resume. `app/onboarding/intent.tsx` stays registered as a redirect so old deep links still resolve.

## States
- **Carousel**: the only onboarding destination. Reach: `habitcents://onboarding/welcome`, or Profile > Start over, or Profile > Persona: first run in a dev build.
- **Door 1, track**: `/(tabs)?view=spent&firstLog=1` opens the real log sheet over Today with a coach line. Saving fires `first_log_saved`, completes onboarding and queues the "Logged for real" ribbon plus the watch-nudge. Dismissing completes it gently instead.
- **Door 3, break**: `/(tabs)?view=kept&breakEntry=1` opens the real break sheet over Today. Starting a habit completes onboarding with `habitStarted`; dismissing completes it gently.
- **Bills door**: `/(tabs)/money?view=upcoming&billsEntry=1` opens the real add-bill sheet on Money > Upcoming. Any close, saved or dismissed, completes onboarding once; no ribbon (Money has none), the sheet's own toast confirms a save.
- **Skipped**: the ghost exit records `door: 'skip'` and lands on Today with no ribbon. Every empty state a skipper can reach is then an onboarding surface and must carry a concrete first action (`useEmptyStateAction`).
- All three door effects are guarded on `isOnboardingComplete()`, so a stale `firstLog=1`, `breakEntry=1` or `billsEntry=1` in history can never reopen a coach flow.

## Decisions
- 2026-09-18 (Charen, arc canvas round): **arc v2 adopted and built.** Hook-first three-beat carousel (break, track, bills), simplified copy, bills door onto Money > Upcoming opening the real add-bill sheet. The bills door completes onboarding on any close of its sheet, saved or dismissed alike: the saved/gentle split on doors 1 and 3 only ever fed ribbon copy, and Money has no first-run ribbon; recorded so the asymmetry reads as a choice.
- 2026-09-18 (Charen): **the leak card is adopted as the acquisition share artifact.** "MY LEAK / Food delivery. / $119.05 across 4 buys this month. / Found it. Breaking it." next to the built kept counter (which stays, as the retention-stage receipt). Design on the arc canvas's Viral moments page. Build dependency: the share screen, capture path and view-shot dependency live on routine/core-p3 (PR #132, behind the payments human gate), so the card component and its stats derivation can land on main but the wiring waits for #132; sessions never touch routine branches. The habit arc card (B) stays proposed, not adopted.
- 2026-09-17 (audit): **the flow is measured from the top.** `onboarding_carousel_shown` and `onboarding_beat_viewed` added, because `onboarding_started` only fires once a beat is picked and therefore could not serve as a denominator. See [OnboardingCarousel](../components/OnboardingCarousel.md).
- 2026-09-17 (audit): **the carousel survives the accessibility text sizes.** Beats scroll, the media frame becomes a band. Recorded in the two component files.
- 2026-09-05 (decision 0009): the scan beat leaves the carousel while the leak scan is dormant behind `SCAN_FLOW_ENABLED`. A beat whose CTA cannot start its real workflow is the one thing ADR 0026 forbids. The analytics enum keeps its `scan` member so the funnel stays readable across the change.
- 2026-08-14 (ADR 0026): the carousel replaces the welcome splash and the intent picker; beats show the real app recorded, never a hand-built scene. The aurora retires with the splash it decorated (`AuroraBackground.tsx` kept unreferenced as the documented revert path, the same way `darkTheme` is).
- 2026-08 (ADR 0020, 0022): the audit, reveal, guided-log and success screens are deleted. Breaking a habit happens in one sheet over the real app, and only an explicit "Yes, log it" ever writes an expense.

## Open
- **The beat media does not exist.** Two screen recordings and two stills, specified in `design/captures/onboarding-beats/RUNBOOK.md` and outstanding since 2026-08-14, are the whole content of the first screen. Charen is designing the media (2026-09-17). Until then the first thing a new user sees is a placeholder occupying about 45% of the screen.
- **Onboarding is consumable by accident.** A scrim tap on the break sheet permanently completes it, by design: nothing should trap a user. Profile > Start over is the way back, but that row reads as a data wipe rather than "show me the intro again". Worth a decision on whether the carousel is re-reachable and how it is named.
- **The break door asks five things and now leads the arc.** (Sharpened 2026-09-18: beat 1 sends new users straight into the heaviest sheet, so the trim below stopped being cosmetic.) The old CTA promise against: which habit, the amount, did you buy it today, how often, start. The bought-today question sits between the price and the cadence, breaking the promised order, and defaults silently to "Not today". Beat 1 asks for one number. Seen on the simulator at first-run, 2026-09-17.
- **The skip path gets no ribbon** while both pick paths do. Probably deliberate, never written down.
- The zero-state illustrations a skipper lands on are blue and orange in an all-green system. Carried on the punch list as a file swap in `assets/empty-states/`.
- The post-log Today screen leaves roughly 600pt of empty background between the logged row and the dock, immediately after the single most important moment in the flow.

## Iterations
- 2026-09-18: arc v2 built (design/onboarding-arc): beat reorder, copy pass, bills door, runbook updated to three captures.
- 2026-09-17: Dynamic Type fix and funnel events (onboarding audit); this file created.
- 2026-09-05: scan beat removed (decision 0009).
- 2026-08-14: carousel shipped (ADR 0026, PR #110, build 14).
