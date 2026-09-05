/**
 * Purchases: a thin, env-gated entitlement + purchase layer over RevenueCat
 * (task BET-004, Phase 3 monetization / P3-1). Mock mode by default; a live
 * client behind the same seam (below).
 *
 * Why mock-first (mirrors website/lib/register.ts): the whole purchase and
 * entitlement flow needs to be wired, testable, and demoable before Charen's
 * RevenueCat key exists. So when EXPO_PUBLIC_REVENUECAT_API_KEY is absent (the
 * default, including on `main` and in tests) this module runs in "mock" mode:
 * every call SUCCEEDS and resolves so the UI flow works end to end, and a
 * clearly-labeled MOCK entitlement is stored on the device.
 *
 * Why the mock now grants premium (device feedback 2026-08-04): it used to
 * resolve ok and leave the entitlement at 'free', so the paywall said "trial
 * started" and returned the user to a sheet that was still locked. That told
 * them it worked and proved it had not, and it made free = 1 vs premium = 5
 * untestable by anyone. The mock now flips a local entitlement so the gate
 * really opens. Nothing is charged, the planned-pricing banner stays on the
 * paywall, and every log line still says mock.
 *
 * Live client (this run): `react-native-purchases` is now a real dependency
 * (package.json), which per ADR 0029 means the next ship of this file needs
 * `eas build`, not an OTA. Its module is still never imported at module scope
 * in the compiled JS, only dynamically via `initPurchases()` below, and then
 * only when a key is configured (mirrors utils/analytics.ts's PostHog import).
 * Mock mode stays the default: no key is set in this environment or in tests,
 * so the dynamic import never runs on `main` or in CI. The one reference to
 * the SDK's types is an `import type`, erased at compile time.
 *
 * Activation (Charen, later): run a dev/device build (this dependency forces
 * one, per ADR 0029), create the `premium` entitlement in the RevenueCat
 * dashboard (or point EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID at whatever it is
 * actually named there), and put the RevenueCat public SDK key in a local
 * untracked .env (EXPO_PUBLIC_REVENUECAT_API_KEY). See .env.example. Until
 * then, MOCK stands. Sandbox purchase/restore/cancel verification needs that
 * real device build; this repo cannot do it.
 */

// Type-only import: erased at compile time, so it adds nothing to the bundle
// and does not pull the SDK in when purchases are disabled (mirrors how
// utils/analytics.ts type-imports posthog-react-native).
import type { default as RNPurchases, CustomerInfo } from 'react-native-purchases';

// AsyncStorage IS a real dependency and is imported the same way utils/storage.ts
// imports it. The dynamic-import rule above is about react-native-purchases;
// it does not apply here.
import AsyncStorage from '@react-native-async-storage/async-storage';

// React IS a real dependency, imported only for useSyncExternalStore (the
// useEntitlement() hook below). Every other export in this file stays plain
// functions so utils/devMenu.ts and __tests__/purchases.test.ts can keep
// calling them outside a component.
import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Product catalog (PLANNED prices, Phase 3 decisions pending Charen's sign-off).
// These ids are placeholders until the real RevenueCat products are created;
// the paywall and analytics reference them by these constants only.
// ---------------------------------------------------------------------------

export const PRODUCT_MONTHLY = 'habitcents_premium_monthly';
export const PRODUCT_ANNUAL = 'habitcents_premium_annual';
export const PRODUCT_LIFETIME = 'habitcents_premium_lifetime';

export type ProductId =
  | typeof PRODUCT_MONTHLY
  | typeof PRODUCT_ANNUAL
  | typeof PRODUCT_LIFETIME;

/**
 * A user's entitlement level. Drives feature gating (free = 1 habit,
 * premium = up to 5). In mock mode this is whatever the local mock grant says,
 * which is 'free' until a mock purchase or 'premium' after one.
 */
export type Entitlement = 'free' | 'premium';

/**
 * Result discriminator (mirrors website/lib/register.ts): `mode` tells the
 * caller whether a real purchase happened ('live') or the mock path
 * short-circuited to success ('mock'). Both resolve ok so the UI flow proceeds.
 */
export type PurchaseResult =
  | { ok: true; mode: 'live' | 'mock'; entitlement: Entitlement; productId: ProductId }
  | { ok: false; mode: 'live' | 'mock'; error: string };

export type RestoreResult =
  | { ok: true; mode: 'live' | 'mock'; entitlement: Entitlement }
  | { ok: false; mode: 'live' | 'mock'; error: string };

// ---------------------------------------------------------------------------
// Configuration (read dynamically so tests can toggle it; Expo inlines
// EXPO_PUBLIC_* at build time, so these resolve to literals in the app).
// ---------------------------------------------------------------------------

function apiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
}

