# Money (app/(tabs)/money.tsx)

## Direction (current)
The record, not the loop. Three segments behind one control: Spent is the chronological log, Upcoming projects what recurs, Habits lists what is being broken. Today answers "what now"; Money answers "what happened, and what is coming". Nothing here asks for a decision the user has not already made.

## States
Vocabulary (ADR 0034): **Zero** nothing ever happened here; **Quiet** history elsewhere, nothing in this slice; **Live** data present.

- Spent Zero: pane-level empty state, 96pt receipt, "Every expense in one place". Reach: Persona new user.
- Spent Quiet: today's section shows a compact white card ("Nothing yet today"), past days still listed. Deliberately not the EmptyState primitive, so past days stay visible below it. Reach: returning user, delete today's rows.
- Spent Live: day sections newest first, edit hint in the footer.
- Upcoming Zero: no recurring expense exists at all, so the whole window and total card is dropped for a 96pt calendar and "Know what's coming before it lands". Reach: Persona new user.
- Upcoming window-empty: something recurs, just not in the picked window. Keeps the total card and shows a body-only inline empty state, because the window picker is how the user gets back to their data. A different state from Zero on purpose.
- Habits Zero: 96pt takeaway coffee cup, "Find the leak worth breaking". Reach: Persona new user.
- Habits Live: managed rows plus the monthly total.

## Decisions
- 2026-09-05: the three Zero states drop their body line and their CTA becomes text only. Why: one hook is the app standard now, and a bordered button was the heaviest thing in the pane. Habits' body was the only place promising leaks surface automatically; Today's kept pane shows that with a live detection meter instead. ADR 0037.
- 2026-09-05: the three Zero states carry 96pt illustrations instead of the shared 28pt ChartLine glyph. Why: Spent, Upcoming and Habits rendered an identical mark, so switching segments changed the words and nothing else. ADR 0036.
- 2026-09-05: Upcoming's calculator became a calendar and Habits' dartboard became a takeaway coffee cup. Why: a calculator means arithmetic where the copy promises a next date, and a dartboard means "hit your target" where the app's own word is leak. The cup is the house example: `constants/onboardingPresets.ts` lists "Coffee or tea out" first, and the leak-scan payoff screen uses coffee as its worked example. Rejected: a dripping tap (better still, none available), a flame (the anti-reference list names streak flames). ADR 0036.
- 2026-09-05: Zero copy names what the surface gives you rather than reporting an absence. "Nothing logged yet" became "Every expense in one place"; "Nothing repeating yet" became "Know what's coming before it lands"; "No leaks spotted yet" became "Find the leak worth breaking". Why: half the app's zero states sold a benefit and half described a void, and the benefit voice is the one that converts a skipper. ADR 0036.
- Upcoming keeps two distinct empty states (true-zero and window-empty). Why: hiding the window picker when a window is merely empty would strand the user away from data they have.
- 2026-09-05: window-empty gets its own line, "None of your repeating expenses land in this window." (`upcomingWindowEmptyBody`). Why: it had inherited the true-zero body, which told a user who already has a repeating expense to go mark one as repeating. The old key stays, retired, for the localization migration. ADR 0039 review.

## Open

## Iterations
- 2026-09-05: illustrations on all three Zero states, Zero copy rewritten. ADR 0036.
