# HabitCents ADA design audit

Living document. Twin of `ADA_AUDIT.html` (keep both in sync). Fix sequencing lives in `ADA_PLAN.md`.

- **App**: HabitCents (Expo SDK 54, React Native 0.81.5, expo-router 6, New Architecture, iOS bundle `com.habitcents.app`)
- **Audit date**: 2026-07-24 (initial run, main @ `2f536a9`)
- **Overall readiness**: **2.5 / 5** (mean of six category scores)
- **Standard**: Apple Design Award bar, scored pure. Gaps that collide with ratified product decisions are scored honestly and tagged `[ratified]`; they route to a product decision, not a fix ticket.

| Category | Score |
|---|---|
| Interaction | 3 / 5 |
| Visuals and graphics | 3 / 5 |
| Delight and fun | 3 / 5 |
| Inclusivity | 2 / 5 |
| Innovation | 2 / 5 |
| State of the platform | 2 / 5 |

Every number in this report was counted or computed against the code at `2f536a9`; nothing is estimated.

## How to re-run this audit (instructions for the next agent)

Never regenerate from scratch. On each re-run:
1. Re-verify every gap in the fix tracker against current code (the file:line evidence is the contract). Flip status to Fixed where resolved, In Progress where a branch exists.
2. Re-run the verification commands in the appendix (contrast script, grep counts) and update any drifted numbers.
3. Add newly found gaps with the next free `ADA-###` id. Ids are stable forever; never renumber.
4. Recompute category scores and the overall mean if the balance of evidence changed.
5. Append a dated changelog entry (bottom of this file and of the HTML) summarizing status flips, score changes, and new gaps.
6. Mirror every change into `ADA_AUDIT.html`.

---

## 1. Interaction — 3 / 5

Intuitive gestures, fluid transitions, purposeful haptics, zero-friction core flows.

### Evidence, strengths

- **The core loop is genuinely one tap.** Once a habit is being broken, the daily skip or slip is a single tap with no confirmation dialog (`components/habit-logging/CheckInCard.tsx:119-125, 206-212`). The tap fires a success haptic and settles the answer immediately; "Change answer" and "Spent less than usual" links appear after, so speed never costs correctness (`CheckInCard.tsx:257-274`). Missed yesterday gets inline backfill buttons (`:277-299`). This is award-grade flow design.
- **Expense logging is two taps minimum**: type an amount, tap Save; category defaults to Other and the form auto-expands only when amount > 0 (`components/AddExpenseSection.tsx:93-99, 119`). Merchant autocomplete from prior entries (`:74-91`).
- **Haptics are purposeful and restrained**: exactly 3 call sites, all money moments. Success notification on expense save (`AddExpenseSection.tsx:135`) and on skip/slip (`CheckInCard.tsx:86`), light impact per keypad press (`AmountInput.tsx:80`). Centralized in `utils/motion.ts:40-47`, best-effort, never throws.
- **The drag sheet behaves like a real sheet**: `TodayExpensesPanel` snaps to the nearest point using gesture velocity (`components/TodayExpensesPanel.tsx:115-127`, spring tension 65 friction 11).
- **Onboarding respects the user**: two-door fork, skippable, resumes mid-flow if interrupted (`app/onboarding/welcome.tsx:39-53`), and the guided log writes a real first expense rather than a demo (`app/onboarding/guided-log.tsx`).

### Gaps (ranked by impact-to-effort)

