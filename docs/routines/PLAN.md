# iPad support plan (routine/ipad)

Owned by the ipad-worker scheduled routine. One bounded increment per run;
see HANDOFF.md for current status and the device pass list. Checked items
are done and verified (tsc clean, npm test green) on this branch.

- [x] 1. Set `ios.supportsTablet: true` in `app.json`. This changes the
      native fingerprint (ADR 0029), so a new `eas build` is required before
      any of this plan reaches a physical device or the App Store build; an
      `eas update` OTA will not carry it. Done 2026-09-04.
- [ ] 2. Introduce one shared max-width content container (about 600pt,
      centered) and apply it to every screen's scroll content, so phone
      layouts stay pixel-unchanged (the container is a pass-through, full
      screen width, below the cap) while iPad gets a readable column.
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
  - [ ] 2e. Known gap in 2b: on the Today Kept pane, the door3 ribbon, the
        kept quote, and `KeptHero` render directly inside the
        `{ width: screenWidth }` pane, above and outside the
        ScrollView/SectionList whose content got capped. They are not
        capped yet, so on a wide window the list column narrows but that
        header chrome stays full pane width. Revisit together with item 4,
        since both live inside the same screenWidth-driven pane.
- [x] 3. Cap and center bottom sheets at tablet widths: added the same
      `width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center'`
      to `components/ui/Sheet.tsx`'s `panel` style. Full-width sheets looked
      wrong on iPad; phones are unaffected since `100%` already equals every
      phone's screen width. Done 2026-09-04. Not yet touched: any modal that
      does not go through this shared `Sheet` (audit as part of item 5).
- [ ] 4. Fix width math that assumes the window equals the content column.
      Highest-priority instance: the Today Spent/Kept pager in
      `app/(tabs)/index.tsx` scrolls by `screenWidth` (from
      `useWindowDimensions`) for both the pager's horizontal paging distance
      and each pane's width (`{ width: screenWidth }`). That math is
      internally consistent (pane width matches paging distance) but was
      never meant to also equal a capped content column, so it is a
      candidate for a real on-layout measured width once this plan reaches
      it, not a change to make lightly given ADR 0019's plain-ScrollView,
      no-reanimated constraint on this exact pager. Not started.
- [ ] 5. Audit remaining `useWindowDimensions` call sites for tablet
      correctness once items 2 and 4 have landed. Known sites (from a repo
      grep, 2026-09-04): `components/money/AddUpcomingSheet.tsx`,
      `components/money/ExpenseSheet.tsx`, `components/habit-logging/
      PickOneSheet.tsx`, `components/habit-logging/PartialSlipSheet.tsx`,
      `components/leak-scan/ReviewQueueSheet.tsx`, `components/leak-scan/
      CategoryTransactionsSheet.tsx`, `components/onboarding/
      OnboardingCarousel.tsx`, `components/onboarding/AuroraBackground.tsx`,
      `components/onboarding/BreakHabitSheet.tsx`,
      `components/AddCategoryModal.tsx` (most read `height` for keyboard
      sizing, not width; each needs a look, not necessarily a change).
      `components/habit-logging/CheckInCard.tsx` reads `fontScale`, not
      width or height, and is Dynamic Type territory, not this plan.
      Also decide as part of this audit: whether fixed footer/CTA bars
      outside a capped ScrollView (`ScopeScreen`, `BillsScreen`,
      `app/paywall.tsx`, `PayoffScreen`'s Continue button) should get the
      same cap, or stay full width by design (found 2026-09-05, item 2d).
- [ ] 6. Add targeted jest tests exercising tablet dimensions.
      `__tests__/tabletLayout.test.tsx` added 2026-09-04, pinning the shared
      `contentColumnStyle`/`layout.contentMaxWidth` contract and that
      `Sheet`'s panel carries the same cap. Extended 2026-09-04 with a case
      for `OnboardingCarousel`'s `beatContent` wrapper (item 2c). Extend
      further (or add siblings) as items 2d and 4 land; jest cannot run RN's
      real flexbox layout engine, so these pin the style contract, not
      measured pixels (see the file's own header comment).
- [ ] 7. Keep portrait-only orientation. `app.json` already sets
      `"orientation": "portrait"`; nothing in this plan changes that.
      Re-verify this line stays untouched at the end of every run.
