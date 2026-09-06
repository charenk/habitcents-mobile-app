# Insights (app/(tabs)/insights.tsx)

## Direction (current)
Where the money went, and which leaks are worth breaking. Two segments: This month is the ongoing read (leaks, where it went, pace), Leak finder is the one-off read of a bank statement the user already has. Insights never invents a number; a card that cannot answer honestly says so and waits (ADR 0022).

The Leak finder is not shipping yet (decision 0009). The scan code is whole and dormant behind `SCAN_FLOW_ENABLED`, and the segment is honest about that: a "Soon" badge on the tab, and a pane that says what is being built and asks the reader to help build it.

## States
Vocabulary (ADR 0034): **Zero** nothing ever happened here; **Live** data present.

- This month Zero: no expenses and no leaks, so the whole three-card stack is replaced by a pane-level empty state, 96pt exploded pie chart, "See where the month went". Reach: Persona new user.
- This month Live: LeaksCard, WhereItWentCard, PaceCard. Each carries its own in-card empty line rather than disappearing, so the shape of the screen is stable as data arrives.
- Leak finder Zero: no scan on file, the LeakFinderTeaser. Same 96pt magnifier and same hook ("Find the leaks you already have"), then what the leak finder will do, the research invitation, and "Count me in". Reach: every user, since the flow is dormant.
- Leak finder Zero, opted in: the CTA is replaced by a check and "You are on the list". Persisted, so the ask never repeats.
- Leak finder Live: ScanSnapshotCard, for an install that scanned before the flow went dormant. The figures stay; the footer drops "Run a new scan" and reads "Saved from your last scan."
- Leak finder indeterminate: while the stored summary or the opt-in is still loading the pane renders nothing at all, so no state flashes before a real answer lands.

## Decisions
- 2026-09-05: the segment is "Leak finder" with a "Soon" badge, and its Zero state is a dedicated teaser rather than an EmptyState. Why: the scan has technical and logistical problems that take real time, and wrapping it beats shipping it rough. The pane needs four things EmptyState deliberately does not carry (an explanation, a research invitation, a reward line, a remembered confirmation), so bending the primitive would have weakened the one-hook rule everywhere else. Decision 0009.
- 2026-09-05: the badge reads "Soon" on screen and "coming soon" to VoiceOver. Why: a segment carries about 148pt of content width, and "Leak finder" plus a two-word pill overflows at large text sizes. The phrase is not lost, it moves to the spoken label and the pane. Decision 0009.
- 2026-09-05: an existing scan snapshot keeps rendering in full. Why: ADR 0020 says kept until replaced, and the figures were true when they were computed. The pause is ours, not the user's, and hiding their own evidence would be the dishonest half of this change. Decision 0009.
- 2026-09-05: "Nothing uploads, ever" returns, in the teaser body. Why: it was retired from the Zero state (ADR 0037) on the grounds that the intake screen and the onboarding beat restated it. Both of those are now behind the flag, so this pane is the only place carrying the strongest trust line the scan ever had. Decision 0009.
- 2026-09-05: the segment wrapper's top margin drops 12 to 8, matching Money and Today. Why: it was the only one of the three not revisited after the shared-header migration, and the 4pt made the control visibly jump when switching tabs. ADR 0039.
- 2026-09-05: the leaks card's in-card empty state loses its title. Why: the card header already reads "Your leaks" and the title read "Your leaks will show up here" directly beneath it. The body is the half carrying the honest detection threshold. ADR 0039.
- 2026-09-05: both Zero states drop their body line and their CTA becomes text only. Why: one hook is the app standard now. Dropping the scan body is safe because "Nothing uploads, ever" is restated on the scan intake screen the CTA leads to, in the onboarding beat and in the intent picker. ADR 0037.
- 2026-09-05: both Zero states carry 96pt illustrations instead of the shared 28pt ChartLine glyph. Why: This month and First scan are different questions and rendered the same mark. ADR 0036.
- 2026-09-05: `scanEmptyTitle` ("Find the leaks you already have") was left untouched in the copy pass and used as the model for every other zero state. Why: it is the only line in the app that names a benefit the user already owns rather than an action they must take.
- 2026-09-05: the book became an exploded pie chart with one slice pulled out. Why: a book means reading, and the lessons section was deleted in Phase 2, so the art advertised a feature that does not exist. The pulled slice draws the copy literally. ADR 0036.
- 2026-09-05: `monthEmptyTitle` became "See where the month went". Why: "Your first insights are a few logs away" measured the distance to value instead of naming it.
- In-card empty states (leaks, where it went, pace) stay text-only, no art. Why: an illustration inside a card competes with the card it sits in; the pane-level mark is the one that earns the space.
- Pace and Where it went carry no CTA. Why: they resolve with time and data, not with a tap, and a button there would be a lie about what the user can do.

## Open
- The This month pie is lavender, which the palette reserves for the habit arc and premium. It is the one illustration whose colour claims a meaning on a surface that does not own it. Low severity: a pie chart is unambiguous enough that the hue reads as decoration. Watch it on the device pass.

## Iterations
- 2026-09-05: illustrations on both Zero states, `monthEmptyTitle` rewritten. ADR 0036.
- 2026-09-05: First scan became Leak finder with a coming soon badge; the Zero state became LeakFinderTeaser with a local interest capture; the snapshot footer's re-scan action went behind `SCAN_FLOW_ENABLED`. Decision 0009.