| Id | Gap | Evidence |
|---|---|---|
| ADA-001 | **P0 crash on the Habits tab**, fresh install, release/Hermes build only. The core loop is unreachable for a new TestFlight user. Root causes identified: mixed native/JS animation drivers on one node (`components/habit-logging/KeptHero.tsx:66-75`, scale `useNativeDriver: true` in parallel with JS-driven tint) and Reanimated worklet serialization on New Architecture in `CheckInCard.tsx`, `WeekStrip.tsx`, `AddExpenseSection.tsx`. An uncommitted fix exists in worktree `.claude/worktrees/fix-habits-tab-crash`; land it first. | `primer.md:15-16`, commit `2f536a9` |
| ADA-002 | **Settings is fully built but unreachable.** Hidden from the tab bar (`app/(tabs)/_layout.tsx:73-78`, `href: null`) and nothing anywhere pushes `/settings` (grep-verified). Currency picker, Restore Purchases, Privacy, and Terms have no entry point in the shipped app; the latter two are App Store review liabilities. | `app/(tabs)/settings.tsx` |
| ADA-011 | **Errors are silent.** Failures land in `.catch(() => {})` with no user-facing error state anywhere (for example `app/(tabs)/settings.tsx:34,38`, `components/habit-logging/KeptHero.tsx:35`). Award-bar apps tell the user when something failed and what to do. | app-wide |
| ADA-012 | **Loading is plain text and hydration can flash.** Habits, reports, categories render the word "loading" (`app/(tabs)/habits.tsx:257-260`); contexts start with empty arrays before async hydration; `expo-splash-screen` is configured but `preventAutoHideAsync` is never used to bridge the gap. | `app/index.tsx:21-27` |
| ADA-025 | **Transitions are stock defaults.** No custom transition, shared element, or continuity gesture anywhere; habit detail's transparent header (`app/habit/[id].tsx:118-135`) is the only navigation flourish. | `app/_layout.tsx` |
| ADA-026 | **Narrow haptic vocabulary.** Only success and light impact are used; destructive actions (Stop tracking, delete category) and errors give no tactile signal, and selection changes (chips, plan cards) are silent. | `utils/motion.ts:40-47` |

Why 3: the core loop earns a 4-5 on its own, but a P0 crash on the loop's home tab, an unreachable settings surface, and silent failure handling are disqualifying at award level.

---

## 2. Visuals and graphics — 3 / 5

Typography hierarchy, color system, iconography, spacing rhythm, motion design.

### Evidence, strengths

- **Color is a real, disciplined token system**, the strongest visual asset. `constants/theme.ts` is the single source (52 of 57 screen/component files consume it via `useTheme()` + `createStyles(theme)`); semantic families are documented in place: slip states deliberately neutral, never red (`theme.ts:33-38`), Leak Scan tier badges as bg+ink pairs (`:45-51`), the SpendPulse heat ramp (`:55`), habit-class badges (`:66-73`). Comments encode principles: green positive-only, "shape + label, never color alone."
- **Motion has a philosophy**: concentrated on the two money moments (log-save, skip), all timings inside the 100-250ms purposeful band except the deliberately slow 550ms celebration ring. Full inventory in appendix A.
- **One icon family, used consistently**: Ionicons only, 47 rendered instances, outline variants for tabs (`app/(tabs)/_layout.tsx:39-69`), no family mixing.
- **App icon suite is complete**: light, dark, and tinted iOS variants wired (`app.json` `ios.icon`), Android adaptive + monochrome, splash via the config plugin.

### Gaps (ranked by impact-to-effort)

