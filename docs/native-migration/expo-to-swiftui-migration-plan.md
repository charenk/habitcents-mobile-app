# HabitCents: Expo to fully native Apple (SwiftUI) migration plan

Plan-only task. Based on latest `main` (eee6898, 2026-08-21). No implementation performed.

> **STATUS: SHELVED (decision by Charen, 2026-08-21).** Staying on React Native / Expo for now to keep the OTA ship loop and focus on Phase 3 (monetization) and product validation. This plan is kept for later. If revisited, re-verify the inventory against `main` first (it will have drifted) and note the plan's own advice: the cheapest moment to migrate is before store launch and real users.

## Context

Charen asked for an end-to-end analysis of migrating HabitCents from React Native / Expo SDK 54 to a fully native Apple (SwiftUI) app, with: (1) a full roadmap if viable, (2) time estimates under three Claude Code operating modes (single session, multi-agent, self-planning Routines loop), and (3) the open questions that must be answered to unblock the migration.

## Verdict: viable, with eyes open

**Technically, this is one of the most migration-friendly RN codebases possible.** No server, no network calls (verified: only env-gated PostHog plus two `Linking.openURL` legal links), a tiny native-module surface, an 8k-line pure logic core with 577 pure-logic test cases that port directly as the Swift spec, centralized strings/theme/a11y labels, and only 4 `Platform.OS` checks in the whole app. Nothing blocks a SwiftUI rewrite.

