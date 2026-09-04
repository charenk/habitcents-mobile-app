# Sheet (components/ui/Sheet.tsx)

## Direction (current)
The base bottom sheet: white panel, radius 20 top, grab handle, scrim, 220ms slide, spring settle after a drag. One PanResponder on the drag zone (handle plus the optional `header`), driving the same `progress` value the open and close timings drive; never a second animation driver on the panel.

## States
Closed, opening, open, dragging, settling, closing; reduced motion swaps the translate for opacity.

## Decisions
- 2026-09-04: `header` prop renders inside the drag zone under the handle. Why: a finger on the title row moved nothing. ADR 0033.
- Close rule: 25% of the panel height or a 0.5 px/ms flick; otherwise spring back (damping 22, stiffness 240, mass 0.8). Unchanged since UX-041.
- Grant reads the live `progress` so a mid-animation grab tracks from where the panel is.

## Open
- Drag unverified on device after the drag-zone change (see modules/drawers.md).
- Decision sheets still pass no header; their titles sit in the body.

## Iterations
- 2026-09-04 d739f59: drag zone wraps handle + header; `sheet-drag-zone` testID.