/**
 * The RevenueCat entitlement identifier that means "premium" here. Configured
 * in the RevenueCat dashboard (a Charen action, not code); defaults to the
 * conventional name so activation needs no env change unless the dashboard
 * entitlement ends up named something else.
 */
function entitlementId(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'premium';
}

/**
 * True only when a RevenueCat key is configured. Until then the module runs in
 * mock mode and this returns false, which is the signal every caller uses to
 * know purchases are not real yet.
 */
export function purchasesEnabled(): boolean {
  const key = apiKey();
  return typeof key === 'string' && key.length > 0;
}

function mode(): 'live' | 'mock' {
  return purchasesEnabled() ? 'live' : 'mock';
}

// ---------------------------------------------------------------------------
// Test/live seam. In mock mode `impl` is null and every call takes the mock
// path. initPurchases() (below) sets a real client here once a key is
// configured and the live SDK initializes; unit tests inject a fake to
// exercise the forwarding path without native code.
// ---------------------------------------------------------------------------

export interface PurchasesClient {
  getEntitlement: () => Entitlement;
  purchase: (productId: ProductId) => Promise<PurchaseResult>;
  restore: () => Promise<RestoreResult>;
}

let impl: PurchasesClient | null = null;

// ---------------------------------------------------------------------------
// Reactivity (backlog from the gating audit, 2026-08-11): getEntitlement() is
// a plain synchronous read, so a mounted screen that captured its value on
// render never learns about a purchase, a restore, or a live renewal that
// happens after that render. Every place below that actually changes
// mockEntitlement or liveEntitlement calls notifyEntitlementChanged() so
// useEntitlement() (bottom of this file) can repaint every mounted gate.
// getEntitlement() itself is untouched: it stays the synchronous source of
// truth this subscription mechanism reads from.
// ---------------------------------------------------------------------------

const entitlementListeners = new Set<() => void>();

function notifyEntitlementChanged(): void {
  entitlementListeners.forEach((listener) => listener());
}

/**
 * Subscribe to entitlement changes. Returns an unsubscribe function. Powers
 * useEntitlement(); call sites that render a gate should use the hook, not
 * this directly.
 */
export function subscribeToEntitlementChanges(listener: () => void): () => void {
  entitlementListeners.add(listener);
  return () => {
    entitlementListeners.delete(listener);
  };
}

// Read through a function rather than the bare module variable wherever a
// second read follows an `await`: TS narrows a directly-referenced `impl` to
// `null` for the rest of a branch once an earlier `if (impl)` falls through,
// and does not know initPurchases() can reassign it in between. A function
// call return value is a fresh, unnarrowed read each time.
function currentImpl(): PurchasesClient | null {
  return impl;
}

/**
 * @internal test-only seam (mirrors analytics __setClientForTests). Also drops
 * the in-memory mock grant so each test starts from 'free', and marks live
 * init "already done" so no test accidentally kicks off a real dynamic import
 * of react-native-purchases. __resetPurchasesInitForTests() below undoes that
 * last part for the one test that needs to exercise initPurchases() itself.
 */
export function __setPurchasesForTests(c: PurchasesClient | null): void {
  impl = c;
  mockEntitlement = 'free';
  liveEntitlement = 'free';
  purchasesInitialized = true;
  purchasesInitPromise = null;
}

/** @internal test-only: let a test re-trigger initPurchases() from scratch. */
export function __resetPurchasesInitForTests(): void {
  purchasesInitialized = false;
  purchasesInitPromise = null;
  liveEntitlement = 'free';
}

