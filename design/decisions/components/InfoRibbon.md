# InfoRibbon (components/ui/InfoRibbon.tsx)

## Direction (current)
The one pattern for persistent positive communication: sage-light band, 1px sage-tinted border, sprout, one 12.5pt line in sage-dark. Two variants by whether `onDismiss` is passed: dismissible (X) for one-shot receipts, persistent (no X) for standing lines. Placement rule: inside a list section, below the content it comments on. (The original "never above an input" clause was positional shorthand for a top-anchored quick log; amended 2026-09-05 by ADR 0038, which docked the input at the bottom, leaving only the below-its-content half operative.) `FirstRunRibbon` re-exports it.

## States
Dismissible, persistent. Message and X are separate VoiceOver stops.

## Decisions
- 2026-09-04: generalized from FirstRunRibbon; Door 1's line moves under the logged-today list ahead of the watch nudge; Quiet's line is the persistent variant. Why: above the then-top-anchored input it read as an instruction; a dismissible placeholder leaves an empty card. ADR 0033. **AMENDED 2026-09-05** per the Direction note: the input is docked below everything now (ADR 0038).
- 2026-09-04: a gentle first-run line dismisses itself once the thing it waits for exists. Why: a line saying something false is worse than none. ADR 0033.
- Sage on a neutral line is accepted because the line is positive in tone; green stays positive-only (ADR 0005).

## Open
- Door 3's line on Kept still renders above the band, outside a list section.
- Two ribbons could stack (receipt plus quiet-day) only in theory; the quiet-day line renders only when no row exists, so they never co-occur. Keep it that way.

## Iterations
- 2026-09-04 d739f59: created; consumers Today (door1, door3) and LoggedTodayList.
