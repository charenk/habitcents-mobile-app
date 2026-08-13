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
| 1 | Accessibility | 4 / 4 | Contrast (Phase B), Dynamic Type caps (Round 1), and VoiceOver flow (Round 1-2) all resolved: caps are now baked into all 7 primitives, and every open a11y-flow finding closed, including check-in and scan-stage announcements, sheet escape, radiogroup/checked, five header roles, named color swatches, spoken hints, and a merged QuickLogRow element, with two adversarial-review regressions caught and fixed under regression tests (UX-071). Held short of full confidence by one thing: no on-device VoiceOver/TalkBack pass has confirmed any of this yet, and the still-open UX-012 stalls VoiceOver focus during the scan's own frozen frame |
| 2 | Performance | 3 / 4 | Round 1 (Phase F) memoized all 6 previously-unmemoized provider values, virtualized Spent history and CategoryTransactionsSheet, added React.memo to SpendPulse/HabitCard/CategoryList/LeakCard/CheckInCard, and ported CategoriesContext to the commit-ref pattern. Still open: the scan pipeline still runs synchronously on the JS thread (UX-012, unchanged); the new React.memo on LeakCard/CheckInCard is not yet effective, because Today's renderItem still hands them fresh per-render callback identities |
| 3 | Responsive design | 4 / 4 | Every named touch-target finding closed (SegmentedControl hitSlop, toast action, CheckInCard correction links, HabitCard menu, FirstRunRibbon/paywall close, Round 2), and Dynamic Type caps moved into the primitives themselves (Round 1), closing the AX-size layout breakage this score previously cited. No on-device Dynamic Type or motor-accessibility pass has confirmed this yet |
| 4 | Theming | 4 / 4 | Contrast/color-token layer resolved and cleanly role-split (mistText vs mistDeco, sagePressed added), Phase B. The type/spacing scale gap this score once flagged as residual is now also closed (decision 2 shipped, Round 1): fontSize literals fell from 116 to 2, spacing and radii.micro tokens now exist. Already at the ceiling this rubric tracks; nothing outstanding pulls it down |
| 5 | Anti-patterns | 4 / 4 | No gamification, no shame coding, gradients exactly on budget; category detail's red/green P&L coding and raw-identity-hue bars, the one named exception, are now fixed. SpendPulse's invented third switcher (UX-037) and PrivacyOverlay's off-brand wordmark (UX-042) are also closed, reinforcing the pass |
| | **Total** | **19 / 20** | **Very good: the code-level system is essentially complete. What remains is a device-verification pass and a small set of named decisions (UX-012, UX-040, UX-041, UX-060, UX-065), not new engineering** |

## Anti-patterns verdict

**Pass, no exceptions remaining.** The app does not look AI-generated: no border-stripe cards, no gradient text, no bounce easing, no glassmorphism, no hero-metric template, exactly two decorative gradients (both sanctioned), one hard-coded hex outside theme.ts (documented, in the sanctioned aurora). The honesty architecture (evidence floors, refuse-to-extrapolate guards, hatch-not-flat-fill) is distinctive and genuinely designed. The one exception this audit found, category detail (`app/category/[id].tsx`)'s red up-arrows, green down-arrows, and spend bars in raw identity hues, both named anti-references in `.impeccable.md`, is now fixed (UX-008, UX-009). The related sage-on-add-upcoming misuse (UX-064) is also fixed. See the 2026-08-12 changelog entry.

## Executive summary

- **71 findings**: 2 P0, 17 P1, 31 P2, 21 P3. Two of these, UX-068 and UX-069, were caught during Phase A review rather than the original scan; two more, UX-070 and UX-071, were caught during Round 1/2 review. None were part of the initial 67.
- **66 resolved, 5 open.** Phase A (commit `65e725e`): 14 findings. Phase B (current working tree at the time): 11 findings, the palette/contrast decision. Round 1 (commits `618a361` Phase F / `0cd804a` Phases C+D, merged `5772001`): 13 findings, decision 2 (the scale) and decision 3's minimum (performance). Round 2 (current working tree): 27 findings, the accessibility-flow and touch-target batch, plus UX-015's premise correction via the new UX-070, plus the two new findings UX-070 and UX-071, both resolved on arrival. Both P0s are resolved; every P1 but one (UX-012) is resolved. Every resolved finding below carries a Status line; nothing was deleted or renumbered.
- **5 open, all decisions or the one real remaining engineering item:**
  1. UX-012: the scan pipeline still runs synchronously on the JS thread (frozen "Reading your files" frame). The only open finding that is pure unstarted engineering, not a decision.
  2. UX-040 (partial): the code fix landed, ExpenseSheet now matches its Money-sheet siblings, but `PATTERN_VOCABULARY.md` still needs to ratify the serif sheetTitle as the pattern.
  3. UX-041: the sheet's grab handle still promises a swipe-to-dismiss no file implements; needs Charen's call between adding the gesture (ADR, new motion behaviour) or dropping the handle.
  4. UX-060 (partial): `strings.ts`'s all-caps casing is fixed; `LoggedTodayList.tsx`'s JS `.toUpperCase()` is not.
  5. UX-065: AuroraBackground's borrowed category-identity hues are still undocumented.
