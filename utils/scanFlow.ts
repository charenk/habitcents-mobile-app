/**
 * The one gate for the Leak Scan flow.
 *
 * Why this exists: the scan (CSV intake, the 9-stage pipeline, results, the
 * rule store) shipped in Phase 2 but has technical and logistical problems
 * that take real time to fix. Charen's call (2026-09-05) is to wrap it as
 * coming soon rather than ship it rough. None of that code is deleted: the
 * whole feature stays compiled, tested and importable, and this flag is the
 * only thing standing between it and the user.
 *
 * How it is set: `EXPO_PUBLIC_SCAN_FLOW` is inlined by Metro at build time, so
 * `process.env.EXPO_PUBLIC_SCAN_FLOW` becomes a string literal in the bundle
 * and this whole expression folds to a constant. eas.json sets it to "0"
 * explicitly on `internal` and `production`, so a stray shell var on a build
 * machine can never re-open the flow.
 *
 * Deliberately NO `__DEV__` term, unlike DEV_MENU_ENABLED. The dev menu wants
 * to be present in local development; this wants the opposite. What a
 * developer sees running Metro should be what a user sees on TestFlight, so a
 * half-finished flow cannot be reasoned about as "fine, it works here". The
 * cost is that resuming the rework takes one line in a local `.env`
 * (EXPO_PUBLIC_SCAN_FLOW=1), which is the intended way back in.
 *
 * Rule: nothing scan-gated may test `__DEV__` or the env var itself. Every
 * gate imports SCAN_FLOW_ENABLED from here, so `grep -rn SCAN_FLOW_ENABLED`
 * lists the complete set of them.
 */

/** Name of the build-time flag, for build-info surfaces and docs. */
export const SCAN_FLOW_FLAG = 'EXPO_PUBLIC_SCAN_FLOW';

/**
 * True only in a build that explicitly opted in. False everywhere else,
 * including local development: /leak-scan redirects to Insights, the Insights
 * pane shows the coming soon teaser, and no scan code path can run.
 */
export const SCAN_FLOW_ENABLED: boolean = process.env.EXPO_PUBLIC_SCAN_FLOW === '1';
