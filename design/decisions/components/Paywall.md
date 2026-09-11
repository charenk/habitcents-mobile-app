# Paywall (app/paywall.tsx)

## Direction (current)
The premium upsell, presented as a modal sheet. One gradient hero carrying the offer, three benefit lines, the plan choice, and a pinned footer holding the trial line and the commit actions. The whole plan choice must be readable at rest: a price the user has to go looking for is a price they cannot compare.

This screen owns the app's single sanctioned decorative gradient (`design/PATTERN_VOCABULARY.md`, Color). `expo-linear-gradient` here is the named exception to the react-native-svg rule that applies while the build-5 incident is open, not a deviation.

Pricing is behind the human gate (ADR 0035): nothing here merges without Charen.

## States
- Plan selected: Yearly (default, "Best value"), Monthly, or Lifetime. The selected card takes the sage tint and border; the others stay white.
- Entitlement: free (the whole screen) or premium (reached only through the ceiling copy on Today).

## Decisions
- 2026-09-11 (QA loop, Charen): **the hero moved to the top of the sheet and the close button onto it.** Why: a dedicated header row existed only to right-align a 40pt close pill, costing about 44pt, and the container added the window's top safe-area inset on top of that even though `presentation: 'modal'` already starts the sheet below the status bar. Together that was roughly 100pt of empty space above the offer, on a screen whose content did not fit. The close button is anchored to the container rather than placed inside the hero, so it stays reachable instead of scrolling away; it is a white pill either way, legible on the lavender and on the page behind it.
- 2026-09-11 (QA loop): **the scroller is bounded.** Why: the `ScrollView` was given `contentContainerStyle` and no `style`, so nothing constrained it to the space between the top of the sheet and the footer, and the footer rendered over the tail of the content. The Monthly row was cut through the middle of "per month", and **the Lifetime plan was not visible at all** at default text size, so a third of the pricing was invisible at rest. `flex: 1`, which every other scroller in the app above fixed chrome already sets. QA finding 12.

## Open
- **The four controls are hand-rolled.** `TouchableOpacity` plus local `StyleSheet` rather than `ui/Button`, and "Restore purchases" uses `tertiaryBrand`'s sage treatment outside the "empty-state CTAs only" scope ADR 0038 set for it. `Button.md` says every button in the app is one of six variants. Deliberately out of scope of the 2026-09-11 layout fix (Charen: "lets focus on layout fix first"), and not a decision yet: either the variants grow to cover a commit action on a pricing surface, or these convert.
- At `extra-extra-extra-large` the hero title reaches within about 35pt of the close pill. It does not collide, checked on the simulator, but there is no padding reserving that corner, so a longer title or a wider pill would.

## Iterations
- 2026-09-11: hero to the top, close button onto it, scroller bounded (QA fix wave).