- **Other open decisions, not tied to a single finding id:** the "stop breaking" color contradiction (theme.ts documents coral/destructive; the shipped trigger renders slate) is preserved as slate and needs an explicit ruling (see UX-039's status). `app/onboarding/welcome.tsx` is still knowingly off ADR 0022 behind a ratify-or-revert comment; only its dead code was cleared (see UX-061's status and UX-017's two by-design fontSize exceptions).
- Resolved since the last run: essentially every accessibility-flow and touch-target finding (Round 2), the full type/spacing scale ratification and the performance architecture minimum (Round 1), plus the two ratified color-token AA failures and the category-detail honesty/anti-pattern bugs from the runs before that. See decision 1-3's shipped notes and the changelog for what actually shipped, round by round.
- Recommended next steps: close the 5 remaining open items above (one engineering task, four Charen decisions), then run the owed on-device VoiceOver/TalkBack and Dynamic Type pass before beta; nothing else in this report blocks it.

## Decisions needed (before the gated phases)

**Decision 1: the palette's ratified AA failures. RESOLVED, shipped in Phase B (current working tree).** Mist text (2.80) and white-on-sage CTA (2.71) are ratified tokens that fail the bar the system itself declares. Options: (a) darken in place (mist to ~#6B7A8F, CTA fill to sageDark #2E7D55 which passes at 5.03); (b) split roles: `mistText` (darkened) vs `mistDeco` (current hue, fills only), and ink-on-sage labels keeping the #4CAF82 fill; (c) accept and document as a named deviation (not recommended before a public beta). **Recommendation: (b) for mist, (a) for the CTA.** Same bucket: amberInk darkening (~#8F5500), lavender pill ink treatment, disabled-label legibility, coral small-label handling.

**Shipped, and where it differs from the recommendation above:** the primary CTA fill stays `#4CAF82`; rather than darkening the fill, the label flips white to ink (2.71 to 6.24), and a new `sagePressed #3D9A6E` covers the pressed fill, because ink on the old sageDark pressed state was only 3.15 and swapping the label color mid-press would flash. Mist splits into `mist` (decorative fills only, 2 sites) and `mistText #677481` (4.78 on white, 4.53 on snow, both pass) for all text and meaning-bearing icons. **Correction: this report originally stated the proposed mistText color as `#6B7A8F` scoring 4.54 on white and passing. That was wrong: `#6B7A8F` is 4.37 on white and 4.14 on snow, and fails the 4.5 floor. `#677481` is the color that actually shipped, and it genuinely passes. See the changelog.** Also shipped: `amberInk #B26A00` to `#8F5500`; `coral #F05A5A` to `#C93B3B` (both directions: label on white and white on the destructive fill); `sageDark #2E7D55` to `#2C7851`; disabled labels white to slate.

**Decision 2: ratify the real scales instead of policing the current ones. RESOLVED, shipped in Round 1.** The literals cluster into steps that have no token: fontSize 14 (x24), 16 (x15), 17 (x6), 26/30 (sheet titles and mid-display, x9); radii 3-5 (x20, all micro-geometry); spacing has no tokens at all and the observed rhythm is 2pt-based. Options were: (a) add the missing steps then enforce hard; (b) rewrite 50+ call sites to fit the current incomplete scale. **Recommendation was (a).** **Shipped:** option (a). `typeScale` gained `label` 14, `button` 16, `lead` 17, `sheetTitle` 26, `displayMid` 30 in Round 1, plus `displayLarge` 36, `quote` 20, `titleSm` 18, `micro` 9 in a second batch; `radii.micro` (4) and a new `spacing` export (a 2pt-rhythm scale: hairline/tight/xs/sm/control/stack/md/lg/xl/gutter/xxl/section) also shipped, along with a `layout` export for shared chrome metrics (tab-bar height, screen bottom clearance). fontSize literals fell from 116 to 2; both remaining literals are named, by-design exceptions (see UX-017's status). The 2pt-rhythm expansion means some values previously flagged as gutter/radius "drift" (16, 24) are now legitimate named scale steps in their own right, not violations under an incomplete scale.

**Decision 3: performance depth before beta. RESOLVED (minimum), shipped in Round 1.** Options were: (a) minimum: useMemo the 6 unmemoized provider values (Toast first: it re-renders 10 consumer files twice per toast, and a toast fires on every mutation) plus the CategoriesContext commit-ref port; ~1 hour, zero visual change, Lane 1; (b) medium: (a) plus React.memo on list rows, Spent history virtualization, HabitsContext ephemeral-slice split; (c) defer until device profiling shows jank. **Recommendation was (a) now, (b) if the owed on-device pass shows dropped frames.** **Shipped:** all of (a), plus most of (b). All 6 provider values are memoized; CategoriesContext has its commit-ref port; React.memo is on SpendPulse, HabitCard, CategoryList, LeakCard, and CheckInCard; Spent history and CategoryTransactionsSheet are virtualized. Not shipped: HabitsContext's ephemeral-slice split, and the added React.memo is not yet fully effective everywhere, because some parent screens (Today's renderItem) still pass fresh per-render callback identities into the memoized children. The scan pipeline (UX-012) remains fully synchronous and unaddressed; it was never part of decision 3's scope.

**Decisions still open, awaiting Charen (no ADR yet):**
- **UX-041, sheet grab handle.** Add real swipe-to-dismiss (needs an ADR, new motion behaviour) or drop the handle. The code now flags this in-place for whoever picks it up.
- **UX-040, Money sheet header pattern (partial).** The serif `sheetTitle` treatment already won in code (ExpenseSheet was moved onto it in Round 2); `PATTERN_VOCABULARY.md` still needs to ratify it as the pattern so a future sheet does not reopen the disagreement.
- **The "stop breaking" color contradiction.** `constants/theme.ts:58-62` documents coral as the app's one destructive color, naming "stop breaking" explicitly; the product has always rendered that trigger in muted slate (see UX-039). Preserved as slate through this round; needs an explicit ruling on whether the token comment or the shipped color is wrong.
- **The welcome splash, `app/onboarding/welcome.tsx`.** Still knowingly off ADR 0022 behind an in-code "ratify or revert" comment. Only its dead code was cleared this round (UX-061); the ratify-or-revert call itself is untouched.

---

## Findings

Format: id · severity · tag · dimension. Location, impact, fix, suggested command.

### P0 · blocking

**UX-001 · P0 · SYSTEM-GAP · contrast: white-on-sage fails AA on every primary CTA (2.71:1, below even the 3:1 large-text bar).**
Location: the primitives `components/ui/Button.tsx:89-100` (primary) and `components/ui/Chip.tsx:124-127,159-161` (solid selected), inherited by every screen; hand-rolled sites `app/paywall.tsx:440-444,366-372`, `components/leak-scan/HabitCard.tsx:306-318`, `components/leak-scan/ProjectionSection.tsx:218-229`, `components/PrivacyOverlay.tsx:64-77`, `components/money/QuickLogRow.tsx:42-49`; white check on sage dots `components/habit-logging/WeekStrip.tsx:71`, `HistoryCalendar.tsx:131` (3:1 non-text minimum).
Impact: the app's most important action class is below AA for every low-vision user, enforced centrally by the primitive.
Fix: per decision 1; sageDark fill passes at 5.03, or ink labels on sage. Chip's soft tone (sageLight + ink) already proves the house style survives. Command: /polish after the decision.
Status: **Resolved**, Phase B (current working tree). Per decision 1's shipped note: label flips white to ink (2.71 to 6.24); `sagePressed #3D9A6E` covers the pressed state.

**UX-002 · P0 · SYSTEM-GAP · contrast: amberInk on amberBg fails AA at five live sites (3.66-4.01:1 at 10.5-11pt).**
Location: `components/leak-scan/TierBadge.tsx:33-38` ("Likely" pill on every KPI card, category row, habit card); `components/leak-scan/HabitCard.tsx:294-305` (yearly-pace pill) and `:66` with `:230-239` (Fixed class pill); `components/leak-scan/ProjectionSection.tsx:179-190` (3-payment flag); `components/money/UpcomingList.tsx:347-357` (multi-payment pill, 10.5pt bold).
Impact: the scan's confidence tier and money-warning metadata, the honesty layer itself, is the least readable text on the results screen.
Fix: darken `amberInk` one step (~#8F5500 passes on the 0.14 tint) in theme.ts; all five sites inherit. Command: /polish.
Status: **Resolved**, Phase B (current working tree). `amberInk` shipped as `#B26A00` to `#8F5500`; passes AA at all five sites.

### P1 · major

**UX-003 · P1 · SYSTEM-GAP · contrast: mist (#8898AA) carries functional text at 2.80:1 on white / 2.95 on snow.**
Location: token `constants/theme.ts:23` (+ aliases textTertiary, tabIconDefault, calendar family); 57 of 63 `theme.mist` uses are `color:`. Load-bearing sites include `components/money/ExpenseRow.tsx:125-130` (logged time), `components/money/UpcomingList.tsx:358-379` (schedule + cadence lines), `components/money/SpentList.tsx:142-150` (day totals), `components/habit-logging/LongArc.tsx:167-174` ("Slips never subtract"), `components/leak-scan/ResultsScreen.tsx:535-541` (evidence window), `app/(tabs)/index.tsx:1101-1104` (interactive "not now"), placeholders in `components/ui/TextField.tsx:59` and `AmountField.tsx:145`, WeekStrip/HistoryCalendar day labels, profile hints and footer.
Impact: the single largest AA debt; captions, placeholders, dates, and legends fail for low-vision users everywhere.
Fix: per decision 1 (recommended: mistText ~#6B7A8F for information, mistDeco for fills). Command: /polish after the decision.
Status: **Resolved**, Phase B (current working tree). Mist split into `mist` (decorative fills, 2 sites) and `mistText #677481` (4.78 on white, 4.53 on snow) for all text and meaning-bearing icons. Correction: this finding originally cited the proposed color as `#6B7A8F` at 4.54, claimed passing; that number was wrong (`#6B7A8F` is 4.37 on white / 4.14 on snow, fails). `#677481` is what shipped and it genuinely passes. See the changelog.

**UX-004 · P1 · DRIFT · dynamic type: the ratified caps (1.3 serif money, 1.5 chrome) are enforced at call sites, not primitives; 20 caps across ~334 Texts.**
Location: uncapped primitives `components/ui/Button.tsx:62`, `Chip.tsx:94`, `SegmentedControl.tsx:58`, `Toast.tsx:166`, `EmptyState.tsx:45-46`, `ConfirmSheet.tsx:74` (body); outright violations `components/ui/AmountDisplay.tsx:92-97` (serif money scales uncapped) and `AmountField.tsx:134-135` (digits capped, currency symbol not). Uncapped serif heroes: `components/habit-logging/KeptHero.tsx:42-50` (42pt), `app/habit/[id].tsx:300-309` (StatBlocks), `app/onboarding/welcome.tsx:199-205` (44pt), `app/paywall.tsx:294-300`, `components/leak-scan/KpiRow.tsx:82-87`, plus serif amounts across Money/Insights (`UpcomingList.tsx:271-279`, `app/category/[id].tsx:369-374,405-410`, `PaceCard.tsx:119-125`, `ScanSnapshotCard.tsx:267-274`).
Impact: at iOS accessibility sizes the kept hero renders ~130pt; side-by-side text+amount rows and the KPI row break irrecoverably.
Fix: bake the caps into the primitives (opt-out, not opt-in), then delete redundant call-site caps; sweep the serif heroes. Command: /typeset.
Status: **Resolved**, Round 1. Dynamic Type caps are now baked into all 7 primitives (opt-out, not opt-in); caps went from 20 of ~334 Texts to universal, including the serif heroes and the AmountDisplay/AmountField cases named above.

**UX-005 · P1 · DRIFT · contrast: the lavender pill AA failure LongArc documents and fixes still ships in two siblings.**
Location: fixed at `components/habit-logging/LongArc.tsx:152-158` (uses ink, with the 2.9:1 math in a comment); re-shipped at `components/habit-logging/CheckInCard.tsx:459-469` (cadence pill, 11pt) and `components/habit-logging/CoachMomentSlot.tsx:71-84` (milestone pill).
Impact: known-documented AA failure beside its own fix; the most fixable inconsistency in the audit.
Fix: apply LongArc's ink treatment to both pills. Command: /polish.
Status: **Resolved**, Phase B (current working tree). CheckInCard and CoachMomentSlot now use LongArc's ink treatment.

**UX-006 · P1 · DRIFT · contrast: paywall hero subtitle and eyebrow fail AA on the lavender gradient.**
Location: `app/paywall.tsx:155-164` (gradient), `:301-308` (15pt subtitle, opacity 0.92), `:286-293` (11pt eyebrow, opacity 0.9). The 30pt serif title passes as large text.
Impact: body-size white text on the lavender end is below 4.5:1 on the app's monetization surface.
Fix: darken the gradient start (indigo-forward) or set subtitle/eyebrow on the darker half without opacity tricks. Command: /polish.
Status: **Resolved**, Phase B (current working tree). Corrected per decision 1's lavender/coral bucket.

**UX-007 · P1 · DRIFT · honesty: Categories claims "this month" on an all-time sum.**
Location: `app/(tabs)/categories.tsx:103-109` (no date filter) rendered via `components/CategoryRow.tsx:39` and `constants/strings.ts:245`.
Impact: every category row states a fabricated monthly figure; the worst honesty-brand bug found ("never invent statistics").
Fix: filter to the current calendar month, or change the string to name what it sums. Command: /clarify (wording) or direct fix (math).
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-008 · P1 · DRIFT · anti-pattern: red/green P&L coding on the category trend.**
Location: `app/category/[id].tsx:206-219` (coral TrendingUp when spend rose, sage when it fell).
Impact: coral is destructive-only and sage never touches spend; this is the named bank-dashboard anti-reference and shame-codes an up month.
Fix: both directions in slate; the arrow and wording carry direction. Command: /quieter.
Status: **Resolved**, Phase B (current working tree). Both directions now render in slate.

**UX-009 · P1 · DRIFT · anti-pattern: six-month trend bars filled with raw category identity colors.**
Location: `app/category/[id].tsx:241-251` (`backgroundColor: category.color`; e.g. health #34C39A, a green, on spend; groceries 2.04:1).
Impact: violates "spend bars are mist on snow" and puts failing-contrast hues to data-bearing use.
Fix: `theme.categoryBarFill` on `theme.snow`, as WhereItWentCard and ScanSnapshotCard already do. Command: /quieter.
Status: **Resolved**, Phase B (current working tree). Trend bars now use `theme.categoryBarFill` on snow, not raw category identity colors.

**UX-010 · P1 · DRIFT · honesty: PaceCard's sage bar fills as the user spends.**
Location: `components/insights/PaceCard.tsx:65-68` (progress = currentSpent / projectedTotal), filled sage at `:133-144`; the comment claims "month progress, not a spend bar" but the math tracks spend.
Impact: spending renders as a filling green bar, the exact inversion the color system exists to prevent.
Fix: fill by days elapsed (true month progress) or restyle the fill mist on snow. Command: /quieter.
Status: **Resolved**, Phase B (current working tree).

**UX-011 · P1 · DRIFT · a11y: no announcement when a check-in answer lands.**
Location: `components/habit-logging/CheckInCard.tsx:163-166` (haptic only) and the onSkip/onSlip paths at `app/(tabs)/index.tsx:710-711`, `app/habit/[id].tsx:124-125`; the ConfirmationBlock ("+$6.50 kept") replaces the question with no announceForAccessibility, and focus drops when the tapped button unmounts. `components/ui/Toast.tsx:88` shows the house pattern.
Impact: the core loop's primary feedback is silent for VoiceOver users (WCAG 4.1.3).
Fix: announce the confirmation headline on both skip and slip paths. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). `CheckInCard` now calls `AccessibilityInfo.announceForAccessibility` with the confirmation headline on both skip and slip paths, via a new shared `confirmationCopy` helper so the spoken and rendered text can never drift apart. Adversarial review caught two defects in the first version of this fix before it merged, both now fixed with dedicated regression tests: see UX-071.

**UX-012 · P1 · SYSTEM-GAP · performance: the scan pipeline runs synchronously on the JS thread; "Reading your files" is a frozen frame.**
Location: `components/leak-scan/useLeakScanIntake.ts:46,132,154` (runScan called sync); correction re-runs `components/leak-scan/ResultsScreen.tsx:123`; spinner at `IntakeScreen.tsx:54` cannot animate.
Impact: at the hook's own caps (5 files x 50k rows) the UI freezes and VoiceOver focus hangs during the app's biggest data moment.
Fix: yield before scanning (InteractionManager.runAfterInteractions or a setTimeout(0) boundary) so the spinner paints; chunk runScan. Command: /optimize.

**UX-013 · P1 · SYSTEM-GAP · a11y: the entire scan flow is silent for VoiceOver.**
Location: zero announceForAccessibility / accessibilityLiveRegion in the leak-scan scope (grep-verified); stage transitions at `components/leak-scan/IntakeScreen.tsx:37-60`; results replace the view with no focus management.
Impact: a VoiceOver user taps "Choose CSV files" and hears nothing until they explore manually.
Fix: announce scanning start, completion, and failure at the stage machine. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). The stage machine now announces scanning start (`IntakeScreen`), completion (`ResultsScreen`), and failure (`GracefulFailure`) via `AccessibilityInfo.announceForAccessibility`.

**UX-014 · P1 · SYSTEM-GAP · UX: IntakeScreen never renders its error states; a failed pick fails silently.**
Location: `components/leak-scan/useLeakScanIntake.ts:117` (no-valid-files), `:134` (pick-failed); `IntakeScreen.tsx` reads only skippedFileMessages (`:85-93`), never `state.error`.
Impact: a document-picker exception bounces the user back to idle with no explanation, the exact dead end the vocabulary bans.
Fix: render a notice line for both error codes (strings additions needed). Command: /harden.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-015 · P1 · SYSTEM-GAP · touch: SpendPulse year view renders 365+ cells at ~7pt with overlapping hitSlops.**
Location: `components/leak-scan/SpendPulse.tsx:41` (53 columns), `:76-85` (per-cell TouchableOpacity ~6pt wide; hitSlop 8 overlaps neighbors so the slop is void).
Impact: motor-impaired users cannot reliably open a day; hundreds of sub-target buttons.
Fix: make year granularity non-interactive (or row-tap into a month); keep per-cell taps for day/month. Command: /adapt.
Status: **Resolved**, Round 2 (current working tree). **Correction: this finding's premise was wrong.** It assumed year granularity renders 365+ daily cells; the data layer (`utils/leakScan/spendPulse.ts` `aggregateCells` + `yearKey`) actually emits one cell per calendar year, so the real defect was a column-count mismatch, not a field of overlapping touch targets. See UX-070 for what the wrong premise actually was and what shipped. The remedy this finding asked for, making year-granularity cells non-interactive, was still applied and is still correct on its own separate merits (a whole calendar year has no single day to open, so a tap has nothing to show), so it is recorded resolved rather than reopened. Cross-reference UX-070.

**UX-016 · P1 · SYSTEM-GAP · performance: the Spent history is unbounded inside a plain ScrollView.**
Location: `app/(tabs)/money.tsx:218-241` mounting `components/money/SpentList.tsx:79-83,117-124` (maps every historical expense; zero virtualization, zero memo).
Impact: a year of daily logging mounts 1000+ Pressable rows per tab switch and re-renders all of them on any expense mutation.
Fix: SectionList + memoized ExpenseRow for the Spent view; categories (~15) and insights cards are fine as-is. Command: /optimize.
Status: **Resolved**, Round 1. `components/money/SpentList.tsx` now renders a `SectionList` with a memoized row (`SpentExpenseRow`), replacing the plain `ScrollView` mapping over every historical expense.

**UX-068 · P1 · SYSTEM-GAP · honesty: date-only ISO keys parsed with `new Date(iso)` render as UTC midnight, showing the wrong day, and for month keys the wrong month, over real spend figures.**
Location: `new Date(iso)` on date-only ISO strings (e.g. `"2026-07-14"`) parses as UTC midnight, so anywhere west of UTC the local calendar reads one day earlier; month-only keys land in the previous month entirely. Affected: `components/leak-scan/PulseDayDetailSheet.tsx`, `components/leak-scan/CategoryTransactionsSheet.tsx`, `components/leak-scan/ProjectionSection.tsx`, and pre-existing sites in `components/leak-scan/ResultsScreen.tsx` including the evidence window. Not in the original 67; found during Phase A review.
Impact: every timezone west of UTC (most of the Americas) sees the wrong day, or the wrong month entirely, printed directly over real spend figures, in the app's honesty-critical evidence surfaces.
Fix: a new `parseDateOnly` helper in `utils/dates.ts` parses date-only strings as local time instead of routing through `new Date(iso)`; 6 regression tests pass across 4 timezones.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-069 · P1 · SYSTEM-GAP · correctness: `restoreDismissedHabit` read a stale render closure, so undo could silently revert unrelated concurrent habit changes.**
Location: `contexts/HabitsContext.tsx`, `restoreDismissedHabit`, reading render-scope `habits` state instead of the commit-ref pattern the codebase already established for this exact bug class (compare `ExpensesContext.restoreExpense`).
Impact: undoing a dismissed habit wrote a pre-dismiss snapshot back to storage; any other habit change that landed in the interim could be silently overwritten and lost. Not in the original 67; found during Phase A review.
Fix: read `habitsRef.current` instead of the closed-over `habits`, matching `ExpensesContext.restoreExpense`.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-071 · P1 · SYSTEM-GAP · a11y: the UX-011 check-in announcement fix shipped with two accessibility defects of its own.**
Location: `components/habit-logging/CheckInCard.tsx`, the announce effect added for UX-011. (a) The same goal's CheckInCard can be mounted twice at once, because opening habit detail is a stack push and Today stays mounted underneath it, so both instances observed the same state change and both called `announceForAccessibility` for one answer, interrupting the utterance mid-word on iOS and queuing it twice on TalkBack. (b) The dedupe compared the confirmation headline TEXT, but a weekly habit allows repeat skips within a period and every repeat resolves to the identical string ("+$5.00 kept."), so every skip after the first was silently swallowed for VoiceOver. Not in the original 69; both defects were caught in adversarial review before the UX-011 fix merged.
Impact: the fix meant to close the core loop's silent-feedback gap would have shipped a new, subtler VoiceOver bug in its place: interrupted or doubled announcements on the common case (two mounted cards), and total silence on the specific case (repeat weekly skips) that most needed the fix.
Fix: a module-level `lastAnnouncedAnswerByGoal` map, keyed by goal id, so whichever mounted instance's effect runs first claims the announcement and the other stays quiet; and an `answerToken` (`dayLogs.length:totalSkips:kept`) that moves on every genuine answer event instead of comparing rendered text, so repeat skips in the same period are each announced. The first attempted fix gated the announcement on navigation focus instead; that was rejected because it would have made a presentational card unrenderable without a navigation container. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). Both defects fixed as described; regression tests added at `__tests__/checkInCardAnnounce.test.tsx`.

### P2 · minor

**UX-017 · P2 · SYSTEM-GAP · typography: the type scale is missing the steps the app actually uses; 112 fontSize literals across 47 of 78 files.**
Location: cluster evidence: 14 (x24, row labels), 16 (x15, incl. `components/ui/Button.tsx:99,115`), 17 (x6, lead text), 26/28/30/32 (sheet titles and mid-display: `ConfirmSheet.tsx:91`, `CurrencySheet.tsx:88`, `AddUpcomingSheet.tsx:788`, `AddCategoryModal.tsx:207`, `paywall.tsx:295`, `intent.tsx:162`, `PaceCard.tsx:120`, `ScanSnapshotCard.tsx:268`, `GracefulFailure.tsx:101`, `PickOneSheet.tsx:234`, `PartialSlipSheet.tsx:106`, `BreakHabitSheet.tsx:313`). Pure drift where a token exists: 13 (x7), 15 (x7), 11 (x7), 13.5 (x3), 12 (x10, near caption 12.5). Off-scale oddities to retire: 9, 10.5, 11.5, 14.5.
Impact: "no sizes off the scale" is unenforceable while the scale lacks its four most common needs; the primitives themselves are offenders.
Fix: per decision 2, add steps, migrate primitives first, sweep mechanically. Command: /typeset.
Status: **Resolved**, Round 1. Decision 2 shipped: fontSize literals fell from 116 to 2 across the app. New typeScale steps: `label` 14, `button` 16, `lead` 17, `sheetTitle` 26, `displayMid` 30 (Round 1), plus `displayLarge` 36, `quote` 20, `titleSm` 18, `micro` 9 added in a second batch; primitives migrated first, then swept mechanically. Two literals remain by design, not drift: `app/onboarding/welcome.tsx:118` (44pt splash hero, pending the welcome ratify-or-revert decision, see UX-061) and `components/leak-scan/CategoryList.tsx:152` (16pt serif money in a list row, awaiting a serif-money scale step).

**UX-018 · P2 · SYSTEM-GAP · layout: the layout token families are incomplete; most "violations" are missing tokens, not drift.**
Location: no spacing export exists in `constants/theme.ts` (radii/shadows/motion/typeScale only); observed rhythm is 2pt-based (108 hits at 6/10/14/18). Radii 3-5 cluster (x20: SpendPulse cells/legend, TierBadge, LongArc bars, insights bars, progress dots) is a missing `radii.micro`. True gutter drift: 16 (x12) and 24 (x8) at screen level vs the ratified 20 (`ResultsScreen.tsx:527-529`, `IntakeScreen.tsx:113`, `GracefulFailure.tsx:86`, `welcome.tsx:178,256`, `paywall.tsx:276`). True radius drift (6 sites): `Toast.tsx:194` (12), `HistoryCalendar.tsx:213` (13), `welcome.tsx:189` (17), `QuickLogRow.tsx:84` (22), `habit/[id].tsx:493` and `intent.tsx:195` (12), `paywall.tsx:362` (6).
Impact: without tokens, drift detection is noise; with them, enforcement becomes honest.
Fix: per decision 2, add spacing + radii.micro, sweep the true drifts. Command: /layout.
Status: **Resolved**, Round 1. `spacing` (a 2pt-rhythm export: hairline/tight/xs/sm/control/stack/md/lg/xl/gutter/xxl/section) and `radii.micro` (4) now exist in `constants/theme.ts`, ratifying the observed rhythm rather than policing an incomplete one; the named true-drift radius sites (Toast, HistoryCalendar, QuickLogRow) were swept to token references, and Money/Toast bottom spacing now derives from the new `layout` export instead of duplicated literals. The values flagged as "16/24 vs the ratified 20" are no longer drift under the expanded scale: both are now named steps in their own right (`spacing.lg`/`spacing.xxl`), which is what decision 2's "ratify the real scale" direction intended. A residual: some lower-traffic call sites still hold spacing/radii values as literals rather than token references; since the values themselves are now legitimate under the expanded scale, this is leftover mechanical cleanup, not live drift.

**UX-019 · P2 · SYSTEM-GAP · performance: 6 of 8 provider values are unmemoized; the toast provider bites on every mutation.**
Location: `app/_layout.tsx:89-124` (8-deep nesting); unmemoized values `contexts/ThemeContext.tsx:23`, `CategoriesContext.tsx:127-141`, `HabitsContext.tsx:704-731` (two inline arrows at 726, 728), `ReportsContext.tsx:300-313`, `OnboardingContext.tsx:294-315`, `components/ui/Toast.tsx:97` (`value={{ show }}`). Memoized: Currency, Expenses. HabitsProvider consumes useCurrency (`HabitsContext.tsx:177`), so currency changes ripple through every useHabits consumer.
Impact: every toast re-renders all 10 useToast consumer files twice (show + dismiss), and toasts fire on every mutation; clearing a coach moment re-renders the 1200-line Today screen.
Fix: per decision 3; useMemo the six values (Toast first), consider splitting HabitsContext ephemeral slices. Command: /optimize.
Status: **Resolved**, Round 1 (decision 3's minimum bucket). All 6 previously-unmemoized provider values now useMemo their context value: Toast (`value={{show}}` was recreated every render), ThemeContext, CategoriesContext, HabitsContext, ReportsContext, and OnboardingContext. HabitsContext ephemeral-slice splitting (decision 3's medium bucket) was not attempted.

**UX-020 · P2 · SYSTEM-GAP · honesty: a partial slip saves $0.00 by default and credits the full skip value.**
Location: `components/habit-logging/PartialSlipSheet.tsx:38-44` (cents starts 0, never prefilled), `:76-78` (Save always enabled); `contexts/HabitsContext.tsx:649-668` (no amount guard).
Impact: one accidental Save fabricates kept money, against "the only accumulated total the app renders is the user's own."
Fix: disable Save at 0 (or treat 0 as cancel). Command: /harden.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-021 · P2 · SYSTEM-GAP · UX: the break-start in-flight guard leaks on throw; the Start button can die for the session.**
Location: `app/(tabs)/index.tsx:306-368` (`breakStartInFlightRef.current = true` at :314, reset only at :368, no try/finally).
Impact: any rejection from seed/start/addExpense leaves the ref stuck true; the button goes permanently dead with no error surfaced.
Fix: try/finally + a failure toast. Command: /harden.
Status: **Resolved**, Phase A (commit `65e725e`). Addendum, Round 2 (current working tree): the same dead-end-button bug class showed up in a second place, `AddCategoryModal`'s Save button, which disabled itself on an empty name with no explanation instead of leaking a ref. Fixed the same way the house pattern (ExpenseSheet's `handleSave`) already establishes: Save now stays live and toasts `strings.toasts.enterCategoryNameFirst` instead of going dead. Recorded against this id rather than as a new finding, since it is the same bug class UX-021 named, at a different site.

**UX-022 · P2 · SYSTEM-GAP · UX: "Not this one" silently discards a detected leak with no toast, no undo.**
Location: `app/(tabs)/index.tsx:605-607,694-695` with `components/habit-logging/LeakCard.tsx:73-78`; Toast's own contract says every mutating action fires exactly one toast.
Impact: a mis-tap discards a leak the user may never see again.
Fix: toast with undo action (Toast already supports `action`). Command: /harden.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-023 · P2 · SYSTEM-GAP · honesty: recent logs silently truncate at 10.**
Location: `app/category/[id].tsx:294` (`slice(0, 10)`, no count, no view-all).
Impact: a heavy category looks like it has 10 logs; the mirror hides evidence.
Fix: count in the section title ("Recent logs · 10 of 84") or a view-all affordance. Command: /clarify.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-024 · P2 · SYSTEM-GAP · a11y: Sheet has no accessibility escape and its scrim close is hidden from VoiceOver.**
Location: `components/ui/Sheet.tsx:105-115` (accessibilityViewIsModal hides the sibling scrim pressable at `:125-136`); no onAccessibilityEscape anywhere in the file.
Impact: the two-finger-Z escape gesture does nothing; dismissal depends on each sheet's cancel button.
Fix: `onAccessibilityEscape={onClose}` on the panel. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). `onAccessibilityEscape={onClose}` added to the sheet panel.

**UX-025 · P2 · SYSTEM-GAP · a11y: paywall plan picker uses radio roles without a radiogroup and `selected` instead of `checked`.**
Location: `app/paywall.tsx:175-212`; also `strings.paywall.planSelectedLabel` exists but is unused (label built inline at `:185`).
Impact: iOS announces the radios poorly; selection state is under-conveyed.
Fix: radiogroup on the container, `state={{ checked }}` per card, use the strings entry. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). The plan container now carries `accessibilityRole="radiogroup"`, each card `accessibilityState={{ checked }}`.