// ---------------------------------------------------------------------------
// Dev visibility. Mock actions log a single line so the flow is verifiable in
// the Metro console without a dashboard, the same way analytics dry-run does:
//   [purchases:mock] purchase habitcents_premium_annual -> ok (no real charge)
// ---------------------------------------------------------------------------

function logMock(message: string): void {
  console.log(`[purchases:mock] ${message}`);
}

// ---------------------------------------------------------------------------
// Local mock entitlement. Held in memory so getEntitlement() can stay
// synchronous (every gate reads it during render), and mirrored to AsyncStorage
// so it survives a relaunch. Every storage call is wrapped, so a storage
// failure can never take a purchase down with it.
// ---------------------------------------------------------------------------

export const MOCK_ENTITLEMENT_KEY = '@habitcents_mock_entitlement';
/** Stored value. Spelled out so a device inspector cannot mistake it for real. */
const MOCK_ENTITLEMENT_VALUE = 'premium-mock';

let mockEntitlement: Entitlement = 'free';

async function writeMockEntitlement(next: Entitlement): Promise<void> {
  mockEntitlement = next;
  notifyEntitlementChanged();
  try {
    if (next === 'premium') {
      await AsyncStorage.setItem(MOCK_ENTITLEMENT_KEY, MOCK_ENTITLEMENT_VALUE);
    } else {
      await AsyncStorage.removeItem(MOCK_ENTITLEMENT_KEY);
    }
  } catch {
    // Deliberate exception to the write policy in utils/storage.ts: this is
    // the mock entitlement store, and the in-memory grant still holds for this
    // session. Revisit when the real RevenueCat wiring replaces it, where a
    // lost entitlement write is a support ticket rather than a dev-mode blip.
  }
}

/**
 * Read the stored mock grant back into memory. Called once at app start
 * (app/_layout.tsx) so a mock premium survives a relaunch. In live mode this
 * instead waits for initPurchases() so the first render sees a real
 * entitlement rather than the transient 'free' default.
 */
export async function hydrateEntitlement(): Promise<Entitlement> {
  if (purchasesEnabled()) {
    await initPurchases();
    return getEntitlement();
  }
  try {
    const raw = await AsyncStorage.getItem(MOCK_ENTITLEMENT_KEY);
    mockEntitlement = raw === MOCK_ENTITLEMENT_VALUE ? 'premium' : 'free';
    notifyEntitlementChanged();
  } catch {
    // Storage unavailable: keep whatever this session already granted rather
    // than silently revoking it.
  }
  return mockEntitlement;
}

// ---------------------------------------------------------------------------
// Live client. Dynamically imports react-native-purchases only when a key is
// configured (never on `main`'s default env, never in tests), exactly the way
// utils/analytics.ts's initAnalytics() loads PostHog. Sets `impl` above once
// ready, which every public function already prefers over the mock path.
// ---------------------------------------------------------------------------

/** In-memory cache of the live entitlement, since getEntitlement() must stay
 * synchronous. Starts 'free' and is updated from getCustomerInfo() at init
 * and from the SDK's customerInfoUpdateListener after every purchase/restore/
 * renewal/refund RevenueCat reports for the rest of the app session. */
let liveEntitlement: Entitlement = 'free';

let purchasesInitialized = false;
let purchasesInitPromise: Promise<void> | null = null;

function entitlementFromCustomerInfo(info: CustomerInfo): Entitlement {
  return info.entitlements.active[entitlementId()] ? 'premium' : 'free';
}

/**
 * Start a real purchase against the store. Not a mock: whatever RevenueCat's
 * getProducts/purchaseStoreProduct calls do (a real charge, in a sandbox or
 * production) is what happens. `mod` is the awaited react-native-purchases
 * module (passed through from initPurchases() so this stays a plain function,
 * not a closure re-importing the SDK on every call).
 */
