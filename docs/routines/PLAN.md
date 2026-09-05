# core-worker PLAN

- **Branch:** `routine/core-p3`
- **Created:** 2026-09-04 (run 1)
- **Scope:** P3 (monetization + legal) then P4 (beta readiness), habitcents-mobile-app
  only. This routine has no access to the website repo (`HabitCents-website`), so P3-3,
  P3-4, P3-5 (all website tasks) are out of reach here; the punch list already records
  P3-4/P3-5 as shipped (2026-07-12 marker, roll-up PR #2 on the website repo) and P3-3
  register wiring as a website-side follow-up. Nothing in this plan duplicates that.
- **Sources read before drafting this:** `habitcents-ops/docs/habitcents-plan-v2.html`
  (P3-1..P3-5, P4-1..P4-4 with accept criteria), `habitcents-ops/docs/phase-3-scope.md`,
  `habitcents-ops/docs/decisions/0029-...md`, `habitcents-ops/PUNCHLIST.md` RESUME
  marker and the P3/RevenueCat/paywall history further down, plus a live read of
  `utils/purchases.ts`, `utils/analytics.ts`, `app/paywall.tsx`, `app/profile.tsx`,
  `utils/habitLogging.ts`, `eas.json`, `.env.example`.

## Run 1 finding: P3 is much further along than `phase-3-scope.md` (2026-07-05) says

That doc is a planning artifact from two months before this run and is stale on the
app side. Verified by reading the actual code, not assumed:

- A full **mock-mode paywall already exists**: `app/paywall.tsx` (annual-first, three
  plans, mock purchase/restore, `paywall_shown`/`paywall_dismissed`/`trial_started`/
  `purchase_completed` all firing), `utils/purchases.ts` (env-gated on
  `EXPO_PUBLIC_REVENUECAT_API_KEY`, zero-native-import guarantee mirroring
  `utils/analytics.ts`, dev-menu entitlement toggle, mock grant persisted and
  restorable).
- **Entitlement gating is real**, not hardcoded: `utils/habitLogging.ts`
  `habitLimitForEntitlement()` reads `Entitlement` (free = 1, premium = 5) and every
  gate site (`(tabs)/habits.tsx`, `habit/[id].tsx`, `ResultsScreen.tsx`) calls through
  it.
- **Pricing is decided and in code**: `$3.99`/mo, `$29.99`/yr, `$49.99` lifetime
  (matches roadmap P3-1 and PUNCHLIST decision record). No open pricing decision.
- **Legal pages are live**: PUNCHLIST records `/privacy`, `/terms`, `/support` shipped
  on the website 2026-07-13 (BET-003), and `app/profile.tsx` in this repo already links
  both (`PRIVACY_POLICY_URL`, `TERMS_OF_SERVICE_URL`, both pointing at habitcents.com).
- **PostHog posture is decided and live**: anonymous device-ID mode, no PII, coarse
  buckets, confirmed live in EAS production per the punch list's 2026-08-16
  "analytics is live in build 15" entry. This resolves `phase-3-scope.md` section 6
  decision 2 (recommendation: ship on, "Usage Data, not linked to you" label).
- **P4-1's eas.json is done**: development/preview/internal/production profiles,
  channels, submit config with `ascAppId`, all present.

So this plan's checklist below is corrected against the roadmap's literal task list,
not copied from the stale scope doc.

## Checklist

Legend: `[x]` verified done in this repo, `[~]` partially done / gap identified,
`[ ]` not started, `(C)` needs a Charen action this routine cannot take.

### P3-1 RevenueCat (roadmap P3-1)
- [x] Product catalog + pricing in code (`utils/purchases.ts`).
- [x] Paywall screen, annual-first, at the two spec'd touchpoints (onboarding success,
      habit-limit gate).
