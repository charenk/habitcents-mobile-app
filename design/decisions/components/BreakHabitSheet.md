# BreakHabitSheet (components/onboarding/BreakHabitSheet.tsx)

## Direction (current)
Door 3's whole flow (W3, ADR 0020 + 0022): pick a vice chip or name your own, set the amount and cadence, answer "bought it today?", then "Start breaking it". Presentational only; the caller (Today) owns seeding the habit and completing onboarding. Reachable post-onboarding too, via restart-onboarding while a habit is already being broken, which is where its gated state lives.

## States
Ungated (chip row, amount, cadence, bought-today, live Start) and gated (habit-limit reached), the gated state split the same way PickOneSheet's is: free tier (upgrade pitch) vs premium at the real ceiling (honest dismiss, no pitch).

## Decisions
- 2026-09-05 (routine/core-p3 run 4): added the same optional `entitlement?: Entitlement` prop and gated-copy split as PickOneSheet (see that file's Decisions for the full reasoning); kept identical rather than inventing separate ceiling copy, since it is the same gate with the same two states.

## Open
None open from this change. The full ungated flow (chip pick, amount, cadence, bought-today) has no test coverage yet, before or after this change; that gap is pre-existing and out of scope here.

## Iterations
- 2026-09-05: gated state splits on `entitlement`, mirroring PickOneSheet. First test coverage for this component at all: __tests__/breakHabitSheetGate.test.tsx, scoped to the gated state only.
