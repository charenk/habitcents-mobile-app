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

## Run 5: review feedback fixed

Run 4's own HANDOFF.md recorded three orchestrator review items (retryable
`initPurchases()`, a DST undercount in `utils/shareCard.ts`'s day math, a doc
nit in `components/ShareCounterCard.tsx`) but a prior commit on this branch
had only pasted that feedback into HANDOFF.md without actually changing any
source file. Run 5 applied all three fixes for real; full detail in
`docs/routines/HANDOFF.md`'s "Completed (run 5)" section. `npx tsc --noEmit`
clean, `npm test` 103 suites / 1106 tests green (up from 103/1104).

## Run 6: closed out

No new commits on `origin/main` since run 5, no new REVIEW FEEDBACK on
PR #132 (checked the PR's comments directly, none). Re-verified clean:
`npx tsc --noEmit` clean, `npm test` 103 suites / 1106 tests green,
exactly matching run 5's ending count. Every checklist item above is
`[x]` or `(C)`; nothing code-shaped remains that this routine can reach
without a website-repo checkout or a Charen-gated external account.
Marked HANDOFF.md `COMPLETE` and PR #132 ready for review, per the
routine's own completion instructions. Full decision queue for Charen is
in HANDOFF.md's `COMPLETE (run 6, ...)` section.

## Run 8: dated entitlement for the leak finder promo

