# Money (app/(tabs)/money.tsx)

## Direction (current)
The record, not the loop. Three segments behind one control: Spent is the chronological log, Upcoming projects what recurs, Habits lists what is being broken. Today answers "what now"; Money answers "what happened, and what is coming". Nothing here asks for a decision the user has not already made. The segments are reachable by tapping the control or by swiping between them, the same as Today's panes.

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
- 2026-09-06: the three segments became pages of one pager, so a swipe moves between them. Why: Today's panes have always swiped and Money's did not, so the same control taught two different things depending on which tab you were on. This is not a new switcher (PATTERN_VOCABULARY's rule holds): SegmentedControl is unchanged and simply gained the affordance the Today scoreboard already had. See [SegmentPager](../components/SegmentPager.md).
- 2026-09-06: all three panes stay mounted, so each keeps its own scroll position. Why: it is the behaviour Today already had, and scrolling deep into Spent, glancing at Habits and coming back to the top of Spent would be a loss. The eager render is bounded (Upcoming and Habits are ~15 rows; Spent virtualizes), so it is cheap. Revisit if any of those lists ever stops being bounded.
- 2026-09-06: UX-016's split stands, now per pane rather than as a conditional. Spent keeps its own SectionList and Upcoming and Habits each take a plain ScrollView, because a SectionList owns its scrolling and virtualizes and must not nest inside another scroller. Verified in the simulator: the list scrolls and virtualizes inside the pager, and a vertical drag does not drag the pager sideways.
- 2026-09-06: `money_view_switched` fires on every switch with `to` and `method`, matching Today's event. Why: it is the only way to learn whether the swipe affordance is actually found, and the tap-versus-swipe split is the whole question. Structural identifiers only, no amounts and no names. Approved by Charen (analytics contracts are human-gated, ADR 0035).
- 2026-09-05: the three Zero states drop their body line and their CTA becomes text only. Why: one hook is the app standard now, and a bordered button was the heaviest thing in the pane. Habits' body was the only place promising leaks surface automatically; Today's kept pane shows that with a live detection meter instead. ADR 0037.
- 2026-09-05: the three Zero states carry 96pt illustrations instead of the shared 28pt ChartLine glyph. Why: Spent, Upcoming and Habits rendered an identical mark, so switching segments changed the words and nothing else. ADR 0036.
- 2026-09-05: Upcoming's calculator became a calendar and Habits' dartboard became a takeaway coffee cup. Why: a calculator means arithmetic where the copy promises a next date, and a dartboard means "hit your target" where the app's own word is leak. The cup is the house example: `constants/onboardingPresets.ts` lists "Coffee or tea out" first, and the leak-scan payoff screen uses coffee as its worked example. Rejected: a dripping tap (better still, none available), a flame (the anti-reference list names streak flames). ADR 0036.
- 2026-09-05: Zero copy names what the surface gives you rather than reporting an absence. "Nothing logged yet" became "Every expense in one place"; "Nothing repeating yet" became "Know what's coming before it lands"; "No leaks spotted yet" became "Find the leak worth breaking". Why: half the app's zero states sold a benefit and half described a void, and the benefit voice is the one that converts a skipper. ADR 0036.
- Upcoming keeps two distinct empty states (true-zero and window-empty). Why: hiding the window picker when a window is merely empty would strand the user away from data they have.
- 2026-09-05: window-empty gets its own line, "None of your repeating expenses land in this window." (`upcomingWindowEmptyBody`). Why: it had inherited the true-zero body, which told a user who already has a repeating expense to go mark one as repeating. The old key stays, retired, for the localization migration. ADR 0039 review.

## Open

## Iterations
- 2026-09-06 (routine/ipad): Spent's SectionList moved into its own `components/money/SpentList.tsx` on the same day the pager landed, and its `listContent` style did not carry forward the 600pt tablet cap `money.tsx`'s old inline ScrollView had (item 2b, 2026-09-04). Added `contentColumnStyle` back to `listContent`, matching Upcoming and Habits' shared `scrollContent`. Below the cap it is a pass-through, so phone rendering is unchanged.
- 2026-09-06: the three segments became a swipeable pager on `utils/useSegmentPager.ts`; `money_view_switched` added.
- 2026-09-05: illustrations on all three Zero states, Zero copy rewritten. ADR 0036.
