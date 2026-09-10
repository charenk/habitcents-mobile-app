# Pattern vocabulary

The one-page self-check for anyone shipping UI in this app. Read it before building, run the checklist before opening a PR. Deviations are allowed; unexplained deviations are not: name them in the PR body so the reviewer judges the exception, not the surprise.

Sources of truth this page compresses: `design/redesign-handoff/01-tokens-and-foundations.md` (tokens), ADR 0018 (system of record), ADR 0019 (chrome and views), ADR 0021 (switching vocabulary). If this page disagrees with those, those win; fix this page.

## Color

- Neutrals carry roughly 90 percent of every screen: ink, slate, mist, cloud, snow. If a screen feels colorful, something is off.
- Sage (`theme.primary` and `primaryDark`) means one thing: a kept outcome or the action that produces one (CTA, kept numbers, active tab tint, skip confirm). Sage never touches a spend figure, a border around one, or decoration.
- Spend is never a win: spend figures are ink, spend bars are mist on snow.
- Lavender = habit arc, chapters, premium. Amber = upcoming money. Coral = destructive only. A slip is never red.
- Exactly ONE decorative gradient is allowed in the app: the premium upsell card's hero. The welcome aurora retired with the splash it decorated (ADR 0026: the carousel replaced that screen); `components/onboarding/AuroraBackground.tsx` is kept unreferenced as the documented revert path, so a gradient appearing anywhere else is a deviation, not a precedent. Scroll-edge fades (a fade to the surface colour over a clipped scroller, horizontal or vertical, signalling more content) are functional, not decorative, and allowed: CategoryChipRow's rail fade, and `ui/ScrollFade` at the bottom of Today's scrollers where they meet the dock (Charen, 2026-09-07). They are drawn with react-native-svg on Today, never expo-linear-gradient, while the build-5 incident stays open.

## Type

- Instrument Serif appears in exactly two places: screen titles ending in a period, and money (hero, stat, reveal amounts). The third, the Today view quotes, retired with them (ADR 0037). Never body, never buttons.
- Quotes are retired (Charen, 2026-09-05, ADR 0037). No pane carries one in any state. `components/today/ViewQuote.tsx` and `useViewQuote.ts` are kept unreferenced as the documented revert path, so re-importing one would be a deviation, not a restoration.
- Everything else is Inter, on the typeScale steps. No sizes off the scale.
- Eyebrows are the only all-caps: 11pt, semibold, letterSpacing .88, uppercased by the component. Strings stay sentence case.
- Every number that can sit above another number is tabular: `fontVariant: ['tabular-nums']`.

## Controls

