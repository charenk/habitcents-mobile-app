# Pattern vocabulary

The one-page self-check for anyone shipping UI in this app. Read it before building, run the checklist before opening a PR. Deviations are allowed; unexplained deviations are not: name them in the PR body so the reviewer judges the exception, not the surprise.

Sources of truth this page compresses: `design/redesign-handoff/01-tokens-and-foundations.md` (tokens), ADR 0018 (system of record), ADR 0019 (chrome and views), ADR 0021 (switching vocabulary). If this page disagrees with those, those win; fix this page.

## Color

- Neutrals carry roughly 90 percent of every screen: ink, slate, mist, cloud, snow. If a screen feels colorful, something is off.
- Sage (`theme.primary` and `primaryDark`) means one thing: a kept outcome or the action that produces one (CTA, kept numbers, active tab tint, skip confirm). Sage never touches a spend figure, a border around one, or decoration.
- Spend is never a win: spend figures are ink, spend bars are mist on snow.
- Lavender = habit arc, chapters, premium. Amber = upcoming money. Coral = destructive only. A slip is never red.
- Exactly ONE decorative gradient is allowed in the app: the premium upsell card's hero. The welcome aurora retired with the splash it decorated (ADR 0026: the carousel replaced that screen); `components/onboarding/AuroraBackground.tsx` is kept unreferenced as the documented revert path, so a gradient appearing anywhere else is a deviation, not a precedent. Scroll-edge fades (a white fade over a clipped horizontal rail, signalling more content) are functional, not decorative, and allowed.

## Type

- Instrument Serif appears in exactly three places: screen titles ending in a period, money (hero, stat, reveal amounts), and the Today view quotes (italic, mist, with their small attribution line). Never body, never buttons.
- Quotes are retired (Charen, 2026-09-05, ADR 0037). No pane carries one in any state. `components/today/ViewQuote.tsx` and `useViewQuote.ts` are kept unreferenced as the documented revert path, so re-importing one would be a deviation, not a restoration.
- Everything else is Inter, on the typeScale steps. No sizes off the scale.
- Eyebrows are the only all-caps: 11pt, semibold, letterSpacing .88, uppercased by the component. Strings stay sentence case.
- Every number that can sit above another number is tabular: `fontVariant: ['tabular-nums']`.

## Controls

- There is ONE switching pattern: the cloud track with a raised white thumb. Small scale = SegmentedControl (Money views, sheet toggles). Value scale = the Today scoreboard. Do not invent a third switcher; grow one of these.
- Both scales are rounded rects, not pills (Charen, 2026-08-16), and both follow one nesting rule: **track radius = thumb radius + track padding (3)**. Small scale is thumb 14 on a 17 track; value scale is thumb 20 on a 23 track. The two track radii are the only derived values in the app; every other radius comes from the token set.
- Buttons: primary sage (48 to 52pt min height), secondary white with cloud border, tertiary bare slate text, destructive coral. Pick from these four.
- The dashed-border card is the app's "add another" affordance (add upcoming, break another habit). Reuse it for any add-an-item entry.
- 40pt pill buttons with cloud borders are header chrome only, icons in slate, never sage.

## Rows

- Every tappable row carries some affordance in its trailing slot; a row that gives no hint what the tap does is the bug, not a style choice.
- Chevron: the row opens something in-app, a screen or a sheet. It never means "leaves the app."
- External-link icon (`ExternalLink` in the icon map): the row leaves the app for the browser. Wire the Linking failure path to a toast; a link that silently does nothing on a tap is a dead end, not a graceful fallback.
- Right-aligned value in 13pt slate: the row's current status (Currency's code, Subscription's plan). Value and chevron combine, value on the left of the chevron.
- A shown address (email, in slate, right-aligned like a value) means the row is a mail action: it opens the device's mail composer, not the browser. No chevron, no external-link icon; the address itself is the affordance.
- A row with none of the above is an in-place async action: it keeps a pressed state but promises nothing about where the tap goes. This is the one deliberately open case in the vocabulary; do not paper over it with a chevron or external-link icon that would misdescribe it.
- Rows have two label tiers: default ink for primary rows, muted slate for tier-two rows (legal links, start over). Muted is a weight statement, not a disabled state.

## Surfaces