**UX-026 · P2 · DRIFT · a11y: five screen titles missing `accessibilityRole="header"`.**
Location: `components/leak-scan/IntakeScreen.tsx:42,66`, `ResultsScreen.tsx:372`, `GracefulFailure.tsx:53`, `app/paywall.tsx:162`.
Impact: VoiceOver users lose the rotor's header navigation on exactly the long screens that need it.
Fix: add the role at all five sites. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). `accessibilityRole="header"` added at all five titles.

**UX-027 · P2 · SYSTEM-GAP · a11y: WeekStrip hand-rolls VoiceOver labels, bypassing the unit-tested builder.**
Location: `components/habit-logging/WeekStrip.tsx:23-30,59-63` vs `utils/a11y.ts:22-26` (weekDotLabel; wording diverges: 'not yet' vs 'no log').
Impact: spoken wording differs between surfaces and drifts from the tested accessibility matrix.
Fix: call weekDotLabel, extending it for the out-of-range case. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). WeekStrip now calls `weekDotLabel`, extended for the out-of-range case, instead of hand-rolling its own wording. Side effect worth recording: the today-unanswered cell now reads "Monday, today" instead of the previous "today, not answered yet", because that is what the ratified, unit-tested builder emits.

**UX-028 · P2 · SYSTEM-GAP · a11y: color swatches are unnamed for VoiceOver.**
Location: `components/AddCategoryModal.tsx:179` (`"color option " + (index + 1)`).
Impact: picking a category color gives no hue information at all.
Fix: name the hues in a lookup beside COLOR_OPTIONS. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). A `COLOR_OPTION_HUE_NAMES` lookup beside COLOR_OPTIONS now names each hue ("coral red", "sky blue", etc.); a stored-but-orphaned legacy swatch with no hue name keeps the old positional fallback rather than claiming a hue it was never given.

