# TabBar (app/(tabs)/_layout.tsx + components/ui/TabBarIcon.tsx)

## Direction (current)
Four tabs, white, 1px cloud top border, 64pt of content above the safe-area inset. The selected tab is marked three ways, only one of which is colour: a sage-light pill behind its icon, a heavier icon stroke, and a heavier sage label. Nothing animates. Settings is not a tab; it opens as a sheet from the gear on Today.

## States
- Active: pill (primaryLight fill, primary border, 56x32 at `radii.control`), icon at stroke 2.25 in `theme.primary`, label `uiBold` in `theme.primary`.
- Inactive: no fill, transparent border of the same width so the box does not move, icon at stroke 1.5 in `theme.tabIconDefault`, label `uiMedium`.
- Large Dynamic Type: labels shrink to fit their column, floored at the 11pt a default-size user sees. Reach: `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large`, then relaunch.

## Decisions
- 2026-09-05: the selected tab gains a pill, a heavier stroke and a heavier label. Why: active sage and inactive mist measure 1.12:1 against each other and the active tab was 14 percent darker, so hue carried the whole state and it vanished in grayscale. Verified by desaturating a screenshot before and after. ADR 0037.
- 2026-09-05: the pill is Chip's `soft` selected tone, not a new pattern. Why: PATTERN_VOCABULARY says do not invent a third switcher, and Chip's record says `soft` exists "for rails where a solid fill would read as a CTA". A solid sage tab would have competed with Today's green plus button. Rejected: solid sage fill with a white icon.
- 2026-09-05: no motion. Why: thumb swaps in switchers are instant by house rule; SegmentedControl rejected a sliding thumb as "a second animated surface competing with the sheet and toast motion the spec already budgets"; and the tab bar is a named suspect in the build 5 launch-crash incident. Rejected: a pill that slides between tabs, and a scale on select (a second playful motion needs its own ADR).
- 2026-09-05: the inactive tab reserves the same 56x32 box. Why: a pill that only existed while focused would reflow the row on every tab change.
- 2026-09-05: `layout.tabBarHeight` 56 to 64. Why: 56 minus the 8pt top padding left 48pt for a 32pt pill above a label reaching 16.5pt at the 1.5x cap. Toast derives from the same token, so it rose 8pt with the bar, which is correct.
- 2026-09-05: labels use `adjustsFontSizeToFit` with a `1/1.5` floor, **iOS only**. Why the platform guard: under the New Architecture RN's Android path never forwards `minimumFontScale` and falls back to a 4dp floor, so the shrink would make large-text labels unreadable there. Android keeps the cap and truncates instead. Why: the "Ins" and "Cate" clipping was horizontal, not vertical, so the taller bar did not fix it; four tabs give each 98pt and "Categories" needs about 91pt at the capped size. The floor means a large-text user never lands below the default 11pt. UX-067, `docs/device-pass.md` section 6.
- Ratified and unchanged: sage on the active tab (ADR 0018), four tabs, lucide icons, and the inactive tint clearing 3:1 because an inactive tab icon is a meaning-bearing control, not decoration (UX-003).

## Open
- The pill's fill is 1.12:1 on white, so on its own it is faint; the border and the two weight changes carry most of the load. If the border reads heavy at arm's length, fill-only is a one-line change in `TabBarIcon.tsx`.
- ADA-005 asked for the bar to become min-height plus padding rather than a fixed height. Raising the token to 64 postpones that rather than doing it.

## Iterations
- 2026-09-05: `components/ui/TabBarIcon.tsx` added, `_layout.tsx` rewired, `layout.tabBarHeight` 56 to 64, first tests to ever cover the tab bar. ADR 0037.