**Strategically, it is a real trade, not free polish:**
- It forfeits the 2-minute OTA ship loop (ADR 0029). Every change becomes a TestFlight build (minutes-to-hours) or App Store release (days).
- It contradicts the locked "repair not rebuild" direction and the spec-first working mode; a superseding ADR in habitcents-ops must land before code starts.
- It drops Android and web permanently (both configured today, never shipped).
- It rewrites ~34k lines for an app with essentially one user (Charen's iPhone, TestFlight build 13), pre-revenue, with Phase 3 monetization queued.

Honest framing: **do it now (pre-users, pre-store) or not for a long time**; the cost only grows after launch. The plan below assumes "go" plus a feature-freeze on the RN app (Lane 1 critical OTA fixes only) during migration.

## Codebase inventory (facts the plan rests on)

- **Scale:** ~33.7k lines TS/TSX app source; 925 tests (577 pure-logic in 36 `.test.ts` files, 348 UI cases that do not port).
- **UI surface:** 15 routes (4 tabs Today/Money/Insights/Categories; pushed habit/category detail, profile=settings; paywall modal; leak-scan 7-stage state machine; onboarding carousel). 76 components; 12 bottom sheets all built on one custom `components/ui/Sheet.tsx`; all charts hand-rolled Views. Biggest: Today 1,405 lines, AddUpcomingSheet 881, CheckInCard 768, ResultsScreen 755.
- **Logic core (the portable asset):** `utils/leakScan/` 2,802 lines / 22 pure modules (10-stage CSV pipeline + derivations); `habitDetection.ts` 535; `recurring.ts` 500 (byte-identical legacy math, 70-case suite); `habitLogging.ts` 254; `coachMoments.ts` 259; `storage.ts` 746 (AsyncStorage, ~18 live keys, corruption hardening + read-path revive = the de facto migration framework); `analytics.ts` 535 (~60 typed events, PII sanitizer); `purchases.ts` 248 (RevenueCat mock only, SDK never installed). Contexts are thin coordinators.
- **Design system:** `constants/theme.ts` (444 lines, ~80 WCAG-annotated tokens, 22-step type scale, light-only); `constants/strings.ts` (~620 entries); Instrument Serif + Inter (npm font packages, no local files). Motion: RN `Animated` only (Reanimated installed, zero imports, after the build-5 release crash); motion budget per ADR 0004-0007. A11y: 15 tested label builders, 9 announcement sites, Dynamic Type caps, 44pt targets; on-device VoiceOver pass deferred to TestFlight (ADR 0008).
- **Distribution reality:** No `ios/`/`android/` checked in (Expo CNG). Bundle `com.habitcents.app`, ASC app 6791025610, TestFlight build 13, one internal tester, not on the App Store. CI is ubuntu-only (tsc + jest); no macOS runner exists today.
- **Data:** integer cents; JS Dates revived from ISO; local-calendar-string exceptions (`biweekAnchor`, scan `dateISO`s); two-generation `HabitChangeGoal` with live back-compat; one versioned type (`ScanSummary`).

## Deliverable 1: migration strategy and roadmap

### Target architecture

**Repo layout (stay in this repo, new `native/` dir):**

```
native/
  HabitCents.xcodeproj          committed; CNG is over
  HabitCents/                   App target, iOS 17+, SwiftUI (macOS toolchain only)
    App/  Screens/  Platform/  Resources/
  Packages/
    HabitCentsCore/             SwiftPM, Foundation-only, BUILDS AND TESTS ON LINUX
      CoreModels/ Formatting/ LeakScanKit/ HabitKit/
      PersistenceKit/ AccessibilityKit/ AnalyticsKit/  + Tests/
    HabitCentsDesign/           SwiftPM, iOS-only (tokens, primitives, haptics, motion)
fixtures/golden/                TS-generated golden input/output JSON
```

The Core/app split is the load-bearing decision: **Claude Code cloud agents and existing CI are Linux-only and can build/test `HabitCentsCore` with the open-source Swift toolchain, but cannot compile SwiftUI targets.** Everything that carries behavior lives in Core; the app layer is a thin renderer. CI grep gates: no `import SwiftUI/UIKit` in Core, no raw `Date()`/`TimeZone.current` (injected clock), amounts only via the Formatting module.

**Key choices (each gets an ADR in Phase 0):**
- **State:** iOS 17 `@Observable` stores mirroring today's contexts (Expenses, Categories, Habits, Onboarding, Settings, ScanFlowModel). ReportsContext does NOT become a store; only its two pure functions survive (Insights uses only `calculateSpendingByCategory` + `calculateMonthlyProjection`). No TCA.
- **Persistence:** plain JSON files via a `FileStore` actor in Application Support (one file per store key, atomic writes), NOT SwiftData/GRDB. Rationale: the corruption-hardening + per-record revive + field-defaulting pattern in `storage.ts` is the app's entire schema-evolution story and must port 1:1 and be Linux-testable; dataset is kilobytes. Revive layer decodes to a lenient JSON tree then applies ported revive functions; corrupt blobs are backed up before returning empty, matching `backupCorrupt`.
- **Navigation:** `TabView` + per-tab `NavigationStack`; leak scan and onboarding as `.fullScreenCover` state machines; paywall as `.sheet`. The 12 custom sheets become native `.sheet` with detents (`ConfirmSheet` becomes `confirmationDialog` where it is a 2-option confirm). This deletes the entire custom Sheet/gesture/backdrop stack: the single biggest UI-code reduction.
- **Charts:** custom SwiftUI (LazyVGrid/Canvas heatmap, `Circle().trim` LongArc, capsule bars), not Swift Charts; all geometry math stays in Core (Linux-tested), SwiftUI is a thin renderer.
- **CSV:** hand-written RFC 4180 `CSVTokenizer.swift` replaces papaparse, pinned by goldens including papaparse edge-case outputs. `.fileImporter` + security-scoped reads replace expo-document-picker/file-system.
- **Fonts/branding:** bundle Instrument Serif + Inter TTFs; `Theme.swift` and `Strings.swift` generated by committed codegen scripts from `theme.ts`/`strings.ts` so tokens and ~620 strings stay name-identical. `.preferredColorScheme(.light)` at the WindowGroup.
- **Haptics/motion:** `UIFeedbackGenerator` wrappers with the same 4 helper names; plain `withAnimation` springs; ADR 0004-0007 motion budget carried verbatim; one reduced-motion gate via `accessibilityReduceMotion`.
- **Analytics:** posthog-ios behind an `.xcconfig`-injected key, no-op when absent (same env-gated posture); event names byte-identical so PostHog history is continuous; sanitizer + bucketing stay in Core with their tests.
- **Purchases:** **StoreKit 2 direct, not RevenueCat** (current code is a mock, SDK never installed, no server, no Android, N=1). Keep the mock's interface shape so RevenueCat could be swapped in later.
- **Also:** privacy overlay via `scenePhase`; `habitcents://` deep links simplified to today/habit/{id}/scan; 15 a11y label builders port with tests; announcements via `AccessibilityNotification.Announcement`.

### Data migration for the one existing install

Same bundle ID keeps the sandbox; AsyncStorage data lives at `Application Support/.../RCTAsyncLocalStorage_V1/` (manifest.json + spill files named by MD5 of key).

- `LegacyRCTStorageImporter`: Linux-testable parse layer (manifest + spill files) feeding the SAME revive functions the new FileStore uses (no second mapping codepath), then first-launch orchestration: write new store, write `migration-receipt.json`, rename legacy dir to `.migrated` (never delete; that is the rollback). On failure: legacy data untouched, one-time "start fresh or retry" screen.
- **Highest-value prep artifact (one small Lane 1 RN PR before freeze):** a dev-menu "Export all storage" action run on Charen's phone; the PII-reviewed export becomes the primary golden fixture and the wipe-and-restart safety net.
- Tests: synthetic manifest fixtures (spilled/missing/corrupt/legacy-key variants) on Linux; round-trip invariants vs TS-computed golden numbers; Lane 2 rehearsal installing the native build over TestFlight build 13 on a simulator/spare device before Charen's phone updates.
- Fallback while N=1: wipe-and-restart is acceptable and documented; the importer is still worth building (small, doubles as revive-layer test, preserves real habit history) but is non-blocking for the first native TestFlight build.

### Roadmap (phases with parallelization lanes)

- **Phase 0: decisions + scaffolding (serial, ~days).** ADRs (repo layout, persistence, StoreKit 2, custom charts, feature freeze with end condition, Android/web dropped, OTA loss accepted); `HabitCentsCore` skeleton + ubuntu `swift test` CI green; **stand up macOS CI now** (GitHub Actions `macos-15` build + unit + snapshots; gates all app-layer work); Xcode project skeleton, `.xcconfig`, lint + grep gates; golden-fixture generator (node script emitting `fixtures/golden/*.json` for currency matrix incl. JPY, 70 recurrence cases, leakScanEval outputs, spendPulse, habit-logging transitions); RN dev-menu export PR; port `types/` to CoreModels (unblocks all lanes).
- **Phase 1: Core port (max parallelism, Linux agents; tests port FIRST in every lane, then implementation to green).**
  - Lane A (head of critical path): Formatting: dates/LocalDay, currency, amountInput/keypad, expenseCategory, color, `groupExpensesByDate`.
  - Lane B (longest lane, start day one): LeakScanKit: types/parsers/confidence first, then fan out B1 preflight/header/columns/sign/rows, B2 categorize/merge/netting/coverage/recurrence, B3 derivations, B4 CSVTokenizer + scanRules. Exit: 15 acceptance tests + per-stage suites + eval-harness parity report identical to TS.
  - Lane C: HabitKit (habitLogging 36, habitDetection 28, recurring 70, materializer, coachMoments, upcomingWindow).
  - Lane D: PersistenceKit (revive + FileStore + 23 hardening tests + importer parse layer).
  - Lane E: AccessibilityKit, AnalyticsKit pure parts, Theme/Strings codegen.
  - B/C/D/E run concurrently; Core-only PRs are Lane 1 auto-merge when green.
- **Phase 2: DesignKit primitives (macOS; parallel with Phase 1 after Phase 0).** Theme/type/fonts, lucide-to-SF-Symbols mapping table (bundle unmatched glyphs), Button/Chip/AmountField/TextField/SegmentedControl/ScreenHeader/EmptyState/Toast/ConfirmSheet, sheet-detent conventions, haptics/motion helpers, PrivacyOverlay. Verified by snapshot tests + a preview gallery target.
- **Phase 3: screens (parallel per family; built against fixture data in previews so they do not serialize on Phase 4).** F1 Today; F2 Money (ExpenseSheet, AddUpcomingSheet, lists); F3 habit logging (CheckInCard, LongArc, calendar, sheets, habit detail); F4 leak-scan flow (needs Lane B); F5 Insights + Categories + category detail; F6 onboarding + BreakHabitSheet + Settings + Paywall.
- **Phase 4: integration (serial convergence).** AppModel + stores over FileStore; navigation/deep links; materializer-on-foreground; import undo; first-kept one-shot; onboarding revive; importer first-launch flow. The context behaviors only encoded in `.test.tsx` today (materializer integration, first-kept, import undo, onboarding revive) become Swift integration tests here.
- **Phase 5: platform.** PostHog wiring; StoreKit 2 products + `.storekit` test config + paywall gating; app icon/launch screen (assets exist); PrivacyInfo.xcprivacy + App Store privacy answers; build numbering continues from 13.
- **Phase 6: hardening + cutover.** VoiceOver pass per screen (checklist from `ada-audit/` + umbrella script; this is the deferred ADR 0008 gate), Dynamic Type sweep, reduced-motion audit, performance, TestFlight internal build, Lane 2 migration rehearsal, then Charen's phone updates and the RN app sunsets.

**Critical path:** Phase 0 -> Lane A -> Lanes C+D -> Phase 4 -> Phase 6 rehearsal. Lane B is the longest single lane but feeds in late (F4/Phase 4). macOS CI in Phase 0 gates all UI verification.

### Verification strategy

- Phase 1 (Linux, automated): each module gated by its ported Swift Testing suite 1:1 AND byte/value-equal assertions against TS-generated goldens (integer cents, exact strings, zero tolerance). leakScanEval ports as an executable target whose report is diffed in CI.
- Phases 2-3 (macOS CI + human): swift-snapshot-testing on a pinned simulator; PreviewGallery for review; any user-visible PR is Lane 2 exactly as today.
- Phase 4-5: importer fixtures (Linux) + simulator integration tests + StoreKit Testing; analytics sanitizer tests + debug event console.
- Phase 6: manual VoiceOver/Dynamic Type/reduced-motion checklists; TestFlight; migration rehearsal is the final gate.
- Two-lane policy carries over unchanged: Lane 1 auto-merge only for ubuntu-green invisible Core changes.

### What is NOT ported (verified dead or superseded; each a recorded scope cut)

- ReportsContext dashboard machinery + `@habitcents_dashboard` key (no dashboard UI exists; only 2 pure functions survive).
- Legacy streak system (`streakLog.ts` referenced only by its own test; legacy `HabitChangeGoal` fields read-and-dropped at import; one-way door on pre-v2 history, flagged).
- `expensesMock.ts` mocks (but `groupExpensesByDate` is live and ports), dark-mode revert path + `@habitcents_theme_mode`, `@habitcents_audit_answers`, web + Android, the entire Expo platform layer (expo-updates/EAS/fingerprint, CNG, babel/jest, Reanimated, custom Sheet.tsx, react-native-svg, papaparse), RevenueCat mock implementation (interface shape survives), and the 348 UI `.test.tsx` cases (superseded by snapshots + Lane 2 + the Phase 4 integration tests).

## Deliverable 2: effort and timeline under three operating modes

Sizing basis: ~34k lines TS/TSX replaced by an estimated 22-28k lines of Swift; 32 logic port units (Linux-parallelizable), ~15 screens / ~76 components collapsing to ~45-55 SwiftUI views; 36 test files (577 cases) ported first as gates. Two constraints no mode can compress: **(a) only a macOS machine can compile the app target** (Charen's Mac, GH Actions macOS, or Xcode Cloud), and **(b) Lane 2 human review + device testing of every visible surface, the VoiceOver pass, TestFlight processing, and App Store review.** All modes assume RN feature freeze.

| Mode | Agent effort | Calendar estimate | Bottleneck |
|---|---|---|---|
| A. Single Claude Code (serial sessions) | ~80-120 focused hours (~40-60 sessions) | **6-10 weeks** | Human review cadence, not agent throughput |
| B. Multi-agent (parallel subagents/workflows) | ~100-140 hours burned in bursts | **3-5 weeks** | ~1.5-2 weeks of serialized human review/device tests |
| C. Routines-driven autonomous loop | Same total, fully unattended between reviews | **~3-4 weeks** (+~1 week TestFlight soak/VoiceOver/store if submitting) | Human availability every 1-2 days for Lane 2 batches; macOS build access |

Phase-level shape (mode A): scaffold 3-5d; Core port 1.5-2wk; DesignKit 1wk; screens 2.5-4wk; integration 1wk; platform 3-5d; hardening 1-2wk. Mode B compresses build phases ~3-4x (Core lanes parallelize almost perfectly; screen families go 4-5 wide after DesignKit); verification and review do not compress.

### Mode C mechanism: the self-planning routine ("look at deliverable, plan next action")

1. **Migration ledger as single source of truth:** `native/MIGRATION_STATE.md` listing every port unit with status (todo / ported / tests-green-linux / built-macos / device-verified / merged), PR link, blocker. Every PR updates it. This makes "inspect the deliverable, plan the next routine action" mechanical.
2. **Cloud Routine (Linux, nightly or every few hours, fresh session per fire via `create_trigger`):** read ledger + CI + open PRs -> pick highest-value unblocked packet (Core modules first; app-layer Swift it can write but not compile goes to the needs-macOS queue) -> implement with test-first gate -> `swift test` on Core -> open PR (Lane 1 auto-merge when green + invisible) -> update ledger -> re-arm.
3. **macOS lane, pick one:** (a) GH Actions macOS workflow builds every PR, runs snapshots, uploads simulator captures; the cloud Routine reads results and iterates (most autonomous); or (b) Charen's Mac runs a local Claude Code session that drains the needs-macOS queue. With (a), the loop runs autonomously all the way to the Lane 2 human gate.
4. **Stop/escalate conditions:** ledger fully device-verified (stop), or a packet fails 2 consecutive autonomous attempts (escalate to Charen instead of thrashing).
5. **Guardrails carried over:** production/store actions human-only (ADR 0029 boundary), Lane 2 for anything visible, no real bank CSVs in fixtures, no em dashes/sentence-case content rules apply to all generated copy.

## Deliverable 3: open questions to unblock (with recommendations)

1. **What does "fully native experience" mean?** Pixel-faithful port of the locked Direction C design vs adopting native idioms. Recommendation: keep brand tokens/fonts/copy, adopt native navigation, sheets, and controls (the plan above assumes this).
2. **Accept losing OTA updates?** The single biggest workflow regression; needs its own ADR. No native equivalent exists.
3. **Android and web dropped permanently?** Implied by the ask, but it is a one-way door without a second codebase; record it.
4. **Direction-lock conflict:** "repair not rebuild" and spec-first both require a superseding ADR + a migration spec in the umbrella `../docs/` before any code.
5. **Migrate or wipe Charen's device data?** Recommendation: build the importer (small, derisks future users, preserves real habit history) but make it non-blocking; ship the dev-menu export PR before freeze either way.
6. **macOS build resource:** GH Actions macOS runner (recommended: most autonomous, stays in PR flow, paid minutes), Xcode Cloud (25 free h/mo), or Charen's Mac only. Decides how autonomous mode C can be; must be settled in Phase 0.
7. **Minimum iOS version:** recommend iOS 17 (`@Observable`); iOS 26 SDK adoption (Liquid Glass) optional later.
8. **Purchases:** recommendation StoreKit 2 direct (current RevenueCat is a mock, SDK never installed, no server, N=1); confirm, since the provisioned RevenueCat key suggests prior intent.
9. **Sequencing vs Phase 3 (monetization/legal/website):** building the paywall twice is waste. Recommendation: if going native, migrate first and land monetization natively (StoreKit 2) in Phase 5.
10. **Repo strategy:** recommendation `native/` directory in this repo (shared history, ledger, CI, ADR adjacency) vs a fresh repo.

## If approved, first concrete steps

1. Write the migration spec + superseding ADR set (umbrella `../docs/`, per spec-first rule) reflecting the answers to the questions above.
2. Land the RN dev-menu "export all storage" PR and capture Charen's device export.
3. Phase 0 scaffolding: `native/Packages/HabitCentsCore` + ubuntu swift CI + macOS CI + golden-fixture generator + CoreModels port.
4. Create `native/MIGRATION_STATE.md` and, if mode C is chosen, the cloud Routine with the standing prompt.