**UX-029 · P2 · SYSTEM-GAP · a11y: the start-over reassurance is never spoken.**
Location: `app/profile.tsx:180-188` passes `hint={strings.settings.startOverHint}` ("data stays on this device"); `components/settings/SettingsRow.tsx:115,125` falls back to the bare label when no accessibilityLabel is given.
Impact: the one row where reassurance matters most is silent for VoiceOver.
Fix: fold `hint` into SettingsRow's default accessible label. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). SettingsRow now accepts an `accessibilityHint` prop and applies the external-link row's own hint (strings.settings.opensInBrowserHint) automatically rather than dropping it.

**UX-030 · P2 · DRIFT · touch: SegmentedControl segments are 38pt with no hitSlop.**
Location: `components/ui/SegmentedControl.tsx:83` (minHeight 38), Pressables at `:46-57` without hitSlop; track padding is exactly the missing 6pt.
Impact: the ONE ratified switching pattern is below the 44pt bar the vocabulary itself sets.
Fix: `hitSlop={{ top: 3, bottom: 3 }}` per segment. One line. Command: /polish.
Status: **Resolved**, Round 2 (current working tree). `hitSlop={{ top: 3, bottom: 3 }}` added per segment, exactly as prescribed.

**UX-031 · P2 · DRIFT · touch: sub-44 targets on the toast action and correction links.**
Location: `components/ui/Toast.tsx:167-176` (action ~33pt effective, on a 2.5s control); `components/habit-logging/CheckInCard.tsx:259-276` ("Change answer", "Spent less than usual?", ~41pt); `app/(tabs)/index.tsx:815-838` (watch-nudge accept and "not now", ~41pt inner touchables).
Impact: correction affordances, the ones anxious users reach for, miss the ratified bar. (Verified fine: HabitLeakRow 38+6/6=50, HistoryCalendar 26+9=44.)
Fix: raise hitSlops; give the toast action a 44pt min-height wrapper. Command: /polish.
Status: **Resolved**, Round 2 (current working tree). CheckInCard's "Change answer" and "Spent less than usual?" hitSlops raised 12/12 to 14/14 (clears 44pt on the 14pt label); toast action and watch-nudge targets raised to clear the bar.

**UX-032 · P2 · SYSTEM-GAP · a11y: HabitCard's overflow menu exposes no expanded state and sits at exactly 44pt effective.**
Location: `components/leak-scan/HabitCard.tsx:122-130` (no accessibilityState expanded; minHeight 32 + hitSlop 6).
Impact: menu state is invisible to VoiceOver; the target has zero margin.
Fix: add expanded state; minHeight 40 + hitSlop 4 like its siblings. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). `accessibilityState={{ expanded: menuOpen }}` added; minHeight raised 32 to 40 with hitSlop 4, matching its sibling menu items.

**UX-033 · P2 · SYSTEM-GAP · performance: ResultsScreen re-renders its full tree on every sheet open/close; SpendPulse carries 8 inline style objects.**
Location: `components/leak-scan/ResultsScreen.tsx:104-113` (setOpenCategory/setOpenPulseCell/setReviewQueueOpen); `components/leak-scan/SpendPulse.tsx:108-148,163-180` (inline styles recreated per render; hatch cells compose 4 absolute Views each; 365+ cells at year granularity); zero React.memo in scope.
Impact: every sheet interaction re-renders hundreds of cells and every HabitCard.
Fix: React.memo on SpendPulse/HabitCard/CategoryList/ProjectionSection; hoist inline styles into createStyles. Command: /optimize.
Status: **Resolved**, Round 1. React.memo added to SpendPulse, HabitCard, CategoryList, and LeakCard/CheckInCard (see UX-036); SpendPulse's hatch-line offsets are now built once rather than recreated per render. Note: the memoization is present but not yet fully effective everywhere it was added, because some parent screens still pass fresh per-render callback identities into these components; see Performance in the health score.

