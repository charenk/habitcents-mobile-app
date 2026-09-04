# core-worker HANDOFF

## Status

Run 1 of the `routine/core-p3` branch. Branch created fresh from `origin/main`
(no prior branch existed). Baseline verified before any change: `npx tsc --noEmit`
clean, `npm test` 98 suites / 1069 tests green.

This run was mostly discovery: the roadmap's Phase 3 planning doc
(`habitcents-ops/docs/phase-3-scope.md`, 2026-07-05) turned out to be substantially
stale against the actual code. Most of P3-1's paywall/entitlement scaffolding and all
of P3-2's app-side legal linking were already built by earlier work (not by this
routine). Full detail and the corrected checklist are in `docs/routines/PLAN.md`.

## Completed

- Read all source-of-truth docs (roadmap, ADRs 0001-0032, `phase-3-scope.md`,
  PUNCHLIST RESUME marker and the P3/RevenueCat history further down) plus a live
  read of the mobile-app code that P3/P4 touch.
- Created `docs/routines/PLAN.md`: the full P3/P4 checklist, corrected against what
  actually exists in the repo (cites roadmap item ids throughout).
- Wrote `docs/legal/app-store-privacy-labels.md`: the App Store privacy-nutrition-label
  worksheet the roadmap's P3-2 accept criterion calls for and that did not exist
  anywhere in either repo. Category-by-category table grounded in
  `utils/analytics.ts`, `utils/purchases.ts`, `utils/leakScan/`, `utils/storage.ts`,
  and `package.json` (checked for crash/ad SDKs; none present). One flagged judgment
  call (whether coarse-bucketed spend amounts count as "Financial Info"), one flagged
  open verification (PostHog's IP-handling default, not asserted either way rather
  than guessed), and a note on what invalidates the worksheet (live RevenueCat
  install, any new SDK).
- `npx tsc --noEmit` and `npm test` re-run after the docs-only change: still clean,
  98/98 suites, 1069/1069 tests (docs changes cannot affect these, run anyway per the
  "must pass before committing" rule).

No app code changed this run. Everything added is under `docs/`.

## Next

1. P3-1's one real remaining gap: the live RevenueCat client behind the existing
   `PurchasesClient` seam in `utils/purchases.ts` (mirrors how `utils/analytics.ts`
   dynamically imports `posthog-react-native`). See PLAN.md's P3-1 section for the
   exact scope and guardrails (inert by default, unit-testable via the existing fake-
   client seam, never flips mock mode off, touches `package.json` so it is native-build-
   only per ADR 0029 and gets no OTA path).
2. If that lands with time left in the run, start P4-3 (shareable counter card v1):
   no dependency exists yet (`react-native-view-shot` or equivalent), no external
   account needed, Lane 2 per ADR 0012 (needs a capture + what-to-test on the PR).
3. Everything else in PLAN.md's checklist is either already done, blocked on a
   Charen action this routine cannot take (App Store Connect, RevenueCat dashboard,
   Resend account), or out of repo scope (website).

## Blockers

None for this run's own work (docs-only, no external dependency). Standing blockers
for later P3/P4 items, all already-known and none new:
- No website repo access from this session, so P3-3/P3-4/P3-5 cannot be verified or
  advanced here regardless of their punch-list status.
- Live RevenueCat verification needs a real device build; this session can write code
  but cannot run a native build or a sandbox purchase.

## DECISIONS NEEDED (for Charen)

1. **App Store privacy label.** Review `docs/legal/app-store-privacy-labels.md` in
   full, accept or override its one judgment call (section 3: whether bucketed spend
   amounts should be declared under "Financial Info" or left under "Usage Data"; this
   routine recommends "Usage Data"), and resolve the one open verification (section 4
   item 3: PostHog's IP-handling default is not configured explicitly in
   `utils/analytics.ts` and was not asserted either way rather than guessed).
   Then transcribe the table into App Store Connect. Not code; nothing to merge for
   this specifically.
2. **When to greenlight the live RevenueCat client (run 2 candidate).** This routine
   can write the code now, but the only way to actually verify a purchase clears
   sandbox is a real device build, which is outside this session. Confirm whether to
   proceed writing it inert-by-default next run (safe, ships nothing live, matches the
   "never live" hard gate) or hold until you're ready to test it on-device yourself.
   Default plan is to proceed writing it (per PLAN.md's "next run" section) since it
   costs nothing to have ready and inert.

No pricing, product id, or legal wording positions were picked by this routine.
