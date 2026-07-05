# 0005. Visual direction C locked; P2-4 unification scope including dark-toggle removal

- **Date:** 2026-07-04
- **Status:** Accepted
- **Area:** Design / UX
- **Deciders:** Charen (Direction C locked 2026-07-04 from the comparison board; dark-toggle removal confirmed 2026-07-04)

## Context
P2-4b required choosing one visual language from three prototyped directions applied to the same four screens (`docs/design-package-phase2/06-p2-4b-direction/`): A refined native, B dimensional accent, C native + motion. Separately, the app still shipped a dark theme toggle despite the D-6 light-only lock (ADR 0002).

## Decision
1. **Direction C:** Direction A's refined-native tokens plus a motion-and-haptics layer concentrated exclusively on the log-save and skip moments. Everything honors prefers-reduced-motion. C contains A; stills look identical.
2. **Dark toggle removed for v1:** the Appearance row leaves Settings. Dark theme code stays in `constants/theme.ts` behind `ThemeMode`, unreferenced by UI, with the one-row revert path documented in spec 05 section 2.
3. **P2-4 apply pass scope** (spec `05-p2-4-design-unification.md`): Direction C tokens, motion layer, Settings production cleanup (remove dead Profile/Notifications/Privacy rows and the Developer section), designed empty states, privacy overlay (solid and instant, present before the iOS snapshot), and a hardcoded-hex sweep.
4. **Color rules:** green #4CAF50 means brand/positive only; a slip is neutral, never red; danger red is destructive confirmation only.

## Alternatives considered
- Direction A alone: safe but spends no distinctiveness where the product promise lives (the skip moment).
- Direction B (dimensional icon tiles): needs a custom icon asset system and risks the gradient-tile trope; its tile treatment can return later as a category-icon accent inside C once real icon art exists.
- Keeping the dark toggle: forces the design pass to cover a second mode for effectively zero current users.

## Consequences
- Easier: downstream specs 03 and 04 are already written against C's tokens; one visual dialect satisfies Phase 2 exit criterion 2.
- Harder / cost: real device time budgeted for 60fps + haptics tuning (jank reads worse than no motion); adds reanimated/haptics polish work to build item 6.
- Revisit at v1.x: dark mode restoration; B-style icon accents after P0-4 real icon art.
