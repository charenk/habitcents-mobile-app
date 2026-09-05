# Design decisions context

Living records of design direction, kept next to the code and updated in place as we iterate. Two levels:

- `modules/`: one file per flow or surface (Today, drawers, Money, onboarding...). Direction for the whole surface, the states it has, what is settled, what is open.
- `components/`: one file per component, named after the source file (`Sheet.md` for `components/ui/Sheet.tsx`). Anatomy, the choices that shaped it, and the iteration log.

How these relate to the ADRs in the ops repo (`../docs/decisions/`): an ADR is immutable, numbered, and ratified by Charen; it records a choice at a moment. These files are the current truth and move every iteration. When a choice here is ratified, link the ADR from the decision line and keep the line. When a choice here reverses an ADR, say so here and file a superseding ADR.

## Shape of a file

```
# <Name> (<source path>)

## Direction (current)
Two to six lines: what this is for, the one thing it must do well, the rule that governs it.

## States
The states it can be in, named with the project vocabulary (Zero / Quiet / Live for panes; pending / skipped / slipped for the check-in card; and so on). Reach: how to get there in the simulator.

## Decisions
Newest first. One line each: date, what, why, what was rejected, ADR link if ratified.

## Open
Questions and findings not yet decided, with the evidence.

## Iterations
Newest first. Date, commit or PR, one line on what changed.
```

## Rules

- Read the module file and the component files for anything you touch before changing it. Update them in the same commit as the change, never later.
- Decisions are one line each and say why. If it needs a paragraph, it is an ADR.
- Vocabulary is the project's: leak, skip, kept, slip; Zero, Quiet, Live; sentence case; no em dashes.
- A finding from a walk or a review goes under Open with where it was seen; it moves to Decisions when settled and to Iterations when shipped.
- Delete nothing. A reversed decision stays, marked reversed, with the date.
- Keep each file on one screen where you can. Split a module file only when a sub-surface earns its own states list.

## Index

Modules: [today](modules/today.md), [drawers](modules/drawers.md), [money](modules/money.md), [insights](modules/insights.md), [categories](modules/categories.md).

Components: [Sheet](components/Sheet.md), [SheetHeader](components/SheetHeader.md), [ExpenseSheet](components/ExpenseSheet.md), [Chip](components/Chip.md), [InfoRibbon](components/InfoRibbon.md), [EmptyState](components/EmptyState.md), [ViewQuote](components/ViewQuote.md) (retired, ADR 0037), [SpentKeptChips](components/SpentKeptChips.md), [QuickLogRow](components/QuickLogRow.md), [LoggedTodayList](components/LoggedTodayList.md), [KeptHero](components/KeptHero.md), [CheckInCard](components/CheckInCard.md), [LeakCard](components/LeakCard.md), [TabBar](components/TabBar.md), [ActionDock](components/ActionDock.md).

Add a file when you first make a decision about a component or module; add it to this index.