- [x] Entitlement gating replaces the hardcoded habit-count check.
- [x] The four paywall analytics events fire.
- [x] **Live RevenueCat client (run 2, 2026-09-04).** `react-native-purchases`
      ^10.9.0 added to `package.json` (this forces the next build to be `eas build`,
      never an OTA, per ADR 0029; confirmed with `npm run ota:check` after committing).
      `utils/purchases.ts` `initPurchases()` dynamically imports the SDK only when
      `EXPO_PUBLIC_REVENUECAT_API_KEY` is set (never on `main`'s default env, never in
      tests, mirrors `utils/analytics.ts`'s PostHog import), configures it, reads
      `getCustomerInfo()`, and wires `addCustomerInfoUpdateListener` to keep a
      synchronous local cache current. `purchase()`/`restore()` call `getProducts` +
      `purchaseStoreProduct` / `restorePurchases` against the SDK's real types (typed
      against the installed package, not guessed). New env var
      `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (default `'premium'`) names the
      RevenueCat-dashboard entitlement identifier that means premium; documented in
      `.env.example`.
      Found and fixed one real bug while writing this: the old fallback logic was
      `if (impl) return impl.X(); <mock path>`, so a live-enabled install whose real
      client merely failed to initialize (bad key, offline at boot) would silently
      fall into the mock branch and comp a free "premium" grant that charged nobody.
      `getEntitlement()`/`purchase()`/`restore()` now branch on `purchasesEnabled()`
      explicitly: the mock grant only ever fires when purchases are disabled outright;
      a configured-but-broken live path reports a real failure instead. Three new
      tests lock this in (`__tests__/purchases.test.ts`, "live mode configured but the
      client fails to initialize"). Still mock-mode by default (no key in this
      environment or in tests); never flips mock mode on; never picked a go-live date.
      Still unverified end-to-end (needs a real device + sandbox purchase, which this
      session cannot do) and still carries the two structural gaps filed 2026-08-11
      (non-reactive entitlement reads; at-ceiling-premium upsell copy) that PLAN.md's
      run-1 note deliberately deferred to "the real RevenueCat activation work",
      reassessed this run and still deferred: fixing entitlement-read reactivity
      touches every gate site (5 call sites) and is its own bounded unit of work, not
      a rider on this one. Listed again under Next run below.
- [x] **Both structural gaps closed (run 4, 2026-09-05).** PUNCHLIST's
      "Backlog from the gating audit" (2026-08-11): (1) gated-sheet copy always
      pitched the free-tier upsell even to a premium user already at the real
      5-habit ceiling; (2) entitlement reads were non-reactive, so a purchase
      did not repaint already-mounted screens. Full detail in this file's "Run
      4" section below.
- (C) Apple Small Business Program enrollment.
- (C) Sandbox purchase/restore/cancel device verification once live.

### P3-2 Legal (roadmap P3-2)
- [x] Privacy policy + terms live at real URLs (website side, verified via PUNCHLIST
      record; this session has no website repo access to re-read the page content).
- [x] Settings/Profile rows open both (`app/profile.tsx`).
- [x] **App Store privacy-nutrition-label worksheet.** Was the one real gap in this
      task (nothing existed). Written this run: `docs/legal/app-store-privacy-labels.md`.
      Full category-by-category table grounded in the actual analytics/storage/leak-scan
      code, one flagged judgment call (financial-info bucketing), one flagged
      verification gap (PostHog IP handling, not asserted either way), and a note on
      what invalidates the worksheet (live RevenueCat, any new SDK).
- (C) Charen transcribes the worksheet into App Store Connect and accepts/overrides
      its one judgment call.

### P3-3, P3-4, P3-5 (website tasks)
- Out of this routine's reach (no website repo access). PUNCHLIST already records
  P3-4 (truth pass) and P3-5 (calculator) as shipped 2026-07-12; P3-3 (Resend register
  wiring, 2-step form) was still open as of that marker. If a future run gains website
  repo access this section should be re-derived from a live read of that repo rather
  than trusted from a two-month-old punch-list line.

### P4-1 (roadmap P4-1)
- [x] `eas.json` profiles (development/preview/internal/production), channels, submit
      config.
- (C) TestFlight internal to external track promotion, inviting the waitlist. Pure
      App Store Connect action; no code.

### P4-2 (roadmap P4-2)
- [x] In-app feedback entry point already exists: Profile's Support row
      (`mailto:support@habitcents.com`, `app/profile.tsx`). Counted as satisfying the
      accept criterion's "in-app feedback entry point" rather than building a second,
      redundant one.
- (C) Weekly PostHog review against North Star metrics, GitHub Issues triage loop.
      Process, not code.

### P4-3 Shareable counter card v1 (roadmap P4-3)
- [x] **Built run 3 (2026-09-05).** `expo-sharing` ~14.0.8 (SDK-matched via
      `node_modules/expo/bundledNativeModules.json`, `npx expo install` itself failed:
      the sandbox has no route to Expo's compatibility API, "Host not i..." JSON parse
      error) and `react-native-view-shot` ^4.0.3 added to `package.json` (native-build-
      only per ADR 0029, confirmed with `npm run ota:check`: NEEDS A NATIVE BUILD,
      `package.json`/`package-lock.json` changed).
      - `utils/shareCard.ts`: pure `computeShareCardStats(goals, today)`, returns
        `{ keptCents, days } | null`. `days` is the real elapsed calendar span from
        the earliest habit's `trackingStart` through today (inclusive), deliberately
        NOT a streak (resets on a miss) and NOT `totalSkips` (a skip count, not a
        span) so the headline is never a fabricated statistic. Returns null with no
        goals or a zero total, so the screen shows an honest empty state rather than
        a $0 card.
      - `components/ShareCounterCard.tsx`: the branded square card, reusing KeptHero's
        palette/type (sage-light, display serif) rather than inventing a new look.
        `forwardRef<View>` so `app/share-card.tsx` can `captureRef` it.
      - `app/share-card.tsx`: new pushed screen (registered in `app/_layout.tsx`).
        Renders the card live and on-screen (no off-screen capture dance needed),
        captures it to a local PNG, hands that file to `expo-sharing`'s
        `shareAsync`. `share_card_opened` fires on mount, `share_card_shared` fires
        once the OS share sheet is actually invoked (mirrors `paywall_shown`'s
        honesty level: "shown"/"invoked", not "user definitely completed a share",
        since `shareAsync` resolves on dismissal either way on both platforms).
        A failed capture, an unavailable share sheet, or a thrown `shareAsync` all
        surface the same toast and never fire the tracked event.
      - Entry point: a new Profile row ("Share your kept total", General group),
        **not** a change to Today/KeptHero. Keeps this off the heavily-audited Today
        surface; see `design/decisions/components/ShareCounterCard.md`.
      - Two new analytics events in `utils/analytics.ts`'s `AnalyticsEventMap`:
        `share_card_opened`, `share_card_shared`, both structural (`Record<string,
        never>`), satisfying the roadmap's "PostHog tracks shares" accept criterion.
      - New `Share2` glyph added to `components/ui/Icon.tsx`'s `GLYPHS` (lucide
        already ships it; nothing else changed there).
      - New strings: `strings.settings.shareRow`, `strings.shareCard.*` (title,
        headline, wordmark, CTA, empty state, failure toast). All additive; no
        existing key touched, per the constants/strings.ts ownership note in
        CLAUDE.md.
      - 15 new tests across three files (`shareCard.test.ts` pins the day-count math
        including the inclusive/1-day/time-of-day edge cases; `shareCounterCard.test.tsx`
        covers the render including "1 day" vs "N days" pluralization;
        `shareCardScreen.test.tsx` covers the empty state, the headline, and the
        capture/share/track wiring with `expo-sharing` and `react-native-view-shot`
        mocked, matching the existing `expo-document-picker` mocking pattern).
        `npx tsc --noEmit` clean. `npm test`: 102 suites / 1093 tests green (up from
        99/1078).
      - Not done, deliberately: no real-device capture/share verification (this
        session cannot run a native build or drive the real OS share sheet); the
        card is text-only v1, no app-icon image embedded. Both flagged in
        `design/decisions/components/ShareCounterCard.md`'s Open section rather than
        decided here.

### P4-4 (roadmap P4-4)
- Explicitly "no in-app UI built for this" per the roadmap's own accept criterion.
  Nothing for this routine to build; it's a Calendly-link-in-email + session process
  item, entirely Charen's court.

## Run 4: the two structural entitlement gaps, closed

Both gaps filed 2026-08-11 ("Backlog from the gating audit... address both with
the real RevenueCat activation work") and reconfirmed still-deferred at the end
of run 3, are now fixed:

- **Non-reactive entitlement reads.** `utils/purchases.ts` gained a listener
  set (`subscribeToEntitlementChanges`) and a `notifyEntitlementChanged()` call
  at every point that actually changes `mockEntitlement`/`liveEntitlement`
  (`writeMockEntitlement`, `hydrateEntitlement`'s mock branch, `purchaseLive`,
  `restoreLive`, `initPurchases`'s initial fetch and its
  `addCustomerInfoUpdateListener` callback). A new `useEntitlement()` hook
  (`useSyncExternalStore(subscribeToEntitlementChanges, getEntitlement,
  getEntitlement)`) is the reactive read; `getEntitlement()` itself is
  untouched and stays the right call outside a component. All 5 gate call
  sites (`app/(tabs)/index.tsx`, `money.tsx`, `insights.tsx`,
  `app/habit/[id].tsx`, `components/leak-scan/useTrackLeak.tsx`) now call
  `useEntitlement()` instead of a one-shot `getEntitlement()`, and
  `components/dev/DevMenuSection.tsx` (the only other reader) switched from its
  own local `useState` mirror to the same hook, so a mock-mode toggle there now
  repaints every mounted gate immediately instead of needing a navigation to
  force a re-render.
- **Gated-sheet copy not distinguishing an at-ceiling premium user from a free
  user.** `PickOneSheet` and `BreakHabitSheet` both gained an optional
  `entitlement?: Entitlement` prop (frozen-props signature grown by addition,
  never broken: omitting it keeps the existing free-tier pitch). When
  `freeTierBlocked` is true and `entitlement === 'premium'`, the gate now shows
  distinct honest copy (`strings.habitLogging.ceilingTitle` /`ceilingBody`
  /`ceilingDismiss`, no price line, no `plannedBanner`, no upgrade CTA) instead
  of pitching a paying user something they cannot buy. All 6 sheet mounts
  across the 5 gate call sites pass the resolved `entitlement` through.
- Tests: `__tests__/purchases.test.ts` gained an `entitlement reactivity`
  describe block (`subscribeToEntitlementChanges` fires/stops firing,
  `useEntitlement()` re-renders via `renderHook`). `__tests__/pickOneSheet.test.tsx`
  gained a `PickOneSheet gated (premium at ceiling)` describe block.
  `__tests__/breakHabitSheetGate.test.tsx` is new (BreakHabitSheet had zero
  test coverage before this run; scoped to the gated state only, since the full
  ungated flow's missing coverage is a separate, larger unit of work).
  `npx tsc --noEmit` clean. `npm test`: 103 suites / 1104 tests green (up from
  102/1093; +11 new, zero regressions).
- Design decisions: added `design/decisions/components/PickOneSheet.md` and
  `BreakHabitSheet.md` (both previously undocumented despite being decision-
  bearing components), indexed in the README.
- Not touched: `DevMenuSection.tsx`'s own gated-copy story (it has none; it is
  a raw toggle, not a gate) and the live-path notify calls in `purchaseLive`/
  `restoreLive`/`initPurchases`'s listener callback are wired but not directly
  unit-tested, since this sandbox's Jest/Babel config cannot execute the real
  dynamic `import('react-native-purchases')` (same documented constraint the
  run-2 live-client tests already work around).

## Next run

Every checklist item across P3 and P4 that this routine can reach without a
website-repo checkout or a Charen-gated external account is now `[x]`, and the
one remaining real-code item (the entitlement gaps above) is done. Nothing
code-shaped is left in this plan.

1. Address any REVIEW FEEDBACK in HANDOFF.md first, if present.
2. If none, re-verify (rebase, `npx tsc --noEmit`, `npm test`), then write
   COMPLETE at the top of HANDOFF.md per the routine's own instructions and
   mark the draft PR ready for review, since nothing code-shaped would be left
   to plan around.
3. `npx tsc --noEmit` and `npm test` must pass before committing, same as every run.