**UX-034 · P2 · SYSTEM-GAP · performance: CategoryTransactionsSheet maps unbounded rows in a plain ScrollView.**
Location: `components/leak-scan/CategoryTransactionsSheet.tsx:67-101` (every spendable row in the category, each with a conditional 10-chip correction row).
Impact: hundreds of rows for a big category over a long window, inside a sheet.
Fix: FlatList inside the sheet, or cap with show-more. Command: /optimize.
Status: **Resolved**, Round 1. `CategoryTransactionsSheet` now renders a `FlatList` instead of mapping every row inside a plain ScrollView.

**UX-035 · P2 · SYSTEM-GAP · UX: sequential awaited writes with no busy state; a double tap can double-import.**
Location: `components/leak-scan/ResultsScreen.tsx:287-290,320-322,304-307` (await-in-loop on save/bring-in/undo); CTA at `:465-469` has no pending state (the paywall models it correctly at `paywall.tsx:223-227`); also `app/onboarding/intent.tsx:70-94` (handlePick awaits with no pressed lock).
Impact: "Bring in your last 30 days" tapped twice starts a second import pass before the first completes.
Fix: disable-while-pending on the CTAs; batch writes if the context allows; a useRef guard on intent. Command: /harden.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-036 · P2 · SYSTEM-GAP · performance: Today's list renderers are inline with per-row closures and no memoized rows.**
Location: `app/(tabs)/index.tsx:685-727` (renderItem/renderSectionHeader recreated per render; getGoalByHabitId inside renderItem at `:693`; fresh arrow props per row).
Impact: every Today state change re-renders every card including all WeekStrip date math; tolerable at the 5-habit ceiling, wasteful by design.
Fix: React.memo on LeakCard/CheckInCard + stable per-id callbacks. Command: /optimize.
Status: **Resolved**, Round 1 (with a caveat). `LeakCard` and `CheckInCard` are now wrapped in `React.memo`. The memo is not yet fully effective: the component's own comment records that renderItem still hands it fresh inline arrow props on every render, so it does not yet bail on unrelated Today re-renders. Stable per-id callbacks were not part of this pass.

**UX-037 · P2 · DRIFT · vocabulary: SpendPulse's granularity toggle invents a third switcher.**
Location: `components/leak-scan/SpendPulse.tsx:60-70` (standalone chips, role button + selected, not the cloud-track pattern, not tablist/tab).
Impact: violates "do not invent a third switcher" and misses the switcher roles.
Fix: swap to SegmentedControl (small scale); correct roles come free. Command: /distill.
Status: **Resolved**, Round 2 (current working tree). SpendPulse's standalone chips are now the shared `SegmentedControl`, which brings the correct tablist/tab roles for free.

**UX-038 · P2 · DRIFT · vocabulary: tappable rows that open sheets carry no trailing affordance.**
Location: `components/leak-scan/CategoryList.tsx:42-67` (opens CategoryTransactionsSheet), `ResultsScreen.tsx:453-461` (review-queue banner opens sheet).
Impact: the rows rule says chevron = opens in-app; these rows promise nothing.
Fix: add the chevron trailing slot to both. Command: /polish.
Status: **Resolved**, Round 2 (current working tree). A trailing `ChevronRight` added to both the CategoryList rows and the review-queue banner.

**UX-039 · P2 · DRIFT · vocabulary: habit detail hand-rolls a fifth and sixth button style.**
Location: `app/habit/[id].tsx:273-285,445-467` (bespoke secondaryButton with no minHeight, plainButton) instead of `Button variant="secondary"` / `"tertiary"`. Note: theme.ts:33 designates stop-breaking coral/destructive while this trigger is muted slate; possibly deliberate, undocumented.
Impact: the four-button vocabulary becomes six on one screen.
Fix: swap to shared Button; name the slate-vs-coral choice in an ADR note. Command: /distill.
Status: **Resolved**, Round 2 (current working tree), for the button consolidation only. Habit detail's bespoke `secondaryButton`/`plainButton` styles are removed; the footer actions now render on the shared `Button` (`variant="secondary"` / `variant="tertiary"`), so the vocabulary is back to four button styles. The slate-vs-coral question named in this finding was NOT resolved and was not an ADR note: `theme.ts:58-62` still documents coral as the app's one destructive color ("delete, stop breaking, undo import"), while the shipped "stop breaking" trigger renders muted slate. This contradiction is preserved as-is and needs an explicit decision from Charen.

**UX-040 · P2 · SYSTEM-GAP · vocabulary: sibling sheets open with two different header patterns.**
Location: `components/money/ExpenseSheet.tsx:277` (11pt eyebrow head) vs `AddUpcomingSheet.tsx:554`, `AddCategoryModal.tsx:117`, `CurrencySheet.tsx:42` (serif 26 title head).
Impact: the two Money sheets visibly disagree; the vocabulary has no ruling.
Fix: pick one (serif title is the majority) and ratify it in PATTERN_VOCABULARY. Command: /polish + doc.
Status: **Still open, decision awaiting Charen.** The code half shipped in Round 2 (current working tree): `ExpenseSheet.tsx` was moved onto the serif `sheetTitle` treatment (`theme.fonts.display` at `typeScale.sheetTitle`), matching AddUpcomingSheet, AddCategoryModal, and CurrencySheet, so the two Money sheets now visibly agree. What is still missing is the documentation half: `design/PATTERN_VOCABULARY.md` has not been updated to ratify the serif title as THE Money-sheet header pattern, so this finding stays open until that ratification lands.

**UX-041 · P2 · SYSTEM-GAP · UX: the grab handle promises a swipe the sheet cannot do.**
Location: `components/ui/Sheet.tsx:112,169-177` (handle, no pan gesture); `app/(tabs)/index.tsx:286` even documents "backdrop, swipe" dismiss paths that do not all exist.
Impact: an affordance that lies; "every tappable thing declares what it does."
Fix: decision: add swipe-to-dismiss or drop the handle; the vocabulary mandates the handle but not the gesture. Command: /animate (if gesture) or /distill (if drop).
Status: **Still open, decision awaiting Charen.** Round 2 added `onAccessibilityEscape` to Sheet (see UX-024) and left an explicit in-code note flagging this exact finding for Charen to pick: (a) add real swipe-to-dismiss (needs an ADR, new motion behaviour), or (b) drop the handle since it currently over-promises. No pan gesture has been added; the handle still promises a swipe the sheet cannot do.

**UX-042 · P2 · DRIFT · theming: PrivacyOverlay's wordmark renders in the system font.**
Location: `components/PrivacyOverlay.tsx:73-82` (fontWeight 800, no fontFamily).
Impact: the surface every app-switcher glance sees is off-brand San Francisco.
Fix: `theme.fonts.uiBold`, drop fontWeight. Command: /polish.
Status: **Resolved**, Round 2 (current working tree). `theme.fonts.uiBold` now carries the weight, `fontWeight: '800'` removed (a loaded font family ignores fontWeight on Android anyway).

**UX-043 · P2 · SYSTEM-GAP · layout: the toast pill can exceed screen width and hardcodes tab-bar geometry.**
Location: `components/ui/Toast.tsx:189-198` (no maxWidth/margin), `:145` (bottom = 56 + inset duplicated from `_layout.tsx:31`, so toasts float wrong on pushed screens), `:166` (message uncapped, no numberOfLines).
Impact: the longest ratified toast + Undo at large Dynamic Type overflows; the 56 silently breaks if the tab bar changes.
Fix: maxWidth 92% + flexShrink + cap + shared tab-bar-height constant. Command: /harden.
Status: **Resolved**, Round 1. Toast now caps at `maxWidth: '92%'`, the message and action carry `numberOfLines` + `maxFontSizeMultiplier`, and the bottom offset derives from the new shared `layout.tabBarHeight` export instead of a duplicated literal.

**UX-044 · P2 · SYSTEM-GAP · visual: the first recent-log row draws a stray hairline.**
Location: `app/category/[id].tsx:295` applies rowNoBorder to the wrapper, but the borderTopWidth lives on the inner logRow (`:518-524`), so the suppression does nothing (merchantRow does it correctly at `:268-271`).
Impact: the Recent logs card opens with a floating top border no other card has.
Fix: apply the condition on logRow itself. Command: /polish.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-045 · P2 · SYSTEM-GAP · layout: Money's bottom padding differs from its sibling tabs.**
Location: `app/(tabs)/money.tsx:291` (paddingBottom 24) vs `insights.tsx:250` and `categories.tsx:199` (100).
Impact: if 100 clears the floating tab bar, the last Spent rows sit underneath it.
Fix: shared constant derived from the tab-bar inset. Command: /layout.
Status: **Resolved**, Round 1. Money now uses the shared `layout.screenBottomClearance` (100) constant, matching insights and categories. Per that constant's own comment, the 100pt value itself is still unverified against a real device pass and is flagged there for a look during the Lane 2 pass.

**UX-046 · P2 · DRIFT · i18n: nine user-facing strings live outside constants/strings.ts; the calendar is permanently English.**
Location: `components/ui/Sheet.tsx:134` ("Close"; strings.common.close exists), `components/leak-scan/HabitCard.tsx:126` ("More options"), `components/habit-logging/HistoryCalendar.tsx:84,94` (prev/next month) and `:27-31` (English month/DOW names while index.tsx:218-221 uses locale-aware formatDate), `components/habit-logging/WeekStrip.tsx:11-12,23-30` (day names, state words), `components/onboarding/FirstRunRibbon.tsx:39` ("Dismiss"), `components/leak-scan/ReviewQueueSheet.tsx:84-86,93-95` (guessed labels). Context: visible-prose centralization is otherwise ~99 percent real (zero hardcoded JSX prose found).
Impact: violates the strings rule; calendar ignores locale.
Fix: move to strings.ts; derive month/day names from formatDate. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). All nine strings moved into `constants/strings.ts`; HistoryCalendar's month name and day-of-week letters now derive from the locale-aware `formatDate` instead of fixed English arrays, matching the rest of the app.

