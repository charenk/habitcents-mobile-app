# OnboardingCarousel (components/onboarding/OnboardingCarousel.tsx)

## Direction (current)
The two-door onboarding's paged beats: a horizontal `ScrollView` of full-width `beat` pages, each rendering `BeatMedia`, a headline, a hook, and a CTA into the door's real first workflow. Never a preview.

## States
One state per beat (Door 1 Leak Audit, Door 3 Break a habit); paging dots track the current index.

## Decisions
- 2026-09-05: `beat` itself stays window width; a new `beatContent` wrapper inside it caps and centers at `layout.contentMaxWidth` (600pt) on tablet widths. Why: `beat` is the paging unit `handleScroll` measures scroll offsets against (dividing by that same `width`), so the shared cap cannot go on `beat` the way it goes into a plain `contentContainerStyle` elsewhere; it has to wrap only the content instead. Below the cap `beatContent` is a pass-through (`width: '100%'`), so phone rendering is unchanged. Same shape later reused for Today's pager (see modules/today.md). routine/ipad.

## Open
- `AuroraBackground.tsx` is a full-bleed decorative gradient strip behind the carousel, not content; left uncapped, on the item 5 tablet audit list (routine/ipad PLAN.md).

## Iterations
- 2026-09-05: `beatContent` wrapper added, capped at 600pt on tablet widths; `beat-content-<intent>` testID (routine/ipad).