New work, not on the original checklist: PUNCHLIST.md picked up a
2026-09-06 item, filed against `main`'s `design/enhancements-zeroth-state`
wave (mobile PR #144, decision 0009): LeakFinderTeaser's receipt tells
everyone who opts in "Your six months is saved", and nothing in the app
could grant that. `Entitlement` was `'free' | 'premium'` with no duration;
the punch list item said explicitly "payments work, so it is a human gate
and belongs with core-p3." Rebased onto `origin/main` first (10 commits
ahead there since run 7, mostly the navigation wave and the leak-finder
coming-soon wrap that introduced this gap); same mechanical
`design/decisions/README.md` conflict as every prior rebase, resolved the
same way (union of both sides' component index entries).

Built `utils/purchases.ts`'s timed promotional grant: a separate, dated
record (`@habitcents_promo_entitlement`) layered on top of the free/mock/
live `Entitlement`, never replacing it. `getEntitlement()` reports
`'premium'` while an active grant exists, composing with (not masking) a
real mock or live purchase. `activateLeakFinderPromoIfEligible()` is the
one call site: eligible only once `SCAN_FLOW_ENABLED` is true (the feature
the receipt promises is actually reachable) AND the device has a leak
finder opt-in on file, idempotent so a repeat call never re-activates or
extends the clock. Wired at boot (`app/_layout.tsx`, alongside the existing
`hydrateEntitlement`) and again right after a fresh opt-in tap
(`app/(tabs)/insights.tsx`'s `handleRecordInterest`), so a device that
opts in on a build where the flag is already live gets granted immediately
rather than waiting for the next relaunch.

**The real decision, not just the mechanism: when the six-month clock
starts.** Built to the safer default, not Charen-ratified: it starts when
`SCAN_FLOW_ENABLED` flips true, not at the opt-in tap. Reasoning: the
receipt's own wording is "your six months is saved... unlocks right here
when it's ready," which only stays true if a long dormancy behind the flag
never eats into the offer. Starting the clock at the tap instead is a
one-line change (drop the flag check in `activateLeakFinderPromoIfEligible`)
if Charen would rather have it that way; flagged in DECISIONS NEEDED below
and in `design/decisions/components/LeakFinderTeaser.md`'s Open section.

New structural, payload-free analytics event `leak_finder_promo_activated`
(`utils/analytics.ts`), fired once a grant actually lands, read against
`leak_finder_interest_recorded` to see how much of the opt-in list the
promo reached. D-9 compliant: no payload, no identify().

Tests: `__tests__/purchases.test.ts` gained a "timed promotional grant"
describe block (composition with `getEntitlement()` including stacking with
a real mock purchase, expiry fall-through, storage round-trip via
`hydratePromoGrant()`, corrupt-record handling). New
`__tests__/leakFinderPromo.test.ts` covers `activateLeakFinderPromoIfEligible()`'s
own eligibility gate, which needs `SCAN_FLOW_ENABLED` toggled via a fresh
module per test (same idiom as `__tests__/scanFlowGate.test.tsx`): dormant
flag is a no-op even with an opt-in on file, flag-on-but-no-opt-in is a
no-op, a real grant lands with the right ~6-month expiry, a second call
never re-activates or extends it, and a fresh opt-in on an already-live
build grants immediately. `npx tsc --noEmit` clean. `npm test`: 110 suites
/ 1165 tests green (up from 109/1154 after the rebase; +1 suite, +11
tests).

Design decisions: `design/decisions/components/LeakFinderTeaser.md`
updated in place, the resolved Open item moved into Decisions, the grant-
timing call added to Open as still needing Charen's ratification.

Not touched, deliberately: the live RevenueCat path is untouched (the
promo grant is additive and mode-agnostic, so it needs no live-client
changes); the opt-in's device-local nature (a reinstall loses the claim)
is unchanged and already documented as accepted; no pricing, product id,
or legal wording was touched.

## Run 9: closed out again

No new commits on `origin/main` since run 8, `mergeable_state: clean` on
PR #132, no new comments on the PR, and the current PUNCHLIST.md RESUME
marker's only core-p3-flagged item is the leak finder promo run 8 already
closed (its other four items belong to the zeroth-state design wave, out
of this routine's isolation scope). Re-verified clean: `npx tsc --noEmit`
clean, `npm test` 110 suites / 1165 tests green, exactly matching run 8's
ending count. Marked HANDOFF.md `COMPLETE` and PR #132 ready for review
again, per the routine's own completion instructions.

## Run 10: closed out again

No new commits on `origin/main` since run 9 (`git fetch origin main` came
back empty; branch already even, no rebase needed), `mergeable_state:
clean` and `draft: false` confirmed on PR #132 via the GitHub API, no PR
comments and no PR reviews (both checked directly: empty). Re-checked
`habitcents-ops/PUNCHLIST.md`'s RESUME marker: still the 2026-09-05
zeroth-state wave (device pass, canvas regeneration, an ipad-routine merge
note, a today-kept art asset decision), none core-p3/payments-shaped, same
conclusion as run 9. Fresh `npm install` (node_modules absent in this
container), `npx tsc --noEmit` clean. `npm test` first run: 109/1165 with
one failure, `__tests__/door3BreakSheet.test.tsx`'s auto-open test timing
out at the full suite's default 5s Jest timeout; re-ran that file alone
and all 17 tests passed in 5.5s total, confirming a suite-level timing
flake unrelated to this branch (that file is Door 3's break sheet, not
touched by anything on `routine/core-p3`), not a regression. Per the one
re-run allowance for a suspected flake: 110 suites / 1165 tests green,
exactly matching run 9's ending count. PLAN.md's checklist is unchanged,
still fully `[x]`/`(C)`; nothing code-shaped remains that this routine can
reach without a website-repo checkout or a Charen-gated external account.

## Run 11: closed out again, decision queue flagged

Same shape as runs 9 and 10: no new commits on `origin/main` beyond what
the branch already contains (`git merge-base --is-ancestor` confirmed),
`mergeable_state: clean` and zero comments/reviews on PR #132, PUNCHLIST's
RESUME marker unchanged and still zeroth-state-shaped, not core-p3. Fresh
`npm install`, `npx tsc --noEmit` clean, `npm test` 110 suites / 1165 tests
green on the first attempt (no flake this run). Checklist unchanged, still
fully `[x]`/`(C)`.

This is the third straight idle run since the decision queue first went up
at run 6 (2026-09-05); it has had zero human engagement since. Sent one
push notification this run naming the queue and the idle PR, since nothing
left here is agent-shaped work.

## Run 12: closed out again

Same shape as runs 9-11: no new commits on `origin/main` beyond what the
branch already contains, `mergeable_state: clean` and zero comments on
PR #132, PUNCHLIST's RESUME marker unchanged and still zeroth-state-shaped
(its one core-p3-flagged line, the leak finder dated entitlement, was
already built and closed at run 8; the checkbox itself is not this
routine's to flip). Fresh `npm install`, `npx tsc --noEmit` clean. `npm
test` hit the same known `door3BreakSheet.test.tsx` timing flake as run
10; isolated re-run confirmed all 17 pass. Full suite: 110 suites / 1165
tests green, exactly matching runs 9-11. Checklist unchanged, still fully
`[x]`/`(C)`. No new push notification this run; run 11's already covers
the idle decision queue and nothing has changed since.

## Run 13: rebased across a real content conflict, no new plan work

`origin/main` had moved 6 commits since run 12 (`a51ce4a` to `b748ca3`),
enough to flip the rebase from the usual mechanical
`design/decisions/README.md` index conflict into two genuine content
conflicts: `design/decisions/components/LeakFinderTeaser.md` (main's
2026-09-07 one-line-body trim landed the same file area this branch's
run 8 dated-grant work touched) and `utils/analytics.ts`'s
`AnalyticsEventMap` (main's new `how_it_works_opened` event landed next to
this branch's `leak_finder_promo_activated`). Both resolved by keeping
both sides' content, not by picking one; full reasoning in
`docs/routines/HANDOFF.md`'s run 13 section. No REVIEW FEEDBACK, no new
PUNCHLIST core-p3 item, checklist below unchanged, still fully `[x]`/`(C)`.
`npx tsc --noEmit` clean, `npm test` 113 suites / 1184 tests green (up
from 110/1165, all from main's own commits carried in by the rebase).

## Run 14: closed out again

Same shape as runs 9-12: no new commits on `origin/main` beyond what the
branch already contains, `mergeable_state: clean` and zero comments/reviews
on PR #132, PUNCHLIST's RESUME marker unchanged and still zeroth-state-
shaped (its one core-p3-flagged line, the leak finder dated entitlement,
was already built and closed at run 8). Fresh `npm install`, `npx tsc
--noEmit` clean. `npm test` hit the same known `door3BreakSheet.test.tsx`
timing flake as runs 10 and 12; isolated re-run confirmed all 17 pass.
Full suite: 113 suites / 1184 tests green, exactly matching run 13.
Checklist unchanged, still fully `[x]`/`(C)`. No new push notification;
run 11's already covers the idle decision queue and nothing has changed
since.

## Run 15: closed out again

Same shape as runs 9-12/14: no new commits on `origin/main` beyond what
the branch already contains, `mergeable_state: clean` and zero
comments/reviews on PR #132, PUNCHLIST's RESUME marker unchanged and
still zeroth-state-shaped. The only new input since run 14 was the
orchestrator's REVIEW FEEDBACK for runs 12-14 ("Approved, no fixes
owed"), nothing to act on. Fresh `npm install`, `npx tsc --noEmit`
clean, `npm test` 113 suites / 1184 tests green on the first attempt (no
flake this run), exactly matching runs 13-14. Checklist unchanged, still
fully `[x]`/`(C)`. No new push notification; run 11's already covers the
idle decision queue and nothing has changed since.

## Run 16: closed out again

Same shape as runs 9-15: no new commits on `origin/main` beyond what the
branch already contains, `mergeable_state: clean` and zero comments/
reviews on PR #132, PUNCHLIST's RESUME marker unchanged and still
zeroth-state-shaped. Fresh `npm install`, `npx tsc --noEmit` clean. `npm
test` hit the same known `door3BreakSheet.test.tsx` timing flake as runs
10, 12, 14; isolated re-run confirmed all 17 pass. Full suite: 113 suites
/ 1184 tests green, exactly matching runs 13-15. Checklist unchanged,
still fully `[x]`/`(C)`. No new push notification; run 11's already
covers the idle decision queue and nothing has changed since.

## Run 17: closed out again

Same shape as runs 9-16: no new commits on `origin/main` beyond what
the branch already contains, `mergeable_state: clean` and zero
comments/reviews on PR #132, PUNCHLIST's RESUME marker unchanged and
still zeroth-state-shaped. Fresh `npm install`, `npx tsc --noEmit`
clean. `npm test` 113 suites / 1184 tests green on the first attempt,
no flake this run, exactly matching runs 13-16. Checklist unchanged,
still fully `[x]`/`(C)`. No new push notification; run 11's already
covers the idle decision queue (now 11 runs idle) and nothing has
changed since.

## Run 18: closed out again

Same shape as runs 9-17: no new commits on `origin/main` beyond what
the branch already contains, `mergeable_state: clean` and zero
comments on PR #132, PUNCHLIST's RESUME marker unchanged (the
`cc87a3c..aabe386` ops-main range touched only `docs/runs.log`) and
still zeroth-state-shaped. Fresh `npm install`, `npx tsc --noEmit`
clean. `npm test` 113 suites / 1184 tests green on the first attempt,
no flake this run. Checklist unchanged, still fully `[x]`/`(C)`. No new
push notification; run 11's already covers the idle decision queue
(now 12 runs idle) and nothing has changed since.

## Run 19: closed out again

Same shape as runs 9-18: no new commits on `origin/main` beyond what
the branch already contains, `mergeable_state: clean` and zero
comments/reviews on PR #132, PUNCHLIST's RESUME marker unchanged and
still zeroth-state-shaped. Fresh `npm install`, `npx tsc --noEmit`
clean. `npm test` 113 suites / 1184 tests green on the first attempt,
no flake this run, exactly matching runs 13-18. Checklist unchanged,
still fully `[x]`/`(C)`. No new push notification; run 11's already
covers the idle decision queue (now 13 runs idle) and nothing has
changed since.

## Run 20: closed out again

Same shape as runs 9-19: no new commits on `origin/main` beyond what
the branch already contains (`git rev-list --left-right --count
origin/main...routine/core-p3` showed `0 24`), `mergeable_state: clean`
and zero comments/reviews on PR #132, PUNCHLIST's RESUME marker
unchanged and still zeroth-state-shaped. Fresh `npm install`, `npx tsc
--noEmit` clean. `npm test` 113 suites / 1184 tests green on the first
attempt, no flake this run, exactly matching runs 13-19. Checklist
unchanged, still fully `[x]`/`(C)`. No new push notification; run 11's
already covers the idle decision queue (now 14 runs idle) and nothing
has changed since.

## Run 21: closed out again

Same shape as runs 9-20: no new commits on `origin/main` beyond what
the branch already contains, `mergeable_state: clean` and zero
comments/reviews on PR #132, PUNCHLIST's RESUME marker unchanged and
still zeroth-state-shaped. Fresh `npm install`, `npx tsc --noEmit`
clean. `npm test` 113 suites / 1184 tests green on the first attempt,
no flake this run, exactly matching runs 13-20. Checklist unchanged,
still fully `[x]`/`(C)`. No new push notification; run 11's already
covers the idle decision queue (now 15 runs idle) and nothing has
changed since.

## Run 22: closed out again

Same shape as runs 9-21: no new commits on `origin/main` beyond what the
branch already contains (`git rev-list --left-right --count
origin/main...routine/core-p3` returned `0 26`, branch tip unchanged at
`cf0a247`), `mergeable_state: clean` and zero comments/reviews on PR
#132, PUNCHLIST's RESUME marker unchanged (still the 2026-09-05/06
zeroth-state design wave items plus the leak finder dated-entitlement
line, already built and closed on this branch at run 8) and still not
core-p3-shaped. Fresh `npm install`, `npx tsc --noEmit` clean. `npm
test` 113 suites / 1184 tests green on the first attempt, no flake this
run, exactly matching runs 13-21. Checklist unchanged, still fully
`[x]`/`(C)`. No new push notification; run 11's already covers the idle
decision queue (now 16 runs idle) and nothing has changed since.

## Run 24: rebase (first since run 13), closed out again

`git rev-list --left-right --count origin/main...routine/core-p3` returned
`4 28`: `origin/main` had moved 4 commits since run 13's rebase (the
2026-09-07 Today docks / How-it-works sheet wave, PR #154 and friends),
touching `constants/strings.ts` and several `design/decisions/` files this
branch also edits, but none of the same entries (main's new lines are for
`BreakHabitRow`/`DockCard`/`HowItWorksSheet`/`QuickLogRow`; this branch's
own touches are `PickOneSheet`/`BreakHabitSheet`/`ShareCounterCard`/
`LeakFinderTeaser`). `git rebase origin/main` completed with zero conflicts
this time (unlike run 13's two genuine ones), force-with-lease pushed.
PR #132 unchanged otherwise: open, not draft, zero comments, zero reviews.
No new REVIEW FEEDBACK since run 15's "Approved, no fixes owed" for runs
12-14. PUNCHLIST.md's RESUME marker re-pulled fresh: still only the
2026-09-05/06 zeroth-state design wave items plus the leak finder
dated-entitlement line already built and closed on this branch at run 8;
nothing newly core-p3-shaped. Fresh `npm install`, `npx tsc --noEmit`
clean, `npm test` 113 suites / 1184 tests green on the first attempt, no
flake, exactly matching runs 13-23 (all growth since run 8 came from
main's own commits carried in by rebases, not new code here). Checklist
unchanged, still fully `[x]`/`(C)`. No new push notification: the decision
queue has now sat untouched since run 6, run 11 already flagged it once,
and nothing in its content has changed (18 runs idle on the decision
queue itself, though this run did do real rebase work).

## Run 25: rebase across two real content conflicts, no new plan work

`git rev-list --left-right --count origin/main...routine/core-p3` returned
`14 29`: `origin/main` had moved 14 commits since run 24's rebase (the
2026-09-10 "sheets: one platform pattern" pinned-title/pinned-footer
rewrite of `Sheet.tsx`, PRs #155-#159, plus the leak-funnel/check-in-card
wave). This flipped the usual mechanical `design/decisions/README.md`
conflict into three genuine ones, all in the same run-4 entitlement-gate
commit (`dd2c1b0`):

1. `components/habit-logging/PickOneSheet.tsx` and
   `components/onboarding/BreakHabitSheet.tsx`, same shape in both files.
   Main's pinned-footer rewrite moved each gated sheet's CTA buttons out of
   the scrolling body into the new `footer` prop, but that footer was still
   the old undifferentiated "See Premium / Maybe later" pair with no
   `atCeiling` branch. This branch's run-4 commit had added the
   `atCeiling`-conditional footer (ceiling dismiss vs upgrade pitch) back
   when the CTAs still lived in the scrolling body. Resolved by moving the
   `atCeiling` conditional onto the new `footer` prop in both files (ceiling
   → single `ceilingDismiss` button, otherwise the existing upgrade/maybe-later
   pair) and deleting the now-redundant in-body button block and its
   `style={styles.primary}` (confirmed dead: `styles.primary` is not defined
   in either file post-rewrite). The gated body content itself (evidence
   block, gate card, `atCeiling`-conditional copy) merged clean, untouched.
2. `design/decisions/components/BreakHabitSheet.md`, an add/add conflict:
   main's 2026-09-10 redesign entry (annotation set 1, new Sheet platform)
   and this branch's 2026-09-05 entitlement-gate entry were two independent
   rewrites of the same file with no shared ancestor content. Resolved by
   keeping main's current Direction/States/Decisions/Open/Iterations as the
   base (it reflects the file as it actually reads today) and folding in
   this branch's entitlement decision as an additional Decisions/Iterations
   entry, plus one added sentence in States noting the gate still splits on
   `entitlement`, and one added Open line for the pre-existing gated-only
   test-coverage gap. Nothing from either side dropped.

Fresh `npm install` (node_modules removed first), `npx tsc --noEmit` clean.
`npm test`: 117 suites / 1206 tests green on the first attempt, no flake
(both `pickOneSheet.test.tsx` and `breakHabitSheetGate.test.tsx` pass,
confirming the footer restructuring didn't change either gate's observable
behavior). Force-with-lease pushed. PR #132 confirmed via the API: head and
base both updated to match (base now `9376cc2`, main's current tip), open,
not draft, merged false, zero comments, zero reviews, unchanged since run
15's last review. Re-checked `habitcents-ops/PUNCHLIST.md`'s RESUME marker
fresh: the new items since run 24 (a profile-modal-vs-push navigation
decision, a how-it-works scroll-fade question, sheet drag-to-dismiss device
verification, the known `door3BreakSheet.test.tsx` CI flake, a Categories
empty-subtitle polish note) are all design/QA-shaped, none payments/legal;
the one core-p3-flagged line (leak finder dated entitlement) is still the
same item already built and closed at run 8. Checklist unchanged, still
fully `[x]`/`(C)`. No new push notification: the decision queue has sat
untouched since run 6 (now 19 runs idle on the queue itself), run 11
already flagged it once, and nothing in its content has changed, though
this run did real rebase-and-resolve work.

## Run 26: rebase, no conflicts despite the crossing warning, no new plan work

`origin/main` moved 4 commits since run 25's rebase point (`9376cc2` to
`683ecc3`: the four QA-loop PRs #161-#164, including #163's paywall
readable-at-rest layout). Run 25's REVIEW FEEDBACK named real crossing risk
in `constants/strings.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/insights.tsx`,
and `contexts/HabitsContext.tsx`, but the rebase completed with zero
conflicts: the edited regions in each shared file didn't land adjacent to
each other. Spot-checked all four named files after rebasing to confirm
nothing silently dropped; full detail in `docs/routines/HANDOFF.md`'s run 26
section. No new REVIEW FEEDBACK, no new PUNCHLIST core-p3 item (its RESUME
marker is still the 2026-09-10 interaction-audit wave, all design/QA-shaped),
checklist unchanged, still fully `[x]`/`(C)`. `npx tsc --noEmit` clean,
`npm test` 121 suites / 1265 tests green on the first attempt, no flake (up
from 117/1206, all from main's own QA-wave tests carried in by the rebase).

## Run 27: closed out again

Same shape as runs 9-22/24: no new commits on `origin/main` beyond what
the branch already contains (`git rev-list --left-right --count
origin/main...routine/core-p3` returned `0 33`, branch tip unchanged at
`41b83c7`), `mergeable_state: clean` and zero comments/reviews on PR #132,
PUNCHLIST's RESUME marker unchanged and still the 2026-09-10
interaction-audit wave, none core-p3-shaped (the one flagged line, the
leak finder dated entitlement, stays the item already built and closed at
run 8). No new REVIEW FEEDBACK since the entry covering runs 15-25. Fresh
`npm install`, `npx tsc --noEmit` clean. `npm test` hit the standing
`door3BreakSheet.test.tsx` full-suite timing flake (isolated re-run: 19/19
pass); full suite 121 suites / 1265 tests green, exactly matching run 26.
Checklist unchanged, still fully `[x]`/`(C)`. No new push notification;
run 11's already covers the idle decision queue (now 21 runs idle) and
nothing has changed since.

## Run 28: rebase across two real content conflicts, closed out again

`origin/main` moved 29 commits since run 27's rebase point (the 2026-09-11/12
"Upcoming" wave, PRs #165-#173: month sections, custom glyphs, yearly
anchors, unknown-day bills, date precision, dynamic-type row survival,
mark-as-paid). Two genuine conflicts, same recurring shape as runs 7/8/13/24:
`design/decisions/README.md`'s component index (twice, union-resolved as
always) and `app/(tabs)/money.tsx`'s import block, where main's Upcoming
rewrite (`getEntitlement`, `advancePastToday`, `getStoredUpcomingWindowDays`,
`pickDefaultUpcomingWindow`) collided with this branch's own `useEntitlement`
switch; kept HEAD's full import list but swapped in `useEntitlement` (the
call site the file actually uses) and dropped a stale unused `UpcomingItem`
type import from the incoming side. Full reasoning in
`docs/routines/HANDOFF.md`'s run 28 section. No new REVIEW FEEDBACK,
no new PUNCHLIST core-p3 item (RESUME marker still the 2026-09-10
interaction-audit wave, all design/QA-shaped), checklist unchanged, still
fully `[x]`/`(C)`. Fresh `npm install`, `npx tsc --noEmit` clean, `npm test`
125 suites / 1367 tests green on the first attempt, no flake (up from
121/1265, all from main's own Upcoming-wave tests carried in by the
rebase). Force-with-lease pushed (`5534bff`). No new push notification;
run 11's already covers the idle decision queue (now 22 runs idle) and
nothing in its content has changed since.

## Run 29: closed out again

Same shape as runs 9-22/24/27: no new commits on `origin/main` beyond what
the branch already contains (`git rev-list --left-right --count
origin/main...routine/core-p3` returned `0 35`, branch tip unchanged at
`2c23516`), `mergeable_state: clean` and zero comments/reviews on PR #132,
PUNCHLIST's RESUME marker unchanged and still the 2026-09-10
interaction-audit wave, none core-p3-shaped (the one flagged line, the
leak finder dated entitlement, stays the item already built and closed at
run 8). Fresh `npm install`, `npx tsc --noEmit` clean. `npm test` 125
suites / 1367 tests green on the first attempt, no flake this run, exactly
matching run 28. Checklist unchanged, still fully `[x]`/`(C)`. No new push
notification; run 11's already covers the idle decision queue (now 23
runs idle) and nothing has changed since.

## If this routine fires again

The branch and PR stay open until Charen merges or closes them (routine
branches sit outside the normal PR lanes per CLAUDE.md). If a future run
finds new commits on `origin/main` or a new REVIEW FEEDBACK section, treat
that as new work: rebase, address the feedback, re-verify
(`npx tsc --noEmit`, `npm test`), and update this file and HANDOFF.md
accordingly. Do not re-open PLAN.md items already checked off without a
concrete reason (a regression, a changed roadmap accept criterion, or an
explicit Charen ask). Also re-check PUNCHLIST.md's RESUME marker for new
core-p3-flagged items the way run 8 found this one: this routine does not
only re-verify a closed checklist, it watches for new payments/entitlement
debt `main` accumulates.
