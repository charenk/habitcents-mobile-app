# ScreenHeader (components/ui/ScreenHeader.tsx)

## Direction (current)
The one header every tab and every pushed route renders through: serif title, optional eyebrow below it, an optional 40pt back pill ahead of the title in pushed mode, and up to two 40pt action pills on the right. White on a cloud border, icons in slate, never sage. In pushed mode it draws its own top inset and rides inside the screen's scroll content, so the title cannot slide under the back control.

## States
Resting; pressed (back pill and action pills swap to snow). Dense chrome, so the title and eyebrow cap at 1.5x Dynamic Type.

## Decisions
- 2026-09-10: **both controls take the house pressed-background swap.** They were `TouchableOpacity` on its default opacity fade, which made the app's most-touched chrome the one exception to the convention `Button.tsx` states outright: "a pressed background swap, never a scale". Chip, SegmentedControl, DockCard, CategoryRow, ExpenseRow, SettingsRow and SheetHeader all already obeyed it. Snow is the same swap Button's secondary uses, and both controls are white-on-cloud like a secondary button. Found by the interaction audit of 2026-09-10.
- Ratified and unchanged: 40pt pills with a cloud border are header chrome only, icons slate never sage (PATTERN_VOCABULARY). Effective target is 48pt with the 4pt hitSlop, clear of the 44pt floor.
- Pushed mode zeroes the header's own horizontal padding, because pushed routes render it inside content that already carries the 20pt gutter and the doubled padding put the back pill 40pt from the edge (Charen, 2026-09-04).
- The eyebrow sits below the title, not above: the title is the thing a user reads first. Uppercasing lives in the style so `strings.ts` keeps storing sentence case.
- One component for every screen, because each tab used to hand-roll its title block and the paddings drifted (Money's paddingTop 8 against 16 elsewhere), so the serif title visibly jumped on every tab change. ADR 0019, design/header-unification U1.

## Open
- The header is not a native `Stack` header, so it does not participate in any push transition; if screen transitions are ever customised, the title will not cross-fade the way an iOS large title does. Noted, not a defect.

## Iterations
- 2026-09-10: TouchableOpacity to Pressable on both controls, pressed style added; this record created.
- 2026-09-04: pushed mode (back pill, own top inset, zeroed horizontal padding).
