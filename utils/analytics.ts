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
 * Paywall entry points (U12b). Every gate used to push the bare 'habit_gate'
 * placement except settings, so the funnel could not tell a Today gate from
 * an Insights gate from a Leak Scan gate. Each call site now carries its own
 * suffix; the 'habit_gate' prefix stays for continuity. Dashboards segmenting
 * on the old bare 'habit_gate' value should switch to prefix matching
 * ('habit_gate_*') to keep picking up all five habit-gate placements.
 */
export type PaywallPlacement =
  | 'habit_gate_today'
  | 'habit_gate_money'
  | 'habit_gate_insights'
  | 'habit_gate_detail'
  | 'habit_gate_scan'
  | 'settings';

const PAYWALL_PLACEMENTS: readonly PaywallPlacement[] = [
  'habit_gate_today',
  'habit_gate_money',
  'habit_gate_insights',
  'habit_gate_detail',
  'habit_gate_scan',
  'settings',
];

/**
 * Narrows the /paywall route's untyped `placement` query param. Every in-app
 * link supplies a value from PaywallPlacement, but the param itself is just a
 * string (expo-router does not validate query params), so app/paywall.tsx
 * runs it through this guard rather than casting.
 */
export function isPaywallPlacement(value: string | undefined): value is PaywallPlacement {
  return !!value && (PAYWALL_PLACEMENTS as readonly string[]).includes(value);
}

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
  // --- Onboarding (P2-1, docs/design-package-phase2/02-p2-1-onboarding-leak-audit.md
  // section 6). Structural only: counts, booleans, step/door names. Never
  // amounts, chip names, or typed text. ---
  door_chosen: { door: 'fresh' | 'statements' | 'skip' };
  // Intent picker (design/redesign-handoff/03-onboarding.md screen 2). The
  // picked card is the acquisition metric, so it gets its own event rather than
  // riding on door_chosen (which still fires underneath for downstream logic).
  onboarding_intent_selected: { intent: 'track' | 'scan' | 'break' };
  onboarding_intent_skipped: Record<string, never>;
  audit_subs_done: { selected: number; edited: number; none: boolean };
  audit_vices_done: { answered: number; skipped: boolean };
  audit_amount_edited: { step: 'subs' | 'vices'; count: number };
  leak_revealed: { nSources: number; hasEdits: boolean };
  first_log_saved: { guided: boolean };
  onboarding_completed: { door?: 'fresh' | 'statements' | 'skip'; habitStarted: boolean };
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
  // 'unknown' mirrors first_kept: startBreakingHabit has no default source, so
  // a caller that omits one is reported honestly rather than attributed to a
  // route it may not have come from.
  habit_tracking_started: {
    cadence?: string;
    source: 'detection' | 'scan' | 'onboarding' | 'unknown';
  };
  skip_logged: { cadence?: string; total_skips_after: number; week_skips: number; backfill: boolean };
  slip_logged: { cadence?: string; partial: boolean; backfill: boolean };
  answer_changed: { from: 'skipped' | 'slipped'; to: 'skipped' | 'slipped' };
  milestone_reached: { milestone: 10 | 30 | 50 | 66 };
  // First real skip, once per install (PRD v3.1 sect 7.5 / sect 11).
  // Activation certifies setup; THIS is engagement, and it is what the scan and
  // habit routes are compared on.
  /**
   * The first dollar this install ever keeps, and the route that got it there.
   *
   * `route` is what makes PRD sect 11's headline criterion computable at all
   * ("scan-route first-kept vs habit-route first-kept, within 20%"). It is read
   * off the goal rather than inferred from the nearest preceding
   * habit_tracking_started, because a first skip can land days later and after
   * a second habit was started, which would misattribute it.
   *
   * 'unknown' means a goal created before the source was persisted, kept
   * distinct rather than folded into 'detection' so the cohort can be excluded
   * instead of quietly skewing the comparison.
   */
  first_kept: { route: 'detection' | 'scan' | 'onboarding' | 'unknown' };
  habit_dismissed: { source: string };
  // Today tab (redesign U5/U7, ADR 0019, DI-5/DI-7): fires on every
  // Spent/Kept switch, chip tap or pager swipe.
  today_view_switched: { to: 'spent' | 'kept'; method: 'tap' | 'swipe' };
  // Coaching (P2-2, docs/design-package-phase2/04-p2-2-coach-moments.md
  // section 5). trigger/card_id are structural identifiers only; no card
  // content, amounts, merchant, or habit names ever ride in this event.
  coach_moment_shown: {
    trigger: 'first_log' | 'detection' | 'skip' | 'milestone' | 'broken_streak';
    card_id: string;
  };
  // Monetization (P3-1)
  paywall_shown: { placement: PaywallPlacement | 'unknown' };
  paywall_dismissed: { placement: PaywallPlacement | 'unknown' };
  purchase_completed: { product: string };
  trial_started: { product: string };

  // --- Leak Scan (P2-1b, docs/design-context/leak-scan-spec.md section 8). ---
  // All structural only: counts, rates, tiers, booleans. Never merchant
  // strings, amounts, descriptions, or file contents (D-9).
  scan_started: { n_files: number };
  scan_file_parsed: {
    rows: number;
    skipped: number;
    confidence_tier: 'solid' | 'likely' | 'needs-review';
    sign_method: 'balance' | 'type' | 'heuristic';
    truncation_flag: boolean;
  };
  scan_question_shown: { type: 'date-order' | 'sign-confirmation' };
  scan_completed: {
    coverage_days: number;
    n_accounts: number;
    n_habits_found: number;
    solid_count: number;
    likely_count: number;
    needs_review_count: number;
  };
  scan_failed: {
    n_files: number;
    encoding_guess: string;
    delimiter_guess: string;
    header_found: boolean;
    date_parse_rate: number;
    amount_parse_rate: number;
    sign_confidence: number;
  };
  /**
   * A skipper acted from an empty state (PRD v3.1 sect 5 / sect 11).
   *
   * Fires on the CTA press, not on the resulting write, and only for users
   * whose door was 'skip'. It answers "which empty state moved someone who
   * refused the tour", which is the question sect 5 raises by sending skippers
   * straight into the app: whether they converted is then the join against the
   * activation events that follow (expense_logged, habit_tracking_started).
   *
   * Keeping it at press time is deliberate. Attributing all the way to
   * activation would mean carrying the surface across a sheet, a navigation,
   * and an async write, and a dropped hand-off would look identical to a
   * skipper who never acted.
   */
  skip_activation: { surface: string };
  // Scope selection (PRD v3.1 sect 7.1 / sect 11). `used_defaults` is the one
  // to read first: heavy editing means the tier assignments are wrong, and
  // that has to be settled before any classifier conversation reopens.
  // Category names are a closed taxonomy (no merchant strings), so they are
  // safe to send under D-9.
  scope_selected: {
    categories_on: string;
    categories_off: string;
    used_defaults: boolean;
  };
  // Habit deck (PRD v3.1 sect 7.3 / sect 11). position is 1-based; the
  // position-1 track rate is the success criterion for the ranking signal.
  deck_card_shown: {
    position: number;
    merchant_category: string;
    instances: number;
    total_cents_bucket: string;
  };
  deck_card_result: { position: number; result: 'tracked' | 'dismissed' };
  deck_exhausted: { fallback: 'template_grid' | 'full_list' };
  // Bills offer (PRD v3.1 sect 8 / sect 11). Instrumented separately from
  // activation on purpose: filing a bill is bookkeeping, not the moment the
  // product exists to deliver, and letting it inflate activation would flatter
  // the funnel with the one step that proves least.
  /**
   * How many recurring expenses this install carries (PRD v3.1 sect 9 / 11).
   *
   * D5 resolved as "stay uncapped and instrument": the PRD's 3-cap never
   * existed in this codebase, and a ceiling should be chosen from observed
   * behaviour rather than guessed. Read at month 3 and 6 to decide whether a
   * free-tier cap is needed and where it sits.
   *
   * DEVIATION, deliberate: the PRD asks for a PostHog *person property*, which
   * this app cannot set. Person properties key off identify(), and D-9's
   * anonymous-device-ID posture forbids calling it. A once-per-session snapshot
   * event carries the same information for a month-3 distribution read.
   *
   * The raw count ships rather than a bucket because the decision it feeds is
   * exactly where to put a threshold, and bucketCount's 1-9 / 10-49 boundary
   * would pre-commit the answer. A count of a user's own rows carries no
   * amounts, merchants, or text, so it is safe under D-9.
   */
  recurring_expense_count: { count: number };
  bills_offered: { count_proposed: number };
  // `skipped` separates "skipped the screen outright" from "considered it and
  // unticked everything": both accept zero rows, but only one of them read the
  // offer, and the sect 11 acceptance criterion should not blend them
  // (review round 3, P3-15).
  bills_imported: { count_accepted: number; skipped: boolean };
  scan_categories_expanded: Record<string, never>;
  // Finding-first ladder's dashed expander (ADR 0020, W4), same shape as
  // scan_categories_expanded above.
  scan_leak_ladder_expanded: Record<string, never>;
  scan_pulse_day_opened: Record<string, never>;
  scan_habit_tracked: { class: 'govern' | 'influence' | 'fixed'; cadence_route: string };
  scan_habit_dismissed: { class: 'govern' | 'influence' | 'fixed' };
  scan_correction: { stage: string; from_tier: 'solid' | 'likely' | 'needs-review' };
  scan_projection_saved: { n_recurring: number };
  scan_reminder_intent_set: Record<string, never>;
  // Renamed from scan_seed15_applied (ADR 0020, W4): the CTA's window is no
  // longer fixed at 15 days, so `days` travels with the row count.
  scan_seed_applied: { rows: number; days: number };
  scan_undone: Record<string, never>;
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