**UX-070 · P2 · DRIFT · layout: SpendPulse's year granularity used a 53-column, GitHub-contribution-graph grid over data that never has more than a handful of cells.**
Location: `components/leak-scan/SpendPulse.tsx` (was `const columns = data.granularity === 'year' ? 53 : 10`), against `utils/leakScan/spendPulse.ts` (`aggregateCells` + `yearKey`), which aggregates year granularity into ONE cell per calendar year and only engages once there is past ~14 months of coverage. Not in the original 69; found and fixed in Round 2.
Impact: two to four cells laid out across a fixed 53-column grid rendered as roughly 6pt slivers scattered across an otherwise empty row, the opposite of legible.
Fix: size the grid to the cells it actually has: `columns = clamp(cells.length, 1, 10)` at year granularity, 10 unchanged at day/month.
Status: **Resolved**, Round 2 (current working tree). **Important and honest: this also corrects UX-015, which was filed against this same `columns` constant but on a wrong premise.** UX-015 assumed year granularity renders 365+ daily cells and therefore a field of overlapping sub-target touch buttons; the data layer never emits more than one cell per year, so that premise was wrong, and the real defect was this column-sizing mismatch. UX-015's own remedy, making year-granularity cells non-interactive, was still applied here and is still correct on independent grounds: a whole calendar year has no single day to open, so a tap has nothing to show. Both findings are recorded resolved, cross-referenced to each other, so a future re-run does not rediscover the same constant twice under two different theories.

### P3 · polish

**UX-047 · P3 · SYSTEM-GAP · contrast: disabled Button/Chip is a white label on cloud at 1.18:1, effectively invisible.**
Location: `components/ui/Button.tsx:80-86`, `components/ui/Chip.tsx:136-139,168-170`; ratified in spec 01.
Impact: WCAG exempts disabled controls, but users cannot read what a disabled control would do.
Fix: decision 1 bucket: slate label on cloud. Command: /polish.
Status: **Resolved**, Phase B (current working tree). Disabled labels shipped as slate on cloud, replacing white on cloud.

**UX-048 · P3 · DRIFT · contrast: sageDark on sageLight sits at 4.48:1, 0.02 under AA.**
Location: `components/habit-logging/KeptHero.tsx:64-81` (11pt eyebrow), `components/habit-logging/HabitLeakRow.tsx:160-164` ("Breaking" chip), `constants/theme.ts:78-79` (tierSolid pair).
Impact: marginal but a stated-bar miss on brand-central chrome.
Fix: nudge sageDark one step darker where it sits on sageLight. Command: /polish.
Status: **Resolved**, Phase B (current working tree). `sageDark` shipped as `#2E7D55` to `#2C7851`, clearing the 4.5 floor on sageLight.

**UX-049 · P3 · DRIFT · honesty: the projection buffer reads as observed evidence.**
Location: `constants/strings.ts` projectionBuffer ('+12% · irregulars & annual renewals') rendered at `components/leak-scan/ProjectionSection.tsx:114`.
Impact: a spec-sanctioned convention that does not say it is an estimate.
Fix: one word ("estimated buffer") or an ADR note. Command: /clarify.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-050 · P3 · SYSTEM-GAP · UX: raw ISO dates are shown to users in three places.**
Location: `components/leak-scan/PulseDayDetailSheet.tsx:41-43` (header renders cell.key, e.g. "2026-07-14", also the a11y label at `:38`), `CategoryTransactionsSheet.tsx:71`, `ProjectionSection.tsx:74`.
Impact: machine dates in a product that formats dates everywhere else.
Fix: route through formatDate. Command: /clarify.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-051 · P3 · SYSTEM-GAP · honesty: $0.00 skip values save silently in two more sheets.**
Location: `app/habit/[id].tsx:358-361` (EditSkipValueSheet), `components/habit-logging/PickOneSheet.tsx:202-206`.
Impact: every future skip keeps $0.00 with no warning; recoverable but a quiet dead end.
Fix: same guard as UX-020. Command: /harden.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-052 · P3 · SYSTEM-GAP · a11y: external-link rows carry no spoken destination.**
Location: `app/profile.tsx:160-179`, `components/settings/SettingsRow.tsx:108`.
Impact: the ExternalLink icon informs sighted users only.
Fix: accessibilityHint "Opens in your browser". Command: /harden.
Status: **Resolved**, Round 2 (current working tree). SettingsRow's external-link rows now carry `strings.settings.opensInBrowserHint` ("opens in your browser") applied automatically (see UX-029, which added the hint plumbing SettingsRow needed).

**UX-053 · P3 · DRIFT · touch: FirstRunRibbon dismiss is ~38pt; paywall close is exactly 44.**
Location: `components/onboarding/FirstRunRibbon.tsx:35-43` (14pt icon + hitSlop 12), `app/paywall.tsx:138-146` (40pt pill + hitSlop 2; house ScreenHeader uses 4).
Fix: hitSlop 16 on the ribbon; hitSlop 4 on the close. Command: /polish.
Status: **Resolved**, Round 2 (current working tree). FirstRunRibbon's dismiss hitSlop raised 12 to 15 per edge (~44pt effective); paywall's close hitSlop raised 2 to 4, matching the house ScreenHeader pill.

**UX-054 · P3 · SYSTEM-GAP · a11y: the calendar's today cell gives no action hint.**
Location: `components/habit-logging/HistoryCalendar.tsx:116-133` (labeled "August 11, no log" only).
Impact: nothing tells VoiceOver that activating opens change-answer.
Fix: accessibilityHint. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). The actionable today cell now carries `accessibilityHint={strings.habitLogging.calendarTodayCellHint}`.

**UX-055 · P3 · SYSTEM-GAP · a11y: two adjacent controls announce identically in QuickLogRow.**
Location: `components/money/QuickLogRow.tsx:34-49` (amount area and plus button, same label, same action).
Impact: VoiceOver hears the same button twice in a row.
Fix: merge into one accessible element. Command: /harden.
Status: **Resolved**, Round 2 (current working tree). The plus button is now `accessible={false}` with `importantForAccessibility="no-hide-descendants"`, hiding it from the accessibility tree; it stays a real, tappable target for sighted/pointer users, but VoiceOver only stops at the amount area now.

**UX-056 · P3 · SYSTEM-GAP · performance: UpcomingList creates a stylesheet per row and keys by index.**
Location: `components/money/UpcomingList.tsx:170-172` (createStyles per row instance), `app/category/[id].tsx:242,269` (key={index} on trend bars and merchant rows).
Fix: hoist row styles; key merchants by name. Command: /optimize.
Status: **Resolved**, Round 1. UpcomingList's per-row stylesheet is hoisted; index keys on the affected rows are replaced.

**UX-057 · P3 · SYSTEM-GAP · correctness: CategoriesContext mutations close over render-scope state.**
Location: `contexts/CategoriesContext.tsx:55-96` (depends on [categories]) vs the commit-ref pattern its siblings built for this bug (`ExpensesContext.tsx:86-104`, `HabitsContext.tsx:169`).
Impact: a rapid add + rename can drop the add; low frequency, known bug class.
Fix: port the commit-ref pattern. Command: /optimize (phase F).
Status: **Resolved**, Round 1 (Phase F). `CategoriesContext` now carries a `categoriesRef` mirror and a `commit()` helper, matching the pattern `ExpensesContext`/`HabitsContext` already established; every mutator reads and writes through it instead of the closed-over `categories` state.

**UX-058 · P3 · SYSTEM-GAP · performance: EventHistory renders unbounded rows.**
Location: `components/habit-logging/EventHistory.tsx:50-61` (all entries inside the screen ScrollView; ~100 rows after two years of a weekly habit).
Fix: cap with show-all if it grows. Command: /optimize.
Status: **Resolved**, Round 2 (current working tree). EventHistory now caps its initial render at 10 rows with a reveal-the-rest affordance. A nested VirtualizedList was deliberately not used: this list sits inside the habit detail screen's own ScrollView, and React Native warns against, and breaks, a VirtualizedList nested in a ScrollView.

**UX-059 · P3 · DRIFT · typography: serif appears off-charter in three places while one stat slot uses Inter.**
Location: `components/leak-scan/HabitCard.tsx:224-229` (rank digit in serif), `CategoryList.tsx:117-122` (list-row amounts in serif), `PulseDayDetailSheet.tsx:96-102` (22pt money total in Inter bold, the statCard slot KpiRow renders in serif); `components/habit-logging/LongArc.tsx:91,161-166` (serif italic identity line, a fourth serif place; the R9 handoff sanctions it, the vocabulary does not).
Impact: the three-places serif charter frays at the edges.
Fix: rank to Inter; pick one treatment for stat money; amend the vocabulary for LongArc or name the deviation. Command: /typeset.
Status: **Resolved**, Round 2 (current working tree). HabitCard's rank digit moved from serif to `theme.fonts.uiSemibold` (Inter), matching the charter's three-places-only rule.

**UX-060 · P3 · DRIFT · copy: casing rules broken in two spots.**
Location: `constants/strings.ts:71` ('KEPT SO FAR' stored uppercase; `KeptHero.tsx:42-44` renders raw), `components/money/LoggedTodayList.tsx:36` (JS .toUpperCase() instead of textTransform).
Fix: sentence case in strings; uppercase via style. Command: /polish.
Status: **Partially resolved**, Round 1. `constants/strings.ts:71` now stores `keptSoFar: 'Kept so far'` in sentence case (was `'KEPT SO FAR'`). The second site is unchanged: `components/money/LoggedTodayList.tsx:54` still calls `.toUpperCase()` in JS on `strings.today.loggedTodayEyebrow` rather than moving the casing into the stylesheet via `textTransform`. Visually identical output either way, but the pattern violation this finding named is only half fixed, so it is not counted as resolved.

**UX-061 · P3 · DRIFT · hygiene: dead code and knowingly off-ADR state on two screens.**
Location: `app/onboarding/welcome.tsx:147-166` (stripped exploration, comment says ratify-or-revert before shipping; dead ExampleCaption `:59-103`, VALUE_ROWS `:42-45`, unused imports, ~10 orphaned styles `:180-254`); `app/habit/[id].tsx:474-481,488-504` (dead grabber/input styles), `:113-116,391-393` (always-rendered empty description block for seeded habits).
Fix: ratify or revert welcome (ADR 0022 amendment either way); delete dead blocks; conditional description. Command: /distill.
Status: **Resolved (dead code only)**, Round 2 (current working tree). The dead code named in this finding is gone: the orphaned ExampleCaption/VALUE_ROWS/unused imports and ~10 orphaned styles in `welcome.tsx`, the dead grabber/input styles in `habit/[id].tsx`, and the always-rendered empty-description block are cleared or made conditional. What is NOT resolved, and remains a separate open decision: `welcome.tsx` still carries its "ratify or revert" comment (now at line 85) and is still knowingly off ADR 0022. See the open-decisions note below.

