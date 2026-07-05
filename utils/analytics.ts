/**
 * Analytics: a thin, env-gated wrapper over PostHog (task P2-3, decision 0001).
 *
 * Privacy posture (decision 0002 / D-9, "anonymous device-ID mode"):
 *  - No user identifiers. We never call identify(); PostHog's auto-generated
 *    anonymous device id is the only key, and it never leaves the device except
 *    as an opaque token.
 *  - No PII in any payload: no free text, no merchant names, no expense titles,
 *    no email. Monetary values are coarse-bucketed, never sent as raw amounts.
 *    See sanitizeProps + bucketCents.
 *  - Session replay and lifecycle autocapture are off; we emit only the explicit
 *    events named below.
 *
 * Zero-network guarantee: when EXPO_PUBLIC_POSTHOG_API_KEY is absent (the default,
 * including on `main` and in tests) this module is a complete no-op. PostHog is
 * never imported, so no network call is ever made. This is the single sanctioned
 * exception to the app's no-network rule (agent-execution-guide rule 5), and it
 * stays dormant until a key is supplied.
 *
 * Activation (Charen, later): put a project key in a local untracked .env
 * (EXPO_PUBLIC_POSTHOG_API_KEY, optional EXPO_PUBLIC_POSTHOG_HOST) and run a
 * device/dev build. See .env.example.
 */

// Type-only import: erased at compile time, so it adds nothing to the bundle and
// does not pull PostHog in when analytics are disabled.
import type PostHog from 'posthog-react-native';

/**
 * Values we allow to leave the device. Deliberately narrow: primitives only, no
 * null/undefined (sanitizeProps strips those), and no raw amounts by convention.
 */
export type AnalyticsProps = Record<string, string | number | boolean>;

/**
 * The full event catalog. Some events (coach_moment_shown, paywall_*, import_*)
 * are wired by later Phase 2/3 tasks (P2-2, P2-1b, P3-1); they live here now so
 * the taxonomy is defined in one place and stays consistent across the app.
 */
export interface AnalyticsEventMap {
  // App lifecycle
  app_opened: { cold_start?: boolean };
  app_foregrounded: Record<string, never>;
  app_backgrounded: Record<string, never>;
  // Onboarding funnel (per-step, via OnboardingContext)
  onboarding_started: Record<string, never>;
  onboarding_step_completed: { step: string };
  onboarding_step_skipped: { step: string };
  onboarding_completed: Record<string, never>;
  // Leak audit (Door 1, P2-1)
  leak_audit_completed: { item_count: number; projected_leak_bucket: string };
  // Import (Door 2, P2-1b)
  import_started: { source?: string };
  import_completed: { row_bucket: string };
  // Expenses
  expense_logged: { category: string; has_merchant: boolean; is_recurring: boolean };
  expense_edited: { fields_changed: number };
  expense_deleted: Record<string, never>;
  // Detection
  detection_shown: { habit_count: number };
  // Habit logging v2 (docs/design-package-phase2/01-habit-logging-spec.md
  // section 6). cadence is 'daily' | 'weekly' | 'monthly'; never amounts,
  // merchant names, or habit titles.
  habit_goal_created: { cadence?: string; value_edited: boolean };
  habit_tracking_started: { cadence?: string; source: 'detection' | 'scan' };
  skip_logged: { cadence?: string; total_skips_after: number; week_skips: number; backfill: boolean };
  slip_logged: { cadence?: string; partial: boolean; backfill: boolean };
  answer_changed: { from: 'skipped' | 'slipped'; to: 'skipped' | 'slipped' };
  milestone_reached: { milestone: 10 | 30 | 50 | 66 };
  habit_dismissed: { source: string };
  // Coaching (P2-2)
  coach_moment_shown: { trigger: string; card_id: string };
  // Monetization (P3-1)
  paywall_shown: { placement: string };
  paywall_dismissed: { placement: string };
  purchase_completed: { product: string };
  trial_started: { product: string };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

// ---------------------------------------------------------------------------
// Configuration (read dynamically so tests can toggle it; Expo inlines
// EXPO_PUBLIC_* at build time, so these references resolve to literals in the app).
// ---------------------------------------------------------------------------

function apiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
}

function host(): string {
  return process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
}

export function analyticsEnabled(): boolean {
  const key = apiKey();
  return typeof key === 'string' && key.length > 0;
}

// ---------------------------------------------------------------------------
// Dev debug logger
// ---------------------------------------------------------------------------
//
// Prints every tracked event (with its final, sanitized payload) to the Metro
// console so you can confirm wiring without opening the PostHog dashboard. It
// runs even when analytics are OFF, so you can watch events before you have a
// key. Lines look like:
//
//   [analytics:dry-run] expense_logged { category: 'Food', has_merchant: true, is_recurring: false }
//   [analytics:sent]     skip_logged   { completed: true, saved_bucket: '5-20' }
//
// "dry-run" = logged locally but NOT sent (no key). "sent" = also forwarded to
// PostHog. Use dry-run to verify events fire and that no PII leaks into props
// before you ever configure a key.
//
// When it is on:
//   - default ON in development (__DEV__), OFF in production builds.
//   - force ON:  EXPO_PUBLIC_ANALYTICS_DEBUG=1  (e.g. to log in a preview build)
//   - force OFF: EXPO_PUBLIC_ANALYTICS_DEBUG=0  (e.g. to quiet the dev console)
// Env changes need a bundler restart with a cleared cache: `npx expo start -c`.

function isDev(): boolean {
  return (globalThis as { __DEV__?: boolean }).__DEV__ === true;
}

export function debugEnabled(): boolean {
  const flag = process.env.EXPO_PUBLIC_ANALYTICS_DEBUG;
  if (flag === '1') return true;
  if (flag === '0') return false;
  return isDev();
}

