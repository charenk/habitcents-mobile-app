# core-worker HANDOFF

## Status

Run 2 of the `routine/core-p3` branch. Rebased cleanly onto `origin/main` (17
commits ahead, mostly the design/craft/docs work merged since run 1; nothing
touched `utils/purchases.ts` or this routine's files). No REVIEW FEEDBACK section
was present in run 1's HANDOFF, so this run went straight to PLAN.md's queued
item: the live RevenueCat client. Baseline verified before any change: `npx tsc
--noEmit` clean, `npm test` 99 suites / 1075 tests green (up from run 1's 98/1069;
the design work merged in between added tests). `npm ci` was needed first,
`node_modules` was not present at session start.

## Completed

- **Added `react-native-purchases` ^10.9.0 to `package.json`** (a new native
  dependency; per ADR 0029 this means the next ship of this branch needs
  `eas build`, not an OTA. Confirmed with `npm run ota:check` after this commit,
  see below).
- **Wrote the live client in `utils/purchases.ts`** behind the existing
  `PurchasesClient` seam:
  - `initPurchases()`: dynamically imports `react-native-purchases` only when
    `EXPO_PUBLIC_REVENUECAT_API_KEY` is set (never on `main`'s default env, never
    in tests, mirrors how `utils/analytics.ts` loads PostHog), calls
    `configure()`, reads `getCustomerInfo()`, and subscribes
    `addCustomerInfoUpdateListener` to keep a synchronous in-memory entitlement
    cache current for the rest of the session.
  - `purchase()`/`restore()` call the SDK's real `getProducts` +
    `purchaseStoreProduct` / `restorePurchases`, typed against the actual
    installed package (I read its `.d.ts` files under `node_modules` to get the
    real method signatures and `CustomerInfo`/`MakePurchaseResult` shapes rather
    than guessing).
  - New env var `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (default `'premium'`)
    names the RevenueCat-dashboard entitlement identifier that maps to premium;
    documented in `.env.example`.
  - Mock mode is unchanged and stays the default: no key is set in this
    environment or in tests, so the dynamic import path never runs on `main` or
    in CI.
- **Found and fixed a real bug while wiring this in**, not something the plan
  called for by name but a direct consequence of adding the live path: the old
  code was `if (impl) return impl.X(); <fall through to mock grant>` in
  `getEntitlement()`/`purchase()`/`restore()`. Once a live client can exist,
  that fallback becomes a bug: a live-enabled install whose real client merely
  failed to initialize (bad key, offline at boot, SDK error) would silently take
  the mock branch and comp a free "premium" grant that charged nobody. Fixed by
  branching explicitly on `purchasesEnabled()`: the mock grant now only ever
  fires when purchases are disabled outright. A configured-but-broken live path
  reports `{ ok: false, mode: 'live', error: ... }` instead. Locked in with 3 new
  tests (see below).
- Hit and fixed one TypeScript control-flow quirk: checking the module-level
  `impl` variable a second time after an `await` (once before, once after
  `initPurchases()`) got narrowed to `never` because TS doesn't know the awaited
  call can reassign it. Fixed with a `currentImpl()` accessor function so each
  read is fresh; documented inline so it isn't "fixed" back into a bug later.
- **`hydrateEntitlement()`** (called fire-and-forget from `app/_layout.tsx` at
  app start) now awaits `initPurchases()` before returning in live mode, instead
  of reading a synchronous default immediately. Small, real improvement: the
  first render after a live-mode cold start now has a chance to see the real
  entitlement rather than always starting from a stale 'free'. This does NOT
  fix the separately-filed non-reactive-gate-read gap (already-mounted screens
  still won't repaint on a later entitlement change); see PLAN.md and DECISIONS
  NEEDED below.
- **3 new tests** in `__tests__/purchases.test.ts` ("live mode configured but
  the client fails to initialize"): `getEntitlement()`/`purchase()`/`restore()`
  each verified to report a live failure, never a mock premium grant, when a key
  is set but the client cannot come up. The mechanism that fails
  `initPurchases()` in this test environment is a genuine Jest/Babel limitation
  (no `--experimental-vm-modules`, so a real ESM dynamic import rejects), not a
  mock; that limitation stands in here for "the SDK failed to start" the way it
  would for real on a device (bad key, no network, native module missing).
  Documented in the test file's own comment so a future reader isn't confused
  about why the test works.
- Added `__resetPurchasesInitForTests()`, a small test-only export alongside the
  existing `__setPurchasesForTests()`, needed to let the one new describe block
  re-trigger `initPurchases()` from a clean state.
- **Updated `docs/legal/app-store-privacy-labels.md`**: this run's change makes
  one line of that worksheet stale (it asserted `react-native-purchases` was
  "not installed"), so fixed the Purchases row and section 4 item 1 to say what
  is actually true now: the dependency is installed but still fully inert
  (mock mode, no key anywhere this app is built or tested). The worksheet's
  bottom-line answer ("No, today") is unchanged; only the rationale text needed
  correcting. This is a direct, in-scope consequence of this run's own change,
  not new scope.
- `npx tsc --noEmit` clean. `npm test`: 99 suites / 1078 tests green (up from
  1075; +3 new tests, no regressions).
- Did not start P4-3 this run. The live-client work (SDK type research, the
  fallback-bug fix, and its tests) filled this run's bounded-increment budget on
  its own; starting a second, unrelated Lane-2 UI feature on top would have
  stretched past "roughly one to two hours of focused work."

## Next

See PLAN.md's "Next run" section (updated this run). In order:
1. Address any REVIEW FEEDBACK below first, if present.
2. P4-3 shareable counter card v1 (no external account needed, Lane 2, needs a
   capture + what-to-test on the PR; also touches `package.json` again, so
   confirm native-build-only with `npm run ota:check`).
3. Optional smaller item: the two structural entitlement gaps (non-reactive
   gate reads; at-ceiling-premium upsell copy), filed 2026-08-11, still
   deliberately deferred (see PLAN.md's P3-1 entry for why). Worth its own
   bounded run.

## Blockers

None for this run's own work. Standing blockers, unchanged from run 1:
- No website repo access, so P3-3/P3-4/P3-5 cannot be verified or advanced here.
- Live RevenueCat end-to-end verification (a real sandbox purchase) needs a
  real device build; this session can write and type-check code against the
  real SDK but cannot run a native build or exercise StoreKit/Play Billing.

## DECISIONS NEEDED (for Charen)

1. **Carried over from run 1, still open.** App Store privacy label: review
   `docs/legal/app-store-privacy-labels.md` in full (now touched again this
   run, see Completed above), accept or override its one judgment call
   (section 3: bucketed spend amounts under "Financial Info" vs "Usage Data";
   recommendation stands: "Usage Data"), and resolve the one open verification
   (section 4 item 3: PostHog's IP-handling default). Then transcribe into App
   Store Connect. Not code; nothing to merge for this specifically.
2. **New this run: RevenueCat dashboard entitlement name.** `utils/purchases.ts`
   defaults `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` to `'premium'`. When you set
   up the entitlement in the RevenueCat dashboard, either name it exactly
   `premium`, or set that env var to whatever you actually name it. This is a
   dashboard action this routine cannot take, and a wrong entitlement id would
   make every live purchase silently classify as "not premium" (getEntitlement
   would keep returning 'free' even after a real charge succeeded), so it is
   worth double-checking before the first sandbox test.
3. **New this run: when to actually build and test the live client.** The
   live RevenueCat client is now written, type-checked against the real SDK,
   and inert (mock mode default, no key set anywhere). The remaining gap is a
   real device build: `EXPO_PUBLIC_REVENUECAT_API_KEY` in a local `.env`, a
   dev/device build (`eas build`, this dependency forces one per ADR 0029), and
   a sandbox purchase/restore/cancel walk. This session cannot do any of that.
   No urgency implied either way; flagging so it's a visible next step rather
   than something only discoverable by reading `utils/purchases.ts`'s header
   comment.

No pricing, product id, or legal wording positions were picked by this routine.
No mock-mode default was flipped. No go-live date was picked.
