# Drawers (bottom sheets)

## Direction (current)
One sheet primitive, two families. **Form sheets** (log and edit expense, add upcoming, category, partial slip, skip value) head with `SheetHeader`: serif title left, one-word Save right, at most one icon action beside it, disabled until valid with a hint naming the missing thing (ADR 0028, 0031, 0033). **Decision sheets** (pick one, break habit, confirm) keep displayMid titles and thumb-zone CTAs. A finger anywhere across the top of a sheet drags it; the body keeps its own scroll. No in-sheet Cancel: handle, scrim, VoiceOver escape dismiss.

## States
- Open, dragging (1:1 under the finger), settling (spring), closing (220ms timing), reduced motion (opacity only).
- Form sheet: Save disabled (cloud fill, slate label, hint) / enabled; with or without the icon action.
- Keyboard up (iOS Done bar on the expense sheet).

## Decisions
- 2026-09-04: the handle and the pinned header share one drag zone (`Sheet` `header` prop). Why: the handle-only drag was a 36 by 5 target nobody found. Rejected: body drag when the scroll is at the top (fights the ScrollView, needs device testing; deferred). ADR 0033.
- 2026-09-04: every form-sheet Save reads "Save". Why: the title already names the sheet; the longer label wrapped at large text. ADR 0033.
- 2026-09-04: a form sheet may carry one icon action left of Save (44pt, tertiary, coral when destructive, 12pt gap, spoken label). First use: delete on the edit expense sheet, instant with Undo. Rejected: flush against Save (mis-tap), a confirm sheet (slower, Undo covers it), the bottom text row (kept for AddUpcoming until it gets the same pass). ADR 0033.
- 2026-09-04: chip rows on one sheet share one radius (pills). ADR 0033.
- 2026-09-04 (0031): Save lives in the header; decision sheets keep bottom CTAs. ADR 0031.
- 2026-08-16 (0028): disabled until valid, never toast on empty. ADR 0028.

## Open
- Drag-to-dismiss is unverified from the agent side: the simulator tooling never reaches a JS PanResponder. Needs a hand on a device, with and without Reduce Motion.
- AddUpcomingSheet still has its delete as a bottom text row; move it to the header icon for consistency.
- Decision sheets have the handle-only drag; extend the drag zone to their title block once the form sheets are confirmed on device.
- Body drag when the ScrollView is at the top.

## Iterations
- 2026-09-04 d739f59: header drag zone, one-word Save, header delete icon, pill merchant chips.
- 2026-09-04 (build 18): SheetHeader convergence across five sheets.