function logAnalyticsEvent(
  event: string,
  props: AnalyticsProps | undefined,
  willSend: boolean
): void {
  const tag = willSend ? 'sent' : 'dry-run';
  console.log(`[analytics:${tag}] ${event}`, props ?? {});
}

// ---------------------------------------------------------------------------
// PII defense-in-depth
// ---------------------------------------------------------------------------

/** Keys that must never be forwarded even if a caller passes them by mistake. */
const BLOCKED_KEYS = new Set([
  'title',
  'merchant',
  'name',
  'note',
  'notes',
  'description',
  'email',
  'amount',
  'amountdisplay',
  'text',
  'query',
]);

const MAX_STRING_LEN = 64;

/**
 * Drop anything that could carry PII: blocked keys, long free-text strings, and
 * non-primitive values. Everything the app sends is already an enum, count,
 * boolean, or pre-bucketed string, so this only ever fires as a safety net.
 */
export function sanitizeProps(props?: Record<string, unknown>): AnalyticsProps | undefined {
  if (!props) return undefined;
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (BLOCKED_KEYS.has(key.toLowerCase())) continue;
    if (value === null || value === undefined) continue;
    const t = typeof value;
    if (t === 'number' || t === 'boolean') {
      out[key] = value as number | boolean;
    } else if (t === 'string' && (value as string).length <= MAX_STRING_LEN) {
      out[key] = value as string;
    }
    // objects, arrays, functions, and long strings are silently dropped
  }
  return out;
}

/**
 * Bucket a monetary value (integer cents) into a coarse range so we can measure
 * behavior without collecting anyone's actual spend. Ranges are in dollars.
 */
export function bucketCents(cents: number | undefined): string {
  if (!cents || cents <= 0) return '0';
  const dollars = cents / 100;
  if (dollars < 5) return '<5';
  if (dollars < 20) return '5-20';
  if (dollars < 50) return '20-50';
  if (dollars < 100) return '50-100';
  if (dollars < 250) return '100-250';
  if (dollars < 500) return '250-500';
  if (dollars < 1000) return '500-1000';
  return '1000+';
}

/** Bucket a count into a coarse range (e.g. imported rows). */
export function bucketCount(n: number | undefined): string {
  if (!n || n <= 0) return '0';
  if (n < 10) return '1-9';
  if (n < 50) return '10-49';
  if (n < 200) return '50-199';
  if (n < 1000) return '200-999';
  return '1000+';
}

// ---------------------------------------------------------------------------
// Client lifecycle
// ---------------------------------------------------------------------------

let client: PostHog | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

interface QueuedEvent {
  event: string;
  props?: AnalyticsProps;
}
const buffer: QueuedEvent[] = [];
const MAX_BUFFER = 100;

/**
 * Initialize PostHog once, only when a key is configured. Safe to call multiple
 * times and from anywhere; the import is dynamic so nothing loads when disabled.
 * Never throws: analytics must not be able to break the app.
 */
export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  if (!analyticsEnabled()) {
    initialized = true;
    return;
  }
  initPromise = (async () => {
    try {
      const mod = await import('posthog-react-native');
      const PostHogClass = mod.default;
      client = new PostHogClass(apiKey() as string, {
        host: host(),
        // Anonymous, explicit-events-only posture.
        captureAppLifecycleEvents: false,
        enableSessionReplay: false,
        persistence: 'file',
      });
    } catch {
      // Leave client null; every track() becomes a no-op.
      client = null;
    } finally {
      initialized = true;
      flushBuffer();
    }
  })();
  return initPromise;
}

function flushBuffer(): void {
  if (!client) {
    buffer.length = 0;
    return;
  }
  for (const q of buffer) {
    try {
      client.capture(q.event, q.props);
    } catch {
      // ignore
    }
  }
  buffer.length = 0;
}

/**
 * Record an event. Fire-and-forget and never throws. No-ops entirely when
 * analytics are disabled. Events fired before init completes are buffered.
 */
export function track<E extends AnalyticsEventName>(
  event: E,
  props?: AnalyticsEventMap[E]
): void {
  const enabled = analyticsEnabled();
  const safe = sanitizeProps(props as Record<string, unknown> | undefined);

  // Dev visibility: log the exact payload we would send. Runs regardless of
  // whether a key is configured, so wiring is verifiable before setup.
  if (debugEnabled()) {
    logAnalyticsEvent(event, safe, enabled);
  }

  if (!enabled) return;
  if (client) {
    try {
      client.capture(event, safe);
    } catch {
      // ignore
    }
    return;
  }
  // Not initialized yet: buffer (bounded) and kick off init.
  if (buffer.length < MAX_BUFFER) {
    buffer.push({ event, props: safe });
  }
  void initAnalytics();
}

/** Flush any queued events to the network. Best-effort; used on backgrounding. */
export async function flushAnalytics(): Promise<void> {
  if (!client) return;
  try {
    await client.flush();
  } catch {
    // ignore
  }
}

/**
 * Reset local analytics state (used when onboarding is reset in dev). Keeps the
 * anonymous posture: a fresh anonymous id is generated on next capture.
 */
export function resetAnalytics(): void {
  if (!client) return;
  try {
    client.reset();
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Test-only seam. Lets unit tests exercise the forwarding + sanitizing path
// without importing the native PostHog SDK.
// ---------------------------------------------------------------------------

export interface TestCapturer {
  capture: (event: string, props?: AnalyticsProps) => void;
  flush?: () => Promise<void>;
  reset?: () => void;
}

/** @internal test-only */
export function __setClientForTests(c: TestCapturer | null): void {
  client = c as unknown as PostHog | null;
  initialized = true;
  initPromise = null;
  buffer.length = 0;
}