async function purchaseLive(
  mod: typeof import('react-native-purchases'),
  productId: ProductId
): Promise<PurchaseResult> {
  try {
    const products = await mod.default.getProducts([productId]);
    const product = products[0];
    if (!product) {
      return {
        ok: false,
        mode: 'live',
        error: `Product not found in the store: ${productId} (check it is configured in App Store Connect / Play Console and attached to the RevenueCat offering)`,
      };
    }
    const result = await mod.default.purchaseStoreProduct(product);
    liveEntitlement = entitlementFromCustomerInfo(result.customerInfo);
    notifyEntitlementChanged();
    return { ok: true, mode: 'live', entitlement: liveEntitlement, productId };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === mod.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { ok: false, mode: 'live', error: 'cancelled' };
    }
    return { ok: false, mode: 'live', error: err.message || 'Purchase failed' };
  }
}

async function restoreLive(
  mod: typeof import('react-native-purchases')
): Promise<RestoreResult> {
  try {
    const info = await mod.default.restorePurchases();
    liveEntitlement = entitlementFromCustomerInfo(info);
    notifyEntitlementChanged();
    return { ok: true, mode: 'live', entitlement: liveEntitlement };
  } catch (e) {
    const err = e as { message?: string };
    return { ok: false, mode: 'live', error: err.message || 'Restore failed' };
  }
}

/**
 * Initialize the live RevenueCat client once, only when a key is configured.
 * Safe to call repeatedly and from anywhere; never throws. On success it sets
 * `impl` so every public function below switches from the mock path to the
 * real SDK. On failure (SDK unavailable, configure() rejects, network down at
 * boot) it leaves `impl` null: purchase()/restore()/getEntitlement() then
 * report a live-mode failure instead of falling through to the mock branch,
 * which would otherwise hand out a free "premium" grant whenever the real
 * client merely failed to come up. That fallback is deliberate: a broken live
 * path must fail loudly, never silently comp the user.
 *
 * A failed attempt is retryable (review feedback, 2026-09-05): the old code
 * set `purchasesInitialized = true` in a `finally`, which meant one bad boot
 * (offline at launch, a transient RevenueCat outage) locked every later
 * purchase()/restore() into "did not initialize" for the rest of the app
 * session, even after the network came back. On failure this now leaves
 * `purchasesInitialized` false and clears `purchasesInitPromise`, so the next
 * call re-attempts from scratch. `client.isConfigured()` guards the retry
 * against calling `configure()` a second time on an SDK instance that
 * actually came up but failed later (e.g. `getCustomerInfo()` threw).
 */
export async function initPurchases(): Promise<void> {
  if (purchasesInitialized) return;
  if (purchasesInitPromise) return purchasesInitPromise;
  if (!purchasesEnabled()) {
    purchasesInitialized = true;
    return;
  }
  purchasesInitPromise = (async () => {
    try {
      const mod = await import('react-native-purchases');
      const client: typeof RNPurchases = mod.default;
      if (!(await client.isConfigured())) {
        client.configure({ apiKey: apiKey() as string });
      }
      const info = await client.getCustomerInfo();
      liveEntitlement = entitlementFromCustomerInfo(info);
      notifyEntitlementChanged();
      client.addCustomerInfoUpdateListener((updated: CustomerInfo) => {
        liveEntitlement = entitlementFromCustomerInfo(updated);
        notifyEntitlementChanged();
      });
      impl = {
        getEntitlement: () => liveEntitlement,
        purchase: (productId) => purchaseLive(mod, productId),
        restore: () => restoreLive(mod),
      };
      purchasesInitialized = true;
    } catch {
      impl = null;
      purchasesInitialized = false;
    } finally {
      purchasesInitPromise = null;
    }
  })();
  return purchasesInitPromise;
}

/** @internal test-only: expose the retry-relevant flag without a public getter. */
export function __isPurchasesInitializedForTests(): boolean {
  return purchasesInitialized;
}

/**
 * Set the local mock grant directly, in memory and in storage.
 *
 * Exists for the developer menu (utils/devMenu.ts gate), which needs to flip
 * free and premium to exercise the habit gate without faking a purchase.
 * Nothing customer-facing calls it: purchase() and restore() remain the only
 * paths a user can reach. In live mode this still only moves the mock value,
 * which getEntitlement() ignores once a real client is installed.
 */
