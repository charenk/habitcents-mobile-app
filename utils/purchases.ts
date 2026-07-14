/**
 * Purchases: a thin, env-gated entitlement + purchase layer over RevenueCat
 * (task BET-004, Phase 3 monetization). MOCK MODE ONLY for now.
 *
 * Why mock-first (mirrors website/lib/register.ts): the whole purchase and
 * entitlement flow needs to be wired, testable, and demoable before Charen's
 * RevenueCat key exists. So when EXPO_PUBLIC_REVENUECAT_API_KEY is absent (the
 * default, including on `main` and in tests) this module runs in "mock" mode:
 * every call SUCCEEDS and resolves so the UI flow works end to end, but nothing
 * is bought and no entitlement is granted (getEntitlement stays 'free').
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
 * premium = up to 5). The mock always reports 'free' so the gate is exercisable
 * before real purchases exist.
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

/** @internal test-only seam (mirrors analytics __setClientForTests). */
export function __setPurchasesForTests(c: PurchasesClient | null): void {
  impl = c;
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
// Public API
// ---------------------------------------------------------------------------

/**
 * The current entitlement. Mock mode always reports 'free' so the paywall and
 * habit gate are exercisable before any real purchase can grant premium. When
 * the live client is present it is the source of truth.
 */
export function getEntitlement(): Entitlement {
  if (impl) return impl.getEntitlement();
  return 'free';
}

/** Convenience predicate used by feature gates. */
export function isPremium(): boolean {
  return getEntitlement() === 'premium';
}

/**
 * Start a purchase. In mock mode this logs and resolves success WITHOUT
 * granting premium (getEntitlement stays 'free'): the goal is to prove the flow
 * wires end to end, not to hand out the product for free. The live client will
 * actually charge and flip the entitlement.
 */
export async function purchase(productId: ProductId): Promise<PurchaseResult> {
  if (impl) return impl.purchase(productId);
  logMock(`purchase ${productId} -> ok (mock, no real charge, entitlement unchanged)`);
  return { ok: true, mode: 'mock', entitlement: getEntitlement(), productId };
}

/**
 * Restore prior purchases. In mock mode there is nothing to restore, so it logs
 * and resolves success with the current (free) entitlement. The live client
 * will query RevenueCat and return the real entitlement.
 */
export async function restore(): Promise<RestoreResult> {
  if (impl) return impl.restore();
  logMock('restore -> ok (mock, nothing to restore)');
  return { ok: true, mode: 'mock', entitlement: getEntitlement() };
}

/** Current mode, for callers that want to surface "planned" vs real copy. */
export function purchasesMode(): 'live' | 'mock' {
  return mode();
}
