# Sheet (components/ui/Sheet.tsx)

## Direction (current)
The base bottom sheet: white panel, radius 20 top, grab handle, scrim, 220ms slide, spring settle after a drag. One PanResponder on the drag zone (handle plus the optional `header`), driving the same `progress` value the open and close timings drive; never a second animation driver on the panel. Structure lives in the primitive (2026-09-10): the body is a Sheet-owned ScrollView (`scrollable={false}` hands a FlatList a plain shrinkable View), an optional `footer` pins below it and owns the bottom inset (zeroed under the keyboard), and the panel is clamped to `sheetMaxHeight` (utils/sheetLayout.ts): 80% of the window, or the visible strip above the software keyboard (utils/keyboard.ts useKeyboardHeight, screenY overlap math). The keyboard lift is a plain marginBottom on a wrapper node, so the single-driver rule holds untouched.

## States
Closed, opening, open, dragging, settling, closing; reduced motion swaps the translate for opacity. Keyboard up: panel clamped above the keyboard, body scrolls, focused mid-body input scrolled into view, footer flush on the keyboard.

## Decisions
- 2026-09-10: `avoidKeyboard` removed; every sheet is keyboard-aware through the clamp instead of a KeyboardAvoidingView that lifted the panel off the top of the screen. The height rule is a pure function so Jest pins it (sheetLayout.test.ts).
- 2026-09-10: `footer` slot with the cloud hairline; the bottom-most fixed element owns insets.bottom and the keyboard supersedes it.
- 2026-09-05: `panel` caps at `layout.contentMaxWidth` (600pt), centered (`alignSelf: 'center'`), on tablet widths. Why: a full-width sheet on iPad read as an unfinished stretch, not a considered layout. Phones are unaffected: `width: '100%'` already equals the phone screen width below the cap, so this is a pass-through there. routine/ipad.
- 2026-09-04: `header` prop renders inside the drag zone under the handle. Why: a finger on the title row moved nothing. ADR 0033.
- Close rule: 25% of the panel height or a 0.5 px/ms flick; otherwise spring back (damping 22, stiffness 240, mass 0.8). Unchanged since UX-041.
- Grant reads the live `progress` so a mid-animation grab tracks from where the panel is.

## Open
- Drag unverified on device after the drag-zone change (see modules/drawers.md), now including the keyboard clamp's resize feel.

## Iterations
- 2026-09-10: clamp + keyboard hook + footer/scrollable/contentContainerStyle props; `sheet-footer` testID.
- 2026-09-05: `panel` capped and centered at 600pt on tablet widths (routine/ipad).
- 2026-09-04 d739f59: drag zone wraps handle + header; `sheet-drag-zone` testID.
