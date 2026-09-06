# SegmentPager (utils/useSegmentPager.ts)

## Direction (current)
The swipe half of a segmented switcher. A screen keeps its segmented control and keeps owning its selected value; this hook adds a horizontal pager beside it and syncs the two both ways, so a segment can be reached by tapping it or by swiping to it. It is not a new switcher: it is the affordance Today's scoreboard already had, made available to the controls that lacked it.

Implementation is deliberately boring and must stay so: a plain horizontal ScrollView with `pagingEnabled` and native scrolling only. No react-native-gesture-handler, no Reanimated, no mixed animation drivers.

## States
- Idle: the pager rests on the selected segment's page.
- Dragging: native 1:1 tracking, then the platform's own paging deceleration.
- Settled: the landed page becomes the value, and the screen fires its switch analytics with `method: 'swipe'`.
- Tap: the value changes first, then the hook scrolls the pager to match, animated. Under reduced motion the same jump cuts.
- First position (default or deep link): silent, always. Nobody asked for it, so it never animates whatever the setting says.

Reach: any screen with segments. Today (Spent, Kept), Money (Spent, Upcoming, Habits), Insights (This month, First scan).

## Decisions
- 2026-09-06: extracted from Today rather than copied a third time, when Money and Insights gained the same swipe. Why: the plumbing is small but every piece of it is a rule (which events count as a settle, when animation is suppressed, that panes stay mounted, that off-screen panes are hidden from assistive tech). Three copies would have meant three places to get those wrong.
- 2026-09-06: settles are read from `onScrollEndDrag` as well as `onMomentumScrollEnd`. Why: a drag released with no velocity settles the page without ever producing momentum, which left the control showing one segment and the pager another. OnboardingCarousel has always wired both; Today wired only momentum and carried that gap from ADR 0019 until now. The duplicate event is dropped by the same inequality that stops a tap counting as a swipe.
- 2026-09-06: `onSwipe` fires only when the landed page differs from the current value. Why: a tap scrolls the pager programmatically, and that scroll produces its own settle event. Without the inequality every tap would also report a swipe.
- 2026-09-06: the landed index is clamped to the page range. Why: rubber-band overshoot at either end reports an offset just outside it. Today's two-page pager could never round past its own ends; a three-page pager can.
- 2026-09-06: all panes stay mounted. Why: each keeps its own scroll position across switches, which is the behaviour Today has always had. The cost is that off-screen panes need `accessibilityElementsHidden` and `importantForAccessibility` set explicitly, so `paneProps` supplies both and no caller can forget one.
- 2026-09-06: no new animation libraries, ever, in this hook. Why: `design/INCIDENT-build5-launch-crash.md` names the animation layer in two release-build crashes whose root cause was never confirmed, and the app holds zero react-native-gesture-handler and Reanimated imports as the containment line. A swipe that needs one of them is a swipe this app does not ship. Carried forward from ADR 0019.
- 2026-09-06: **cross-page swipe rejected.** A swipe past the last segment would have moved to the next bottom tab. Why not: a paging ScrollView cannot hand a gesture past its own bounds without one of the forbidden libraries; the boundary between "next segment" and "left the page" is invisible, so an overshoot becomes a navigation error rather than a bounce; segment counts differ per tab (Today 2, Money 3, Insights 2, Categories 0) so no muscle memory can form; a right swipe at the first segment collides with the iOS back gesture; it implies a sliding tab transition, against the house rule that tab switches are instant, on chrome already named as a crash suspect; and VoiceOver users, who navigate by the tab bar, gain nothing. The native rubber-band bounce at the ends already says "that is all". Rejected without a spike, on Charen's call. See [TabBar](TabBar.md).
- Ratified and unchanged: the swipe is direct manipulation and is never suppressed by reduced motion; only the programmatic scroll behind a tap is. ADR 0019.

## Open
- Verified from the simulator, which drives native ScrollView paging faithfully. Nothing here is a JS PanResponder, so unlike the sheet drag it does not need a device to prove, but a real thumb on all three screens is still owed at the device pass.
- If a screen ever puts a horizontally scrolling row inside a pane (a chip rail, a carousel), the two gestures will compete. None does today: every row in the app is tap-only and the chip rails live inside sheets. That is the moment to decide a coordination rule, not before.

## Iterations
- 2026-09-06: hook added, Today refactored onto it with no behaviour change, Money and Insights adopted it.