- Feature card: radius 20, white, 1px cloud border, `shadows.card`. List card: radius 14. Sheets: bottom-anchored, radius 20 top, grab handle; form sheets head with `ui/SheetHeader` (serif title left, compact primary Save top-right, disabled until valid, no in-sheet Cancel, ADR 0031), decision sheets keep bottom CTAs. Toasts: ink pill, one per mutating action.
- Sheet drag (Charen, 2026-09-04): the handle and the pinned header share one drag zone (`Sheet`'s `header` prop), so a finger anywhere across the top of a form sheet tracks it 1:1 and a 25% drag or a flick dismisses; the body keeps its own scroll. Form-sheet Save reads one word, "Save", on every sheet: the serif title already names the sheet. A form sheet may carry at most one icon action left of Save (`SheetHeader` `secondaryAction`, 44pt, tertiary, coral when destructive, 12pt gap, spoken label required); the edit expense sheet's delete is the first. Destructive text rows at the bottom are retired for that sheet.
- Every empty state is mark, one hook line, text CTA (`ui/EmptyState`, no body). One line is the standard app-wide since ADR 0037, not just on Today. The CTA is `variant="tertiary"`: a bordered button was the heaviest thing in a pane meant to read quiet. In-card empty states are a single body line with no title, which is the same standard seen from the other side.
- The mark on a pane-level zero state is a 96pt illustration from `constants/emptyArt.ts` (ADR 0036); in-card empty states carry no mark at all, and Categories keeps a 28pt glyph because its zero state is unreachable while default categories ship. This is the one place saturated raster art appears in the app, and it is a named deviation from the neutrals rule above, not a precedent: art anywhere else is a deviation to argue for on its own.
- Persistent positive communication is one pattern, `ui/InfoRibbon`: sage-light band, sprout, one caption line. Dismissible (X) for one-shot lines such as the first-run receipts; persistent (no X) for standing lines such as the quiet-day placeholder. Always inside a list section, below the content it comments on, never above an input: under the log card it reads as a receipt, above the quick-log field it read as an instruction. A gentle first-run line resolves itself once the thing it waits for exists.
- Bottom sheets head with the serif `sheetTitle` treatment (`theme.fonts.display` at `typeScale.sheetTitle`), not an eyebrow. AddUpcomingSheet, AddCategoryModal, CurrencySheet, and ExpenseSheet all follow it; a new sheet reaching for an 11pt eyebrow head instead is a deviation, not a second pattern (UX-040).
- One 20pt horizontal gutter per screen. Full-bleed is reserved for nothing currently; if you think you need it, that is a named deviation.
- Vertical rhythm inside a view is a 12pt stack gap.

## Motion

- Budget: tap 120ms, sheet and toast 220ms, screen 360ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Exactly one playful motion exists: the 280ms skip-confirm pulse. Do not add a second without an ADR.
- Thumb swaps in switchers are instant, by design.
- Every animation has a reduced-motion path (opacity only or nothing). Mixed animation drivers on one node crashed two release builds; one driver per node, no JS-thread sequences.

## Accessibility

- Screen titles carry `accessibilityRole="header"`. Switchers are tablist/tab with selected state. Targets are 44pt or padded to it with hitSlop.
- Dynamic Type caps: 1.5 on chrome and eyebrows, 1.3 on serif amounts.
- Anything mounted off-screen (pagers) is hidden from assistive tech.
- Status conveyed by color (pending dot) is also in the accessible label.

## Copy

- All strings live in `constants/strings.ts`. Sentence case. No em dashes, anywhere, ever.
- Locked vocabulary: leak, skip, kept, slip. Never streak, success, or completed language.
- Never invent statistics; state observed evidence ("$119.05 across 4 buys"), not fabricated rates.
- No invented totals, ever (ADR 0022): the only accumulated total the app renders is the user's own. Sample dollars appear only as per-skip example prices explicitly marked as examples ("for example: one skipped coffee keeps $6.50"). Applies to onboarding, empty states, marketing surfaces, and screenshots alike.

## The PR self-check

- [ ] No new color meanings, no sage near spend, no red slip
- [ ] Type on the scale; serif only for titles and money; tabular numbers
- [ ] Controls picked from the vocabulary above, not invented
- [ ] Rows: exactly one trailing affordance (chevron / external-link / none), value in 13pt slate, no silent Linking failures
- [ ] 20pt gutter, 12pt rhythm, radii from the set (10 / 14 / 20 / 999), switcher tracks derived per the nesting rule
- [ ] Motion inside the budget with a reduced-motion path, single driver
- [ ] Header roles, tab roles, 44pt targets, Dynamic Type caps
- [ ] Strings centralized, sentence case, locked vocabulary
- [ ] Any deviation from the above named in the PR body
