# Drawers (bottom sheets)

## Direction (current)
One sheet primitive, two families, one structural pattern (Charen, 2026-09-10): pinned title in the drag zone, a Sheet-owned scrolling body, a pinned footer for bottom CTAs, and the panel clamped to at most 80% of the window - with the software keyboard up, clamped to the visible strip above it (utils/sheetLayout.ts), never pushed off the top. **Form sheets** (log and edit expense, add upcoming, category, partial slip, skip value) head with `SheetHeader`: serif title left, one-word Save right, at most one icon action beside it, disabled until valid with a hint naming the missing thing (ADR 0028, 0031, 0033). **Decision sheets** (pick one, break habit, confirm, currency, how it works) head with `SheetTitle` (displayMid + one caption line) and keep thumb-zone CTAs, now pinned in the footer slot. A finger anywhere across the top of a sheet drags it. No in-sheet Cancel: handle, scrim, VoiceOver escape dismiss.

## States
- Open, dragging (1:1 under the finger), settling (spring), closing (220ms timing), reduced motion (opacity only).
- Form sheet: Save disabled (cloud fill, slate label, hint) / enabled; with or without the icon action.
- Keyboard up: the panel shrinks to the strip above the keyboard, handle and title stay visible, the footer sits flush on the keyboard (iOS Done bar on the expense sheet rides the footer slot).

## Decisions
- 2026-09-11: **a scrolling body dissolves under the pinned header rather than being sliced on it.** `ui/ScrollFade` at `edge="top"`, 20pt, in the sheet's own white, wherever a sheet has both a header and a scrolling body. Why: the header's hairline cut whatever passed under it, and on a 40pt serif amount that reads as a rendering fault, not as content scrolling away. Same fade the Today panes use against the dock. See [ScrollFade](../components/ScrollFade.md).
- 2026-09-11 (Charen): **the two expense forms are one form.** AddUpcoming took the log sheet's anatomy: enclosed amount at the same density, identity section as a text field with presets under it, a real category rail, delete as the header's one icon action. Closes the open item ADR 0033 left behind ("the bottom text row, kept for AddUpcoming until it gets the same pass"), so destructive text rows at the bottom are now retired for BOTH form sheets. See [AddUpcomingSheet](../components/AddUpcomingSheet.md).
- 2026-09-11: **a form sheet never shows a control state its stored data does not support.** AddUpcoming preselected a day-of-month chip for legacy monthly rules that had never chosen one, so the sheet contradicted the list. No chip is selected in that state now, and a caption names the date the rule actually lands on. See [AddUpcomingSheet](../components/AddUpcomingSheet.md).
- 2026-09-10: a drawer never exceeds 80% of the window, keyboard included. Why: with the keyboard up the old KeyboardAvoidingView pushed tall sheets off the top with the handle invisible (Charen's device screenshot); the per-sheet 0.82/0.86 caps measured full window height and never bounded that case. One rule in utils/sheetLayout.ts replaces all of them; the keyboard lift is plain layout, never a second driver on the panel transform. Rejected: keyboard-controller/native modules (OTA boundary, ADR 0029), reanimated useAnimatedKeyboard (banned inside this Modal).
- 2026-09-10: Sheet owns the body scroll (`scrollable={false}` for FlatList bodies) and a pinned `footer` slot that owns the bottom inset, zeroed under the keyboard. Why: eight sheets hand-rolled the same body/scroll/footer; five had no cap or scroll at all (HowItWorksSheet overflowed at XXXL). Retires ExpenseSheet's negative-margin Done-bar hack.
- 2026-09-10: decision-sheet titles pin via `SheetTitle` in the drag zone. Why: the sticky-title rule applies to every drawer, and it closes the deferred extend-the-drag-zone item below. SheetHeader stays form-family-only so the two families stay two components.
- 2026-09-04: the handle and the pinned header share one drag zone (`Sheet` `header` prop). Why: the handle-only drag was a 36 by 5 target nobody found. Rejected: body drag when the scroll is at the top (fights the ScrollView, needs device testing; deferred). ADR 0033.
- 2026-09-04: every form-sheet Save reads "Save". Why: the title already names the sheet; the longer label wrapped at large text. ADR 0033.
- 2026-09-04: a form sheet may carry one icon action left of Save (44pt, tertiary, coral when destructive, 12pt gap, spoken label). First use: delete on the edit expense sheet, instant with Undo. Rejected: flush against Save (mis-tap), a confirm sheet (slower, Undo covers it), the bottom text row (kept for AddUpcoming until it gets the same pass). ADR 0033.
- 2026-09-04: chip rows on one sheet share one radius (pills). ADR 0033.
- 2026-09-04 (0031): Save lives in the header; decision sheets keep bottom CTAs. ADR 0031.
- 2026-08-16 (0028): disabled until valid, never toast on empty. ADR 0028.

## Open
- Drag-to-dismiss is unverified from the agent side: the simulator tooling never reaches a JS PanResponder. Needs a hand on a device, with and without Reduce Motion - now including the keyboard clamp's resize feel (the height change is an instant jump behind the keyboard's own animation; judge on device whether it needs a LayoutAnimation pass).
- Body drag when the ScrollView is at the top.

## Iterations
- 2026-09-11: AddUpcomingSheet reaches parity with ExpenseSheet; the last footer delete row is gone.
- 2026-09-10: 80% keyboard-aware clamp, Sheet-owned scroll, pinned footer slot, SheetTitle; all 15 sheet usages migrated off local caps and hand-rolled footers.
- 2026-09-04 d739f59: header drag zone, one-word Save, header delete icon, pill merchant chips.
- 2026-09-04 (build 18): SheetHeader convergence across five sheets.