**UX-062 · P3 · SYSTEM-GAP · UX: door pick and import CTAs lack double-tap guards.**
Location: `app/onboarding/intent.tsx:70-94` (handlePick, no pressed lock; can double-fire the analytics event and door write).
Fix: useRef guard. (Import CTAs covered in UX-035.) Command: /harden.
Status: **Resolved**, Phase A (commit `65e725e`).

**UX-063 · P3 · DRIFT · theming: the cold-start frame is pure white before snow screens.**
Location: `app/index.tsx:24` (theme.surface inline on the loading frame).
Impact: a white flash against "never pure white pages."
Fix: theme.background. Command: /polish.
Status: **Resolved**, Round 2 (current working tree). The loading frame now uses `theme.background` instead of `theme.surface`.

**UX-064 · P3 · DRIFT · color: sage on the add-upcoming affordance.**
Location: `components/money/UpcomingList.tsx:101` (dashed add tile's Plus in primaryDark).
Impact: adding a bill is amber-domain money-out, not a kept outcome; sage's signal should stay rare.
Fix: slate, like header chrome icons. Command: /quieter.
Status: **Resolved**, Phase B (current working tree).

**UX-065 · P3 · DRIFT · theming: AuroraBackground borrows category identity colors as decoration, undocumented.**
Location: `components/onboarding/AuroraBackground.tsx:37,39,43` (categoryColors.utility, .transport as gradient stops; also `paywall.tsx:156`); the one local hex (`:11`) is documented, the borrow is not.
Fix: a comment naming the borrow, or promote the two hues to named decorative tokens. Command: /polish.

**UX-066 · P3 · DRIFT · typography: micro type hygiene cluster.**
Location: `components/leak-scan/ProjectionSection.tsx:146-154` (eyebrow at letterSpacing 0.4 uiBold instead of the 0.88 semibold spec); `components/money/SpentList.tsx:105,120` (stacked day totals without tabular-nums; `HabitsList.tsx:80-89` does it right); `components/ui/Toast.tsx:201,206` (13.5 literal where typeScale.control is exactly 13.5).
Fix: three one-liners. Command: /typeset.
Status: **Resolved**, Round 1. ProjectionSection's eyebrow now uses `typeScale.eyebrowLetterSpacing` (0.88); SpentList's stacked totals carry `fontVariant: ['tabular-nums']`; Toast's 13.5 literals now reference `typeScale.control`.

**UX-067 · P3 · SYSTEM-GAP · edge cases cluster.**
Location: `app/(tabs)/index.tsx:218-221` (todayLabel memoized with [] goes stale across midnight); `:503-507` (refreshHabits keyed on expenses.length only, so editing amount/merchant never re-runs detection from this screen); `components/habit-logging/SpentKeptChips.tsx:86-91,113-118` (22pt serif amounts can wrap at max cap; add numberOfLines + adjustsFontSizeToFit); `app/(tabs)/_layout.tsx:35-40` (11pt tab labels clip at AX sizes, fixed 56pt bar); `app/category/[id].tsx:189-195` (40pt identity icon can hit 2.04:1 on its tint; consider the darker identity ramp).
Fix: recompute on focus; content hash or comment; wrap guards; scaling handling; ramp. Command: /harden.
Status: **Resolved**, Round 2 (current working tree), four of five fixed and the fifth deliberately deferred with a documented rationale. `todayLabel` now recomputes via `useFocusEffect` instead of a `[]`-memoized value; SpentKeptChips amounts carry `numberOfLines={1}` + `adjustsFontSizeToFit`; the tab bar labels are capped at `maxFontSizeMultiplier={1.5}`, matching the vocabulary's chrome/eyebrow Dynamic Type ceiling; category detail's identity icon now picks ink or white per swatch via a new `accessibleIdentityColor` helper (WCAG relative luminance) instead of a fixed color that could fail on light identity hues. The `refreshHabits` length-keyed effect was left as-is on purpose: an in-code comment ("that is the accepted gap, not fixed here") explains that a content-derived key would make detection re-run on unrelated mutations elsewhere in the tree, which is a worse trade. Recorded resolved because the remaining gap is a reasoned, documented decision, not an oversight.

---

## Patterns and systemic issues

1. **The AA debt is a token problem, not a call-site problem.** Mist, white-on-sage, amberInk, lavender-on-tint, and the disabled pair all fail at the palette level; roughly 70 percent of the P0/P1 contrast surface disappeared with decision 1 plus edits to `constants/theme.ts`, `Button`, and `Chip`. Resolved, Phase B.
2. **Compliance lives in primitives when it lives at all.** Chip enforces labels, state, and hitSlop; Sheet, Toast, and SegmentedControl enforce their gaps. This pattern held: pushing Dynamic Type caps into the primitives themselves (Round 1) took enforcement from 6 percent of Texts to universal, the same fix direction this section originally called for.
3. **The scales were incomplete, and builders routed around them consistently.** fontSize 14/16/17/26/30, micro radii, and a 2pt spacing rhythm all appeared dozens of times each with no token to reach for. Ratified in Round 1 (decision 2): fontSize literals fell from 116 to 2, and `spacing`/`radii.micro` now exist. Some lower-traffic call sites still hold values as literals rather than token references; since the values themselves are now legitimate under the expanded scale, that is leftover mechanical cleanup, not live drift.
4. **The honesty architecture is strong at the center, leaky at the edges.** Evidence floors and refuse-to-extrapolate guards are real code; the leaks were peripheral (the "this month" label, the $0 partial slip, the silent leak dismissal, the 10-row truncation) and are now patched (Phase A, commit `65e725e`). Phase A review also turned up two peripheral leaks the original scan missed: date-only ISO keys displaying the wrong day or month over real spend figures (UX-068), and an undo path that could silently drop unrelated concurrent habit changes (UX-069). Round 1/2 review turned up two more this same way: SpendPulse's year grid sized for data it never has (UX-070), and a first attempt at fixing UX-011 that would have shipped its own VoiceOver regressions (UX-071). All four are fixed. Adversarial review catching real defects in a fix before it ships, twice now, is itself worth naming as a working pattern.
5. **VoiceOver structure is excellent; VoiceOver feedback was absent, and is not anymore.** Labels, roles, and state were already near-universal; announcements of what just happened (check-in confirmation, scan stages) are now wired in too (Round 1-2), closing the gap this section originally called out.

## Positive findings

- **Motion and crash discipline**: every animated component has a reduced-motion branch on a single driver, with a comment trail back to the release-crash postmortems; the Today pager deliberately stays a plain paged ScrollView with a documented revert path.
- **Honesty guards are real code paths in at least six components**: hasReliableRate gating, PaceCard's refuse-to-extrapolate, ScanSnapshotCard's evidence floor, HabitsList's refusal of unearned credit, median-not-average prefills, the rise-only arc.
- **The primitive layer genuinely enforces**: Chip (label + state + hitSlop to 48), SegmentedControl (tablist/tab), EmojiTile (decorative vs labeled), Icon (fallback glyph instead of a crash), ConfirmSheet (re-entrancy guard).
- **ExpensesContext concurrency is unusually good for a v1**: commit-ref pattern, serialized materializer provably duplicate-free, tombstones, pre-hydration guard.
- **Strings centralization is ~99 percent real** (zero hardcoded JSX prose in 78 files) and the row-affordance vocabulary is genuinely implemented, not just documented (mail-row, hidden decorative chevrons, composed spoken labels).
- **AuroraBackground is a model decorative layer**: pointer-events none, hidden from assistive tech, reduced-motion static frame, one documented hex.
- **Undo-not-confirm deletion restoring list position**, implemented identically in both Money sheets.

## Recommended actions (priority order)

Status note (2026-08-12, Round 1/2 update): items 1 through 7 below are complete or effectively complete. See the finding-level Status tags and the changelog for exactly what shipped, round by round. What is left is item 8's re-verification pass, plus the 5 open items called out in the executive summary (UX-012, 040, 041, 060, 065).

1. ~~**[P0/P1] Decision 1, then `/polish`**: contrast token changes (UX-001, 002, 003, 005, 006, 047, 048) in theme.ts + Button + Chip; category-detail tonal pass via `/quieter` (UX-008, 009, 010, 064).~~ Done, Phase B.
2. ~~**[P1] `/harden`**: honesty and dead-end fixes needing no decision (UX-007, 011, 013, 014, 020, 021, 022, 035, 051, 062).~~ Done, Phase A + Round 2 (UX-011, 013 landed Round 2; the rest Phase A).
3. **[P1] `/optimize`**: scan-pipeline yield (UX-012), Spent virtualization (UX-016); decision 3 minimum (UX-019, 057). Partially done: UX-016, 019, 057 resolved Round 1. UX-012, the scan-pipeline yield, is the one item in this whole list that is still fully unstarted engineering.
4. ~~**[P1/P2] `/adapt`**: SpendPulse year interaction (UX-015); Dynamic Type caps into primitives via `/typeset` (UX-004).~~ Done, Round 1 (UX-004) + Round 2 (UX-015, with a corrected premise; see UX-070).
5. ~~**[P2] Decision 2, then `/typeset` + `/layout`**: scale steps and sweeps (UX-017, 018, 043, 045, 059, 066).~~ Done, Round 1.
6. ~~**[P2] `/harden` a11y flow batch**: UX-024 through UX-032, 046, 052, 054, 055.~~ Done, Round 2.
7. **[P2] `/distill`**: vocabulary consolidation (UX-037, 038, 039, 040, 041, 061). Done except two named decisions still awaiting Charen: UX-040 (PATTERN_VOCABULARY ratification) and UX-041 (swipe-to-dismiss vs. drop the handle).
8. **[P3] `/polish`** as the final pass: everything remaining, plus re-verification. Still open: UX-060's residual LoggedTodayList site, UX-065 (AuroraBackground borrow), and the on-device VoiceOver/Dynamic Type pass this whole report has deferred to Lane 2.

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

- **2026-08-12 (correction, then Phase A/B update)**:
  - **Correction (read this first): a contrast figure in the initial report was wrong.** The report claimed the proposed replacement color `#6B7A8F` scored 4.54 on white and passed AA. That was false: verified, `#6B7A8F` is 4.37 on white and 4.14 on snow, and fails the 4.5 floor. This has been corrected everywhere it appeared (decision 1, UX-003, the HTML contrast matrix and its swatch, the HTML findings data). The color that actually shipped is `#677481`, which scores 4.78 on white and 4.53 on snow and genuinely passes. An audit that ships a wrong number is exactly the class of error this document exists to catch, so this correction is called out here rather than silently fixed.
  - **Phase A resolved (commit `65e725e`)**: UX-007, UX-014, UX-020, UX-021, UX-022, UX-023, UX-035, UX-044, UX-049, UX-050, UX-051, UX-062. Also two new findings caught during Phase A review, not in the original 67, both already fixed and assigned the next free ids: UX-068 (date-only ISO keys parsed as UTC midnight display the wrong day, or the wrong month, over real spend figures; fixed with a `parseDateOnly` helper in `utils/dates.ts`, 6 regression tests across 4 timezones) and UX-069 (`restoreDismissedHabit` read a stale render closure and could silently drop concurrent habit changes on undo; fixed by reading `habitsRef.current`, matching `ExpensesContext.restoreExpense`).
  - **Phase B resolved (current working tree)**: UX-001, UX-002, UX-003, UX-005, UX-006, UX-008, UX-009, UX-010, UX-047, UX-048, UX-064. Decision 1 (the palette's ratified AA failures) shipped. What actually shipped, recorded because it changes the ratified system going forward: the primary CTA fill stays `#4CAF82` and the label flips white to ink (2.71 to 6.24) instead of darkening the fill; a new `sagePressed #3D9A6E` covers the pressed fill, because ink on the old sageDark pressed state was only 3.15 and swapping label color mid-press would flash; `mist` splits into `mist` (decorative fills only, 2 sites) and `mistText #677481` (all text and meaning-bearing icons); `amberInk #B26A00` to `#8F5500`; `coral #F05A5A` to `#C93B3B` (both directions: label on white and white on the destructive fill); `sageDark #2E7D55` to `#2C7851`; disabled labels white to slate.
  - **Counts**: 67 findings become 69 (the two new Phase A findings). Of 69, 25 are now resolved (12 Phase A + 2 new + 11 Phase B) and 44 remain open. Both P0s are resolved. Ids are unchanged and unrenumbered per the re-run rule; every resolved finding carries its own Status line rather than being deleted.
  - **Phase B adversarial review round, recorded because it changes what "resolved" means here.** An independent review of the Phase B diff found UX-001 had been marked resolved while five hand-rolled sage buttons still shipped a white label at 2.71:1, including the paywall's main "Start trial" CTA. Only the shared `Button`/`Chip` primitives and four icon sites had been fixed; buttons that roll their own sage fill inherited nothing. All five are now ink: `paywall.tsx` primary button and plan badge, `ProjectionSection` save, `HabitCard` track, `HabitLeakRow` break. `HabitLeakRow` additionally needed its pressed fill moved to `primaryPressedBg`, because its old `primaryDark` pressed state would have failed with an ink label. The same review caught a regression this phase introduced: the `SpentKeptChips` unselected eyebrow was swapped to `mistText`, which is certified on white and snow but sits at 4.06:1 on the cloud track it actually renders on; it is now slate (6.39:1). Two stale comments left by superseded approaches were deleted. The lesson worth keeping: a token-level fix does not reach call sites that hand-roll the same treatment, so "fixed in the primitive" is not the same as "fixed".
  - **Scores, and why each one did or didn't move**: Accessibility 2/4 to 3/4, because contrast was the single largest AA debt in the report and it is now resolved across every row of the contrast matrix (CTA, mist, amberInk, lavender pills, coral, sageDark-on-sageLight, disabled labels); Dynamic Type caps and VoiceOver announcements are still open, so this isn't a 4. Theming 3/4 to 4/4, because the color-token layer is now cleanly role-split (mist vs mistText, sagePressed added) where it was previously overloaded and partly failing; the separate type-scale and spacing-token gap (decision 2, 112 fontSize literals) is completely untouched by this branch and would on its own justify holding at 3, but the token-architecture problem this score has always tracked is resolved. Anti-patterns 3/4 to 4/4: this dimension's verdict named exactly one exception, category detail's red/green P&L coding and raw-identity-hue trend bars (UX-008, UX-009), plus the related sage misuse (UX-064); all three are now fixed, so the exception is closed and the verdict is a clean pass. Performance stays 2/4, Responsive design stays 3/4: neither Phase A nor Phase B touched a single performance or touch-target finding, so per the instruction to move a score only where the evidence moved, these hold. Total: 13/20 to 16/20, band moves from "Acceptable: significant work needed" to "Good: address weak dimensions" (performance and the still-open type/spacing scale, decision 2).

- **2026-08-12 (Round 1 + Round 2 update)**: two more remediation rounds landed since the Phase A/B update above. Round 1 is committed (`618a361` Phase F: performance architecture; `0cd804a` Phases C+D: ratify the real scales, then enforce them; merged at `5772001`). Round 2 was reviewed uncommitted in the working tree, about to be committed.
  - **Round 1 resolved**: UX-004, UX-016, UX-017, UX-018, UX-019, UX-033, UX-034, UX-036, UX-043, UX-045, UX-056, UX-057, UX-066 (13 of the 14 findings originally targeted; UX-060 landed only half-fixed, see below). Decision 2 (ratify the real scales) and decision 3's minimum (performance) both shipped in full; see their entries above for what actually shipped.
  - **Round 2 resolved**: UX-011, UX-013, UX-024, UX-025, UX-026, UX-027, UX-028, UX-029, UX-030, UX-031, UX-032, UX-037, UX-038, UX-039 (button consolidation only; the slate-vs-coral question stays open), UX-042, UX-046, UX-052, UX-053, UX-054, UX-055, UX-058, UX-059, UX-061 (dead code only; the welcome ratify-or-revert decision stays open), UX-063, UX-067 (four of five items; the fifth was deliberately deferred with a documented rationale, not missed). UX-021 got an addendum: the same dead-end-Save bug class showed up in `AddCategoryModal` and was fixed there too, recorded against UX-021 rather than as a new finding.
  - **Two new findings, both caught in review and both resolved on arrival, not part of the original 69**: UX-070 (SpendPulse's year granularity used a 53-column, GitHub-contribution-graph grid, but the data layer aggregates to one cell per calendar year, so 2-4 cells rendered as ~6pt slivers across an empty row; columns now size to the actual cell count, clamped 1-10) and UX-071 (the UX-011 check-in-announcement fix shipped with two of its own VoiceOver defects, caught in adversarial review before merge: a doubled/interrupted announcement when the same goal's card is mounted twice at once, and silence on every skip after the first for a weekly habit's repeat skips; both fixed with a module-level per-goal answer-token guard and regression tests at `__tests__/checkInCardAnnounce.test.tsx`).
  - **UX-070 also corrects UX-015's premise.** UX-015 assumed year granularity renders 365+ daily cells and therefore a field of overlapping sub-target touch buttons; the data layer never emits more than one cell per year, so that premise was wrong. UX-015's own remedy, making year cells non-interactive, was still applied and is still correct on independent grounds (a whole calendar year has no single day to open), so it is recorded resolved and cross-referenced to UX-070 rather than reopened or deleted. Recording this the same way the earlier mistText correction was recorded: an audit that ships a wrong premise is exactly the class of error this document exists to catch.
  - **Two findings did NOT fully resolve, and are recorded as such rather than inflated:** UX-060 (casing) fixed `strings.ts`'s all-caps storage but left `LoggedTodayList.tsx`'s JS `.toUpperCase()` call untouched, so it is marked **Partially resolved**, not resolved, and stays in the open count. UX-040 (Money sheet header pattern) landed its code fix (ExpenseSheet now matches its siblings) but `PATTERN_VOCABULARY.md` was never updated to ratify the pattern, so per the task's own instruction it stays open, recorded as partial progress rather than closed.
  - **Still open, decisions awaiting Charen, not new engineering**: UX-041 (swipe-to-dismiss vs. drop the grab handle), UX-040 (PATTERN_VOCABULARY ratification), the "stop breaking" coral-vs-slate contradiction (theme.ts documents coral as destructive including this exact trigger; the product renders it slate; preserved as slate), and the welcome splash's ratify-or-revert call (ADR 0022; only its dead code was cleared). UX-012 (the scan pipeline's synchronous JS-thread execution) remains the one fully unstarted engineering item in the whole report.
  - **Counts**: 69 findings become 71 (UX-070, UX-071). Of 71, 66 are now resolved (25 carried over + 13 Round 1 + 25 Round 2, excluding the UX-021 addendum which was already counted resolved + 1 for UX-015's premise-corrected resolution + 2 new findings resolved on arrival) and 5 remain open: UX-012, UX-040 (partial), UX-041, UX-060 (partial), UX-065. Both P0s remain resolved; only one P1 (UX-012) is still open. Ids are unchanged and unrenumbered per the re-run rule; every resolved finding carries its own Status line, and the two partial resolutions say exactly what is and is not fixed rather than being marked either fully open or fully resolved.
  - **Scores, and why each one moved (or didn't)**: Accessibility 3/4 to 4/4, because Round 2 closed essentially every open accessibility-flow finding (announcements, sheet escape, radiogroup/checked, header roles, named swatches, spoken hints, a merged QuickLogRow element) on top of Round 1's Dynamic Type caps, and every remaining open finding is tagged something other than a11y; held short of unconditional confidence in the finding text itself because no on-device screen-reader pass has confirmed any of it, and UX-012 still stalls VoiceOver focus during the scan's own frozen frame. Responsive design 3/4 to 4/4, because every touch-target finding closed (SegmentedControl, toast action, CheckInCard correction links, HabitCard menu, FirstRunRibbon/paywall close) and the Dynamic Type caps that were breaking AX-size layouts moved into the primitives; again, no on-device Dynamic Type pass has confirmed this yet. Performance 2/4 to 3/4, not 4/4: real, substantial work landed (all 6 providers memoized, two lists virtualized, CategoriesContext's race condition fixed, React.memo added to 5 components), but it is deliberately not scored a clean pass, because UX-012's synchronous scan pipeline is untouched and the new React.memo is not yet effective (Today's renderItem still hands its children fresh per-render callback identities, so the memo does not yet bail). Theming stays 4/4 and Anti-patterns stays 4/4: both were already at this rubric's ceiling; decision 2 shipping closes the residual gap Theming's row used to cite, but there is no higher score to move to. Total: 16/20 to 19/20, band moves from "Good: address weak dimensions" to "Very good: the code-level system is essentially complete." Deliberately not 20/20: the device-verification pass genuinely has not happened, and 5 findings remain open, 4 of them decisions only Charen can make.