export async function setMockEntitlement(value: Entitlement): Promise<void> {
  await writeMockEntitlement(value);
}

/**
 * Drop the local mock grant, so the free gate can be exercised again without
 * reinstalling. Used by restore() in mock mode's reset path and available to
 * settings.
 */
export async function resetMockEntitlement(): Promise<void> {
  await writeMockEntitlement('free');
  logMock('mock entitlement cleared -> free');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The current entitlement. In mock mode this is the local mock grant: 'free'
 * until a mock purchase, 'premium' after one, restored on launch by
 * hydrateEntitlement(). When the live client is present it is the source of
 * truth. Synchronous because every feature gate reads it during render.
 */
export function getEntitlement(): Entitlement {
  if (impl) return impl.getEntitlement();
  if (purchasesEnabled()) {
    // Live mode is configured but not yet initialized (or init failed):
    // report 'free' rather than falling through to the mock branch below,
    // which would otherwise hand out a mock premium grant whenever live is
    // merely still starting up. Kick off init (no-op if already running) so
    // a render shortly after picks up the real value.
    void initPurchases();
    return 'free';
  }
  return mockEntitlement;
}

/** Convenience predicate used by feature gates. */
export function isPremium(): boolean {
  return getEntitlement() === 'premium';
}

/**
 * Start a purchase. In mock mode this logs, grants the local MOCK premium
 * entitlement, and persists it, so the habit gate really opens and free = 1 vs
 * premium = 5 is testable end to end. No money moves and mode stays 'mock'; the
 * paywall keeps its planned-pricing banner. The live client will actually
 * charge and flip the entitlement for real.
 */
export async function purchase(productId: ProductId): Promise<PurchaseResult> {
  if (impl) return impl.purchase(productId);
  if (purchasesEnabled()) {
    await initPurchases();
    const ready = currentImpl();
    if (ready) return ready.purchase(productId);
    // Live is configured but never came up (bad key, SDK unavailable, no
    // network at the moment of purchase): report the real failure. Never
    // fall through to the mock grant below, which would comp a "purchase"
    // that charged nobody.
    return {
      ok: false,
      mode: 'live',
      error: 'RevenueCat did not initialize. Check the configured API key and network connection.',
    };
  }
  await writeMockEntitlement('premium');
  logMock(`purchase ${productId} -> ok (mock, no real charge, MOCK premium granted locally)`);
  return { ok: true, mode: 'mock', entitlement: getEntitlement(), productId };
}

/**
 * Restore prior purchases. In mock mode the only thing that can exist is the
 * local mock grant, so it re-reads that and reports it. In live mode this
 * queries RevenueCat and returns the real entitlement.
 */
export async function restore(): Promise<RestoreResult> {
  if (impl) return impl.restore();
  if (purchasesEnabled()) {
    await initPurchases();
    const ready = currentImpl();
    if (ready) return ready.restore();
    return {
      ok: false,
      mode: 'live',
      error: 'RevenueCat did not initialize. Check the configured API key and network connection.',
    };
  }
  const entitlement = await hydrateEntitlement();
  logMock(`restore -> ok (mock, local grant is ${entitlement})`);
  return { ok: true, mode: 'mock', entitlement };
}

/** Current mode, for callers that want to surface "planned" vs real copy. */
export function purchasesMode(): 'live' | 'mock' {
  return mode();
}

/**
 * Reactive entitlement (backlog from the gating audit, 2026-08-11): every gate
 * site used to call getEntitlement() directly during render, which reads the
 * right value once but never again, so a purchase or a live renewal never
 * repainted an already-mounted screen until something else happened to
 * re-render it. This hook subscribes through useSyncExternalStore, so every
 * gate that switches to it repaints the moment notifyEntitlementChanged()
 * fires (a mock purchase/restore, setMockEntitlement, or a live
 * customerInfoUpdateListener event). getEntitlement() itself is unchanged and
 * still the right call outside a component (utils/devMenu.ts, one-off reads).
 */
export function useEntitlement(): Entitlement {
  return useSyncExternalStore(subscribeToEntitlementChanges, getEntitlement, getEntitlement);
}
