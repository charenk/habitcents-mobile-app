# HowItWorksSheet (components/today/HowItWorksSheet.tsx)

## Direction (current)
How skips and habits work, told on request. A decision-style sheet: serif title, four icon rows (log, a leak surfaces, a skip keeps, a slip never subtracts), one secondary "Got it". Opened from the underlined link on Today's Kept true-zero state, and from nowhere else. It carries the only explanation of the kept mechanic a user with no data can reach.

## States
Closed; open (Sheet's enter); closing (Sheet's exit, reduced-motion path inherited). No state of its own: nothing here mutates.

## Decisions
- 2026-09-07 (Charen): the explanation lives here, behind a link, not on the pane. Why: explanatory prose does not belong in the empty-state pattern; the pane keeps its silhouette and the telling is one tap away for whoever wants it. See [EmptyState](EmptyState.md) and today.md for the reversal of ADR 0039.
- 2026-09-07: this revives the "how-it-works" sheet the redesign retired (`design/redesign-handoff/03-onboarding.md`, three icon rows and an OK) rather than inventing a new surface. Its third row survived the retirement as onboarding's `outcomeKeptCounts`; the shape was already proven.
- 2026-09-07: four rows, not three. The ADR 0039 lines (log, around four logs at one place, a skip keeps) plus "A slip records what happened; it never takes anything back." Why: the question is how skips and habits are measured, and a slip is the half people worry about. Verified against the code before writing: `contexts/HabitsContext.tsx` leaves `goal.kept` unchanged on a slipped answer and adds partial-slip credit, `utils/habitLogging.ts` `keptOnDay` only ever adds, and the one subtraction (`changeTodayAnswer`) corrects a previously recorded skip. The ADR 0039 guardrails still bind the copy: no rate, no total, no "the one you buy most often".
- 2026-09-07: glyphs Pencil (log; SquarePen means edit-a-row elsewhere), Sprout (a leak surfaces; InfoRibbon's growth mark), Check (a skip; the check-in's own mark), Repeat (a slip; the habit ran again). Rejected: Minus for the slip, which reads as "subtract", the one thing the row denies.
- 2026-09-07: a bottom "Got it" (secondary). Why: decision sheets keep bottom CTAs; ADR 0031's "no in-sheet Cancel" is about form sheets, and an acknowledgement is not a cancel. Handle and scrim dismiss too.
- 2026-09-07: each row is one VoiceOver stop carrying the whole line; the glyph is decorative. Same idiom the removed steps list used.
- 2026-09-07: opening fires `how_it_works_opened`, no payload. Why: the only way to learn whether a deliberately quiet link gets found at all. Approved by Charen (analytics contracts are human-gated, ADR 0035).

## Open
- Reachable only from Kept true zero. Kept Quiet shows the detection meter instead; whether a returning user ever wants this sheet again (from habit detail, say) is a separate question.
- Body lines are uncapped under Dynamic Type, like EmptyState's; at XXXL the sheet is tall but Sheet has no built-in scroll. Verified on the iPhone 16 simulator; a shorter device is owed a look.

## Iterations
- 2026-09-07: created.