| Id | Gap | Evidence |
|---|---|---|
| ADA-006 | **No typography scale.** 323 hardcoded `fontSize` literals across 20 distinct sizes; 13, 14, and 15 are used near-interchangeably for body text (53, 63, and 50 times respectively). Weight distribution is top-heavy: '600' x90, '700' x81, '800' x19, '400' x1, so body copy reads bold-on-bold and hierarchy flattens. No named text styles exist (`constants/theme.ts` holds colors only; `docs/DESIGN.md:242` confirms tokens are a "future consideration"). | app-wide |
| ADA-007 | **No spacing or radius tokens.** 18 distinct `borderRadius` values; 12 is the de-facto card radius (52 uses) but 16 (20) and 14 (19) fight it on sibling cards. Padding and gaps are literal integers per stylesheet, not a 4/8 scale. | app-wide |
| ADA-014 | **No shared primitives.** Zero Button, Card, Text, or Sheet components; roughly 42 files hand-roll `TouchableOpacity`/`Pressable` styling, which is the mechanical cause of ADA-006/007 drift. Two different components are both named `HabitCard` (`components/leak-scan/HabitCard.tsx`, `components/habit-logging/HabitCard.tsx`). | `components/` |
| ADA-013 | **Two animation systems coexist.** Reanimated 4 in newer components (`AddExpenseSection`, `WeekStrip`, `CheckInCard`) and classic `Animated` in older ones (`TodayExpensesPanel.tsx:122`, `KeptHero.tsx:66-75`); the mixed-driver pattern in KeptHero is also the ADA-001 crash source. Even AddExpenseSection uses both in one file (`:93-99` vs `:147-150`). | see evidence |
| ADA-016 | **Dead visual surface and stale docs.** `expo-linear-gradient` is a dependency with zero imports; `fabGradientStart/End` tokens have no consumer (`theme.ts:21-22`); `expo-font` loads no custom face; `CLAUDE.md:159,185-186` and `docs/DESIGN.md` still claim dark mode and PieChart/LineChart/ProgressRing components that do not exist. | see evidence |

Why 3: the color system shows award-level intentionality, but typography and spacing, the two loudest visual signals, run on unmanaged literals, and the system-font-only, stock-component look reads functional rather than distinctive.

---

## 3. Delight and fun — 3 / 5

Moments of surprise, micro-interactions, personality without gimmicks.

### Evidence, strengths

- **The kept-dollars celebration is honest and earned.** `KeptHero` counts up with a scale + green tint pulse only on increase (`components/habit-logging/KeptHero.tsx:65-76`), and announces the settled value to VoiceOver rather than animating silently. The counter celebrates money kept, never spend.
- **The skip micro-interaction stacks three cheap signals** into one satisfying beat: button press-down spring (100/140ms), expanding 550ms ring, success haptic (`CheckInCard.tsx:91-106`), then the WeekStrip dot pops in (`WeekStrip.tsx:58-62`). Cause and effect are legible.
- **Save has a check-morph moment**: the save button pops (1.06 scale) and morphs to a check for 550ms before the form resets (`AddExpenseSection.tsx:147-155`).
- **Personality shows in the writing**: the reveal number carries a mandatory tilde and an honesty line (`app/onboarding/reveal.tsx`), and empty states coach rather than apologize (`app/(tabs)/habits.tsx:281-306`, detection-progress meter `:263-279`).

### Gaps (ranked by impact-to-effort)

| Id | Gap | Evidence |
|---|---|---|
| ADA-027 | **Delight stops at the two money moments.** Milestones (1, 3, 7, 14, 30, 66 days) pass without any celebration; streak achievements, first leak plugged, and first week kept are unmarked. The delight architecture exists but fires on almost nothing. | `utils/` streak logic, no celebration call sites |
| ADA-012 | Loading and waiting moments are dead air (plain "loading" text), the cheapest place personality is missing. | `app/(tabs)/habits.tsx:257-260` |
| ADA-026 | No tactile personality outside the three haptic sites; selection, destructive, and error moments are flat. | `utils/motion.ts` |

Why 3: what exists is tasteful, honest, and on-brand (no gimmicks, no confetti debt), but the surface area is thin; an ADA judge would find two good moments and then nothing for the rest of the app.

---

## 4. Inclusivity — 2 / 5

VoiceOver, Dynamic Type, contrast, Reduce Motion, localization readiness.

### Evidence, strengths

