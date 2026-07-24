# ADA fix plan

Sequenced from `ADA_AUDIT.md` (2026-07-24, main `2f536a9`). Quick wins first, then structural work, then product decisions. One PR per unit of work per ADR 0012; anything user-visible is Lane 2. Update the fix tracker status in both audit files as each lands.

## 0. Prerequisite (owned elsewhere, not part of this plan's PRs)

**ADA-001, land the Habits-tab crash fix.** The fix already exists uncommitted in worktree `.claude/worktrees/fix-habits-tab-crash` (branch `fix/habits-tab-crash`).
- Acceptance: fresh-install release build (`expo run:ios --configuration Release` or TestFlight) opens the Habits tab without crashing; the three Reanimated call sites wrap shared-value writes in `runOnUI`; KeptHero no longer mixes native and JS drivers on one node; all 292+ tests green.

## 1. Quick wins (each S effort, independently shippable)

1. **ADA-002 Make Settings reachable.** Add an entry point (gear icon in a tab header or a fifth tab). Currency, Restore Purchases, Privacy, Terms must be reachable before store submission.
   - Acceptance: a user can reach `/settings` from the main UI in 2 taps or fewer; VoiceOver announces the entry button; Privacy and Terms open.
2. **ADA-010 Label the WidgetCard trend icon.** Either hide it (`importantForAccessibility="no"`) and fold direction into the percentage text's label, or give it `accessibilityLabel` ("spending up vs last period").
   - Acceptance: VoiceOver reads direction and magnitude as one sensible utterance; no color-only meaning remains (`components/WidgetCard.tsx:269-273`).
3. **ADA-009 Move string stragglers into `constants/strings.ts`** and make the amount label currency-aware via `useCurrency()` ("Amount in dollars" -> "Amount in {currency}").
   - Acceptance: grep for user-facing literals in `components/` returns only `strings.ts` references; the amount field label matches the selected currency; a11y tests updated.
4. **ADA-008 Device-locale dates.** Replace all 13 `'en-US'` literals with `undefined` (device locale) or a central `formatDate` helper in `utils/`; move "Week of" into `strings.ts`.
   - Acceptance: `grep -rn "'en-US'" app components contexts utils` returns 0; date rendering verified in one non-US locale.
5. **ADA-023 Darken the two failing accents.** `tierLikelyInk` and `calendarDow` to values computing >= 4.5:1 on their backgrounds.
   - Acceptance: contrast script (audit appendix C) reports >= 4.5:1 for both pairs; badges still read as amber/gold.
6. **ADA-016 Sweep dead surface.** Remove `expo-linear-gradient`, the `fabGradient*` tokens, and (if still no custom face planned) `expo-font`; fix stale claims in `CLAUDE.md` and `docs/DESIGN.md` (dark mode wording, nonexistent chart components).
   - Acceptance: `npx tsc --noEmit` and tests green; docs describe only what exists.
7. **ADA-021 + ADA-022 Adaptive metrics.** Swap module-scope `Dimensions.get` for `useWindowDimensions`; derive tab bar height/padding from `useSafeAreaInsets()`.
   - Acceptance: no module-scope `Dimensions.get` in `app/` or `components/`; tab bar renders correctly on a home-button device (SE) and a home-indicator device.
8. **ADA-026 Widen the haptic vocabulary.** Add `hapticWarning`/`hapticSelection` in `utils/motion.ts`; wire warning to destructive confirms (Stop tracking, delete category) and selection to plan cards and chips.
   - Acceptance: destructive alerts and plan selection produce distinct feedback; still fire-and-forget, never throw.

## 2. Structural work (M/L, sequence matters)

9. **ADA-003 + ADA-004 Contrast-safe palette revision** (do before the token work so tokens are born correct). Primary-button text pairing must reach AA: darken primary toward `#388E3C`-adjacent for filled buttons or introduce `onPrimary` pairing rules; raise `textTertiary` to roughly `#6E6E6E` territory; give inactive tab icons a passing tint.
   - Acceptance: every pair in audit appendix B computes >= 4.5:1 (normal text) or >= 3:1 (large text and icons); both money moments re-verified visually; green still reads as the brand.
