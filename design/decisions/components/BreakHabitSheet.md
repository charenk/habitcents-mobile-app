# BreakHabitSheet (components/onboarding/BreakHabitSheet.tsx)

## Direction (current)
The Door 3 / Break-another decision sheet. Pinned SheetTitle "Break a habit."
with caption "Pick one or name your own."; chips (Coffee, Food delivery,
Impulse buys, Something else); a name field under the chips for Impulse buys
and Something else; "One skip keeps" as an enclosed AmountField at
ExpenseSheet's density (size 40); "Did you buy it today?" directly below the
amount; "How often" last with the yearly projection line, rendered only once
an amount exists; pinned footer CTA "Start breaking it", disabled until valid
with the hint naming the first missing thing (pick, then name, then amount -
ADR 0028).

## States
Nothing picked; preset picked (amount prefilled, Start live); Impulse buys or
Something else picked (name field shown, Start held until named); amount
cleared (yearly line hidden, Start held); gated (habit-limit reached), split
the same way PickOneSheet's is: free tier (upgrade pitch, pinned footer) vs
premium at the real ceiling (honest dismiss, no pitch, no upgrade CTA).

## Decisions
- 2026-09-10 (Charen, annotation set 1): title "Break a habit." replaces
  "Break an expensive habit." (a habit can be anything); the growth line "One
  is free, always." leaves the caption (the gate card still carries pricing,
  that is the paywall moment); "Coffee or tea out" becomes "Coffee" (labels
  never carry "or"; preset ids are persisted as merchantPattern and never
  change); bought-today sits beside the value it logs, cadence below.
- 2026-09-10: Impulse buys requires a typed name and seeds custom-like - the
  typed name is the habit name and dedupe key, category stays the preset's.
  Why: "impulse buys" is a bucket, not a breakable habit, and a premium user
  can break two named impulse habits. The glyph lookup falls back to the
  category emoji for them. The amount prefill stays, so value_edited keeps
  its analytics meaning (contract untouched, ADR 0035).
- 2026-09-10: the yearly line hides at $0.00 ("keeps about $0.00 a year" said
  nothing).
- 2026-09-05 (routine/core-p3 run 4): added the same optional
  `entitlement?: Entitlement` prop and gated-copy split as PickOneSheet (see
  that file's Decisions for the full reasoning); kept identical rather than
  inventing separate ceiling copy, since it is the same gate with the same
  two states. Carried forward through the 2026-09-10 pinned-footer redesign:
  the gated footer is now conditional on `entitlement === 'premium'` the same
  way PickOneSheet's is.

## Open
- Placeholder wording "What do you usually buy?" is Claude's call; Charen may
  reword.
- The full ungated flow (chip pick, amount, cadence, bought-today) has no
  test coverage yet; that gap is pre-existing and out of scope for the
  entitlement work. `__tests__/breakHabitSheetGate.test.tsx` covers the gated
  state only.

## Iterations
- 2026-09-05: gated state splits on `entitlement`, mirroring PickOneSheet.
  First test coverage for this component at all:
  __tests__/breakHabitSheetGate.test.tsx, scoped to the gated state only.
- 2026-09-10: redesigned per annotation set 1 on the new Sheet platform; the
  entitlement-gated footer moved from the scrolling body into the pinned
  `footer` prop alongside the rest of the redesign.