- **A deliberate, tested VoiceOver layer**: `utils/a11y.ts` (79 lines) builds every habit-surface label from spec (`docs/design-package-phase2/09-p2-5-accessibility-matrix.md`), unit-tested for exact wording in `__tests__/a11y.test.ts`. Decorative icons are hidden (`app/(tabs)/habits.tsx:286-287`, `components/habit-logging/KeptHero.tsx:95-102`), icon-only buttons are labeled (back, edit, delete, calendar nav, paywall close), `accessibilityState` marks selected/disabled/checked (`app/paywall.tsx:168`). The kept-hero settle value is announced (`reveal.tsx:100` uses a live announcement too).
- **Reduce Motion is exemplary.** A live hook (`utils/motion.ts:19-37`, subscribes to `reduceMotionChanged`) gates every animated component; CheckInCard applies animated styles only when `!reduceMotion` (`CheckInCard.tsx:88-91,111`). Haptics intentionally still fire (documented, `motion.ts:6-8`), which is the correct call.
- **Currency is properly international**: integer cents, `Intl.NumberFormat` with per-currency locale, zero-decimal JPY handled (`utils/currency.ts:24-32,70-76`), unit-tested.
- 44pt calendar targets were addressed in the P2-5 pass (PR #17).

### Gaps (ranked by impact-to-effort)

| Id | Gap | Evidence |
|---|---|---|
| ADA-003 | **Every primary CTA fails contrast.** White text on `primary #4CAF50` computes to **2.78:1** (AA requires 4.5:1 normal, 3:1 large); this pair is the core Skip button (`CheckInCard.tsx:470-483`), onboarding CTAs (`welcome.tsx:132`), paywall purchase button (`paywall.tsx:311,377`), and the save button (`AddExpenseSection.tsx:390`). `primaryDark #388E3C` at 4.12:1 passes large-text and is already in the palette. | `constants/theme.ts:6` |
| ADA-005 | **Dynamic Type will clip, not reflow.** Zero uses of `maxFontSizeMultiplier` or any scaling strategy (grep: 0 hits) combined with fixed-height containers (tab bar `height: 84`, `app/(tabs)/_layout.tsx:16-18`; fixed button and row heights throughout). RN scales text by default, so at accessibility sizes text grows into boxes that cannot. | app-wide |
| ADA-004 | **Tertiary text and inactive tab icons fail AA.** `textTertiary #9E9E9E` = 2.68:1 on white, 2.52:1 on `#F8F8F8`; used for captions, placeholders, and `tabIconDefault`. Combined `textSecondary`/`textTertiary` usage: 184 references, and `textSecondary #757575` itself sits at 4.34:1 on `#F8F8F8`, just under AA. | `constants/theme.ts:11-12` |
| ADA-023 | **Badge and calendar accents under AA**: `tierLikelyInk #B26A00` on `#FFF3E0` = 3.86:1 at caption size; `calendarDow #B8860B` on `#F8F8F8` = 3.06:1. | `theme.ts:23,48` |
| ADA-008 | **Dates are locale-hostile.** 13 hardcoded `'en-US'` format calls across 8 files (`app/(tabs)/expenses.tsx:32`, `contexts/ReportsContext.tsx:233-244` incl. an English "Week of" prefix, `components/leak-scan/ResultsScreen.tsx:51-57,144`, others) while currency respects locale. Only `EventHistory.tsx:15` does it right. | see evidence |
| ADA-009 | **String stragglers outside `constants/strings.ts`**, including `accessibilityLabel="Amount in dollars"` which is wrong for 6 of the 7 supported currencies (`components/AmountInput.tsx:70,87`); also `AddExpenseSection.tsx:205,217,235`, `CategoryRow.tsx:111`, `ToggleRow.tsx:43`, and all of `utils/a11y.ts`. | see evidence |
| ADA-010 | **WidgetCard trend arrow speaks color only.** The up/down `Ionicons` carrying "spend up is bad" is neither labeled nor hidden from VoiceOver (`components/WidgetCard.tsx:269-273`). | see evidence |
| ADA-024 | **No rendered-tree a11y coverage.** Tests verify label strings only; no render tests, no Dynamic Type or focus-order checks. The on-device VoiceOver walk is deferred to Phase 4 `[ratified]` (decision 0008) and must pass before store submission. | `__tests__/a11y.test.ts` |

Why 2: the VoiceOver and Reduce Motion work is genuinely strong, but the two heaviest-weight inclusivity criteria fail measurably today: contrast fails on the primary action of every screen, and large-text users get clipped layouts. ADA Inclusivity winners are flawless on exactly these two.

---

## 5. Innovation — 2 / 5

Novel use of platform capabilities in service of the core job.

### Evidence, strengths

- **The Leak Scan is a genuinely novel mechanic**: a fully on-device, zero-network CSV pipeline (10MB / 50k rows / 5 files caps) with automatic column and sign inference capped at two user questions, confidence tiers, and a graceful-failure path that lands the user in the manual flow instead of a dead end (`app/leak-scan.tsx:37-45`, `components/leak-scan/`, `utils/leakScan/`). Privacy as a design material, not a checkbox. This is the app's strongest award story.
- The no-network rule is real and enforced (single env-gated PostHog exception, `app/_layout.tsx:24-45`).
- `PrivacyOverlay` masks amounts in the iOS app switcher snapshot (`app/_layout.tsx:66-70`), a thoughtful platform-aware touch.

### Gaps (ranked by impact-to-effort)

| Id | Gap | Evidence |
|---|---|---|
| ADA-017 | **Reminder toggles capture intent but nothing ever fires.** `expo-notifications` is not installed; every `reminderEnabled` lands as false-in-effect (`components/leak-scan/ProjectionSection.tsx:30-31`, `utils/leakScan/importWrite.ts:69`). For a habit app, the platform's single highest-leverage capability (timely local notifications at the moment of temptation) is absent. | `package.json` |
| ADA-018 | **Zero home-screen presence.** No WidgetKit widget (the kept counter is a born widget), no Live Activity, no App Intents/Siri ("log a five dollar coffee"), no Shortcuts donation. Entitlements file is an empty dict (`ios/HabitCents/HabitCents.entitlements:3-4`); `app.json` plugins are router/asset/font/splash only. Expo requires a config-plugin or native-target step for these, but that is effort, not impossibility. | see evidence |

Why 2: one genuinely original mechanic (Leak Scan) keeps this off the floor, but ADA Innovation is judged on platform leverage, and the app currently uses the platform as a generic runtime: no notifications, no widget, no intents, no sensors.

---

## 6. State of the platform — 2 / 5

Latest HIG compliance, native components, dark mode, all device sizes.

### Evidence, strengths

- Current stack: Expo SDK 54, RN 0.81, New Architecture enabled, expo-router 6; safe areas handled per screen via `useSafeAreaInsets()` (all tabs, paywall, onboarding); keyboard avoidance on every input sheet (`KeyboardAvoidingView` in 6 modals).
- Complete modern icon suite including iOS 18 tinted variant; Handoff activity registered; custom URL scheme wired (`Info.plist`).
- Storage is corruption-tolerant with backup-on-corrupt reads (`utils/storage.ts:33-41`).

### Gaps (ranked by impact-to-effort)

| Id | Gap | Evidence |
|---|---|---|
| ADA-022 | **Tab bar metrics are hardcoded**, `height: 84, paddingBottom: 28` (`app/(tabs)/_layout.tsx:16-18`) instead of deriving from safe-area insets; wrong on devices whose home-indicator inset differs. | see evidence |
| ADA-021 | **Module-scope `Dimensions.get('window')`** in `app/(tabs)/expenses.tsx:26` and `components/TodayExpensesPanel.tsx:22` captures size once; stale after resize or Stage Manager style changes. `useWindowDimensions` exists for this. | see evidence |
| ADA-015 | **Hand-built sheets where the platform has native ones.** The drag sheet is a `PanResponder` + spring (`TodayExpensesPanel.tsx:90-142`) and modals are `pageSheet` with hand-drawn grabbers; iOS native detents (medium/large) are the HIG-current pattern. | see evidence |
| ADA-028 | **No SF Symbols.** Ionicons throughout; `expo-symbols` (SymbolView) would give the platform's own iconography with weight/scale alignment to text and built-in symbol effects. | `package.json` |
| ADA-019 | **No dark mode.** `userInterfaceStyle: "light"`, ThemeContext hardwired, `useColorScheme` never called; a complete `darkTheme` sits unreferenced (`constants/theme.ts:76-133`). `[ratified]` direction lock 2026-07-02 with a documented revert path (`ThemeContext.tsx:6-12`); an ADA submission would need this revisited. | see evidence |
| ADA-020 | **iPhone-portrait only.** `supportsTablet: false`, no landscape, no size-class adaptation; iPad runs the app in compatibility scale. `[ratified]` scope decision. | `app.json` |

Why 2: the foundations are current (SDK, New Architecture, safe areas), but the app reinvents native surfaces (sheets, tab metrics), skips platform iconography, and ships without dark mode or any device adaptability, the first two things an ADA judge toggles.

---

## Fix tracker

Statuses: Open, In Progress, Fixed. Severity: P0 blocker, P1 award-blocking and user-harming, P2 below award bar, P3 polish. Effort: S < half day, M 1-3 days, L > 3 days. `[ratified]` rows need a product decision before any fix.

| Id | Gap | Category | Status | Severity | Effort | File |
|---|---|---|---|---|---|---|
| ADA-001 | Habits tab P0 crash (mixed drivers + worklet serialization) | Interaction | In Progress | P0 | S | `components/habit-logging/KeptHero.tsx:66-75` |
| ADA-002 | Settings screen unreachable | Interaction | In Progress | P1 | S | `app/(tabs)/_layout.tsx:73-78` |
| ADA-003 | White on primary green 2.78:1 on every primary CTA | Inclusivity | Open | P1 | M | `constants/theme.ts:6` |
| ADA-004 | textTertiary 2.68:1, tab inactive icons fail AA | Inclusivity | Open | P1 | M | `constants/theme.ts:11-12` |
| ADA-005 | Dynamic Type clips: no multiplier caps, fixed-height containers | Inclusivity | Open | P1 | L | `app/(tabs)/_layout.tsx:16-18` + app-wide |
| ADA-006 | No typography scale (323 literals, 20 sizes, weights top-heavy) | Visuals | Open | P2 | L | `constants/theme.ts` |
| ADA-007 | No spacing/radius tokens (18 radii) | Visuals | Open | P2 | M | `constants/theme.ts` |
| ADA-008 | 13 hardcoded en-US date formats in 8 files | Inclusivity | In Progress | P2 | S | `contexts/ReportsContext.tsx:233-244` et al |
| ADA-009 | Strings outside strings.ts incl. currency-wrong "Amount in dollars" | Inclusivity | In Progress | P2 | S | `components/AmountInput.tsx:70,87` |
| ADA-010 | WidgetCard trend icon unlabeled, color-only meaning | Inclusivity | In Progress | P2 | S | `components/WidgetCard.tsx:269-273` |
| ADA-011 | Silent `.catch(() => {})`, no user-facing error states | Interaction | Open | P2 | M | app-wide |
| ADA-012 | Plain-text loading, no splash-to-hydration bridge | Interaction | Open | P2 | M | `app/index.tsx:21-27` |
| ADA-013 | Two animation systems (Reanimated + classic Animated) | Visuals | Open | P2 | M | `components/habit-logging/KeptHero.tsx` |
| ADA-014 | No shared primitives (Button/Card/Sheet), 42 hand-rolled touchables | Visuals | Open | P2 | L | `components/` |
| ADA-015 | Hand-built sheets vs native detents | Platform | Open | P3 | M | `components/TodayExpensesPanel.tsx:90-142` |
| ADA-016 | Dead deps/tokens, stale CLAUDE.md and DESIGN.md claims | Visuals | Fixed | P3 | S | `package.json`, `constants/theme.ts:21-22` |
| ADA-017 | Reminder toggles schedule nothing (no notifications) | Innovation | Open | P2 | L | `package.json` |
| ADA-018 | No widget, Live Activity, App Intents, or Siri | Innovation | Open | P2 | L | `ios/HabitCents/HabitCents.entitlements` |
| ADA-019 | No dark mode `[ratified]` | Platform | Open | P2 | M | `contexts/ThemeContext.tsx` |
| ADA-020 | No iPad or landscape `[ratified]` | Platform | Open | P2 | L | `app.json` |
| ADA-021 | Module-scope Dimensions.get, stale after resize | Platform | In Progress | P3 | S | `app/(tabs)/expenses.tsx:26` |
| ADA-022 | Hardcoded tab bar height 84 / padding 28 | Platform | In Progress | P3 | S | `app/(tabs)/_layout.tsx:16-18` |
| ADA-023 | tierLikelyInk 3.86:1 and calendarDow 3.06:1 under AA | Inclusivity | Open | P2 | S | `constants/theme.ts:23,48` |
| ADA-024 | No rendered a11y/Dynamic Type test coverage; VoiceOver walk deferred `[ratified]` | Inclusivity | Fixed | P2 | M | `__tests__/` |
| ADA-025 | Stock transitions only, no continuity polish | Interaction | Open | P3 | M | `app/_layout.tsx` |
| ADA-026 | Haptic vocabulary limited to success + light | Interaction | In Progress | P3 | S | `utils/motion.ts:40-47` |
| ADA-027 | Milestones and streak wins pass uncelebrated | Delight | Open | P2 | M | habit streak logic |
| ADA-028 | Ionicons instead of SF Symbols | Platform | Open | P3 | M | `package.json` |

---

## Appendix A: motion and animation inventory

Judged against HIG motion guidance and the 150-250ms purposeful-motion bar. All values read from source on 2026-07-24.

| Site | Trigger | Spec | Driver | Reduce Motion |
|---|---|---|---|---|
| `AddExpenseSection.tsx:147-150` | Save tapped | scale 1 -> 1.06 (120ms) -> 1 (160ms), then check-morph reset at 550ms | Reanimated | gated |
| `AddExpenseSection.tsx:96-99` | Amount > 0 | form expand, timing 250ms | classic Animated (same file as Reanimated) | gated |
| `CheckInCard.tsx:91-94` | Skip/slip tapped | button 1 -> 0.96 (100ms) -> 1 (140ms) | Reanimated | gated |
| `CheckInCard.tsx:95-106` | Skip/slip tapped | ring scale 0.3 -> 2.6, opacity 0.5 -> 0, 550ms, JS-side unmount at 560ms | Reanimated | gated |
| `WeekStrip.tsx:58-62` | Day flips to skipped | dot scale 0.4 -> 1.18 (200ms) -> 1 (120ms) | Reanimated | gated |
| `KeptHero.tsx:54-76` | Kept total increases | count-up via 16ms setTimeout steps; scale 1 -> 1.06 (250ms) -> 1 (200ms) parallel with tint 0 -> 1 -> 0 (250/200ms) | classic Animated, **mixed drivers on one node (ADA-001 crash source)** | own gate (`:29-34`) |
| `TodayExpensesPanel.tsx:115-127` | Drag release | spring to nearest snap, tension 65 friction 11, velocity fling | classic Animated + PanResponder | not gated (continuous direct-manipulation response, acceptable) |

Verdicts: timing discipline is genuinely good (every non-celebration value inside 100-250ms); the two gaps are the dual-driver architecture (ADA-013, and its crash consequence ADA-001) and how little of the app the motion touches (ADA-027).

## Appendix B: visual token inventory

- **Palette (light, the only active theme)**: primary `#4CAF50`, primaryDark `#388E3C`, background `#F8F8F8`, surface `#FFFFFF`, text `#212121`, textSecondary `#757575`, textTertiary `#9E9E9E`, border `#E5E7EB`, danger `#DC2626`, chip active `#000000`/`#FFFFFF`.
- **Computed contrast (WCAG relative luminance)**: text on surface 16.10:1; textSecondary on surface 4.61:1, on background 4.34:1 (under AA); textTertiary on surface 2.68:1, on background 2.52:1 (fails); white on primary 2.78:1 (fails); white on primaryDark 4.12:1 (passes large only); tier inks 4.67 / 3.86 / 5.57:1; calendarDow on background 3.06:1; danger on surface 4.83:1; chip active 21.00:1.
- **Type**: system font only (SF on iOS), no custom faces. 323 fontSize literals; distribution 14 x63, 13 x53, 15 x50, 16 x40, 12 x31, 11 x18, 18 x16, 17 x14, 28 x7, 22 x7, 20 x6, 10 x6, 32 x3, 9 x2, 42 x2, then 24/26/30/36/48 x1 each. Weights: '600' x90, '700' x81, '800' x19, '500' x19, '400' x1.
- **Radii**: 12 x52, 16 x20, 14 x19, 3 x16, 10 x10, 999 x9, 8 x9, 4 x6, then 6/5/22 x3, 20/2/13/11 x2, 44/30/18 x1.
- **Shadows**: only `TodayExpensesPanel.tsx:199-203, 276-280`; all other surfaces flat or border-delineated.
- **Icons**: Ionicons, 47 rendered instances, zero other families, no SVG rendering (`react-native-svg` absent).

## Appendix C: verification commands

```bash
# contrast (node): relative-luminance ratio for any pair
node -e "function lum(h){const c=h.replace('#','');const[r,g,b]=[0,2,4].map(i=>parseInt(c.substr(i,2),16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*r+0.7152*g+0.0722*b}function ratio(a,b){const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return(x+0.05)/(y+0.05)};console.log(ratio('#FFFFFF','#4CAF50').toFixed(2))"
# counts
grep -rhoE "fontSize: [0-9]+" app components | sort | uniq -c | sort -rn
grep -rhoE "borderRadius: [0-9]+" app components | sort | uniq -c | sort -rn
grep -rn "hapticSuccess()\|hapticLight" app components --include="*.tsx"
grep -rn "allowFontScaling\|maxFontSizeMultiplier" app components contexts utils | wc -l
grep -rn "'en-US'" app components contexts utils --include="*.ts*" | wc -l
```

---

## Changelog

- **2026-07-24 (second entry)** — Seven gated items decided by Charen (ops ADR 0017): reminders build during beta (ADA-017), full widget + App Intents + Live Activity set on the roadmap (ADA-018), tokens theme-aware but ship light-only (ADA-019), iPad post-launch track (ADA-020), SF Symbols with the primitives work (ADA-028), native detents approved now (ADA-015, no longer decision-gated), sequencing quick-wins-now / structural-steady. Quick-win batch shipped: ADA-016 and ADA-024 Fixed (PRs #31, #38 merged); ADA-002/008/009/010/021/022/026 In Progress (PRs #33-#37 awaiting Charen's device test).
- **2026-07-24** — Initial audit at main `2f536a9`. Scores: Interaction 3, Visuals 3, Delight 3, Inclusivity 2, Innovation 2, Platform 2; overall 2.5/5. 28 gaps filed (ADA-001..028), ADA-001 already In Progress via worktree `fix/habits-tab-crash`. Note: Inclusivity landed one point below the pre-verification estimate after contrast computation surfaced the white-on-primary 2.78:1 failure on all primary CTAs.
