# HabitCents UX/UI debt audit

Living document. Twin of `UXUI_AUDIT.html` (interactive viewer; keep both in sync). Complements `ada-audit/ADA_AUDIT.md` (ADA-### ids remain the accessibility gap tracker; overlapping findings cross-reference rather than duplicate).

- **App**: HabitCents (Expo SDK 54, React Native, expo-router, light mode only, iOS-first)
- **Audit date**: 2026-08-12 (initial run, main @ `9f9430e`, branch `design/audit`)
- **Method**: mechanical scans (contrast math, grep counts) + four scoped deep reviews on Fable 5 (Today+habit-logging, Money/Insights/Categories/Profile, onboarding/leak-scan/paywall, UI primitives+cross-cutting). Every finding carries file:line evidence verified against the code at `9f9430e`; nothing is estimated.
- **Standard**: compliance with the ratified system (`design/PATTERN_VOCABULARY.md`, ADRs 0018-0022) PLUS an independent WCAG-AA/craft bar. Findings are tagged:
  - **DRIFT**: violates the ratified system; fixable without a decision.
  - **SYSTEM-GAP**: the system permits it but it fails the independent bar; routes to a decision, not a silent fix.

## Audit health score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 / 4 | Ratified tokens fail AA (mist text, white-on-sage CTA); Dynamic Type caps on 20 of ~334 Texts |
| 2 | Performance | 2 / 4 | Zero React.memo; 6 of 8 provider values unmemoized; unbounded lists in ScrollViews; sync scan pipeline |
| 3 | Responsive design | 3 / 4 | 44pt honored or hitSlop-padded almost everywhere; SegmentedControl 38pt, uncapped type breaks layouts at AX sizes |
| 4 | Theming | 3 / 4 | Tokens used with discipline; 112 fontSize literals driven by missing scale steps; no spacing tokens exist |
| 5 | Anti-patterns | 3 / 4 | No gamification, no shame coding, gradients exactly on budget; category detail ships red/green P&L coding |
| | **Total** | **13 / 20** | **Acceptable: significant work needed** |

## Anti-patterns verdict

**Pass, with one screen excepted.** The app does not look AI-generated: no border-stripe cards, no gradient text, no bounce easing, no glassmorphism, no hero-metric template, exactly two decorative gradients (both sanctioned), one hard-coded hex outside theme.ts (documented, in the sanctioned aurora). The honesty architecture (evidence floors, refuse-to-extrapolate guards, hatch-not-flat-fill) is distinctive and genuinely designed. The exception is category detail (`app/category/[id].tsx`), which predates the redesign's soul: red up-arrows, green down-arrows, and spend bars in raw identity hues, both named anti-references in `.impeccable.md`.

## Executive summary

- **67 findings**: 2 P0, 14 P1, 30 P2, 21 P3.
- Top issues:
  1. Two ratified color tokens fail WCAG AA at every use: white-on-sage on the primary CTA (2.71:1) and mist as text (2.80:1 in ~57 sites). These are palette decisions, not drift (decision 1).
  2. Dynamic Type caps exist on only 20 of ~334 Texts because the primitives delegate the ratified caps to call sites; serif money is uncapped almost everywhere.
  3. Honesty bugs: Categories labels an all-time sum "this month"; a $0 partial-slip save credits the full skip value; the scan intake never renders its error states.
  4. The scan pipeline runs synchronously on the JS thread (frozen "Reading your files" frame) and is silent for VoiceOver end to end.
  5. The type scale, radii set, and spacing grid are missing the steps the app actually uses; 112 fontSize literals across 47 files are mostly evidence of missing tokens, not sloppiness (decision 2).
- Recommended next steps: resolve decisions 1-3 below, then execute fix phases A-G (end of document).

## Decisions needed (before the gated phases)

**Decision 1: the palette's ratified AA failures.** Mist text (2.80) and white-on-sage CTA (2.71) are ratified tokens that fail the bar the system itself declares. Options: (a) darken in place (mist to ~#6B7A8F, CTA fill to sageDark #2E7D55 which passes at 5.03); (b) split roles: `mistText` (darkened) vs `mistDeco` (current hue, fills only), and ink-on-sage labels keeping the #4CAF82 fill; (c) accept and document as a named deviation (not recommended before a public beta). **Recommendation: (b) for mist, (a) for the CTA.** Same bucket: amberInk darkening (~#8F5500), lavender pill ink treatment, disabled-label legibility, coral small-label handling.

**Decision 2: ratify the real scales instead of policing the current ones.** The literals cluster into steps that have no token: fontSize 14 (x24), 16 (x15), 17 (x6), 26/30 (sheet titles and mid-display, x9); radii 3-5 (x20, all micro-geometry); spacing has no tokens at all and the observed rhythm is 2pt-based. Options: (a) add the missing steps (`label` 14, `button` 16, `lead` 17, `sheetTitle` 26, `displayMid` 30, `radii.micro` 4, a first spacing export) then enforce hard; (b) rewrite 50+ call sites to fit the current incomplete scale. **Recommendation: (a).**

**Decision 3: performance depth before beta.** Options: (a) minimum: useMemo the 6 unmemoized provider values (Toast first: it re-renders 10 consumer files twice per toast, and a toast fires on every mutation) plus the CategoriesContext commit-ref port; ~1 hour, zero visual change, Lane 1; (b) medium: (a) plus React.memo on list rows, Spent history virtualization, HabitsContext ephemeral-slice split; (c) defer until device profiling shows jank. **Recommendation: (a) now, (b) if the owed on-device pass shows dropped frames.**

---

## Findings

Format: id · severity · tag · dimension. Location, impact, fix, suggested command.

### P0 · blocking

**UX-001 · P0 · SYSTEM-GAP · contrast: white-on-sage fails AA on every primary CTA (2.71:1, below even the 3:1 large-text bar).**
Location: the primitives `components/ui/Button.tsx:89-100` (primary) and `components/ui/Chip.tsx:124-127,159-161` (solid selected), inherited by every screen; hand-rolled sites `app/paywall.tsx:440-444,366-372`, `components/leak-scan/HabitCard.tsx:306-318`, `components/leak-scan/ProjectionSection.tsx:218-229`, `components/PrivacyOverlay.tsx:64-77`, `components/money/QuickLogRow.tsx:42-49`; white check on sage dots `components/habit-logging/WeekStrip.tsx:71`, `HistoryCalendar.tsx:131` (3:1 non-text minimum).
Impact: the app's most important action class is below AA for every low-vision user, enforced centrally by the primitive.
Fix: per decision 1; sageDark fill passes at 5.03, or ink labels on sage. Chip's soft tone (sageLight + ink) already proves the house style survives. Command: /polish after the decision.

**UX-002 · P0 · SYSTEM-GAP · contrast: amberInk on amberBg fails AA at five live sites (3.66-4.01:1 at 10.5-11pt).**
Location: `components/leak-scan/TierBadge.tsx:33-38` ("Likely" pill on every KPI card, category row, habit card); `components/leak-scan/HabitCard.tsx:294-305` (yearly-pace pill) and `:66` with `:230-239` (Fixed class pill); `components/leak-scan/ProjectionSection.tsx:179-190` (3-payment flag); `components/money/UpcomingList.tsx:347-357` (multi-payment pill, 10.5pt bold).
Impact: the scan's confidence tier and money-warning metadata, the honesty layer itself, is the least readable text on the results screen.
Fix: darken `amberInk` one step (~#8F5500 passes on the 0.14 tint) in theme.ts; all five sites inherit. Command: /polish.

### P1 · major

**UX-003 · P1 · SYSTEM-GAP · contrast: mist (#8898AA) carries functional text at 2.80:1 on white / 2.95 on snow.**
Location: token `constants/theme.ts:23` (+ aliases textTertiary, tabIconDefault, calendar family); 57 of 63 `theme.mist` uses are `color:`. Load-bearing sites include `components/money/ExpenseRow.tsx:125-130` (logged time), `components/money/UpcomingList.tsx:358-379` (schedule + cadence lines), `components/money/SpentList.tsx:142-150` (day totals), `components/habit-logging/LongArc.tsx:167-174` ("Slips never subtract"), `components/leak-scan/ResultsScreen.tsx:535-541` (evidence window), `app/(tabs)/index.tsx:1101-1104` (interactive "not now"), placeholders in `components/ui/TextField.tsx:59` and `AmountField.tsx:145`, WeekStrip/HistoryCalendar day labels, profile hints and footer.
Impact: the single largest AA debt; captions, placeholders, dates, and legends fail for low-vision users everywhere.
Fix: per decision 1 (recommended: mistText ~#6B7A8F for information, mistDeco for fills). Command: /polish after the decision.

**UX-004 · P1 · DRIFT · dynamic type: the ratified caps (1.3 serif money, 1.5 chrome) are enforced at call sites, not primitives; 20 caps across ~334 Texts.**
Location: uncapped primitives `components/ui/Button.tsx:62`, `Chip.tsx:94`, `SegmentedControl.tsx:58`, `Toast.tsx:166`, `EmptyState.tsx:45-46`, `ConfirmSheet.tsx:74` (body); outright violations `components/ui/AmountDisplay.tsx:92-97` (serif money scales uncapped) and `AmountField.tsx:134-135` (digits capped, currency symbol not). Uncapped serif heroes: `components/habit-logging/KeptHero.tsx:42-50` (42pt), `app/habit/[id].tsx:300-309` (StatBlocks), `app/onboarding/welcome.tsx:199-205` (44pt), `app/paywall.tsx:294-300`, `components/leak-scan/KpiRow.tsx:82-87`, plus serif amounts across Money/Insights (`UpcomingList.tsx:271-279`, `app/category/[id].tsx:369-374,405-410`, `PaceCard.tsx:119-125`, `ScanSnapshotCard.tsx:267-274`).
Impact: at iOS accessibility sizes the kept hero renders ~130pt; side-by-side text+amount rows and the KPI row break irrecoverably.
Fix: bake the caps into the primitives (opt-out, not opt-in), then delete redundant call-site caps; sweep the serif heroes. Command: /typeset.

**UX-005 · P1 · DRIFT · contrast: the lavender pill AA failure LongArc documents and fixes still ships in two siblings.**
Location: fixed at `components/habit-logging/LongArc.tsx:152-158` (uses ink, with the 2.9:1 math in a comment); re-shipped at `components/habit-logging/CheckInCard.tsx:459-469` (cadence pill, 11pt) and `components/habit-logging/CoachMomentSlot.tsx:71-84` (milestone pill).
Impact: known-documented AA failure beside its own fix; the most fixable inconsistency in the audit.
Fix: apply LongArc's ink treatment to both pills. Command: /polish.

**UX-006 · P1 · DRIFT · contrast: paywall hero subtitle and eyebrow fail AA on the lavender gradient.**
Location: `app/paywall.tsx:155-164` (gradient), `:301-308` (15pt subtitle, opacity 0.92), `:286-293` (11pt eyebrow, opacity 0.9). The 30pt serif title passes as large text.
Impact: body-size white text on the lavender end is below 4.5:1 on the app's monetization surface.
Fix: darken the gradient start (indigo-forward) or set subtitle/eyebrow on the darker half without opacity tricks. Command: /polish.

**UX-007 · P1 · DRIFT · honesty: Categories claims "this month" on an all-time sum.**
Location: `app/(tabs)/categories.tsx:103-109` (no date filter) rendered via `components/CategoryRow.tsx:39` and `constants/strings.ts:245`.
Impact: every category row states a fabricated monthly figure; the worst honesty-brand bug found ("never invent statistics").
Fix: filter to the current calendar month, or change the string to name what it sums. Command: /clarify (wording) or direct fix (math).

**UX-008 · P1 · DRIFT · anti-pattern: red/green P&L coding on the category trend.**
Location: `app/category/[id].tsx:206-219` (coral TrendingUp when spend rose, sage when it fell).
Impact: coral is destructive-only and sage never touches spend; this is the named bank-dashboard anti-reference and shame-codes an up month.
Fix: both directions in slate; the arrow and wording carry direction. Command: /quieter.

**UX-009 · P1 · DRIFT · anti-pattern: six-month trend bars filled with raw category identity colors.**
Location: `app/category/[id].tsx:241-251` (`backgroundColor: category.color`; e.g. health #34C39A, a green, on spend; groceries 2.04:1).
Impact: violates "spend bars are mist on snow" and puts failing-contrast hues to data-bearing use.
Fix: `theme.categoryBarFill` on `theme.snow`, as WhereItWentCard and ScanSnapshotCard already do. Command: /quieter.

**UX-010 · P1 · DRIFT · honesty: PaceCard's sage bar fills as the user spends.**
Location: `components/insights/PaceCard.tsx:65-68` (progress = currentSpent / projectedTotal), filled sage at `:133-144`; the comment claims "month progress, not a spend bar" but the math tracks spend.
Impact: spending renders as a filling green bar, the exact inversion the color system exists to prevent.
Fix: fill by days elapsed (true month progress) or restyle the fill mist on snow. Command: /quieter.

**UX-011 · P1 · DRIFT · a11y: no announcement when a check-in answer lands.**
Location: `components/habit-logging/CheckInCard.tsx:163-166` (haptic only) and the onSkip/onSlip paths at `app/(tabs)/index.tsx:710-711`, `app/habit/[id].tsx:124-125`; the ConfirmationBlock ("+$6.50 kept") replaces the question with no announceForAccessibility, and focus drops when the tapped button unmounts. `components/ui/Toast.tsx:88` shows the house pattern.
Impact: the core loop's primary feedback is silent for VoiceOver users (WCAG 4.1.3).
Fix: announce the confirmation headline on both skip and slip paths. Command: /harden.

**UX-012 · P1 · SYSTEM-GAP · performance: the scan pipeline runs synchronously on the JS thread; "Reading your files" is a frozen frame.**
Location: `components/leak-scan/useLeakScanIntake.ts:46,132,154` (runScan called sync); correction re-runs `components/leak-scan/ResultsScreen.tsx:123`; spinner at `IntakeScreen.tsx:54` cannot animate.
Impact: at the hook's own caps (5 files x 50k rows) the UI freezes and VoiceOver focus hangs during the app's biggest data moment.
Fix: yield before scanning (InteractionManager.runAfterInteractions or a setTimeout(0) boundary) so the spinner paints; chunk runScan. Command: /optimize.

**UX-013 · P1 · SYSTEM-GAP · a11y: the entire scan flow is silent for VoiceOver.**
Location: zero announceForAccessibility / accessibilityLiveRegion in the leak-scan scope (grep-verified); stage transitions at `components/leak-scan/IntakeScreen.tsx:37-60`; results replace the view with no focus management.
Impact: a VoiceOver user taps "Choose CSV files" and hears nothing until they explore manually.
Fix: announce scanning start, completion, and failure at the stage machine. Command: /harden.

**UX-014 · P1 · SYSTEM-GAP · UX: IntakeScreen never renders its error states; a failed pick fails silently.**
Location: `components/leak-scan/useLeakScanIntake.ts:117` (no-valid-files), `:134` (pick-failed); `IntakeScreen.tsx` reads only skippedFileMessages (`:85-93`), never `state.error`.
Impact: a document-picker exception bounces the user back to idle with no explanation, the exact dead end the vocabulary bans.
Fix: render a notice line for both error codes (strings additions needed). Command: /harden.

**UX-015 · P1 · SYSTEM-GAP · touch: SpendPulse year view renders 365+ cells at ~7pt with overlapping hitSlops.**
Location: `components/leak-scan/SpendPulse.tsx:41` (53 columns), `:76-85` (per-cell TouchableOpacity ~6pt wide; hitSlop 8 overlaps neighbors so the slop is void).
Impact: motor-impaired users cannot reliably open a day; hundreds of sub-target buttons.
Fix: make year granularity non-interactive (or row-tap into a month); keep per-cell taps for day/month. Command: /adapt.

**UX-016 · P1 · SYSTEM-GAP · performance: the Spent history is unbounded inside a plain ScrollView.**
Location: `app/(tabs)/money.tsx:218-241` mounting `components/money/SpentList.tsx:79-83,117-124` (maps every historical expense; zero virtualization, zero memo).
Impact: a year of daily logging mounts 1000+ Pressable rows per tab switch and re-renders all of them on any expense mutation.
Fix: SectionList + memoized ExpenseRow for the Spent view; categories (~15) and insights cards are fine as-is. Command: /optimize.

### P2 · minor

**UX-017 · P2 · SYSTEM-GAP · typography: the type scale is missing the steps the app actually uses; 112 fontSize literals across 47 of 78 files.**
Location: cluster evidence: 14 (x24, row labels), 16 (x15, incl. `components/ui/Button.tsx:99,115`), 17 (x6, lead text), 26/28/30/32 (sheet titles and mid-display: `ConfirmSheet.tsx:91`, `CurrencySheet.tsx:88`, `AddUpcomingSheet.tsx:788`, `AddCategoryModal.tsx:207`, `paywall.tsx:295`, `intent.tsx:162`, `PaceCard.tsx:120`, `ScanSnapshotCard.tsx:268`, `GracefulFailure.tsx:101`, `PickOneSheet.tsx:234`, `PartialSlipSheet.tsx:106`, `BreakHabitSheet.tsx:313`). Pure drift where a token exists: 13 (x7), 15 (x7), 11 (x7), 13.5 (x3), 12 (x10, near caption 12.5). Off-scale oddities to retire: 9, 10.5, 11.5, 14.5.
Impact: "no sizes off the scale" is unenforceable while the scale lacks its four most common needs; the primitives themselves are offenders.
Fix: per decision 2, add steps, migrate primitives first, sweep mechanically. Command: /typeset.

**UX-018 · P2 · SYSTEM-GAP · layout: the layout token families are incomplete; most "violations" are missing tokens, not drift.**
Location: no spacing export exists in `constants/theme.ts` (radii/shadows/motion/typeScale only); observed rhythm is 2pt-based (108 hits at 6/10/14/18). Radii 3-5 cluster (x20: SpendPulse cells/legend, TierBadge, LongArc bars, insights bars, progress dots) is a missing `radii.micro`. True gutter drift: 16 (x12) and 24 (x8) at screen level vs the ratified 20 (`ResultsScreen.tsx:527-529`, `IntakeScreen.tsx:113`, `GracefulFailure.tsx:86`, `welcome.tsx:178,256`, `paywall.tsx:276`). True radius drift (6 sites): `Toast.tsx:194` (12), `HistoryCalendar.tsx:213` (13), `welcome.tsx:189` (17), `QuickLogRow.tsx:84` (22), `habit/[id].tsx:493` and `intent.tsx:195` (12), `paywall.tsx:362` (6).
Impact: without tokens, drift detection is noise; with them, enforcement becomes honest.
Fix: per decision 2, add spacing + radii.micro, sweep the true drifts. Command: /layout.

**UX-019 · P2 · SYSTEM-GAP · performance: 6 of 8 provider values are unmemoized; the toast provider bites on every mutation.**
Location: `app/_layout.tsx:89-124` (8-deep nesting); unmemoized values `contexts/ThemeContext.tsx:23`, `CategoriesContext.tsx:127-141`, `HabitsContext.tsx:704-731` (two inline arrows at 726, 728), `ReportsContext.tsx:300-313`, `OnboardingContext.tsx:294-315`, `components/ui/Toast.tsx:97` (`value={{ show }}`). Memoized: Currency, Expenses. HabitsProvider consumes useCurrency (`HabitsContext.tsx:177`), so currency changes ripple through every useHabits consumer.
Impact: every toast re-renders all 10 useToast consumer files twice (show + dismiss), and toasts fire on every mutation; clearing a coach moment re-renders the 1200-line Today screen.
Fix: per decision 3; useMemo the six values (Toast first), consider splitting HabitsContext ephemeral slices. Command: /optimize.

**UX-020 · P2 · SYSTEM-GAP · honesty: a partial slip saves $0.00 by default and credits the full skip value.**
Location: `components/habit-logging/PartialSlipSheet.tsx:38-44` (cents starts 0, never prefilled), `:76-78` (Save always enabled); `contexts/HabitsContext.tsx:649-668` (no amount guard).
Impact: one accidental Save fabricates kept money, against "the only accumulated total the app renders is the user's own."
Fix: disable Save at 0 (or treat 0 as cancel). Command: /harden.

**UX-021 · P2 · SYSTEM-GAP · UX: the break-start in-flight guard leaks on throw; the Start button can die for the session.**
Location: `app/(tabs)/index.tsx:306-368` (`breakStartInFlightRef.current = true` at :314, reset only at :368, no try/finally).
Impact: any rejection from seed/start/addExpense leaves the ref stuck true; the button goes permanently dead with no error surfaced.
Fix: try/finally + a failure toast. Command: /harden.

**UX-022 · P2 · SYSTEM-GAP · UX: "Not this one" silently discards a detected leak with no toast, no undo.**
Location: `app/(tabs)/index.tsx:605-607,694-695` with `components/habit-logging/LeakCard.tsx:73-78`; Toast's own contract says every mutating action fires exactly one toast.
Impact: a mis-tap discards a leak the user may never see again.
Fix: toast with undo action (Toast already supports `action`). Command: /harden.

**UX-023 · P2 · SYSTEM-GAP · honesty: recent logs silently truncate at 10.**
Location: `app/category/[id].tsx:294` (`slice(0, 10)`, no count, no view-all).
Impact: a heavy category looks like it has 10 logs; the mirror hides evidence.
Fix: count in the section title ("Recent logs · 10 of 84") or a view-all affordance. Command: /clarify.

**UX-024 · P2 · SYSTEM-GAP · a11y: Sheet has no accessibility escape and its scrim close is hidden from VoiceOver.**
Location: `components/ui/Sheet.tsx:105-115` (accessibilityViewIsModal hides the sibling scrim pressable at `:125-136`); no onAccessibilityEscape anywhere in the file.
Impact: the two-finger-Z escape gesture does nothing; dismissal depends on each sheet's cancel button.
Fix: `onAccessibilityEscape={onClose}` on the panel. Command: /harden.

**UX-025 · P2 · SYSTEM-GAP · a11y: paywall plan picker uses radio roles without a radiogroup and `selected` instead of `checked`.**
Location: `app/paywall.tsx:175-212`; also `strings.paywall.planSelectedLabel` exists but is unused (label built inline at `:185`).
Impact: iOS announces the radios poorly; selection state is under-conveyed.
Fix: radiogroup on the container, `state={{ checked }}` per card, use the strings entry. Command: /harden.

**UX-026 · P2 · DRIFT · a11y: five screen titles missing `accessibilityRole="header"`.**
Location: `components/leak-scan/IntakeScreen.tsx:42,66`, `ResultsScreen.tsx:372`, `GracefulFailure.tsx:53`, `app/paywall.tsx:162`.
Impact: VoiceOver users lose the rotor's header navigation on exactly the long screens that need it.
Fix: add the role at all five sites. Command: /harden.

**UX-027 · P2 · SYSTEM-GAP · a11y: WeekStrip hand-rolls VoiceOver labels, bypassing the unit-tested builder.**
Location: `components/habit-logging/WeekStrip.tsx:23-30,59-63` vs `utils/a11y.ts:22-26` (weekDotLabel; wording diverges: 'not yet' vs 'no log').
Impact: spoken wording differs between surfaces and drifts from the tested accessibility matrix.
Fix: call weekDotLabel, extending it for the out-of-range case. Command: /harden.

**UX-028 · P2 · SYSTEM-GAP · a11y: color swatches are unnamed for VoiceOver.**
Location: `components/AddCategoryModal.tsx:179` (`"color option " + (index + 1)`).
Impact: picking a category color gives no hue information at all.
Fix: name the hues in a lookup beside COLOR_OPTIONS. Command: /harden.

**UX-029 · P2 · SYSTEM-GAP · a11y: the start-over reassurance is never spoken.**
Location: `app/profile.tsx:180-188` passes `hint={strings.settings.startOverHint}` ("data stays on this device"); `components/settings/SettingsRow.tsx:115,125` falls back to the bare label when no accessibilityLabel is given.
Impact: the one row where reassurance matters most is silent for VoiceOver.
Fix: fold `hint` into SettingsRow's default accessible label. Command: /harden.

**UX-030 · P2 · DRIFT · touch: SegmentedControl segments are 38pt with no hitSlop.**
Location: `components/ui/SegmentedControl.tsx:83` (minHeight 38), Pressables at `:46-57` without hitSlop; track padding is exactly the missing 6pt.
Impact: the ONE ratified switching pattern is below the 44pt bar the vocabulary itself sets.
Fix: `hitSlop={{ top: 3, bottom: 3 }}` per segment. One line. Command: /polish.

**UX-031 · P2 · DRIFT · touch: sub-44 targets on the toast action and correction links.**
Location: `components/ui/Toast.tsx:167-176` (action ~33pt effective, on a 2.5s control); `components/habit-logging/CheckInCard.tsx:259-276` ("Change answer", "Spent less than usual?", ~41pt); `app/(tabs)/index.tsx:815-838` (watch-nudge accept and "not now", ~41pt inner touchables).
Impact: correction affordances, the ones anxious users reach for, miss the ratified bar. (Verified fine: HabitLeakRow 38+6/6=50, HistoryCalendar 26+9=44.)
Fix: raise hitSlops; give the toast action a 44pt min-height wrapper. Command: /polish.

**UX-032 · P2 · SYSTEM-GAP · a11y: HabitCard's overflow menu exposes no expanded state and sits at exactly 44pt effective.**
Location: `components/leak-scan/HabitCard.tsx:122-130` (no accessibilityState expanded; minHeight 32 + hitSlop 6).
Impact: menu state is invisible to VoiceOver; the target has zero margin.
Fix: add expanded state; minHeight 40 + hitSlop 4 like its siblings. Command: /harden.

**UX-033 · P2 · SYSTEM-GAP · performance: ResultsScreen re-renders its full tree on every sheet open/close; SpendPulse carries 8 inline style objects.**
Location: `components/leak-scan/ResultsScreen.tsx:104-113` (setOpenCategory/setOpenPulseCell/setReviewQueueOpen); `components/leak-scan/SpendPulse.tsx:108-148,163-180` (inline styles recreated per render; hatch cells compose 4 absolute Views each; 365+ cells at year granularity); zero React.memo in scope.
Impact: every sheet interaction re-renders hundreds of cells and every HabitCard.
Fix: React.memo on SpendPulse/HabitCard/CategoryList/ProjectionSection; hoist inline styles into createStyles. Command: /optimize.

**UX-034 · P2 · SYSTEM-GAP · performance: CategoryTransactionsSheet maps unbounded rows in a plain ScrollView.**
Location: `components/leak-scan/CategoryTransactionsSheet.tsx:67-101` (every spendable row in the category, each with a conditional 10-chip correction row).
Impact: hundreds of rows for a big category over a long window, inside a sheet.
Fix: FlatList inside the sheet, or cap with show-more. Command: /optimize.

**UX-035 · P2 · SYSTEM-GAP · UX: sequential awaited writes with no busy state; a double tap can double-import.**
Location: `components/leak-scan/ResultsScreen.tsx:287-290,320-322,304-307` (await-in-loop on save/bring-in/undo); CTA at `:465-469` has no pending state (the paywall models it correctly at `paywall.tsx:223-227`); also `app/onboarding/intent.tsx:70-94` (handlePick awaits with no pressed lock).
Impact: "Bring in your last 30 days" tapped twice starts a second import pass before the first completes.
Fix: disable-while-pending on the CTAs; batch writes if the context allows; a useRef guard on intent. Command: /harden.

**UX-036 · P2 · SYSTEM-GAP · performance: Today's list renderers are inline with per-row closures and no memoized rows.**
Location: `app/(tabs)/index.tsx:685-727` (renderItem/renderSectionHeader recreated per render; getGoalByHabitId inside renderItem at `:693`; fresh arrow props per row).
Impact: every Today state change re-renders every card including all WeekStrip date math; tolerable at the 5-habit ceiling, wasteful by design.
Fix: React.memo on LeakCard/CheckInCard + stable per-id callbacks. Command: /optimize.

**UX-037 · P2 · DRIFT · vocabulary: SpendPulse's granularity toggle invents a third switcher.**
Location: `components/leak-scan/SpendPulse.tsx:60-70` (standalone chips, role button + selected, not the cloud-track pattern, not tablist/tab).
Impact: violates "do not invent a third switcher" and misses the switcher roles.
Fix: swap to SegmentedControl (small scale); correct roles come free. Command: /distill.

**UX-038 · P2 · DRIFT · vocabulary: tappable rows that open sheets carry no trailing affordance.**
Location: `components/leak-scan/CategoryList.tsx:42-67` (opens CategoryTransactionsSheet), `ResultsScreen.tsx:453-461` (review-queue banner opens sheet).
Impact: the rows rule says chevron = opens in-app; these rows promise nothing.
Fix: add the chevron trailing slot to both. Command: /polish.

**UX-039 · P2 · DRIFT · vocabulary: habit detail hand-rolls a fifth and sixth button style.**
Location: `app/habit/[id].tsx:273-285,445-467` (bespoke secondaryButton with no minHeight, plainButton) instead of `Button variant="secondary"` / `"tertiary"`. Note: theme.ts:33 designates stop-breaking coral/destructive while this trigger is muted slate; possibly deliberate, undocumented.
Impact: the four-button vocabulary becomes six on one screen.
Fix: swap to shared Button; name the slate-vs-coral choice in an ADR note. Command: /distill.

**UX-040 · P2 · SYSTEM-GAP · vocabulary: sibling sheets open with two different header patterns.**
Location: `components/money/ExpenseSheet.tsx:277` (11pt eyebrow head) vs `AddUpcomingSheet.tsx:554`, `AddCategoryModal.tsx:117`, `CurrencySheet.tsx:42` (serif 26 title head).
Impact: the two Money sheets visibly disagree; the vocabulary has no ruling.
Fix: pick one (serif title is the majority) and ratify it in PATTERN_VOCABULARY. Command: /polish + doc.

**UX-041 · P2 · SYSTEM-GAP · UX: the grab handle promises a swipe the sheet cannot do.**
Location: `components/ui/Sheet.tsx:112,169-177` (handle, no pan gesture); `app/(tabs)/index.tsx:286` even documents "backdrop, swipe" dismiss paths that do not all exist.
Impact: an affordance that lies; "every tappable thing declares what it does."
Fix: decision: add swipe-to-dismiss or drop the handle; the vocabulary mandates the handle but not the gesture. Command: /animate (if gesture) or /distill (if drop).

**UX-042 · P2 · DRIFT · theming: PrivacyOverlay's wordmark renders in the system font.**
Location: `components/PrivacyOverlay.tsx:73-82` (fontWeight 800, no fontFamily).
Impact: the surface every app-switcher glance sees is off-brand San Francisco.
Fix: `theme.fonts.uiBold`, drop fontWeight. Command: /polish.

**UX-043 · P2 · SYSTEM-GAP · layout: the toast pill can exceed screen width and hardcodes tab-bar geometry.**
Location: `components/ui/Toast.tsx:189-198` (no maxWidth/margin), `:145` (bottom = 56 + inset duplicated from `_layout.tsx:31`, so toasts float wrong on pushed screens), `:166` (message uncapped, no numberOfLines).
Impact: the longest ratified toast + Undo at large Dynamic Type overflows; the 56 silently breaks if the tab bar changes.
Fix: maxWidth 92% + flexShrink + cap + shared tab-bar-height constant. Command: /harden.

**UX-044 · P2 · SYSTEM-GAP · visual: the first recent-log row draws a stray hairline.**
Location: `app/category/[id].tsx:295` applies rowNoBorder to the wrapper, but the borderTopWidth lives on the inner logRow (`:518-524`), so the suppression does nothing (merchantRow does it correctly at `:268-271`).
Impact: the Recent logs card opens with a floating top border no other card has.
Fix: apply the condition on logRow itself. Command: /polish.

**UX-045 · P2 · SYSTEM-GAP · layout: Money's bottom padding differs from its sibling tabs.**
Location: `app/(tabs)/money.tsx:291` (paddingBottom 24) vs `insights.tsx:250` and `categories.tsx:199` (100).
Impact: if 100 clears the floating tab bar, the last Spent rows sit underneath it.
Fix: shared constant derived from the tab-bar inset. Command: /layout.

**UX-046 · P2 · DRIFT · i18n: nine user-facing strings live outside constants/strings.ts; the calendar is permanently English.**
Location: `components/ui/Sheet.tsx:134` ("Close"; strings.common.close exists), `components/leak-scan/HabitCard.tsx:126` ("More options"), `components/habit-logging/HistoryCalendar.tsx:84,94` (prev/next month) and `:27-31` (English month/DOW names while index.tsx:218-221 uses locale-aware formatDate), `components/habit-logging/WeekStrip.tsx:11-12,23-30` (day names, state words), `components/onboarding/FirstRunRibbon.tsx:39` ("Dismiss"), `components/leak-scan/ReviewQueueSheet.tsx:84-86,93-95` (guessed labels). Context: visible-prose centralization is otherwise ~99 percent real (zero hardcoded JSX prose found).
Impact: violates the strings rule; calendar ignores locale.
Fix: move to strings.ts; derive month/day names from formatDate. Command: /harden.

### P3 · polish

**UX-047 · P3 · SYSTEM-GAP · contrast: disabled Button/Chip is a white label on cloud at 1.18:1, effectively invisible.**
Location: `components/ui/Button.tsx:80-86`, `components/ui/Chip.tsx:136-139,168-170`; ratified in spec 01.
Impact: WCAG exempts disabled controls, but users cannot read what a disabled control would do.
Fix: decision 1 bucket: slate label on cloud. Command: /polish.

**UX-048 · P3 · DRIFT · contrast: sageDark on sageLight sits at 4.48:1, 0.02 under AA.**
Location: `components/habit-logging/KeptHero.tsx:64-81` (11pt eyebrow), `components/habit-logging/HabitLeakRow.tsx:160-164` ("Breaking" chip), `constants/theme.ts:78-79` (tierSolid pair).
Impact: marginal but a stated-bar miss on brand-central chrome.
Fix: nudge sageDark one step darker where it sits on sageLight. Command: /polish.

**UX-049 · P3 · DRIFT · honesty: the projection buffer reads as observed evidence.**
Location: `constants/strings.ts` projectionBuffer ('+12% · irregulars & annual renewals') rendered at `components/leak-scan/ProjectionSection.tsx:114`.
Impact: a spec-sanctioned convention that does not say it is an estimate.
Fix: one word ("estimated buffer") or an ADR note. Command: /clarify.

**UX-050 · P3 · SYSTEM-GAP · UX: raw ISO dates are shown to users in three places.**
Location: `components/leak-scan/PulseDayDetailSheet.tsx:41-43` (header renders cell.key, e.g. "2026-07-14", also the a11y label at `:38`), `CategoryTransactionsSheet.tsx:71`, `ProjectionSection.tsx:74`.
Impact: machine dates in a product that formats dates everywhere else.
Fix: route through formatDate. Command: /clarify.

**UX-051 · P3 · SYSTEM-GAP · honesty: $0.00 skip values save silently in two more sheets.**
Location: `app/habit/[id].tsx:358-361` (EditSkipValueSheet), `components/habit-logging/PickOneSheet.tsx:202-206`.
Impact: every future skip keeps $0.00 with no warning; recoverable but a quiet dead end.
Fix: same guard as UX-020. Command: /harden.

**UX-052 · P3 · SYSTEM-GAP · a11y: external-link rows carry no spoken destination.**
Location: `app/profile.tsx:160-179`, `components/settings/SettingsRow.tsx:108`.
Impact: the ExternalLink icon informs sighted users only.
Fix: accessibilityHint "Opens in your browser". Command: /harden.

**UX-053 · P3 · DRIFT · touch: FirstRunRibbon dismiss is ~38pt; paywall close is exactly 44.**
Location: `components/onboarding/FirstRunRibbon.tsx:35-43` (14pt icon + hitSlop 12), `app/paywall.tsx:138-146` (40pt pill + hitSlop 2; house ScreenHeader uses 4).
Fix: hitSlop 16 on the ribbon; hitSlop 4 on the close. Command: /polish.

**UX-054 · P3 · SYSTEM-GAP · a11y: the calendar's today cell gives no action hint.**
Location: `components/habit-logging/HistoryCalendar.tsx:116-133` (labeled "August 11, no log" only).
Impact: nothing tells VoiceOver that activating opens change-answer.
Fix: accessibilityHint. Command: /harden.

**UX-055 · P3 · SYSTEM-GAP · a11y: two adjacent controls announce identically in QuickLogRow.**
Location: `components/money/QuickLogRow.tsx:34-49` (amount area and plus button, same label, same action).
Impact: VoiceOver hears the same button twice in a row.
Fix: merge into one accessible element. Command: /harden.

**UX-056 · P3 · SYSTEM-GAP · performance: UpcomingList creates a stylesheet per row and keys by index.**
Location: `components/money/UpcomingList.tsx:170-172` (createStyles per row instance), `app/category/[id].tsx:242,269` (key={index} on trend bars and merchant rows).
Fix: hoist row styles; key merchants by name. Command: /optimize.

**UX-057 · P3 · SYSTEM-GAP · correctness: CategoriesContext mutations close over render-scope state.**
Location: `contexts/CategoriesContext.tsx:55-96` (depends on [categories]) vs the commit-ref pattern its siblings built for this bug (`ExpensesContext.tsx:86-104`, `HabitsContext.tsx:169`).
Impact: a rapid add + rename can drop the add; low frequency, known bug class.
Fix: port the commit-ref pattern. Command: /optimize (phase F).

**UX-058 · P3 · SYSTEM-GAP · performance: EventHistory renders unbounded rows.**
Location: `components/habit-logging/EventHistory.tsx:50-61` (all entries inside the screen ScrollView; ~100 rows after two years of a weekly habit).
Fix: cap with show-all if it grows. Command: /optimize.

**UX-059 · P3 · DRIFT · typography: serif appears off-charter in three places while one stat slot uses Inter.**
Location: `components/leak-scan/HabitCard.tsx:224-229` (rank digit in serif), `CategoryList.tsx:117-122` (list-row amounts in serif), `PulseDayDetailSheet.tsx:96-102` (22pt money total in Inter bold, the statCard slot KpiRow renders in serif); `components/habit-logging/LongArc.tsx:91,161-166` (serif italic identity line, a fourth serif place; the R9 handoff sanctions it, the vocabulary does not).
Impact: the three-places serif charter frays at the edges.
Fix: rank to Inter; pick one treatment for stat money; amend the vocabulary for LongArc or name the deviation. Command: /typeset.

**UX-060 · P3 · DRIFT · copy: casing rules broken in two spots.**
Location: `constants/strings.ts:71` ('KEPT SO FAR' stored uppercase; `KeptHero.tsx:42-44` renders raw), `components/money/LoggedTodayList.tsx:36` (JS .toUpperCase() instead of textTransform).
Fix: sentence case in strings; uppercase via style. Command: /polish.

**UX-061 · P3 · DRIFT · hygiene: dead code and knowingly off-ADR state on two screens.**
Location: `app/onboarding/welcome.tsx:147-166` (stripped exploration, comment says ratify-or-revert before shipping; dead ExampleCaption `:59-103`, VALUE_ROWS `:42-45`, unused imports, ~10 orphaned styles `:180-254`); `app/habit/[id].tsx:474-481,488-504` (dead grabber/input styles), `:113-116,391-393` (always-rendered empty description block for seeded habits).
Fix: ratify or revert welcome (ADR 0022 amendment either way); delete dead blocks; conditional description. Command: /distill.

**UX-062 · P3 · SYSTEM-GAP · UX: door pick and import CTAs lack double-tap guards.**
Location: `app/onboarding/intent.tsx:70-94` (handlePick, no pressed lock; can double-fire the analytics event and door write).
Fix: useRef guard. (Import CTAs covered in UX-035.) Command: /harden.

**UX-063 · P3 · DRIFT · theming: the cold-start frame is pure white before snow screens.**
Location: `app/index.tsx:24` (theme.surface inline on the loading frame).
Impact: a white flash against "never pure white pages."
Fix: theme.background. Command: /polish.

**UX-064 · P3 · DRIFT · color: sage on the add-upcoming affordance.**
Location: `components/money/UpcomingList.tsx:101` (dashed add tile's Plus in primaryDark).
Impact: adding a bill is amber-domain money-out, not a kept outcome; sage's signal should stay rare.
Fix: slate, like header chrome icons. Command: /quieter.

**UX-065 · P3 · DRIFT · theming: AuroraBackground borrows category identity colors as decoration, undocumented.**
Location: `components/onboarding/AuroraBackground.tsx:37,39,43` (categoryColors.utility, .transport as gradient stops; also `paywall.tsx:156`); the one local hex (`:11`) is documented, the borrow is not.
Fix: a comment naming the borrow, or promote the two hues to named decorative tokens. Command: /polish.

**UX-066 · P3 · DRIFT · typography: micro type hygiene cluster.**
Location: `components/leak-scan/ProjectionSection.tsx:146-154` (eyebrow at letterSpacing 0.4 uiBold instead of the 0.88 semibold spec); `components/money/SpentList.tsx:105,120` (stacked day totals without tabular-nums; `HabitsList.tsx:80-89` does it right); `components/ui/Toast.tsx:201,206` (13.5 literal where typeScale.control is exactly 13.5).
Fix: three one-liners. Command: /typeset.

**UX-067 · P3 · SYSTEM-GAP · edge cases cluster.**
Location: `app/(tabs)/index.tsx:218-221` (todayLabel memoized with [] goes stale across midnight); `:503-507` (refreshHabits keyed on expenses.length only, so editing amount/merchant never re-runs detection from this screen); `components/habit-logging/SpentKeptChips.tsx:86-91,113-118` (22pt serif amounts can wrap at max cap; add numberOfLines + adjustsFontSizeToFit); `app/(tabs)/_layout.tsx:35-40` (11pt tab labels clip at AX sizes, fixed 56pt bar); `app/category/[id].tsx:189-195` (40pt identity icon can hit 2.04:1 on its tint; consider the darker identity ramp).
Fix: recompute on focus; content hash or comment; wrap guards; scaling handling; ramp. Command: /harden.

---

## Patterns and systemic issues

1. **The AA debt is a token problem, not a call-site problem.** Mist, white-on-sage, amberInk, lavender-on-tint, and the disabled pair all fail at the palette level; roughly 70 percent of the P0/P1 contrast surface disappears with decision 1 plus edits to `constants/theme.ts`, `Button`, and `Chip`.
2. **Compliance lives in primitives when it lives at all.** Chip enforces labels, state, and hitSlop; Sheet, Toast, and SegmentedControl enforce their gaps. Wherever a rule is enforced by a primitive (touchable labeling: 100 percent) it holds; wherever it is delegated to call sites (Dynamic Type caps: 6 percent) it fails. The fix direction is always the same: push the rule into the primitive.
3. **The scales are incomplete, and builders route around them consistently.** fontSize 14/16/17/26/30, micro radii, and a 2pt spacing rhythm all appear dozens of times each with no token to reach for. Ratify what the app already is (decision 2), then enforcement becomes honest.
4. **The honesty architecture is strong at the center, leaky at the edges.** Evidence floors and refuse-to-extrapolate guards are real code; the leaks are peripheral (the "this month" label, the $0 partial slip, the silent leak dismissal, the 10-row truncation).
5. **VoiceOver structure is excellent; VoiceOver feedback is absent.** Labels, roles, and state are near-universal; announcements of what just happened (check-in confirmation, scan stages) are missing entirely.

## Positive findings

- **Motion and crash discipline**: every animated component has a reduced-motion branch on a single driver, with a comment trail back to the release-crash postmortems; the Today pager deliberately stays a plain paged ScrollView with a documented revert path.
- **Honesty guards are real code paths in at least six components**: hasReliableRate gating, PaceCard's refuse-to-extrapolate, ScanSnapshotCard's evidence floor, HabitsList's refusal of unearned credit, median-not-average prefills, the rise-only arc.
- **The primitive layer genuinely enforces**: Chip (label + state + hitSlop to 48), SegmentedControl (tablist/tab), EmojiTile (decorative vs labeled), Icon (fallback glyph instead of a crash), ConfirmSheet (re-entrancy guard).
- **ExpensesContext concurrency is unusually good for a v1**: commit-ref pattern, serialized materializer provably duplicate-free, tombstones, pre-hydration guard.
- **Strings centralization is ~99 percent real** (zero hardcoded JSX prose in 78 files) and the row-affordance vocabulary is genuinely implemented, not just documented (mail-row, hidden decorative chevrons, composed spoken labels).
- **AuroraBackground is a model decorative layer**: pointer-events none, hidden from assistive tech, reduced-motion static frame, one documented hex.
- **Undo-not-confirm deletion restoring list position**, implemented identically in both Money sheets.

## Recommended actions (priority order)

1. **[P0/P1] Decision 1, then `/polish`**: contrast token changes (UX-001, 002, 003, 005, 006, 047, 048) in theme.ts + Button + Chip; category-detail tonal pass via `/quieter` (UX-008, 009, 010, 064).
2. **[P1] `/harden`**: honesty and dead-end fixes needing no decision (UX-007, 011, 013, 014, 020, 021, 022, 035, 051, 062).
3. **[P1] `/optimize`**: scan-pipeline yield (UX-012), Spent virtualization (UX-016); decision 3 minimum (UX-019, 057).
4. **[P1/P2] `/adapt`**: SpendPulse year interaction (UX-015); Dynamic Type caps into primitives via `/typeset` (UX-004).
5. **[P2] Decision 2, then `/typeset` + `/layout`**: scale steps and sweeps (UX-017, 018, 043, 045, 059, 066).
6. **[P2] `/harden` a11y flow batch**: UX-024 through UX-032, 046, 052, 054, 055.
7. **[P2] `/distill`**: vocabulary consolidation (UX-037, 038, 039, 040, 041, 061).
8. **[P3] `/polish`** as the final pass: everything remaining, plus re-verification.

## How to re-run this audit (instructions for the next agent)

Never regenerate from scratch. On each re-run:
1. Re-verify every finding against current code (file:line evidence is the contract). Flip status where resolved.
2. Re-run the mechanical scans (contrast math, fontSize/radii/spacing greps, provider memoization greps) and update drifted numbers.
3. Add new findings with the next free `UX-###` id. Ids are stable forever; never renumber.
4. Recompute dimension scores and the total if the balance of evidence changed.
5. Append a dated changelog entry summarizing flips, score changes, and new findings.
6. Mirror every change into `UXUI_AUDIT.html`.

## Changelog

- **2026-08-12**: initial audit at `9f9430e`. 67 findings (2 P0, 14 P1, 30 P2, 21 P3), health 13/20. Deliverables: this report + interactive viewer. Awaiting Charen's triage of findings and decisions 1-3.
