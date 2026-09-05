# core-worker HANDOFF

## Status

Run 3 of the `routine/core-p3` branch. `git fetch origin main` showed no new
commits since run 2 (branch already up to date), so no rebase was needed.
Baseline verified before any change: `npx tsc --noEmit` clean, `npm test` 99
suites / 1078 tests green (matches run 2's own ending count exactly, so
nothing drifted underneath this branch between runs). No REVIEW FEEDBACK
section was present in run 2's HANDOFF, so this run went straight to PLAN.md's
queued item: P4-3, the shareable counter card v1.

## Completed

- **P4-3 shareable counter card v1, built end to end** (roadmap accept
  criterion: "share sheet exports a branded card; PostHog tracks shares.").
  Full detail lives in `docs/routines/PLAN.md`'s P4-3 entry (what each new
  file does and why); the summary:
  - New deps `expo-sharing` ~14.0.8 and `react-native-view-shot` ^4.0.3.
    `npx expo install expo-sharing` itself failed in this sandbox (no route to
    Expo's compatibility API: "Unable to fetch compatibility data... Host not
    i... is not valid JSON"), so the version was read directly out of
    `node_modules/expo/bundledNativeModules.json` (the SDK's own pinned
    version) and installed with plain `npm install`. `react-native-view-shot`
    has no Expo-bundled version to match against; its peer deps are `"*"` for
    both `react`/`react-native`, so the latest stable (4.0.3) was used as-is.
  - `utils/shareCard.ts`: pure `computeShareCardStats(goals, today)`. Returns
    null (no card, not a $0 card) when there are no goals or the total kept is
    zero. `days` is the real elapsed calendar span from the earliest habit's
    `trackingStart` through today, inclusive: deliberately not a streak
    (resets on a missed day) and not `totalSkips` (a count of skip days, not a
    span), so the headline can never be read as a fabricated statistic.
  - `components/ShareCounterCard.tsx`: the branded card, reusing KeptHero's
    palette and type rather than inventing a new visual language.
  - `app/share-card.tsx`: new pushed screen, registered in `app/_layout.tsx`.
    Renders the card live (not off-screen), captures it with
    `react-native-view-shot`'s `captureRef`, hands the PNG to `expo-sharing`'s
    `shareAsync`. Fires `share_card_opened` on mount and `share_card_shared`
    once the OS share sheet is actually invoked; a failed capture or an
    unavailable/erroring share sheet surfaces a toast and never fires the
    tracked event.
  - Entry point: a new Profile row, "Share your kept total" (General group).
    Deliberately not a change to Today/KeptHero, so this stayed off the
    heavily design-audited Today surface; see
    `design/decisions/components/ShareCounterCard.md` (new file, added to the
    design-decisions README index) for that call and its Open items.
  - Two new structural analytics events (`share_card_opened`,
    `share_card_shared`) in `utils/analytics.ts`'s `AnalyticsEventMap`, both
    `Record<string, never>`, satisfying the "PostHog tracks shares" half of
    the accept criterion. No amounts, no merchant/habit names in either
    payload.
  - New `Share2` icon glyph in `components/ui/Icon.tsx` (lucide already ships
    it as `share-2`, just wasn't wired into the app's `GLYPHS` map yet).
  - New strings, all additive to `constants/strings.ts`: `settings.shareRow`
    plus a new `shareCard` section (title, headline, wordmark, CTA, empty
    state, failure toast). No existing key touched, respecting the file's
    routine-ownership note in CLAUDE.md; searched the mobile-app repo's
    issues for a "Routine status board" issue first (none exists), so this is
    the routine's own read of the file, not a check against a status board
    that doesn't exist yet.
  - 15 new tests, three new files: `__tests__/shareCard.test.ts` (pure day-
    count math, including the inclusive-count, 1-day-minimum, and
    time-of-day-ignored edge cases), `__tests__/shareCounterCard.test.tsx`
    (render, including the "1 day" vs "N days" pluralization), and
    `__tests__/shareCardScreen.test.tsx` (empty state, headline, and the
    capture/share/track wiring, with `expo-sharing` and
    `react-native-view-shot` mocked the same way the existing
    `expo-document-picker` tests mock that native seam).
  - `npm run ota:check` confirms NEEDS A NATIVE BUILD (`package.json` +
    `package-lock.json` changed), exactly as expected for a new native
    dependency per ADR 0029.
  - `npx tsc --noEmit` clean. `npm test`: 102 suites / 1093 tests green (up
    from 99/1078; +15 new, zero regressions).
- Did not start the deferred entitlement-reactivity gaps this run (see
  PLAN.md's P3-1 entry). P4-3 filled this run's bounded-increment budget on
  its own: two new native deps, a new screen, a new pure-math module, and 15
  tests is a full unit of work; stacking a second unrelated fix on top would
  have stretched past "roughly one to two hours."

## Next

See PLAN.md's "Next run" section (updated this run). In order:
1. Address any REVIEW FEEDBACK below first, if present.
2. The two structural entitlement gaps (non-reactive gate reads across
   mounted screens; gated-sheet copy not distinguishing an at-ceiling premium
   user from a free user), filed 2026-08-11, still deliberately deferred (see
   PLAN.md's P3-1 entry for why). This is now the only remaining real-code
   item this routine can reach; everything else left in PLAN.md's checklist
   is a `(C)` Charen action or a device verification.
3. If item 2 is picked up and lands clean, this plan is COMPLETE-modulo-
   Charen: write COMPLETE at the top of this file (per the routine's own
   instructions) and mark the draft PR ready for review, since nothing code-
   shaped would be left.

## Blockers

None for this run's own work. Standing blockers, unchanged from runs 1-2:
- No website repo access, so P3-3/P3-4/P3-5 cannot be verified or advanced
  here.
- Live RevenueCat end-to-end verification (a real sandbox purchase) needs a
  real device build; unchanged from run 2.
- **New this run:** the share card's capture-and-share path is fully unit-
  tested against mocked native seams but has never run on a real device.
  `react-native-view-shot`'s actual pixel capture and the real iOS/Android
  share sheet cannot be exercised in this sandbox. Needs a device/TestFlight
  pass once a build carries this dependency (it will ride the same native
  build P3-1's RevenueCat activation already needs).

## DECISIONS NEEDED (for Charen)

1. **Carried over from runs 1-2, still open.** App Store privacy label:
   review `docs/legal/app-store-privacy-labels.md` in full, accept or
   override its one judgment call (section 3: bucketed spend amounts under
   "Financial Info" vs "Usage Data"; recommendation stands: "Usage Data"),
   and resolve the one open verification (section 4 item 3: PostHog's
   IP-handling default). Then transcribe into App Store Connect. Not code;
   nothing to merge for this specifically. (Not touched this run: the share
   card adds no new data collection. It renders a card on-device, writes a
   temporary local PNG, and hands it to the OS share sheet the same way any
   app's "share" button does; the destination is the user's own choice at
   share time, not something the app collects or controls. No worksheet
   update was made for it.)
2. **Carried over from run 2, still open.** RevenueCat dashboard entitlement
   name must match `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (defaults to
   `'premium'`).
3. **Carried over from run 2, still open.** When to actually build and test
   the live RevenueCat client (needs a real device build; this session
   cannot do that).
4. **New this run: a real device pass for the share card.** Once a native
   build exists (it can ride the same build item 3 above already needs),
   worth a few minutes on a real device: confirm the captured PNG looks
   right (text not clipped at Dynamic Type extremes, colors correct), and
   that the OS share sheet actually receives a usable image on both iOS and
   Android. Not urgent, and not blocking anything else; flagging so it is a
   visible next step.

No pricing, product id, or legal wording positions were picked by this
routine. No mock-mode default was flipped. No go-live date was picked. No
existing `constants/strings.ts` key was changed, only new ones added.
