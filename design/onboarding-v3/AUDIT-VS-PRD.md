# Onboarding v3.1: PRD vs shipped app audit

Audited 2026-08-14 on `design/onboarding-exploration` (cut from main `a50bfa4`, baseline
green: tsc clean, 823/823 tests x3). Source PRD: `PRD-v3.1.md` in this folder (copied from
Charen's draft, `habitcents-onboarding-prd-v3.1.md`). Companion docs:
`INTEGRATION-PLAN.md` (phased build) and `DECISIONS-NEEDED.md` (D1-D6).

## The framing fact

The PRD was drafted against a prototype workspace (`src/onboarding/`, `app/today/
LogDrawer.tsx`, a web harness, a FigJam) that does not exist in this repo. Several PRD
assumptions are stale against the shipped app, and several "new" PRD features already
exist here. This audit is the mapping between the two.

## PRD assumptions that are stale here

1. **"On-device extractor still stubbed / largest unknown / critical path" (sect 14):
   false in this repo.** The 9-stage CSV leak-scan pipeline shipped
   (`utils/leakScan/pipeline.ts:57`) with an eval harness
   (`__tests__/leakScanEval/`), intake/questions/results UI, 30-day import, undo, and a
   persisted Insights snapshot. Section 14's critical-path calculus collapses.
2. **"Insights / First scan tab absent from MVP scope" (sect 13.2): it exists.**
   `components/insights/ScanSnapshotCard.tsx` renders the persisted `ScanSummary`
   (`types/scanSummary.ts`, key `@habitcents_scan_summary`) behind Insights' scan
   segment, with "Run a new scan". The dismissal-storage question resolves to:
   already persisted (see suppression below).
3. **"Recurring free cap 3 -> 10" (sect 9): no cap exists anywhere.** The habit ceiling
   (1 free / 5 premium, `utils/habitLogging.ts:28-43`) is the only gate, exactly the
   PRD's load-bearing habit cap. The real decision is "introduce a 10 cap or stay
   uncapped and instrument", not "raise 3 to 10".
4. **"Empty states are undesigned" (sect 13.3): partially stale.** An `EmptyState`
   primitive exists and every tab has one; what is missing is CTAs (only Today > Kept
   carries one). This is a copy-and-CTA pass, not a from-scratch design dependency.
5. **Beats and events already half-exist.** The shipped intent picker
   (`app/onboarding/intent.tsx`) has the PRD's three intents as cards with analytics
   (`onboarding_intent_selected/skipped`, `door_chosen`, `onboarding_completed`).
   PRD names (`beat_viewed`, `intent_selected`, `carousel_skipped`) need a mapping
   table, not a green-field schema.
6. **Beat-1 "keypad": ADR 0023 deleted the custom keypad app-wide** for the native
   decimal pad. Any beat-1 pad must be AmountField/LogExpenseSheet-based.

## Conflicts with ratified decisions (record, never drift)

- **ADR 0022 "the app is the onboarding":** the PRD's simulated-UI carousel,
  onboarding-owned amount pad, and payoff screen are the parallel surfaces 0022
  deleted. Building the PRD means writing ADR 0026 superseding 0022's surface rule,
  with a drift-mitigation clause: beats render real components, never mockups.
- **ADR 0020:** the success screen was retired; the PRD payoff revives it. Same ADR
  0026 scope.
- **Palette:** PRD sect 10's "Gold = kept, Rose = leaking" vs the ratified vocabulary
  (sage = kept everywhere; coral = destructive only; a slip is never red; spend is
  ink/mist). RESOLVED 2026-08-14: sage stays; "quiet green" = sage; gold/rose dropped.
- **ADR 0023:** native decimal pad (above).
- **Analytics contract (ADR 0020):** event/placement values stay stable; new names go
  through the mapping table and Lane 2 review.

## Gap matrix

Verdict key: DONE (exists, meets PRD), PARTIAL (exists, needs rework), GAP (build new),
CONFLICT (needs ADR or decision), STALE (PRD premise wrong here).

| # | PRD requirement | Current state | Verdict |
|---|---|---|---|
| 1 | Carousel, 3 beats, mini device frame | `welcome.tsx` + `intent.tsx`, same 3 intents as cards | CONFLICT (ADR 0022); content equivalent exists |
| 2 | Beat 1 onboarding-owned pad, one shared component | Real LogExpenseSheet opens over Today via `firstLog=1` deep link (`app/(tabs)/index.tsx:247-260`) | CONFLICT (0022/0023); sheet-level sharing exists |
| 3 | "Is this a regular thing?" post-save sheet | Break-or-watch nudge after first log (dashed affordance) | PARTIAL: same slot, different copy/action |
| 4 | Every skipper-reachable empty state is an onboarding surface | Only Today > Kept has a CTA; Money > Spent/Upcoming/Habits, Insights, Categories are copy-only | PARTIAL: CTA pass |
| 5 | Scope selection screen | Absent; only date-order + sign questions (`pipeline.ts:96-116`) | GAP |
| 6 | Locked essential tier, never searched | `governClass 'fixed'` (`recurrence.ts:202-221`) renders a no-CTA tip card, but the taxonomy has no health/childcare/education/insurance/debt categories, and rent-with-Break-it was observed live (UX-073 note) | GAP + taxonomy gap |
| 7 | >=8-instance threshold | Rate-based gates: behavioral >=4/mo + variance + discretionary; recurrence min 3 (2 annual) (`recurrence.ts:29-56,262`) | CONFLICT (D6): recommend keeping rate-based |
| 8 | Merchant suppression list | Exists: `scanRules.suppressedHabits` keyed on merchantStem (`utils/scanRules.ts:133`, consumed `recurrence.ts:247`) | DONE for scan; NOT consulted by `utils/habitDetection.ts`, so "never re-proposed by future discovery" is false today |
| 9 | Deck <=3, frequency first, per-instance cost tiebreak | 1 hero + 5 list (`RANKED_LEAKS_CAP=5`), ranked monthly cost desc with occurrences tiebreak (`ResultsScreen.tsx:239-246`): the exact inverse | GAP: rerank + cap |
| 10 | Two fallbacks (template grid / full in-scope list), one hop | GracefulFailure (3 exits) exists; vice presets exist inside BreakHabitSheet; ranked ladder exists | PARTIAL: rewire |
| 11 | Dismissals persisted for future habit discovery | Persisted (row 8) but unread by habitDetection | PARTIAL: one consumer wire-up |
| 12 | Import-as-instance (occurrences recorded, $84/14=$6, no did-you-buy step) | `dayLogs: []` on goal creation (`HabitsContext.tsx:377`); `HabitLogEntry.state` is only `'skipped'\|'slipped'`. The DetectedHabit evidence block (observedTotal/Count/spanDays/averageAmount, `leakScanBridge.ts:64-107`) already carries everything the payoff line needs, and the scan flow already asks no did-you-buy question | PARTIAL: meet the spirit via evidence block; the letter would ripple through countTotalSkips, keptOnDay, dayStateFor, weekStats, WeekStrip, HistoryCalendar, CheckInCard |
| 13 | Activation = habit + $ value + instance; first-kept = engagement | `startBreakingHabit` guarantees habit + skipValue atomically; `habit_tracking_started {source}` fires; no first-kept event (closest: `skip_logged {total_skips_after:1}`) | PARTIAL: define on existing events + add `first_kept` |
| 14 | Payoff screen (gold / quiet green) | Retired by ADR 0020 | CONFLICT (D1) |
| 15 | Bills -> Upcoming: post-payoff, propose-not-ask, per-row untick | ProjectionSection "Save to HabitCents": bulk, PRE-payoff, hidden behind the collapsed ladder, gated coveredDays>=28; cadence detection + `recurringToExpenses` + cross-import dedup all exist (`importWrite.ts:85-110,184-189`) | PARTIAL: reposition + per-row UI + events; plumbing done |
| 16 | Free recurring cap 3 -> 10 | No cap exists | STALE (D5) |
| 17 | Habit cap 1 free / 5 premium | Exists verbatim including paywall copy | DONE |
| 18 | No notification prompt in flow | No notification delivery exists at all (v1.x); bills "remind me" is intent capture only | DONE (stronger than asked) |
| 19 | Gold/rose color rules | Sage/coral vocabulary; a slip is never red | RESOLVED: sage stays |
| 20 | Reduced motion, 44pt, Dynamic Type, integer cents | House rules, audited in build 13 | DONE |
| 21 | Two-level system back | No carousel yet; house 40pt back pill + edge swipe | N/A until carousel; Android predictive back documented, not built (iOS-first) |
| 22 | New events (scope_selected, deck_*, bills_*, skip_activation) + recurring_expense_count | None exist; event map at `utils/analytics.ts:75-177` | GAP: small, additive |
| 23 | (implied by all $/mo math) | UX-073 confirmed at source: `coveredDays` = distinct transaction days, not calendar span (`coverage.ts:67-71`); divisor reused at `recurrence.ts:253,266`, `ResultsScreen.tsx:94,536`, `summarize.ts:38,44`, `resultsSummary.ts:42` | PRECONDITION: every payoff/deck dollar claim sits on this bug |
| 24 | Scan route completes onboarding at activation | `completeOnboarding` fires only from "Bring in your last 30 days" or the graceful-failure exit; "Break it" alone never completes onboarding (`useCompleteScanOnboarding.ts`) | BUG: fix regardless |

## Opinion summary (full version delivered in session, 2026-08-14)

Adopt the scan-route architecture wholesale: scope inversion is the best decision in the
PRD (the user declares scope, so the app never claims to know what is essential; the
privacy moat survives), the 3-card deck beats the shipped analyst dashboard for a
minute-two user, the bills offer completes the positioning with plumbing that already
exists, and the activation definition is crisper than what ships (row 24 is a live hole).

Push back on four things: (1) the carousel re-litigates ADR 0022 and must ship with the
real-components rule or it becomes a permanent drift tax; (2) import-as-instance as
written would corrupt the kept ledger, meet its spirit through the evidence block;
(3) the fixed >=8 threshold punishes short statements and duplicates the shipped rate
gate, keep defense-in-depth without the magic number; (4) the payoff is the success
screen 0020 retired, revive it via ADR because the scan variant carrying real history is
a genuinely strong argument, not by silent reversal.

With the 2026-08-14 decisions (CSV scan, sage palette, beat-1 log is a real expense),
the critical path is: UX-073 fix, scope screen, deck. PR-sized units, not an epic.
