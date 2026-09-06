# LeakFinderTeaser (components/insights/LeakFinderTeaser.tsx)

## Direction (current)
The Leak finder pane while the scan is dormant. It has one job beyond honesty: turn a feature that is not ready into a reason to talk to the people who would use it. Art, the unchanged hook, what the leak finder will do, the research invitation, one button. Nothing here invents a date, a number, or a promise the app cannot keep.

Deliberately not an EmptyState. That primitive is art, one hook, a text link (ADR 0037), and this pane carries four more parts. It borrows the proportions (96pt art, 12pt centered stack, fill padding) so switching segments does not feel like switching apps.

## States
- Unrecorded: the reward line and a "Count me in" primary button. Reach: Insights, Leak finder segment, on a device that has never opted in.
- Recorded: the button is replaced by a sage check and "You are on the list", with a one-line receipt. Persisted, so the ask never repeats. Reach: tap the button once, or relaunch after tapping it.
- The pane renders nothing at all while the opt-in is still loading, so the button never flashes at someone who already tapped it.

## Decisions
- 2026-09-05: the opt-in is local. A tap writes one timestamp on device and fires one structural analytics event, and that is the whole mechanism. Why: the app makes no network calls beyond PostHog, and a research sign-up is not a good enough reason to open one. The recruiting happens outside the app; this only has to count hands and remember whose is up. Decision 0009.
- 2026-09-05: the hook stays "Find the leaks you already have", unchanged from the Zero state it replaces. Why: it is still the only line in the app that names a benefit the user already owns rather than an action they must take. The promise did not change, the timing did.
- 2026-09-05: the reward line is ink and semibold, never sage. Why: green in this app means money the user kept. Using it to highlight an offer would spend the one colour that carries a meaning.
- 2026-09-05: no animation on the CTA-to-confirmed swap. Why: it matches the segmented control's own no-motion stance directly above it, and a state that swaps instantly needs no reduced-motion branch at all.
- 2026-09-05: the art is the same `insights-scan` magnifier the Zero state used. Why: the tab did not become a different thing; drawing new art for a pause would say it did.

## Open
- The reward line ("six months of HabitCents") is promotional wording and sits behind Charen's approval, not the implementation's. If the offer changes, this line and `leakFinderReward` change together.
- Nothing yet closes the loop with the people who opt in. The count is visible in analytics; reaching them is a manual step outside the app until the rework starts.

## Iterations
- 2026-09-05: created with the coming soon wrap. Decision 0009.
