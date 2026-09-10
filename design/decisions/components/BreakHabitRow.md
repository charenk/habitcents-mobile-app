# BreakHabitRow (components/today/BreakHabitRow.tsx)

## Direction (current)
The Kept pane's dock content: the break-habit affordance, on the same [DockCard](DockCard.md) structure as the Spent pane's quick log, in its own skin: the dashed tone (the app's "add another" edge) and an unfilled plus with a sage glyph. Border only since 2026-09-10, so the dashed edge is the whole button: one line of semibold sage label sitting on the pane with no fill behind it, no caption under it, and the round plus on the right unfilled to match. Both halves open the break sheet, or the paywall at the free ceiling. It is the single re-entry point in both the empty and populated Kept views.

## States
- Zero habits: "Break your first habit".
- One or more, including at either ceiling: "Break another habit". One line, always, inside the fixed 44pt field.
- Pressed (either half): cloud fill appears under the label or the plus, and goes on release.
- The free ceiling is no longer a visual state here. The tap still routes to the paywall; nothing on the dock forewarns it.

## Decisions
- 2026-09-10 (Charen): the free-plan caption is gone. Why: growth copy on a dock nobody has pressed against is a limit announced before anyone has met it. It belongs where a user has actually reached for a second habit, and two surfaces already carry it there: the gate card inside [PickOneSheet](../../../components/habit-logging/PickOneSheet.tsx) and BreakHabitSheet, and the paywall this affordance routes to. **Supersedes the ADR 0038 narrowing**, which had already cut the caption back from "any free user" to "only at the ceiling"; this finishes the same argument. `strings.habitLogging.freeTierNote` stays, because those two sheets still use it. The `caption` prop, its line-height constant, and the comma-joined spoken name go with it.
- 2026-09-10 (Charen): no fill behind the label, none behind the plus. Why: a snow slab inside a dashed snow-grey outline was two containers doing one container's job, on the affordance whose whole point is to be the quieter of the two docks. The dashed edge now carries it alone. The pressed swap to cloud stays on both halves; see [DockCard](DockCard.md) for why feedback survived the fills.
- 2026-09-07 (Charen, later the same day): the dashed edge comes back and the plus goes plain. Why: on the device, the solid sage version read as a second add-expense composer one swipe from the first. Same structure, field, button and 74pt height as Spent; only the skin differs. See [DockCard](DockCard.md) for the tone mechanics and the height compensation. Reverses the "solid shell" half of the line below.
- 2026-09-07 (Charen): extracted from inline JSX in `app/(tabs)/index.tsx` onto DockCard, and the dashed border leaves the dock. Why: one swipe from the quick log it was a different shape at a different height, and Charen asked for the two docks to be one structure. Dashed still means "add another" inside content (UpcomingList's add row, Today's watch nudge); a composer's primary action should not read as a tentative placeholder. Rejected: keeping the dashed edge at the shared height and pill radius, which Charen declined in favour of one solid shell. **PARTLY REVERSED the same day, above: the structure stayed, the dashed edge returned once the solid version was seen in place.**
- 2026-09-07: label colour `theme.primary` to match the plus glyph beside it (now the plain plus's sage glyph rather than its fill). The inline row used `primaryDark`, which since ADR 0027 is the same hex under another name; naming the role it now plays is the change, not the colour.
- 2026-09-07: the caption fits inside the fixed field rather than growing it. Why: the whole point of the shared shell is equal height in every state, and the ceiling is a state. Label 18 + caption 15 + 2pt gap is 51.5pt at the 1.5 cap, pinned by `__tests__/dockGeometry.test.tsx`.
- Ratified and unchanged: label by state and caption only at the ceiling (ADR 0038), the plus hidden from assistive tech with the caption folded into the field's spoken name (UX-055).

## Open
- At XXXL a long label is `numberOfLines={1}` and ellipsises rather than wrapping; "Break your first habit" fits the field on an iPhone 16 with room to spare, a narrower device is unverified.

## Iterations
- 2026-09-10: caption removed (prop, style, constant and spoken name), both halves unfilled at rest, field 52 to 44 with the shell at 66. Geometry and Today tests rewritten onto the caption-free dock.
- 2026-09-07 (later): dashed tone and plain plus.
- 2026-09-07: created from the inline affordance; styles `breakAnother*` removed from index.tsx.
