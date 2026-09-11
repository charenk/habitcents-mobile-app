# BeatMedia (components/onboarding/BeatMedia.tsx)

## Direction (current)
The media frame at the top of every onboarding beat: a portrait 9/16 card, capped at 380pt tall, holding a captured preview of the real app. It is the first thing a new user ever sees, so it carries the beat's promise before the headline does. Until the captures land it renders a labelled "Preview coming soon" frame, which is honest rather than finished (`design/onboarding-v3/CARRY-FORWARD.md`, Charen 2026-08-14).

## States
- **Pending**: no `asset` on the beat, so the frame renders empty with the "Preview coming soon" label. This is what production shows today: no beat in `OnboardingCarousel`'s `BEATS` carries an asset.
- **Poster**: `asset.poster` renders as an `Image` through the same `frame` style, `resizeMode="cover"`. Exercised only through the `beats` test seam so far.
- **Static**: a non-animating illustration, same frame.

## Decisions
- 2026-09-11 (QA loop): **the frame centres itself with `alignSelf`, rather than the beat centring its children.** Why: `frame` sets `width: '100%'` with `aspectRatio: 9/16` and `maxHeight: 380`. On a phone the height cap wins, so yoga shrinks the box below the full content width to hold the ratio, and the beat container sets `justifyContent` (main axis) with no `alignItems`, leaving the narrowed frame against the left gutter with roughly 140pt of dead space beside it while every other element in the beat spanned full width. Rejected: `alignItems: 'center'` on the beat container, which would also shrink-wrap and centre `headline` and `hook`, both of which rely on the container's default `stretch` to stay full-width and left-aligned. Scoping the fix to the component that owns the shape also means the real poster inherits it, since both branches render through the same style. QA finding 8.
- Both the poster and the pending placeholder share one `frame` style, so the shape cannot drift between the two.

## Open
- The captures themselves (`design/captures/onboarding-beats/RUNBOOK.md`) are still pending, and `expo-video` is deliberately not added because it is a native module and would force a fresh native build rather than an OTA. `BeatAsset.video` already carries the contract.

## Iterations
- 2026-09-11: frame centred (QA fix wave).
