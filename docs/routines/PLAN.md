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
- [~] **Live RevenueCat client.** `utils/purchases.ts` has a `PurchasesClient` seam
      (`impl`) built for exactly this, mirroring how `utils/analytics.ts` dynamically
      imports `posthog-react-native` only when a key is set. The equivalent for
      `react-native-purchases` has not been written; the module comment says
      "Activation (Charen, later): install react-native-purchases, run a dev/device
      build." **Run 2 candidate.** Adding the dependency touches `package.json` (ADR
      0029: forces a native build, never an OTA) and the live path can only be
      end-to-end verified on a real device with sandbox purchases, which this session
      cannot do. What this routine CAN do safely: write the live client behind the
      existing seam with the SDK's calls type-checked against its real types, add a
      unit test that injects a fake `PurchasesClient` (the existing test seam already
      supports this), and leave it inert (mock mode stays the default) until Charen
      supplies a real device build to verify against sandbox. Never flips mock mode
      off by default; never picks a go-live date.
- [~] The two structural gaps PUNCHLIST already filed and deliberately deferred
      ("Backlog from the gating audit", 2026-08-11): (1) gated-sheet copy always
      pitches the free-tier upsell even to a premium user already at the real 5-habit
      ceiling; (2) entitlement reads are non-reactive, so a purchase does not repaint
      already-mounted screens. Both were explicitly filed as "not urgent while
      purchases are mock... address both with the real RevenueCat activation work."
      Respecting that standing call: **not picked up ahead of the live client work**,
      but listed here so a future run doesn't have to rediscover them.
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
- [ ] Not started. No `react-native-view-shot` / `expo-sharing`-equivalent dependency
      exists yet. This is real, bounded, buildable work that needs no external account
      (unlike P3-1/P4-1's Charen-gated items): image-export a branded "I kept $X in Y
      days" card and wire the native share sheet, then have `purchase_completed`-style
      analytics track shares (new event, structural only per D-9: a share fired, not
      what was shared). **Run 2 or 3 candidate**, Lane 2 (user-visible), needs a
      capture + what-to-test on the PR per ADR 0012 same as any UI change.

### P4-4 (roadmap P4-4)
- Explicitly "no in-app UI built for this" per the roadmap's own accept criterion.
  Nothing for this routine to build; it's a Calendly-link-in-email + session process
  item, entirely Charen's court.

## Next run

1. Address any REVIEW FEEDBACK in HANDOFF.md first.
2. P3-1 live RevenueCat client (the `~` item above): write it behind the existing
   `PurchasesClient` seam, dynamic-imported, inert until a real key is configured,
   with the same unit-test seam pattern `utils/analytics.ts` already proves out.
   `npx tsc --noEmit` and `npm test` must pass with mock mode still the default
   behavior (no key set in this environment).
3. If that lands cleanly with room left in the run's time budget, start P4-3
   (shareable counter card), otherwise leave it queued.