- There is ONE switching pattern: the cloud track with a raised white thumb. Small scale = SegmentedControl (Money views, sheet toggles). Value scale = the Today scoreboard. Do not invent a third switcher; grow one of these.
- Both scales are rounded rects, not pills (Charen, 2026-08-16), and both follow one nesting rule: **track radius = thumb radius + track padding (3)**. Small scale is thumb 14 on a 17 track; value scale is thumb 20 on a 23 track. The two track radii are the only derived values in the app; every other radius comes from the token set.
- Buttons: primary sage (48 to 52pt min height), secondary white with cloud border, tertiary bare slate text, tertiaryBrand bare sage text (empty-state CTAs only, ADR 0038), link (slate, regular, 13pt, underlined: a disclosure that opens an explanation and changes nothing, Charen 2026-09-07), destructive coral. Pick from these six. `link` is the only underlined text in the app; a control that writes data, navigates to a workflow or spends money is never a link, whatever it looks like.
- The dashed-border card is the app's "add another" affordance (add upcoming, the watch nudge, the break-habit dock). Reuse it for any add-an-item entry. Both Today docks share one structure, `components/today/DockCard.tsx` (a rounded-rect shell at `radii.feature` with a field at `radii.control` at a fixed 44pt and a round plus, 66pt outer), in two tones: Spent's is the solid composer (cloud edge, snow field, filled sage plus); Kept's is the dashed "add another" shell, border only, with an unfilled plus carrying a sage glyph (Charen, 2026-09-07: same structure, different skin, so the break trigger never reads as a second composer; 2026-09-10: Kept loses its fills so the dashed edge is the whole button). The break label still reads the state where that matters: "Break your first habit" at zero habits, "Break another habit" after (ADR 0038). The dock carries no growth copy in any state (Charen, 2026-09-10): a free ceiling is named where the user reaches for it, in the gate card and the paywall, never on the affordance itself.
- **The rounded-rect nesting rule is no longer switcher-only** (Charen, 2026-09-10). The dock was the app's one pill container precisely to stay out of the switcher family; it is now a rounded rect at the switchers' own `radii.feature`, because a fully round composer promised a corner the sheet behind it did not keep. Nesting is concentric wherever it applies: inner radius = outer radius minus the container's padding, which is how the dock's 20 and 10 were derived. The two are still told apart by everything except the corner: a switcher is a filled track holding a thumb, a dock is a bordered shell holding a field and a round button, and they sit at opposite ends of the pane.
- **A sheet opens where the user already is** (Charen, 2026-09-10). A CTA never changes tab to reach its own sheet: mount the sheet on the screen that offers the action. Logging was the last violation, sending Money > Spent and both Insights empty states to Today with `?view=spent&sheet=log`, which cost the user their segment and scroll position and bought nothing, since `ExpenseSheet` owns its own save, haptic, toast and close. The `?view=&sheet=` route survives as a DEEP LINK entry for links arriving from outside the app; it is not a way for one tab to reach another tab's sheet. Still outstanding: Money > Habits' break CTA routes to Today the same way, and is a different sheet and flow.
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
- Every empty state is mark, one hook line, one text line (`ui/EmptyState`, no body, no explanatory prose). One line is the standard app-wide since ADR 0037, not just on Today. The text line is the pane's CTA, `variant="tertiaryBrand"` (sage text, ADR 0038; a bordered button was the heaviest thing in a pane meant to read quiet, and slate made the pane's only action its quietest element), or, where the pane's action lives in a dock instead, one underlined `link` that discloses and never acts (Today's Kept Zero, Charen 2026-09-07). In-card empty states are a single body line with no title, which is the same standard seen from the other side.
- The mark on a pane-level zero state is a 96pt illustration from `constants/emptyArt.ts` (ADR 0036); in-card empty states carry no mark at all, and Categories keeps a 28pt glyph because its zero state is unreachable while default categories ship. This is the one place saturated raster art appears in the app, and it is a named deviation from the neutrals rule above, not a precedent: art anywhere else is a deviation to argue for on its own.
- Persistent positive communication is one pattern, `ui/InfoRibbon`: sage-light band, sprout, one caption line. Dismissible (X) for one-shot lines such as the first-run receipts; persistent (no X) for standing lines such as the quiet-day placeholder. Always inside a list section, below the content it comments on, so it reads as a receipt for what just happened. The rule used to add "never above an input", written when the quick log sat at the top of the pane and a message over the field read as an instruction about it; ADR 0038 docked the input at the bottom, so everything is above it and only the below-its-content half is operative. A gentle first-run line resolves itself once the thing it waits for exists.
- The ActionDock (`components/today/ActionDock.tsx`, ADR 0038) is the one bottom-docked chrome strip: full width, 20pt gutter, 12pt above and below, background fill, no top edge (Charen, 2026-09-07: the hairline read as a seam; the fill separates), no bottom safe-area padding (the tab bar reserves that). Both Today panes end in one so the action holds its position across a swipe. It never hides and never floats; it is a flex sibling of the pane's scroller.
- Bottom sheets head with the serif `sheetTitle` treatment (`theme.fonts.display` at `typeScale.sheetTitle`), not an eyebrow. AddUpcomingSheet, AddCategoryModal, CurrencySheet, and ExpenseSheet all follow it; a new sheet reaching for an 11pt eyebrow head instead is a deviation, not a second pattern (UX-040).
- One 20pt horizontal gutter per screen. Full-bleed is reserved for nothing currently; if you think you need it, that is a named deviation.
- Vertical rhythm inside a view is a 12pt stack gap.

## Motion

- Budget: sheet and toast 220ms, screen 360ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`. The `tap 120ms` entry went on 2026-09-10: it had never had a consumer, because press feedback here is an instant background swap by the rule below. A timed press state needs an ADR before the token comes back.
- **Touch answers, even where nothing moves** (2026-09-10). A tab change and either switcher fire `hapticSelection`, and only on a real change: re-pressing the segment or tab you are already on is not a selection. The bars still have no motion. Before this, 21 of the app's 27 haptics were `hapticError` and `hapticSelection` fired in exactly one place, so the product touched you almost only to say you were wrong.
- Exactly one playful motion exists: the 280ms skip-confirm pulse. Do not add a second without an ADR.
- Thumb swaps in switchers are instant, by design.
- Every animation has a reduced-motion path (opacity only or nothing). Mixed animation drivers on one node crashed two release builds; one driver per node, no JS-thread sequences.

## Accessibility

- Screen titles carry `accessibilityRole="header"`. Switchers are tablist/tab with selected state. Targets are 44pt or padded to it with hitSlop.
- Dynamic Type caps: 1.5 on chrome and eyebrows, 1.3 on serif amounts. Tab labels additionally shrink to fit their column on iOS, floored at 1/1.5 so they never render below the default size; Android truncates instead, because RN never forwards the scale floor there (ADR 0039 review).
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
