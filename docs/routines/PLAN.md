# iPad support plan (routine/ipad)

Owned by the ipad-worker scheduled routine. One bounded increment per run;
see HANDOFF.md for current status and the device pass list. Checked items
are done and verified (tsc clean, npm test green) on this branch.

- [x] 1. Set `ios.supportsTablet: true` in `app.json`. This changes the
      native fingerprint (ADR 0029), so a new `eas build` is required before
      any of this plan reaches a physical device or the App Store build; an
      `eas update` OTA will not carry it. Done 2026-09-04.
- [x] 2. Introduce one shared max-width content container (about 600pt,
      centered) and apply it to every screen's scroll content, so phone
      layouts stay pixel-unchanged (the container is a pass-through, full
      screen width, below the cap) while iPad gets a readable column. All of
      2a-2e done; the fixed-footer bars outside scroll content (ScopeScreen,
      BillsScreen, paywall, PayoffScreen) are a separate, already-identified
      gap tracked under item 6/DECISIONS NEEDED, not part of this item's
      scope. Marked complete run 9 (2026-09-06): all five sub-items were
      already checked, this was a bookkeeping gap in the parent line, not
      new work.
  - [x] 2a. Added `layout.contentMaxWidth` (600) and `contentColumnStyle`
        to `constants/theme.ts`. Spread into a screen's
        `contentContainerStyle`, not a wrapping component: it folds into the
        existing style object at each call site, so no extra View is added
        to the tree and phone layout math cannot change. Done 2026-09-04.
  - [x] 2b. Applied to the tab screens and push screens' scroll content:
        `app/(tabs)/index.tsx` (both Today panes: `spentScrollContent`,
        `listContent`, `keptEmptyContent`), `app/(tabs)/money.tsx`,
        `app/(tabs)/insights.tsx`, `app/(tabs)/categories.tsx`,
        `app/habit/[id].tsx`, `app/category/[id].tsx`, `app/profile.tsx`,
        `app/paywall.tsx`. Done 2026-09-04.
      - Note (regression found and fixed, run 8, 2026-09-06): main's PR #143
        (the segment-pager wave) extracted Money's Spent pane out of
        `money.tsx` into its own `components/money/SpentList.tsx` the same
        day, and its SectionList's `listContent` style did not carry the cap
        forward from the old inline ScrollView this item originally capped.
        Fixed by spreading `contentColumnStyle` into `listContent`, same as
        Upcoming/Habits' shared `scrollContent`; see PLAN.md's run 8 line and
        `design/decisions/modules/money.md`. Today's and Insights' panes were
        not extracted into separate components by that same refactor, so
        their caps were unaffected; confirmed by re-reading both files, not
        assumed from the clean rebase.
  - [x] 2c. Onboarding screens read and handled. `app/onboarding/welcome.tsx`
        renders only `OnboardingCarousel` (no layout of its own);
        `app/onboarding/intent.tsx` is a bare `Redirect`, so neither needed a
        change. `OnboardingCarousel.tsx`'s paged beats are the one real case:
        each `beat` View is deliberately full window width because it is the
        paging unit `handleScroll` measures offsets against (dividing by that
        same `width`), so the shared cap could not go on `beat` itself the
        way it goes into a `contentContainerStyle` elsewhere. Added one new
        `beatContent` wrapper View (spreading `contentColumnStyle`) around
        each beat's media/headline/hook/CTA, leaving `beat`'s own width
        untouched so paging math is unaffected; below the cap `beatContent`
        is a pass-through (`width: '100%'`), so phone rendering is
        unchanged. Checked `components/onboarding/BreakHabitSheet.tsx`
        (routes through the already-capped `Sheet`, no change needed) and
        `AuroraBackground.tsx` (a full-bleed decorative gradient strip, not
        content; capping it would leave gaps, left alone, already on item
        5's audit list). Done 2026-09-04.
  - [x] 2d. Applied to the Leak Scan flow: `IntakeScreen` (`container`,
        shared by its scroll and its two plain-View stages; the pre-existing
        `maxWidth: '100%'` is on the unrelated `fileChip` row, no collision),
        `ScopeScreen` (`content`), `DeckScreen` (`content`), `BillsScreen`
        (`content`), `GracefulFailure` (`container`), `ResultsScreen`
        (`scrollContent` and the separate `undoneCenter` early-return state),
        and `PayoffScreen` (`body`; this screen has no ScrollView, so the cap
        goes directly on its single content View). All seven are the same
        mechanical `...contentColumnStyle` spread as item 2b, not a new
        wrapper, so no per-screen jest case was added, consistent with 2b's
        screens (money.tsx, insights.tsx, etc.) also getting none; the
        general contract test already pins the shared style object every one
        of them spreads. Done 2026-09-05.
      - Note (fixed-footer gap, discovered this run): `ScopeScreen` and
        `BillsScreen` each have a `footer` View that sits outside the capped
        ScrollView (a confirm/skip button bar), left un-capped this run. This
        matches an existing, older gap in `app/paywall.tsx`'s own `footer`
        (from item 2b, not touched there either) and `PayoffScreen`'s
        Continue button (a sibling of the now-capped `body`, also left full
        width) — so it is an existing, consistent pattern in this codebase
        for CTA bars outside scroll content, not a one-off miss. Whether
        full-width footer buttons on iPad are the intended look or a gap to
        close is a design call, not a mechanical one; added to item 5's audit
        so it gets decided in one pass rather than piecemeal.
  - [x] 2e. Fixed the gap in 2b: on the Today Kept pane, the door3 ribbon and
        `KeptHero` render directly inside the `{ width: screenWidth }` pane,
        above and outside the ScrollView/SectionList whose content got
        capped. Re-checked "the kept quote" from this item's original
        wording (2026-09-04): it turned out to already be inside
        `keptEmptyContent`'s ScrollView (capped by item 2d), not a real gap;
        only the ribbon and the hero needed work. `ribbonWrap` uses
        `paddingHorizontal`, so it took the same direct `...contentColumnStyle`
        spread as `listContent`/`keptEmptyContent` (item 2b/2d), no
        conflict. `keptHeroGutter` uses `marginHorizontal` and is merged
        directly onto `KeptHero`'s own `card` root (which carries `card`'s
        background), via `style={[styles.card, style]}` in KeptHero.tsx:
        spreading `contentColumnStyle`'s `width: '100%'` straight into it
        would size that background box to 100% of the pane BEFORE margin is
        added outside it, pushing the card past the 600pt cap by
        `2 * spacing.gutter`. Fixed with a new wrapping View,
        `keptHeroCapWrap` (own style, just `...contentColumnStyle`, no
        other properties), around `<KeptHero>`: the wrapper caps and
        centers at 600pt first, and `keptHeroGutter`'s margin then insets
        `KeptHero` within that already-capped width, same as it insets
        within the full screen width on phones today. Below the cap the
        wrapper is a pass-through (matches item 2's pattern), so phone
        rendering is unchanged. Both wrappers got a `testID`
        (`door3-ribbon-wrap`, `kept-hero-cap-wrap`) for the item 6 tests.
        Done 2026-09-05.
- [x] 3. Cap and center bottom sheets at tablet widths: added the same
      `width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center'`
      to `components/ui/Sheet.tsx`'s `panel` style. Full-width sheets looked
      wrong on iPad; phones are unaffected since `100%` already equals every
      phone's screen width. Done 2026-09-04. Not yet touched: any modal that
      does not go through this shared `Sheet` (audit as part of item 5).
- [x] 4. Fix width math that assumes the window equals the content column.
      Highest-priority instance: the Today Spent/Kept pager in
      `app/(tabs)/index.tsx` scrolls by `screenWidth` (from
      `useWindowDimensions`) for both the pager's horizontal paging distance
      and each pane's width (`{ width: screenWidth }`).
      Investigated 2026-09-05, resolved with no code change beyond item 2e:
      this is the exact same shape as `OnboardingCarousel`'s `beat`/
      `beatContent` split (item 2c, already pinned by
      `__tests__/tabletLayout.test.tsx`) — the paging unit (`beat`, or here
      `pane`) has to stay window width because the offset math divides by
      that same width, so the fix is capping the CONTENT inside the page,
      never the page itself. Every content path inside both panes was
      already capped or got capped this run: the Spent pane's entire body
      routes through `spentScrollContent` (item 2b); the Kept pane's three
      paths (`keptEmptyContent`, `listContent`, the item 2e wrapper for the
      ribbon and `KeptHero`) are now all capped too. `screenWidth` from
      `useWindowDimensions()` also reliably equals the pager's own rendered
      frame width on iOS (portrait-only per item 7 means no left/right safe
      area insets, and `useWindowDimensions` already reflects the app's
      actual window bounds even in iPad Split View / Slide Over, not the
      full device screen), so there is no real divergence for an
      on-layout measured width to fix; that alternative from this item's
      original wording would only add redundant computation. No test added
      for this item specifically: `__tests__/todayQuoteRibbonPlacement.test.tsx`'s
      new "leaves the pane itself at window width" case (item 6) already
      pins the invariant this item was worried about.
- [x] 5. Audit remaining `useWindowDimensions` call sites for tablet
      correctness. Done 2026-09-05: a fresh repo grep confirms the run
      3/4-era site list was complete (19 files, 7 real call sites once
      docs/plan/test files and the two already-resolved ones, `app/(tabs)/
      index.tsx` (item 4) and `OnboardingCarousel.tsx` (item 2c), are set
      aside). No code change needed for any of them:
      - `components/AddCategoryModal.tsx`, `components/habit-logging/
        PartialSlipSheet.tsx`, `components/money/AddUpcomingSheet.tsx`,
        `components/money/ExpenseSheet.tsx`, `components/onboarding/
        BreakHabitSheet.tsx`, `components/leak-scan/
        CategoryTransactionsSheet.tsx`, `components/leak-scan/
        ReviewQueueSheet.tsx`, `components/habit-logging/PickOneSheet.tsx`
        all destructure `height` only (never `width`), used solely for a
        `maxHeight: height * 0.82` or `* 0.86` cap on the sheet's scrollable
        body so it clears the keyboard. That math is orientation- and
        cap-independent: it is correct against the real window height on a
        phone, on iPad, and in iPad Split View/Slide Over alike, and needs
        no change now that `Sheet`'s panel is width-capped (item 3) since
        the two axes do not interact.
      - `components/onboarding/AuroraBackground.tsx` reads `width` to size
        a full-bleed decorative gradient strip, which would need a look if
        it rendered on tablet, but it does not: it is unreferenced dead
        code (the retired welcome screen's revert path, per
        PATTERN_VOCABULARY.md and the item 2c note), imported nowhere in
        the app, only in its own test. No live tablet surface to fix.
      - `components/habit-logging/CheckInCard.tsx` reads `fontScale`, not
        width or height, confirmed out of scope (Dynamic Type, not this
        plan).
      The fixed footer/CTA bar question (`ScopeScreen`, `BillsScreen`,
      `app/paywall.tsx`, `PayoffScreen`'s Continue button) is NOT decided
      here per the 2026-09-05 review feedback: it is on the ops status
      board's DECISIONS NEEDED queue for Charen now, not a call this audit
      makes.
- [ ] 6. Add targeted jest tests exercising tablet dimensions.
      `__tests__/tabletLayout.test.tsx` added 2026-09-04, pinning the shared
      `contentColumnStyle`/`layout.contentMaxWidth` contract and that
      `Sheet`'s panel carries the same cap. Extended 2026-09-04 with a case
      for `OnboardingCarousel`'s `beatContent` wrapper (item 2c). Extended
      2026-09-05 with three cases in `__tests__/todayQuoteRibbonPlacement.test.tsx`
      (item 2e/4, added there rather than in tabletLayout.test.tsx because
      this file already has the full provider/mock wiring to get KeptHero
      and the door3 ribbon to render): `kept-hero-cap-wrap` and
      `door3-ribbon-wrap` both carry the cap, and `kept-pane` itself does
      not (the pager's paging unit stays window width). Extended 2026-09-06
      (run 8) with a case in `__tests__/spentList.test.tsx` pinning the
      restored cap on `SpentList`'s `SectionList` (`testID`
      `spent-section-list` added for the query), covering the regression
      found this run (see item 2b's note). Kept as an ongoing item, not
      checked off: still open pending Charen's footer-cap decision (item
      2d/5): if that decision adds a cap to `ScopeScreen`/`BillsScreen`/
      paywall/`PayoffScreen`, it is a real structural change and earns a
      dedicated case here, same as items 2c/2e/run 8 did.
- [ ] 7. Keep portrait-only orientation. `app.json` already sets
      `"orientation": "portrait"`; nothing in this plan changes that.
      Re-verify this line stays untouched at the end of every run.
