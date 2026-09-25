# BeatMedia (components/onboarding/BeatMedia.tsx)

## Direction (current)
The media frame at the top of every onboarding beat: a portrait 9/16 card, capped at 380pt tall, holding a captured preview of the real app. Above the accessibility text-size threshold it stops being a portrait card and becomes a full-width 120pt band, so the headline, hook and CTA keep the screen. It is the first thing a new user ever sees, so it carries the beat's promise before the headline does. Until the captures land it renders a labelled "Preview coming soon" frame, which is honest rather than finished (`design/onboarding-v3/CARRY-FORWARD.md`, Charen 2026-08-14).

## States
- **Band**: at any of the five accessibility text sizes, the frame drops `aspectRatio` and takes a fixed 120pt height at full width. Orthogonal to the three below: each of them renders in this shape at those sizes. Reach: `xcrun simctl ui <device> content_size accessibility-medium`, relaunch, then `habitcents://onboarding/welcome`.
- **Pending**: no `asset` on the beat, so the frame renders empty with the "Preview coming soon" label. This is what production shows today: no beat in `OnboardingCarousel`'s `BEATS` carries an asset.
- **Poster**: `asset.poster` renders as an `Image` through the same `frame` style, `resizeMode="cover"`. Exercised only through the `beats` test seam so far.
- **Static**: a non-animating illustration, same frame.

## Decisions
- 2026-09-17 (onboarding audit): **at accessibility text sizes the frame gives up its portrait ratio for a fixed 120pt full-width band.** Why: the card's width is derived from its height, so a frame short enough to leave the CTA on screen is also narrow, about 90pt at AX3, too narrow to hold its own pending label and far too narrow to read a recording of a phone screen in. Dropping the ratio keeps the full column width and spends the saved height on the text and the button. The height is a constant rather than a shrink curve because what it has to buy is one specific thing, room for the CTA at AX1 without a scroll; a proportional shrink left it about 90pt short there (walked on the simulator). Rejected: hiding the frame entirely at AX sizes, which is defensible for a placeholder but would silently apply to the real captures too and should be a call made with them in hand; shrinking by `flexShrink` alone, which cannot know how much room the text needs. Paired with the beat becoming a scroller, which is what catches AX4 and AX5 where no frame size leaves the CTA on screen. See [OnboardingCarousel](OnboardingCarousel.md).
- 2026-09-17: **the pending label caps at `CHROME_MAX_FONT_SCALE`.** Why: it says what is missing, which makes it chrome under `utils/textScale` rule 1, and uncapped it is what pushed itself out of its own frame once the frame started shrinking.
- 2026-09-11 (QA loop): **the frame centres itself with `alignSelf`, rather than the beat centring its children.** Why: `frame` sets `width: '100%'` with `aspectRatio: 9/16` and `maxHeight: 380`. On a phone the height cap wins, so yoga shrinks the box below the full content width to hold the ratio, and the beat container sets `justifyContent` (main axis) with no `alignItems`, leaving the narrowed frame against the left gutter with roughly 140pt of dead space beside it while every other element in the beat spanned full width. Rejected: `alignItems: 'center'` on the beat container, which would also shrink-wrap and centre `headline` and `hook`, both of which rely on the container's default `stretch` to stay full-width and left-aligned. Scoping the fix to the component that owns the shape also means the real poster inherits it, since both branches render through the same style. QA finding 8.
- Both the poster and the pending placeholder share one `frame` style, so the shape cannot drift between the two.

## Open
- The band height is tuned to the iPhone 16's 852pt. It has not been checked on a 667pt phone (SE) at AX1, where the same 120pt may still be too much. The portrait card carries `flexShrink: 1` for that case; the band does not.
- Whether the media should appear at accessibility sizes at all is worth revisiting once the real captures exist: a 120pt band of a portrait phone recording is a cropped middle strip. Decided as "shrink, do not hide" while the content is a placeholder.
- The captures themselves (`design/captures/onboarding-beats/RUNBOOK.md`) are still pending, and `expo-video` is deliberately not added because it is a native module and would force a fresh native build rather than an OTA. `BeatAsset.video` already carries the contract.

## Iterations
- 2026-09-17: accessibility band + capped pending label (onboarding audit, Dynamic Type fix).
- 2026-09-11: frame centred (QA fix wave).
