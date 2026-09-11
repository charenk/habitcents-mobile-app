# AddUpcomingSheet (components/money/AddUpcomingSheet.tsx)

## Direction (current)
The bill form. Amount first, then what it is, then when: the same order as the log sheet, so the two never feel like different apps. A form sheet by the drawers rule, so `SheetHeader` with a serif title and a one-word Save disabled until an amount exists.

Whatever it shows about a schedule has to be true of the rule it will write. That sounds obvious and was not: the sheet spent a release preselecting a day chip for rules that had never chosen one.

## States
- Add: empty amount, Save disabled, schedule defaulting to Repeats / Monthly / 1st.
- Edit: prefilled from the row, Save enabled, delete available.
- Schedule sub-states per frequency: weekday chips (weekly), start-week chips (bi-weekly), day-of-month chips (monthly), a stepper (custom), nothing (yearly).
- Monthly with no stored anchor: **no day chip selected**, plus one line naming the date the rule actually lands on. Reach: any expense written before step 04, or a Leak Scan import; Persona returning user's Rent row is one.

## Decisions
- 2026-09-11: **a legacy monthly rule lights no day chip, and the sheet says what the rule does instead.** Why: `draftFromExpense` read `rule.monthDay ?? '1'`, so a rule stored before step 04 (no `monthDay`, steps from its own anchor date) opened with "1st" lit up while the list correctly said "Monthly, next Sep 29". The sheet was stating something false about a rule every other surface described accurately, and one tap on any schedule control would then rebuild from the wrong anchor and silently move the bill. The `scheduleTouched` guard meant an untouched Save was always safe, which is exactly why nobody caught it: the lie never wrote itself to disk. Rejected: a real "same day each month (29th)" chip state, which needs a locale-safe ordinal for an arbitrary day (ADA-008 forbids hardcoding "29th"), needs a sentinel in `MonthDayOption` or a storage change, and has no meaning in add mode, where anchoring at today would write a bill dated today that Spent would then render as a spend the user never made. `describeSchedule` needed no change at all: it has always omitted the anchor phrase when there is no `monthDay`. Only the sheet was lying.
- 2026-09-11: **the note names the NEXT occurrence, not the stored date.** Caught on device: `expense.date` is the rule's anchor and is usually in the past, so the first version read "next on Aug 29" beside a row correctly saying "next Sep 29". It projects through `nextOccurrence`, the same helper the list uses, so the two cannot disagree.
- 2026-09-11: **round-tripping monthly to weekly and back keeps the original anchor.** `buildSchedule` takes the row's own date and steps its day-of-month forward, rather than re-anchoring on today, so "the 29th" survives a frequency change the user did not mean to make.

## Open
- The sheet says "upcoming expense" in the delete label and in its own title while the pane it belongs to has settled on "bill". Those move together with the pane's other two, not piecemeal.
- The amount field is the underline variant while the log sheet and the break sheet are both enclosed.
- Delete is a bottom text row; `drawers.md` has it filed as owed the header-icon pass.
- `NAME_CHIPS` is a name-preset row that silently carries the sheet's only category assignment, with hardcoded tints that disagree with `categoryIdentityColor` in three of six entries.

## Iterations
- 2026-09-11: the legacy monthly anchor stops being misrepresented, and the sheet echoes the date it will write.
