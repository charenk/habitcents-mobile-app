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
  - [ ] 2c. Apply to the onboarding screens: `app/onboarding/welcome.tsx`,
        `app/onboarding/intent.tsx`, and the components they render from
        `components/onboarding/` (OnboardingCarousel and friends). Not
        started; onboarding has its own scroll/carousel structure and needs
        its own read before touching it.
  - [ ] 2d. Apply to the Leak Scan flow: `app/leak-scan.tsx` composes
        `IntakeScreen`, `ScopeScreen`, `DeckScreen`, `PayoffScreen`,
        `BillsScreen`, `GracefulFailure`, `ResultsScreen` from
        `components/leak-scan/`, each with its own layout. Not started.
        Note: `IntakeScreen.tsx` already has an unrelated `maxWidth: '100%'`
        on some element; check it does not collide before adding the shared
        cap there.
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
- [ ] 6. Add targeted jest tests exercising tablet dimensions.
      `__tests__/tabletLayout.test.tsx` added 2026-09-04, pinning the shared
      `contentColumnStyle`/`layout.contentMaxWidth` contract and that
      `Sheet`'s panel carries the same cap. Extend this file (or add
      siblings) as items 2c, 2d and 4 land; jest cannot run RN's real
      flexbox layout engine, so these pin the style contract, not measured
      pixels (see the file's own header comment).
- [ ] 7. Keep portrait-only orientation. `app.json` already sets
      `"orientation": "portrait"`; nothing in this plan changes that.
      Re-verify this line stays untouched at the end of every run.
