# 02 · Navigation

## Tabs: 4 → 3
Rewrite `app/(tabs)/_layout.tsx`:
| Tab | Icon (lucide) | Route | Replaces |
|---|---|---|---|
| Today | sun | `app/(tabs)/index.tsx` | habits.tsx + the log form from expenses.tsx |
| Money | wallet | `app/(tabs)/money.tsx` | expenses list + UpcomingPanel |
| Insights | trending-up | `app/(tabs)/insights.tsx` | reports.tsx + leak list from habits.tsx |

Tab bar: white bg, 1px cloud top border, label 11/600. Height ~84 incl. safe area. SUPERSEDED in part by ADR 0037: sage on the active tab is unchanged, but colour is no longer the only signal. The selected tab now also carries a sage-light pill behind its icon (Chip's `soft` tone), a 2.25 icon stroke against 1.5, and a bolder label. Colour alone measured 1.12:1 between the two states. Content height is 64, not 56.

## Settings
Remove the Settings tab. Gear (`settings-2`, 40×40 white circle w/ cloud border) top-right on Today opens a **settings bottom sheet**:
- Serif title "Settings." + plan line ("Free plan · 1 habit" / "Premium trial · 14 days left").
- Groups (eyebrow labels): **Preferences** (Currency; Premium → paywall), **About** (Restore purchases; Sign out — coral text, right hint "data stays on this device"; Version).
- Categories management: add row "Categories" under Preferences → pushes existing categories screen (moved out of tabs to `app/categories.tsx`).
- Sign out: confirm nothing server-side (no account); clears session flag → onboarding welcome; toast "Signed out. Your data stays on this device."

## Stack routes (unchanged paths, restyled)
- `app/habit/[id].tsx` — pushed from check-in card header or Insights leak row. No tab bar visible.
- `app/paywall.tsx` — modal, from pick-one gate or settings.
- `app/leak-scan.tsx` — from onboarding intent card 2 (and Insights "bring statements" affordance if present).
- `app/onboarding/*` — see 03.

## Sheets (bottom sheets, not routes)
log, edit-expense, add-upcoming, partial-slip, skip-value, pick-one, stop-breaking-confirm, settings, how-it-works.
