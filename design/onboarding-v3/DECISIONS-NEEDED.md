# Onboarding v3.1: decision matrix

Six decisions surfaced by the audit. Three resolved by Charen on 2026-08-14 in session;
three open. Open ones block only the phases named; phase 1 of the integration plan is
blocked by nothing.

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

## Open

### D1. ADR 0026: carousel, payoff, and beat hosts supersede ADR 0022's surface rule
The PRD reintroduces the parallel onboarding surfaces ADR 0022 deleted and the payoff
screen ADR 0020 retired. Building it requires an ADR recording the reversal, with one
condition attached: **beats render real components, never simulated mockups** (the app's
redesign + audit cadence would have invalidated simulated frames twice in the last
month). Blocks phases 4 (payoff) and 6 (carousel). Recommendation: accept with the
real-components clause; draft text ready on request.

### D5. Free-tier recurring cap
The PRD's 3-cap never existed; today recurring expenses are uncapped. Options:
(a) stay uncapped, instrument `recurring_expense_count`, decide at month 3/6 data
(recommended: strictly more information, zero build); (b) introduce the 10 cap now so
the free-tier promise hardens at launch per the PRD. Blocks nothing; phase 8 instruments
either way.

### D6. Candidate threshold
PRD wants a fixed >=8-instance floor. Shipped gates are rate-based (behavioral >=4/mo +
variance + discretionary; recurrence minimums 3, annual 2). A fixed 8 punishes short
statements (a 2-week export cannot show 8 coffees at 3/wk) and duplicates the rate
gate's job. The PRD's actual goal, monthly essentials structurally out of the deck, is
delivered by scope + locked tier + suppression + governClass. Recommendation: keep
rate-based gates; revisit only if deck quality data says otherwise. Blocks phase 3's
final numbers only.