10. **ADA-006 + ADA-007 Type and spacing tokens in `constants/theme.ts`.** A named type scale (about 6 steps mapped to iOS text styles, weights rebalanced so body is '400'/'500') and a 4/8 spacing plus radius set (propose 8/12/16 + pill). Migrate mechanically, file by file.
    - Acceptance: fontSize literal count drops from 323 to ~0 outside the scale file; distinct radii from 18 to <= 4; visual diff per screen approved by Charen (Lane 2).
11. **ADA-005 Dynamic Type strategy.** Set `maxFontSizeMultiplier` defaults on the shared Text usage (sane cap like 1.5 on dense UI, uncapped on reading surfaces), convert fixed-height buttons/rows/tab bar to min-height plus padding.
    - Acceptance: at iOS accessibility text size XL, all five tabs and both money moments render without clipped or overlapping text; screenshot set attached to the PR.
12. **ADA-014 Shared primitives.** `Button` (filled/tonal/plain, loading state), `Card`, `AppText` (scale-aware), one `Sheet` wrapper; rename the duplicate `HabitCard`s. This locks in items 9-11.
    - Acceptance: new primitives used by the five highest-traffic screens; hand-rolled touchable count materially down; no visual regressions in both themes of the report (light only in-app).
13. **ADA-013 One animation system.** Port KeptHero pulse and TodayExpensesPanel spring to Reanimated; delete classic `Animated` usage.
    - Acceptance: `grep -rn "from 'react-native'" | grep Animated` returns nothing animation-driving; motion inventory re-verified; no driver mixing anywhere.
14. **ADA-011 + ADA-012 Error and loading surfaces.** A small toast/banner pattern for failed persists and link opens; skeleton or shaped placeholders instead of "loading" text; hold the splash via `SplashScreen.preventAutoHideAsync()` until contexts hydrate.
    - Acceptance: killing storage mid-write surfaces a visible, dismissible error; cold start shows no empty-content flash; loading states match the card layout they replace.
15. **ADA-027 Milestone celebrations.** Celebrate the existing milestones (1/3/7/14/30/66) reusing the ring + haptic + count-up grammar; respect reduce motion; never celebrate spend.
    - Acceptance: reaching a milestone produces one distinct moment; VoiceOver announces it; no celebration fires on slip days.
16. **ADA-024 Rendered a11y tests.** Add RTL render tests asserting accessibility tree for CheckInCard, LeakCard, paywall (roles, labels, states) and a Dynamic Type smoke test at 1.5x.
    - Acceptance: tests fail if a label/role regresses; wired into CI.

## 3. Product decisions (route to Decision inbox, no code until decided)

17. **ADA-017 Local notifications** (reminder toggles currently schedule nothing). Highest-leverage platform capability for a habit product; also unblocks the intent data already being captured.
18. **ADA-018 Home-screen presence**: WidgetKit kept-counter widget first (config-plugin or native target), then App Intents ("log a coffee") and a Live Activity candidate (daily check-in). Sequenced after TestFlight stability.
19. **ADA-019 Dark mode** `[ratified light-only]`: `darkTheme` exists and ThemeContext documents the revert path. An ADA-caliber submission needs it; decide timing (suggest with item 10 so tokens land theme-aware).
20. **ADA-020 iPad/landscape** `[ratified iPhone-portrait]`: decide whether award ambition changes scope; if yes, size-class layouts follow the primitives work (item 12).
21. **ADA-028 SF Symbols migration** via `expo-symbols`: aligns iconography with the platform; decide appetite alongside item 12, since icon call sites get touched there anyway.
22. **ADA-015 Native sheet detents**: replace the hand-built panel when the router/native stack supports detents cleanly in this Expo version; revisit each SDK upgrade.
23. **ADA-025 Transition polish**: shared-element or continuity transitions for leak -> habit detail; only after crash-free baseline and primitives.

## Suggested order of PRs

Prerequisite ADA-001 -> quick wins 1-8 (parallelizable, mostly Lane 2 small) -> 9 palette -> 10 tokens -> 11 Dynamic Type -> 12 primitives -> 13 animation unification -> 14 states -> 15 celebrations -> 16 tests, with section 3 decisions filed to the inbox immediately and scheduled by Charen.
