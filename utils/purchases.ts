/**
 * Purchases: a thin, env-gated entitlement + purchase layer over RevenueCat
 * (task BET-004, Phase 3 monetization). MOCK MODE ONLY for now.
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
 * Zero-native guarantee (mirrors utils/analytics.ts): react-native-purchases is
 * never installed or imported at module scope. The only reference to its type is
 * an `import type` (erased at compile time). This keeps the module pure TS and
 * jest-testable, and means no native prebuild is needed until the live
 * implementation lands. When the key ships, the live branch will dynamically
 * `await import('react-native-purchases')` exactly the way analytics loads
 * PostHog, and this file is where that swap happens.
 *
 * Activation (Charen, later): install react-native-purchases, run a dev/device
 * build, put the RevenueCat public SDK key in a local untracked .env
 * (EXPO_PUBLIC_REVENUECAT_API_KEY). See .env.example. Until then, MOCK stands.
 */

// Type-only import placeholder for the eventual live SDK. Erased at compile
// time, adds nothing to the bundle, and does not require the package to be
// installed for typecheck (the reference below is commented until it lands).
// import type Purchases from 'react-native-purchases';

// AsyncStorage IS a real dependency and is imported the same way utils/storage.ts
// imports it. The zero-native rule above is about react-native-purchases, which
// is not installed; it does not apply here.
import AsyncStorage from '@react-native-async-storage/async-storage';

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
// path. The live implementation (later) sets a real client here through init;
// unit tests inject a fake to exercise the forwarding path without native code.
// ---------------------------------------------------------------------------

export interface PurchasesClient {
  getEntitlement: () => Entitlement;
  purchase: (productId: ProductId) => Promise<PurchaseResult>;
  restore: () => Promise<RestoreResult>;
}

let impl: PurchasesClient | null = null;

/**
 * @internal test-only seam (mirrors analytics __setClientForTests). Also drops
 * the in-memory mock grant so each test starts from 'free'.
 */
export function __setPurchasesForTests(c: PurchasesClient | null): void {
  impl = c;
  mockEntitlement = 'free';
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
  try {
    if (next === 'premium') {
      await AsyncStorage.setItem(MOCK_ENTITLEMENT_KEY, MOCK_ENTITLEMENT_VALUE);
    } else {
      await AsyncStorage.removeItem(MOCK_ENTITLEMENT_KEY);
    }
  } catch {
    // Best effort: the in-memory grant still holds for this session.
  }
}

/**
 * Read the stored mock grant back into memory. Called once at app start
 * (app/_layout.tsx) so a mock premium survives a relaunch. No-op in live mode.
 */
export async function hydrateEntitlement(): Promise<Entitlement> {
  if (purchasesEnabled()) return getEntitlement();
  try {
    const raw = await AsyncStorage.getItem(MOCK_ENTITLEMENT_KEY);
    mockEntitlement = raw === MOCK_ENTITLEMENT_VALUE ? 'premium' : 'free';
  } catch {
    // Storage unavailable: keep whatever this session already granted rather
    // than silently revoking it.
  }
  return mockEntitlement;
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
  await writeMockEntitlement('premium');
  logMock(`purchase ${productId} -> ok (mock, no real charge, MOCK premium granted locally)`);
  return { ok: true, mode: 'mock', entitlement: getEntitlement(), productId };
}

/**
 * Restore prior purchases. In mock mode the only thing that can exist is the
 * local mock grant, so it re-reads that and reports it. The live client will
 * query RevenueCat and return the real entitlement.
 */
export async function restore(): Promise<RestoreResult> {
  if (impl) return impl.restore();
  const entitlement = await hydrateEntitlement();
  logMock(`restore -> ok (mock, local grant is ${entitlement})`);
  return { ok: true, mode: 'mock', entitlement };
}

/** Current mode, for callers that want to surface "planned" vs real copy. */
export function purchasesMode(): 'live' | 'mock' {
  return mode();
}
