# Button (components/ui/Button.tsx)

## Direction (current)
Six variants, and every button in the app is one of them: primary (sage fill, white label), secondary (white, cloud border), tertiary (bare slate text), tertiaryBrand (bare sage text, empty-state CTAs only, ADR 0038), link (bare slate text, regular, 13pt, underlined; a disclosure that opens an explanation and changes nothing), destructive (bare coral) and destructiveFill. Feedback is a pressed background swap or an opacity dip, never a scale. Style keys are looked up by constructed name (`variant`, `variantPressed`, `variantLabel`), so every variant defines all three.

## States
Resting, pressed, disabled (cloud fill, slate label so the label stays readable, UX-047).

## Decisions
- 2026-09-07 (Charen): `link` is added, the first underlined text in the app. Why: Today's Kept zero state needed a trigger that reads as a different kind of thing from the sage CTA that can sit in the same stack; sage says "do the thing", an underline says "read about the thing". Regular weight and the secondary size keep it the quietest element on a pane; slate keeps it at 7:1 so quiet never means unreadable. Rule: `link` discloses, never acts. A control that writes data, navigates to a workflow or spends money is one of the other variants. Rejected: a colour or underline prop on `tertiary`, for the same reason `tertiaryBrand` is its own variant: a variant makes the distinction nameable, a prop makes it a judgment call per site.
- 2026-09-07: `textDecorationColor` is set explicitly to the label colour. Why: Android draws the rule in the text colour by default and iOS does too, but naming it keeps the platforms from ever drifting.
- 2026-09-05: `tertiaryBrand` added for the empty-state CTA (ADR 0038). Its rationale lives in the source comment.
- Ratified and unchanged: pressed feedback is a background swap or opacity, never a scale (`design/redesign-handoff/01-tokens-and-foundations.md`).

## Open
- `link` has one caller. If a second appears that is not a disclosure, the rule above is the thing under pressure.

## Iterations
- 2026-09-07: `link` variant. Pinned in `__tests__/actionDock.test.tsx`.
