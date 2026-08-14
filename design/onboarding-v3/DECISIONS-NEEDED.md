# Onboarding v3.1: decision matrix

Six decisions surfaced by the audit. Five resolved by Charen on 2026-08-14 across two
session rounds; one open (D5). Nothing blocks phase 1 of the integration plan.

## Resolved 2026-08-14

### D2. Palette: sage stays
Gold/rose (PRD sect 10) is dropped. Onboarding adopts the shipped vocabulary: sage =
kept, "quiet green" payoff = sage, leak emphasis stays ink/slate, coral remains
destructive-only, a slip is never red. No app re-skin. PRD sect 10's gold/rose lines are
superseded; record inside ADR 0026 when drafted.

### D3. Scan modality: existing CSV pipeline
Beat 2 is the shipped CSV leak scan restyled with scope selection and the deck. No
PDF/OCR extractor in this scope. Consequences: PRD sect 13.1's conditional and sect 14's
"largest unknown" are moot; `SCAN_ROUTE_ENABLED` degradation is unnecessary; the
"Permission" step in the PRD flow map is a prototype artifact (the iOS document picker
needs no OS permission), the trust pre-prompt stays.

### D4. Beat-1 log is a real expense
The saved amount persists through the real log sheet as a genuine first expense. No
throwaway onboarding store. Preserves the honest-data rule and "the first log is the
thousandth log."

### D1. Carousel resolved as previews plus real workflows (round 2)
Charen's clarified design: each beat is a pre-recorded capture FROM the real app (looping
video) with hook text below; tapping the beat triggers the real workflow. That AMENDS
rather than reverses ADR 0022: workflows are always the real ones, preview media may
demonstrate them, simulated interactive UI stays banned. Four conditions carried into the
ADR 0026 draft (`ADR-0026-DRAFT.md`):
1. Capture runbook versioned under `design/captures/onboarding-beats/`; re-capture is a
   named release-checklist item whenever an onboarding-visible surface changes.
2. No invented totals inside recordings: example-scale seed data, "for example" framing
   carried by the hook text (ADR 0022's rule extends to marketing surfaces).
3. Looping HEVC/MP4 via expo-video, never GIF (binary size, battery, JS-thread decode).
   Target 3-5 second loops.
4. Reduced motion = static poster frame per beat.
Side benefit: beats-as-video removes the release-only animation crash class from the
carousel itself. The payoff screen remains the one genuinely revived ADR 0020 surface
and is covered by the same draft.

### D6. Threshold resolved: five-layer essential guarantee replaces the fixed >=8 (round 2)
Charen: >=8 was an ideation number; the hard requirement is that the system never calls
out essential spending as a habit. The guarantee, four layers shipped + one new:
1. Scope: essential categories never searched (locked tier, fail-closed defaults,
   Other off). NEW.
2. Governability: contract-class (`fixed`) candidates never enter the deck; fix the
   rent-hero CTA bug. SHIPPED, tightened.
3. Behavioral rate gate: deck eligibility needs about 4+ purchases/month pace + price
   variance + discretionary category. One-instance-per-cycle items (rent, insurance,
   mortgage, car payment) cannot satisfy it mathematically. SHIPPED. Strictly stronger
   than a fixed 8: reads a 2-week statement correctly instead of punishing it, and
   8-in-two-months is the same 4/month bar anyway.
4. Merchant suppression, extended to log-based discovery in phase 1. SHIPPED + wire-up.
5. Cadence routing: monthly/annual cadence in essential or locked categories goes to
   the bills offer, never the deck. NEW.
Per-card dismissal stays the honest failure path for the residue (pharmacy filed under
Shopping). Subscription ruling (a PRD internal inconsistency: >=8 would have banned
subscriptions from the deck while scope defaults them ON): the deck stays
behavioral-only; detected subscriptions land in the bills screen as their own
"subscriptions" group, distinct from essentials; the Insights snapshot keeps ranking
them as leaks.

### Import-as-instance resolved: evidence block, never dayLogs (round 2)
PRD 7.5's letter (statement occurrences recorded as `skipped: false` instances) has no
representation in the shipped model: `HabitLogEntry.state` is only skipped or slipped,
so 14 statement rows would render as 14 day-one slips across the history calendar, week
stats, milestones, and check-in surfaces, and the coaching voice would open with a wall
of failures. Final design, meeting every visible PRD outcome:
- Statement occurrences live on the habit's evidence block (observedTotal /
  observedCount / averageAmount, already filled by `utils/leakScanBridge.ts`) and,
  when the user takes the 30-day import, in the expense ledger as real spends.
- skipValue auto-derives from averageAmount (total / count), editable in PickOneSheet.
- The payoff renders its real-history line from the evidence block.
- Activation = habit + value + observedCount >= 1 ("the import is the instance", true
  at the metrics layer).
- dayLogs starts empty; the kept counter only ever moves on a real skip.

### D5. Free-tier recurring cap: stay uncapped, instrument only (round 2)
The PRD's 3-cap never existed in this codebase, so there is nothing to raise. Recurring
expenses stay uncapped; phase 8 adds the `recurring_expense_count` user property and the
number is read at month 3 and 6. Rationale: an unenforced ceiling costs nothing to
observe and everything to guess wrong, and the habit cap (1 free / 5 premium) is already
the load-bearing gate the PRD says it should be. Revisit only if the data shows a
free-tier abuse pattern.

## Open

None. All six decisions are resolved. The remaining gate is Charen's ratification of
`ADR-0026-DRAFT.md` into the umbrella `docs/decisions/` folder, which unblocks phases 4
(payoff) and 6 (carousel).
