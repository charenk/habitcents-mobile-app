# core-worker HANDOFF

## Status (run 5, 2026-09-05)

`git fetch origin main` showed no new commits since run 4 (branch already
even with `origin/main`, no rebase needed). This run addressed the
orchestrator's REVIEW FEEDBACK below, which run 4's session had recorded
into this file but had not actually applied to code (the commit that added
the REVIEW FEEDBACK section touched only `docs/routines/HANDOFF.md`, no
source files). All three items are now fixed in commit on this branch; see
Completed. `npx tsc --noEmit` clean. `npm test`: 103 suites / 1106 tests
green (up from 103/1104; +2 new tests). PLAN.md's checklist itself is
unchanged by this run (it was already fully `[x]`/`(C)` before this fix).

## Prior status (run 4)

Run 4 of the `routine/core-p3` branch. `git fetch origin main` showed no new
commits since run 3 (branch already up to date, 3 commits ahead of
`origin/main`), so no rebase was needed. No REVIEW FEEDBACK section was
present in run 3's HANDOFF. `node_modules` did not exist in this checkout
(fresh container); `npm install` ran first, then the baseline was verified
clean: `npx tsc --noEmit` clean, `npm test` 102 suites / 1093 tests green
(matches run 3's own ending count exactly). This run went straight to
PLAN.md's queued item: the two structural entitlement gaps filed 2026-08-11
and reconfirmed still-deferred at the end of run 3.

## Completed (run 5)

Fixed all three items from the REVIEW FEEDBACK section below, in
`9a0d3d7`:

1. **Retryable `initPurchases()`.** The old code set
   `purchasesInitialized = true` in a `finally` regardless of outcome, so
   one failed boot-time init locked every later `purchase()`/`restore()`
   into "did not initialize" for the rest of the app session, even after
   the network came back. On the catch path this now leaves
   `purchasesInitialized` false and clears `purchasesInitPromise` to
   `null`, so the next call re-attempts `import()`/`configure()`/
   `getCustomerInfo()` from scratch. `client.isConfigured()` guards
   against calling `configure()` a second time if the SDK actually came
   up but failed later (e.g. `getCustomerInfo()` threw). New test-only
   `__isPurchasesInitializedForTests()` plus a test in
   `__tests__/purchases.test.ts` asserting the flag is false after a
   failed `purchase()` call. Note: this project's Jest/Babel setup can't
   execute a real dynamic `import('react-native-purchases')` at all (it
   throws the same `--experimental-vm-modules` TypeError every time,
   confirmed by hand with a throwaway probe test), so a black-box
   call/response check can't distinguish "retryable" from "permanently
   stuck" (both look like the same repeated failure). The internal flag
   is the only thing that actually proves the fix; that's why the new
   exported getter exists rather than trying to fake a successful retry.
2. **DST day-math undercount.** `utils/shareCard.ts` now uses
   `Math.round(spanMs / MS_PER_DAY) + 1` instead of `Math.floor(...) + 1`.
   A span crossing a spring-forward transition is n*24h minus 1h, which
   `Math.floor` reads as one whole day short; `Math.round` absorbs the
   one-hour drift (and the symmetric fall-back gain) without changing any
   non-DST result, since those spans are always exact day multiples. New
   test in `__tests__/shareCard.test.ts` sets `process.env.TZ =
   'America/New_York'` for the 2026-03-08 transition (confirmed by hand
   that Node's Date respects a runtime `process.env.TZ` reassignment) and
   restores the original `TZ` afterward.
3. **Doc nit.** `components/ShareCounterCard.tsx`'s header now says the
   card renders on-screen, matching `app/share-card.tsx` (which was
   already correct: the card is mounted and visible, captured live, never
   hidden off-screen).

`npx tsc --noEmit` clean. `npm test`: 103 suites / 1106 tests green (up
from 103/1104; +2 new tests, zero regressions).

## Completed (run 4)

- **Non-reactive entitlement reads, fixed.** `utils/purchases.ts` gained a
  listener set (`entitlementListeners`, `subscribeToEntitlementChanges`) and a
  `notifyEntitlementChanged()` call at every point that actually changes
  `mockEntitlement` or `liveEntitlement`: `writeMockEntitlement` (covers
  `setMockEntitlement`, `resetMockEntitlement`, and the mock `purchase()`
  path), `hydrateEntitlement`'s mock branch (covers mock `restore()`),
  `purchaseLive`, `restoreLive`, and `initPurchases`'s initial
  `getCustomerInfo()` fetch plus its `addCustomerInfoUpdateListener` callback
  (the actual point of this fix: a renewal or a purchase completed elsewhere
  now propagates). A new `useEntitlement()` hook
  (`useSyncExternalStore(subscribeToEntitlementChanges, getEntitlement,
  getEntitlement)`) is the reactive read for components.
  `getEntitlement()` itself is untouched, still synchronous, still the right
  call for `utils/devMenu.ts` or any one-off non-component read.
  All 5 gate call sites switched from a one-shot `getEntitlement()` to
  `useEntitlement()`: `app/(tabs)/index.tsx`, `app/(tabs)/money.tsx`,
  `app/(tabs)/insights.tsx`, `app/habit/[id].tsx`,
  `components/leak-scan/useTrackLeak.tsx`. `components/dev/DevMenuSection.tsx`
  (the dev-menu entitlement toggle, the only other reader) switched from its
  own local `useState` mirror plus a manual `setEntitlement(next)` call to the
  same `useEntitlement()` hook, which both simplifies it (one source of truth
  instead of two) and means toggling entitlement there now repaints every
  other mounted gate immediately, which is the whole bug this fixes.
- **Gated-sheet copy not distinguishing an at-ceiling premium user, fixed.**
  `PickOneSheet` and `BreakHabitSheet` both gained an optional
  `entitlement?: Entitlement` prop. PickOneSheet's header comment says "PROPS
  ARE FROZEN"; this grows the signature by addition only (every existing call
  site that omits the prop keeps the exact free-tier pitch it always
  rendered), never breaks it. When `freeTierBlocked` is true and
  `entitlement === 'premium'`, the gated block now renders distinct honest
  copy: `strings.habitLogging.ceilingNote` / `ceilingTitle` / `ceilingBody` /
  `ceilingDismiss` (new strings, `constants/strings.ts`), no price line, no
  `plannedBanner` honesty note (nobody is being asked to pay), and a single
  dismiss button instead of an upgrade CTA + "Maybe later" (there is nothing
  left to sell a paying user). Free/omitted `entitlement` is unchanged. All 6
  sheet mounts across the 5 gate call sites now pass the resolved
  `entitlement` value through as a prop, alongside the existing
  `freeTierBlocked`.
- **Tests.** `__tests__/purchases.test.ts` gained an `entitlement reactivity`
  describe block: `subscribeToEntitlementChanges` fires on a mock
  purchase/`resetMockEntitlement`/`setMockEntitlement` and stops firing once
  unsubscribed; `useEntitlement()` re-renders (via `renderHook` +
  `act`) when the mock grant changes. `__tests__/pickOneSheet.test.tsx` gained
  a `PickOneSheet gated (premium at ceiling)` describe block (3 tests: shows
  ceiling copy and drops the price/upgrade CTA, dismisses without ever calling
  `onStartTrial`, still shows the free-tier pitch when entitlement is
  free/omitted). `__tests__/breakHabitSheetGate.test.tsx` is new:
  BreakHabitSheet had zero test coverage of any kind before this run;
  deliberately scoped to just the gated state (both branches) rather than
  building out the full ungated chip/amount/cadence flow's coverage, which is
  a separate, larger unit of work and not part of this backlog item.
  `npx tsc --noEmit` clean. `npm test`: 103 suites / 1104 tests green (up from
  102/1093; +11 new, zero regressions).
- **Design decisions.** Added `design/decisions/components/PickOneSheet.md`
  and `BreakHabitSheet.md` (both were undocumented despite being
  decision-bearing components; the README's own rule is "add a file when you
  first make a decision about a component"), indexed in
  `design/decisions/README.md`.
- Considered and left alone: the live-path `notifyEntitlementChanged()` calls
  in `purchaseLive`/`restoreLive`/`initPurchases`'s
  `addCustomerInfoUpdateListener` callback are wired but not directly
  exercised by a test, because this sandbox's Jest/Babel config cannot run a
  real dynamic `import('react-native-purchases')` (the same documented
  constraint run 2's live-client tests already work around by testing the
  injected-client seam and the init-failure path instead, never the real
  dynamic import itself). Not a gap introduced this run; the mock-mode
  reactivity tests exercise the identical `notifyEntitlementChanged()` call
  sites through the reachable path.

## Next

REVIEW FEEDBACK below is now addressed (run 5) but not yet re-reviewed by
the orchestrator. Next run:
1. Address any NEW REVIEW FEEDBACK below first, if the orchestrator has
   appended one since run 5.
2. If none, re-verify (rebase onto `origin/main`, `npx tsc --noEmit`,
   `npm test`), then write COMPLETE at the top of this file and mark the
   draft PR ready for review, per the routine's own instructions. PLAN.md's
   checklist is fully `[x]`/`(C)` and nothing code-shaped remains that this
   routine can reach without a website-repo checkout or a Charen-gated
   external account, so COMPLETE is the expected outcome once run 5's fixes
   clear review.

## Blockers

None for this run's own work. Standing blockers, unchanged from runs 1-3:
- No website repo access, so P3-3/P3-4/P3-5 cannot be verified or advanced
  here.
- Live RevenueCat end-to-end verification (a real sandbox purchase) needs a
  real device build.
- The share card's capture-and-share path (run 3) still has no real-device
  pass.
- **New this run:** the live-path reactivity wiring (customerInfo update
  listener notifying mounted screens) is code-reviewable but not unit-testable
  in this sandbox, for the reason given above under Completed. Worth a manual
  check once RevenueCat activation gets a real device build: trigger a
  renewal or a second-device purchase and confirm an already-open habit
  detail screen's gate updates without navigating away and back.

## DECISIONS NEEDED (for Charen)

1. **Carried over from runs 1-3, still open.** App Store privacy label:
   review `docs/legal/app-store-privacy-labels.md` in full, accept or
   override its one judgment call (section 3: bucketed spend amounts under
   "Financial Info" vs "Usage Data"; recommendation stands: "Usage Data"),
   and resolve the one open verification (section 4 item 3: PostHog's
   IP-handling default). Then transcribe into App Store Connect. Not code;
   nothing to merge for this specifically.
2. **Carried over from run 2, still open.** RevenueCat dashboard entitlement
   name must match `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (defaults to
   `'premium'`).
3. **Carried over from run 2, still open.** When to actually build and test
   the live RevenueCat client (needs a real device build).
4. **Carried over from run 3, still open.** A real device pass for the share
   card once a native build exists: confirm the captured PNG and that the OS
   share sheet receives a usable image on both iOS and Android.
5. **New this run, not blocking, informational.** No pricing, product id, or
   legal wording positions were touched. No mock-mode default was flipped.
   The new `ceilingNote`/`ceilingTitle`/`ceilingBody`/`ceilingDismiss` copy
   (constants/strings.ts) is new customer-facing text but not a pricing or
   legal decision: it only ever shows to a premium user who has already hit
   the real 5-habit ceiling, stating a fact about the product's own limit,
   not a price or a legal position. Flagging so it is visible, not asking for
   a decision.

## REVIEW FEEDBACK

**Status: addressed in run 5 (`9a0d3d7`), pending re-review.** All three
numbered items below are fixed; see "Completed (run 5)" above for what
changed and why. Left in place rather than deleted so the orchestrator's
next pass can verify against the original ask.

2026-09-05, orchestrator, runs 1-4 reviewed (d1d2cf1..4e79863). Strong
work: catching and fixing the impl-null fallback that silently granted mock
premium on a live init failure was a real save, and the useSyncExternalStore
reactivity fix is the right shape. Three items to fix next run, before
marking PR #132 ready for review:

1. `initPurchases()` failure is permanent for the session. The catch
   leaves `impl` null and the finally sets `purchasesInitialized = true`,
   so one failed boot-time init (offline at launch, a transient RevenueCat
   outage) makes every later `purchase()`/`restore()` report "did not
   initialize" until the app relaunches, even after the network returns.
   Make a failed init retryable: on the catch path, clear
   `purchasesInitPromise` and leave `purchasesInitialized` false, guarding
   against calling `configure()` twice on retry (the SDK's
   `Purchases.isConfigured()`, or a local configured flag). Cover the
   retry via the injectable seam plus `__resetPurchasesInitForTests`, same
   as the existing init-failure test.
2. `utils/shareCard.ts` day math undercounts across spring-forward DST:
   the midnight-to-midnight diff over such a span is n*24h minus 1h, and
   `Math.floor` then yields n-1, so the card can claim one fewer day than
   the real span. `Math.round(spanMs / MS_PER_DAY) + 1` fixes it; add a
   DST test case with explicit dates (the suite runs under a fixed TZ, so
   pick one that crosses a US or EU transition).
3. Doc nit: `components/ShareCounterCard.tsx`'s header says it "renders
   off-screen for a view-shot capture"; `app/share-card.tsx` correctly
   says it renders on-screen (mounted and visible). Align both on
   on-screen.

Not yours to fix, tracked on the status board for Charen: the CLAUDE.md
locked rule still names PostHog "the single sanctioned exception" to
no-network, and this branch makes RevenueCat a second env-gated exception;
that amendment is queued as a decision, and PR #132 sits behind the
payments human gate regardless of CI state. Worth one line in the PR body
when you mark it ready, so a reviewer sees both flags.
