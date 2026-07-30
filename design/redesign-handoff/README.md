# Handoff: HabitCents redesign + intent-first onboarding

## Overview
Ground-up visual redesign of the HabitCents Expo app plus a rebuilt onboarding. The product logic is unchanged (skip = win, slips neutral, kept is the only aggregate, on-device only). What changes: visual system (editorial serif numbers, one green, calm neutrals, emoji category tiles, Lucide icons), navigation (4 tabs → 3), an intent-first onboarding replacing the "Find my leak" funnel, confirmation toasts (new — the shipped app has none), and an add-upcoming-expense flow with full recurrence options.

Target codebase: the existing Expo/React Native app (`mobile-app/`, expo-router). All specs reference its real files.

## About the design files
The `.dc.html` files bundled here are **design references created in HTML** — interactive prototypes showing intended look and behavior, NOT production code. The task is to **recreate them in the Expo/React Native codebase** using its established patterns (expo-router screens, contexts, StyleSheet). Open `App Prototype.dc.html` in a browser to click through every flow (left phone = 2a control, right phone = 3a intent-first onboarding — **implement 3a**).

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and copy are final. Recreate pixel-perfectly using RN equivalents. Exact values are in `01-tokens-and-foundations.md`; exact copy in `05-copy.md`.

## Implementation order (each step ships independently)
1. `01-tokens-and-foundations.md` — theme.ts values, fonts, icon library, Toast component. Everything else depends on this.
2. `02-navigation.md` — 3-tab structure, routes, settings sheet.
3. `03-onboarding.md` — intent-first onboarding (the 3a variant).
4. `04-screens.md` — Today, Money (+ add upcoming), Insights, habit detail, sheets, paywall.
5. `05-copy.md` — strings.ts replacement table + voice rules.

## Screen map (old → new)
| Shipped (mobile-app/) | New |
|---|---|
| app/onboarding/welcome.tsx | Welcome with 3 value-prop rows |
| app/onboarding/fork.tsx | **Replaced** by intent picker (3 cards) |
| app/onboarding/audit-*.tsx, reveal.tsx, guided-log.tsx, success.tsx | Restyled, same logic |
| app/leak-scan.tsx | Reachable from intent card 2; restyled results |
| app/(tabs)/expenses.tsx | **Today** tab (kept hero + check-in + quick log + today's list) and **Money** tab (Spent/Upcoming) |
| app/(tabs)/habits.tsx | Merged into **Today** (check-in) + **Insights** (leak list) |
| app/(tabs)/reports.tsx | **Insights** tab |
| app/(tabs)/categories.tsx | Category management moves behind settings (unchanged logic) |
| app/(tabs)/settings.tsx | Sheet behind gear icon on Today |
| app/habit/[id].tsx | Restyled habit detail (lavender arc) |
| app/paywall.tsx | Restyled (gradient card is the only gradient) |

## Product truths — do not violate
- Skip is the win. A slip is neutral: never red, never subtracts from Kept.
- Kept is the only cross-habit aggregate number.
- ~66 skips rewires a habit. Chapters: Deciding 0–10, Rhythm 10–30, Cruising 30–50, Rewired 50–66. Arc never decreases.
- Everything on-device. No bank login, no account. ("Sign out" resets local session only.)
- Detection needs ~4 logs at one merchant. Free tier = 1 habit.
- Leak-scan confidence tiers (Solid/Likely/Needs review) always shape + label, never color alone.

## Verification checklist (run after each step)
- [ ] No color outside the token set; sage appears only on primary CTA, kept number, active states, skip confirmations.
- [ ] All currency uses tabular numerals and `$X.XX` format.
- [ ] Every action shows its toast ("Logged." / "Saved." / "Deleted." + Undo).
- [ ] Slip path shows gray minus icon, kept total unchanged.
- [ ] Intent picker fires `onboarding_intent_selected` with `{intent: 'track'|'scan'|'break'}`.
- [ ] All three intent paths land on the Today tab.

## Files in this bundle
- `App Prototype.dc.html` + `Prototype 3a.dc.html` + `support.js` — interactive prototypes (open App Prototype in a browser; keep the three files together).
- `App Workflow Canvas.dc.html` — static mocks R1–R27 with annotations (all states incl. edges not in the prototype: graceful failure, scan questions, partial-slip, milestone).
- `01…05` spec files.
