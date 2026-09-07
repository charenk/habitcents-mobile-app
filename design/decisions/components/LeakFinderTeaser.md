# LeakFinderTeaser (components/insights/LeakFinderTeaser.tsx)

## Direction (current)
The Leak finder pane while the scan is dormant. It has one job beyond honesty: turn a feature that is not ready into a reason to talk to the people who would use it. Art, the unchanged hook, what the leak finder will do, the research invitation, one button. Nothing here invents a date, a number, or a promise the app cannot keep.

Deliberately not an EmptyState. That primitive is art, one hook, a text link (ADR 0037), and this pane carries four more parts. It borrows the proportions (96pt art, 12pt centered stack, fill padding) so switching segments does not feel like switching apps.

## States
- Unrecorded: the invitation line and a "Count me in" primary button. Reach: Insights, Leak finder segment, on a device that has never opted in.
- Recorded: both are replaced by the receipt, a sage check with "You're in" and what happens next. Persisted, so the ask never repeats. Reach: tap the button once, or relaunch after tapping it.
- The pane renders nothing at all while the opt-in is still loading, so the button never flashes at someone who already tapped it.

## Decisions
- 2026-09-06 (core-worker, routine/core-p3): **the six months can now actually be granted.** `utils/purchases.ts` gained a timed promotional grant layered on top of the free/mock/live `Entitlement`, stored dated and separately (`@habitcents_promo_entitlement`), so `getEntitlement()` reports `'premium'` while it is active regardless of the underlying mode. `activateLeakFinderPromoIfEligible()` is the one call site: eligible only once `SCAN_FLOW_ENABLED` is true AND the device has an opt-in on file, idempotent (never re-activates or extends an existing grant). Called at boot (`app/_layout.tsx`, alongside `hydrateEntitlement`) and again right after a fresh tap (`handleRecordInterest`, so an opt-in on a build where the flag is already on grants immediately rather than waiting for a relaunch). Why the flag rather than the tap: the receipt says the six months is saved AND unlocks when the feature is ready; starting the clock at opt-in would let a long dormancy quietly eat into the offer, which is the exact broken promise this was built to prevent. Fires a new structural, payload-free `leak_finder_promo_activated` event (D-9) once a grant lands, read against `leak_finder_interest_recorded` to see how much of the opt-in list the promo actually reached.
- 2026-09-06: the invitation and the receipt share one slot, never both. Why: the first version left "Join the research and you could win six months" above the confirmation, so a returning user was invited to join something they had already joined. The receipt carries the offer from then on.
- 2026-09-06: the receipt promises the outcome, not just the tap. "You're in / Your six months is saved. The leak finder unlocks right here when it's ready." Why: a returning user arrives with two questions, did my tap register and what do I get, and the old line ("the leak finder will land in this tab first") answered only the first.
- 2026-09-06: it deliberately does not say "we will contact you". Why: analytics is anonymous by contract (D-9, no `identify()`, payload-free event), so the app has no channel to reach anyone and no way to know who opted in. Unlocking in place is the one promise it can keep by itself.
- 2026-09-06 (Charen): everyone who opts in gets the six months, no draw. Why: with no backend, each device knows only about itself, so a draw could be neither run nor announced from inside the app. A promise to everyone is the only version that is deliverable.
- 2026-09-05: the opt-in is local. A tap writes one timestamp on device and fires one structural analytics event, and that is the whole mechanism. Why: the app makes no network calls beyond PostHog, and a research sign-up is not a good enough reason to open one. The recruiting happens outside the app; this only has to count hands and remember whose is up. Decision 0009.
- 2026-09-05: the hook stays "Find the leaks you already have", unchanged from the Zero state it replaces. Why: it is still the only line in the app that names a benefit the user already owns rather than an action they must take. The promise did not change, the timing did.
- 2026-09-05: the reward line is ink and semibold, never sage. Why: green in this app means money the user kept. Using it to highlight an offer would spend the one colour that carries a meaning.
- 2026-09-05: no animation on the CTA-to-confirmed swap. Why: it matches the segmented control's own no-motion stance directly above it, and a state that swaps instantly needs no reduced-motion branch at all.
- 2026-09-05: the art is the same `insights-scan` magnifier the Zero state used. Why: the tab did not become a different thing; drawing new art for a pause would say it did.

## Open
- The opt-in is device-local. A reinstall or Start over loses it, and with it the claim to the six months. Acceptable while the offer is generous rather than contractual; it would not be if the promise ever hardened.
- The offer wording is promotional and sits behind Charen's approval, not the implementation's. If it changes, `leakFinderReward` and `leakFinderConfirmedBody` change together, since both now state it.
- **Grant timing is a real call, built to the safer default, not yet Charen-ratified.** The clock starts when `SCAN_FLOW_ENABLED` flips true, not at the opt-in tap (see Decisions above and `utils/purchases.ts`'s `activateLeakFinderPromoIfEligible`). If Charen would rather it start at the tap, that is a one-line change (drop the flag check); in DECISIONS NEEDED on the core-p3 branch.

## Iterations
- 2026-09-06: the six months is now a real, dated grant (`utils/purchases.ts`), not just a promise. `__tests__/purchases.test.ts` (composition with `getEntitlement()`, storage round-trip) and the new `__tests__/leakFinderPromo.test.ts` (the `SCAN_FLOW_ENABLED` eligibility gate) cover it.
- 2026-09-06: invitation and receipt share one slot; the receipt states the outcome.
- 2026-09-05: created with the coming soon wrap. Decision 0009.
