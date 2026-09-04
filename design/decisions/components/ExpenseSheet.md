# ExpenseSheet (components/money/ExpenseSheet.tsx)

## Direction (current)
One component, two modes (log, edit); they differ only in title, the optional coach line, and edit's delete. Amount first on the native decimal pad in the enclosed field, then Where (text field + recent merchant pills), then the category rail. Save in the header, disabled until an amount.

## States
Log: empty (Save disabled), typing, with a Door 1 coach line. Edit: prefilled, merchant chip and category preselected, delete icon in the header. Keyboard up shows the iOS Done bar.

## Decisions
- 2026-09-04: delete is the header trash icon, instant with Undo from the toast; the bottom row is gone. ADR 0033.
- 2026-09-04: merchant chips are pills, matching the category rail. Why: two chip rows 30pt apart carried two radii. ADR 0033.
- 2026-09-04: Save reads "Save" in both modes (keys `saveExpense` / `saveChanges` kept). ADR 0033.
- 2026-08-16: enclosed amount field, header save, no stock coach line. ADR 0031.
- Merchant is optional but load-bearing: detection groups on it.

## Open
- The recent-merchant row can exceed one line with long names; check at large text.

## Iterations
- 2026-09-04 d739f59: header delete, pill chips, one-word Save, header inside the drag zone.
