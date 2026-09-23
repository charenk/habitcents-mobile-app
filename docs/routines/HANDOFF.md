# ipad-worker handoff

## COMPLETE

Run 14 (2026-09-08) checked off the plan's last item and marked PR #133
ready for review. Every plan item but the standing item 7 re-verification
line is checked (see PLAN.md); item 7 is by design never checked, since it
is a re-verify-every-run instruction, not a one-time task. **This branch
has never been seen on a real iPad or the iPad simulator (none is
available in this environment).** The device pass below is the one thing
left before this ships; nothing about the plan being "complete" changes
that.

## DEVICE PASS NEEDED

- The 600pt capped column reads as intentional on iPad, not cramped or
  arbitrarily narrow, across Today, Money, Insights, Categories, habit
  detail, category detail, Profile, Paywall, the onboarding carousel beats,
  and every Leak Scan screen (intake, scope, deck, bills, graceful failure,
  results, payoff).
- Bottom sheets (`components/ui/Sheet.tsx` and everything built on it:
  ExpenseSheet, AddUpcomingSheet, PickOneSheet, PartialSlipSheet,
  BreakHabitSheet, ConfirmSheet, ReviewQueueSheet, CategoryTransactionsSheet,
  the currency and category pickers) look right centered at the capped
  width, including the keyboard-clamp behavior on forms (ExpenseSheet,
  AddUpcomingSheet) with the iPad on-screen keyboard, which is shaped
  differently from the phone one. **Changed run 26 (main, not this
  branch):** the sheet's old `avoidKeyboard`/KeyboardAvoidingView lift was
  replaced by a height clamp (`utils/sheetLayout.ts` `sheetMaxHeight`,
  `utils/keyboard.ts` `useKeyboardHeight`) that shrinks the panel to the
  visible strip above the keyboard instead of lifting it; the 600pt width
  cap this branch owns is unaffected (confirmed run 26, see Status), but the
  clamp's own feel on the iPad keyboard, which is taller and shaped
  differently from the phone one, is new territory for the device pass.
- The onboarding carousel: swiping between beats on iPad, confirming the
  capped `beatContent` column reads well against the still full-width
  `beat` page background, and that `BeatMedia`'s frame (capped along with
  the rest of the beat content) is not so narrow it looks like an error
  state.
- The Leak Scan flow end to end on iPad: intake's file-picker stage,
  scope's category rows, the deck's swipeable candidate cards, the bills
  offer rows, graceful failure, and the results dashboard, all capped at
  600pt. **New this run:** `ScopeScreen` and `BillsScreen`'s fixed footer
  bars (confirm/skip), `app/paywall.tsx`'s footer, and `PayoffScreen`'s
  Continue button now cap and center at 600pt too (decision 1, issue #139)
  rather than staying full width; confirm this reads as one consistent
  bar rather than a strange inset one, especially where the footer's own
  border-top and background now stop at 600pt instead of spanning the
  screen.
- The Today Spent/Kept pager: swiping between Spent and Kept feels right on
  iPad, in both split-view widths. **Changed this run:** the Kept pane's
  `KeptHero` band no longer renders at all (main removed it 2026-09-07,
  unrelated to this branch); only the door3 ribbon is capped and centered
  above the list now. Confirm there is no leftover visual seam where the
  capped ribbon meets the still-full-width pane background around it.
- Split-screen / Slide Over multitasking on iPad, since `supportsTablet`
  now being true makes iPadOS offer those; the app has never been exercised
  in a resized window before this branch.
- One boot on an iPad simulator or device to confirm nothing above (icon,
  splash) regressed from turning `supportsTablet` on, before this reaches
  TestFlight.

This app also carries a standing device-pass item from Phase 2 sign-off
(decision 0008, umbrella repo): the VoiceOver walk + Accessibility
Inspector audit, scheduled for the Phase 4 TestFlight beta. This iPad
device pass is separate and additional to that one, not a substitute.

## Status

Run 77. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-76. PR #133
re-checked via `get`/`get_comments`/`get_check_runs`: still open, not
draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `8f0ca8f` (run 76's own status commit, no new push
between), `verify` check green (completed 14:09-14:11 UTC on 2026-09-23,
this same head, one check run). No new comments since run 66's
second-occurrence note. Issue #139 (Routine status board) re-checked via
`get`: `updated_at` unchanged at `2026-09-23T12:03:20Z`, same nineteenth
orchestrator entry run 76 already saw: ipad-worker section still
"approved, nothing owed," blocker still the device pass gated on PR #133
merging behind PR #132's payments gate (decision 6). Decision queue still
16 days untouched per the board's own count; item 11's sanctioned
escalation stands unanswered, still governed by the board's "no further
notifications until something lands" posture, which this run follows:
pausing or thinning routine cadence is Charen's call to make, not this
routine's to enact on its own reading of item 11, so runs continue as
configured. Item 12 (the habitDetection.ts flake) unchanged, did not
recur this run (single `verify` check, green). Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen beyond what the board already covers; this is the forty-ninth
consecutive run (29-77) with the plan at zero drift.

Run 76. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-75. PR #133
re-checked via `get`/`get_check_runs`: still open, not draft,
`mergeable_state: clean`, base SHA `3890ba1` (main's tip, unchanged), head
still `380cae7` (run 75's own status commit, no new push between), `verify`
check green (completed 08:09-08:10 UTC on 2026-09-23, this same head, one
check run). Issue #139 (Routine status board) re-checked via `get`:
nineteenth orchestrator entry landed since run 75's check (`updated_at` now
`2026-09-23T12:03:20Z`), content is confirmation only: ipad-worker section
still "approved, nothing owed," blocker still the device pass gated on PR
#133 merging behind PR #132's payments gate (decision 6), forty-seven
consecutive zero-drift runs already counted through run 75, this run
extends that to forty-eight (29-76). Decision queue now 16 days untouched
per the board's own count; item 11's sanctioned escalation stands
unanswered on its fifth day per the board's own text, still governed by
the board's "no further notifications until something lands" posture,
which this run follows: pausing or thinning routine cadence is Charen's
call to make, not this routine's to enact on its own reading of item 11,
so runs continue as configured. Item 12 (the habitDetection.ts flake)
unchanged, did not recur this run (single `verify` check, green).
Re-verified item 7 (`app.json` orientation still `"portrait"`,
`supportsTablet` still `true`). This HANDOFF update is the only change
this run; no production code or plan content changed. No push
notification: nothing new for Charen beyond what the board already
covers; this is the forty-eighth consecutive run (29-76) with the plan at
zero drift.

Run 75. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-74. PR #133
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `e41cf51` (run 74's own status commit, no new push
between), `verify` checks green (one check run on this head, completed
02:08-02:10 UTC on 2026-09-23, `success`). No new comments since run 66's
second-occurrence note (`issuecomment-5754512815`), no reviews. Issue #139
(Routine status board) re-checked via `get`: `updated_at` unchanged at
`2026-09-22T12:06:04Z`, still the eighteenth orchestrator entry run 74
already saw, still purely a re-verification: ipad-worker section still
"approved, nothing owed," blocker still the device pass gated on PR #133
merging behind PR #132's payments gate (decision 6). Decision queue still
15+ days untouched per the board's own last count; item 11's sanctioned
escalation (09-18) stands unanswered, now on its sixth unanswered day
count from this run's read of today's date (2026-09-23) against the
board's 09-22 update, still governed by the board's own "no further
notifications until something lands" posture, which this run follows:
pausing or thinning routine cadence is Charen's call to make, not this
routine's to enact on its own reading of item 11, so runs continue as
configured. Item 12 (the habitDetection.ts flake) unchanged, did not
recur this run (single `verify` check, green). Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen beyond what the board already covers and what run 71 already sent;
this is the forty-seventh consecutive run (29-75) with the plan at zero
drift.

Run 74. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-73. PR #133
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `edd8ab0` (run 73's own status commit, no new push
between), `verify` checks green (two check runs on this head, both
completed 20:08-20:10 UTC on 2026-09-22, both `success`). No new comments
since run 66's second-occurrence note (`issuecomment-5754512815`), no
reviews. Issue #139 (Routine status board) re-checked via `get`:
`updated_at` unchanged at `2026-09-22T12:06:04Z`, still the eighteenth
orchestrator entry run 73 already saw, still purely a re-verification:
ipad-worker section still "approved, nothing owed," blocker still the
device pass gated on PR #133 merging behind PR #132's payments gate
(decision 6). Decision queue still 15+ days untouched per the board's own
last count (day 4 as of the board's 2026-09-22 update); item 11's
sanctioned escalation stands unanswered, per the board's own "no further
notifications until something lands" posture, which this run follows:
pausing or thinning routine cadence is Charen's call to make, not this
routine's to enact on its own reading of item 11, so runs continue as
configured. Item 12 (the habitDetection.ts flake) unchanged, did not
recur this run (both `verify` check runs green). Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen beyond what the board already covers and what run 71 already sent;
this is the forty-sixth consecutive run (29-74) with the plan at zero
drift.

Run 73. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-72. PR #133
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `d60c069` (run 72's own status commit, no new push
between), `verify` check green (completed 14:10-14:11 UTC on 2026-09-22 on
this same head). No new comments since run 66's second-occurrence note
(`issuecomment-5754512815`), no reviews. Issue #139 (Routine status board)
re-checked via `get`: `updated_at` unchanged at `2026-09-22T12:06:04Z`,
still the eighteenth orchestrator entry run 72 already saw, still purely a
re-verification: ipad-worker section still "approved, nothing owed,"
blocker still the device pass gated on PR #133 merging behind PR #132's
payments gate (decision 6). Decision queue still 15+ days untouched per
the board's own count; item 11's sanctioned escalation stands unanswered a
fifth day, per the board's own "no further notifications until something
lands" posture, which this run follows: pausing or thinning routine
cadence is Charen's call to make, not this routine's to enact on its own
reading of item 11, so runs continue as configured. Item 12 (the
habitDetection.ts flake) unchanged, did not recur this run (single
`verify` check, green). Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen beyond what the board already covers
and what run 71 already sent; this is the forty-fifth consecutive run
(29-73) with the plan at zero drift.

Run 72. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-71. PR #133
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `45afbc0` (run 71's own status commit, no new push
between), `verify` check green (completed 08:10-08:12 UTC on 2026-09-22 on
this same head). No new comments since run 66's second-occurrence note
(`issuecomment-5754512815`), no reviews. Issue #139 (Routine status board)
re-checked via `get`: `updated_at` advanced to `2026-09-22T12:06:04Z`, an
eighteenth orchestrator entry landed since run 71's check. Content is
confirmation, not new work: it corrects and closes out localization-worker's
run 71 false alarm about this board being deleted (wrong repo queried,
`charenk/habitcents-ops`, where no such issue has ever existed; this board
has always lived at `charenk/habitcents-mobile-app` #139 and was read clean
by ipad-worker run 71, core-worker run 69, and the orchestrator itself the
same day), and explicitly commends run 71's handling ("exactly right:
independent confirmation in both repos, one corrective notification, no
writes outside its own branch"). ipad-worker's own line is unchanged:
"approved, nothing owed," blocker still the device pass gated on PR #133
merging behind PR #132's payments gate (decision 6). Decision queue now
15+ days untouched per the board's own count; item 11's sanctioned
escalation (recommending the three worker routines be paused or thinned
while blocked) stands unanswered a fourth day, per the board's own "no
further notifications until something lands" posture, which this run
follows: pausing or thinning routine cadence is Charen's call to make, not
this routine's to enact on its own reading of item 11, so runs continue as
configured. Item 12 (the habitDetection.ts flake) unchanged, did not
recur this run (single `verify` check, green). Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen beyond what the board already covers and what run 71 already sent;
this is the forty-fourth consecutive run (29-72) with the plan at zero
drift.

Run 71. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-70. PR #133
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `eb95502` (run 70's own status commit, no new push
between), `verify` check green (completed 02:10-02:11 UTC on 2026-09-22 on
this same head). No new comments since run 66's second-occurrence note
(`issuecomment-5754512815`), no reviews. Issue #139 (Routine status board,
`charenk/habitcents-mobile-app`) re-checked via `get`: `updated_at`
unchanged at `2026-09-21T12:12:04Z`, still the seventeenth orchestrator
entry runs 68-70 already saw, still purely a re-verification: ipad-worker
section still "approved, nothing owed," blocker still the device pass
gated on PR #133 merging behind PR #132's payments gate (decision 6).
Decision queue still 14+ days untouched per the board's own count; item
11's sanctioned escalation stands unanswered per the board's "no further
notifications until something lands" posture, and item 12 (the
habitDetection.ts flake) is unchanged since its cleared second occurrence.
**Cross-routine note, not this branch's own finding to act on:** the ops
runs.log shows localization-worker's run 71 reported issue #139 as 404
and missing, checked against `charenk/habitcents-ops` ("zero issues exist"
there) and sent a push notification about a disappeared decision channel.
Independently confirmed this run: issue #139 does not exist in
`charenk/habitcents-ops` (404, expected, nothing was ever filed there) but
is alive and unchanged in `charenk/habitcents-mobile-app`, the same repo
every ipad-worker run including this one has read it from since run 1; the
`get` above returned the same content and `updated_at` this run saw. Read
this as localization-worker checking the wrong repo, not the board
actually disappearing; noted here rather than edited into their file,
since routine isolation means their branch and its files are not this
routine's to touch. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. Sending
one push notification this run despite the otherwise-zero-drift status:
Charen may already be acting on localization-worker's false alarm, and
this is new, corrective information a same-day re-check would not
otherwise surface; this is the forty-third consecutive run (29-71) with
the plan at zero drift.

Run 70. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-69. PR #133
re-checked via `get`/`get_comments`/`get_check_runs`: still open, not
draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `3184fd0` (run 69's own status commit, no new push
between), `verify` check green (completed 20:11-20:12 UTC on 2026-09-21 on
this same head). No new comments since run 66's second-occurrence note
(`issuecomment-5754512815`), no reviews. Issue #139 (Routine status board)
re-checked via `get`: `updated_at` unchanged at `2026-09-21T12:12:04Z`,
still the seventeenth orchestrator entry runs 68-69 already saw, still
purely a re-verification: ipad-worker section still "approved, nothing
owed," blocker still the device pass gated on PR #133 merging behind PR
#132's payments gate (decision 6). Decision queue still 14+ days untouched
per the board's own count; item 11's sanctioned escalation stands
unanswered per the board's "no further notifications until something
lands" posture, and item 12 (the habitDetection.ts flake) is unchanged
since its cleared second occurrence. Re-verified item 7 (`app.json`
orientation still `"portrait"`, `supportsTablet` still `true`). This
HANDOFF update is the only change this run; no production code or plan
content changed. No push notification: nothing new for Charen beyond what
the board already covers; this is the forty-second consecutive run
(29-70) with the plan at zero drift.

Run 69. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-68. PR #133
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `3cee893` (run 68's own status commit, no new push
between), `verify` check green (completed 14:10-14:11 UTC on 2026-09-21 on
this same head). No new comments since run 66's second-occurrence note
(`issuecomment-5754512815`), no reviews. Issue #139 (Routine status board)
re-checked via `get`: `updated_at` unchanged at `2026-09-21T12:12:04Z`,
still the seventeenth orchestrator entry run 68 already saw, still purely
a re-verification: ipad-worker section still "approved, nothing owed,"
blocker still the device pass gated on PR #133 merging behind PR #132's
payments gate (decision 6). Decision queue still 14+ days untouched per
the board's own count; item 11's sanctioned escalation stands unanswered
per the board's "no further notifications until something lands" posture,
and item 12 (the habitDetection.ts flake) is unchanged since its cleared
second occurrence. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen beyond what the board already
covers; this is the forty-first consecutive run (29-69) with the plan at
zero drift.

Run 68. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-67. PR #133
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `e3c19d2` (run 67's own status commit, no new push
between), `verify` check green (completed 08:12-08:13 UTC on 2026-09-21 on
this same head, the run that cleared the item 12 flake's second
occurrence). No new comments since run 66's second-occurrence note
(`issuecomment-5754512815`), no reviews. Issue #139 (Routine status board)
re-checked via `get`: seventeenth orchestrator entry landed since run 67's
check (`updated_at` now `2026-09-21T12:12:04Z`), still purely a
re-verification: ipad-worker section still "approved, nothing owed,"
blocker still the device pass gated on PR #133 merging behind PR #132's
payments gate (decision 6). Board confirms the item 12 flake's second
occurrence cleared on its own re-run with no code change, matching run
67's own read of `mergeable_state: clean`. Decision queue now 14+ days
untouched per the board's own count; item 11's sanctioned escalation
stands unanswered per the board's "no further notifications until
something lands" posture. Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). This HANDOFF update is
the only change this run; no production code or plan content changed. No
push notification: nothing new for Charen beyond what the board already
covers; this is the fortieth consecutive run (29-68) with the plan at
zero drift.

Run 67. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-66. PR #133
re-checked via `get`/`get_comments`/`get_reviews`: still open, not draft,
`mergeable_state` back to `clean` (from run 66's `unstable`) with the head
sha unchanged at `2bec5ba` (run 66's own status commit, no new push
between), meaning the flaky `verify` check cleared on its own re-run
without any code change, consistent with the flake diagnosis from runs 55
and 66. No new comments since run 66's second-occurrence note
(`issuecomment-5754512815`), no reviews. Issue #139 (Routine status board)
re-checked via `get`/`get_comments`: unchanged since run 66's check
(`updated_at` still `2026-09-20T12:05:18Z`, still the sixteenth
orchestrator entry, predating run 66's CI comment), ipad-worker section
still "approved, nothing owed," blocker still the device pass gated on PR
#133 merging behind PR #132's payments gate (decision 6). Note: the
board's item 12 text ("no recurrence since 09-18") is now stale relative
to PR #133, which recorded a second flake occurrence on 2026-09-21 (run
66); that staleness is the orchestrator's board to refresh on its next
pass, not this routine's file to edit, and item 12 already sanctions
"accept occasional red checks" as one disposition, so no new escalation
from this routine either. Decision queue still 13+ days untouched per the
board's own last count; item 11's sanctioned escalation stands unanswered
per the board's "no further notifications until something lands" posture.
Re-verified item 7 (`app.json` orientation still `"portrait"`,
`supportsTablet` still `true`). This HANDOFF update is the only change
this run; no production code or plan content changed. No push
notification: nothing new for Charen beyond what the board already
covers and what run 66's PR comment already surfaced; this is the
thirty-ninth consecutive run (29-67) with the plan at zero drift.

Run 66. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green locally on the first
pass, no flake: 122 suites / 1335 tests, zero drift from runs 33-65.
**PR #133's `verify` check failed a second time** (job
[106141608170](https://github.com/charenk/habitcents-mobile-app/actions/runs/35534733993/job/106141608170),
on run 65's own status-commit push, head `fe38ccf`, completed 20:12 UTC
2026-09-20): the identical `habitDetection.test.ts` `spanDays` assertion
from run 55 (`Expected: 0, Received: 1.157e-8`), confirmed via `get_files`
still untouched by this branch's diff, confirmed green on a fresh local
full-suite run of the same commit. `rerun_failed_jobs` returned 403 again
(no permission). Per issue #139's standing instruction ("a second failure
of the same assertion on a head that is green locally is real, not flake;
escalate then"), posted one PR comment
(https://github.com/charenk/habitcents-mobile-app/pull/133#issuecomment-5754512815)
flagging this explicitly as the second occurrence rather than re-treating
it as a one-off, alongside the same diagnosis and the same "not this PR's
code, already queued as decision item 12" disposition as run 55. Not
pushing a fix: `habitDetection.ts` is outside this PR's scope and
main-owned per item 12, which already carries the proposed patch and an
"accept occasional red checks" option; leaving the call to that decision.
`mergeable_state` is `unstable` for this reason only, base SHA `3890ba1`
(main's tip, unchanged). No new reviews. Issue #139 (Routine status board)
re-checked via `get`/`get_comments`: unchanged since run 65's check
(`updated_at` still `2026-09-20T12:05:18Z`, still the sixteenth
orchestrator entry, predates this CI event), ipad-worker section still
"approved, nothing owed," blocker still the device pass gated on PR #133
merging behind PR #132's payments gate (decision 6). Decision queue still
13+ days untouched per the board's own count; item 11's sanctioned
escalation stands unanswered per the board's own "no further
notifications until something lands" posture; item 12 (the flake itself)
already anticipates and sanctions occasional recurrences like this one, so
not re-escalating past the PR comment above. Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update and the PR comment above are the only
changes this run; no production code or plan content changed. No push
notification: the recurrence is diagnosed, reported on the PR where the
next reader (orchestrator or Charen) will see it, matches an outcome
decision item 12 already anticipated and sanctioned, and the board's
"no further notifications" posture on the stale decision queue still
holds; this is the thirty-eighth consecutive run (29-66) with the plan at
zero drift, though not zero-CI-drift given the flake noted above.

Run 65. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-64. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `42d1b13` (run 64's own status commit, unchanged by
any code this run), `verify` check green (completed 14:10-14:12 UTC on
2026-09-20 on this same head). No new comments since run 55's flake
comment, no reviews. Issue #139 (Routine status board) re-checked via
`get`/`get_comments`: unchanged since run 64's check (`updated_at` still
`2026-09-20T12:05:18Z`, still the sixteenth orchestrator entry), ipad-
worker section still "approved, nothing owed," blocker still the device
pass gated on PR #133 merging behind PR #132's payments gate (decision 6).
Decision queue still 13 days untouched per the board's own count; item 11's
sanctioned escalation stands unanswered per the board's own "no further
notifications until something lands" posture, and item 12 (the
habitDetection.ts flake) is unchanged; neither is this routine's to act on
or re-notify. Re-verified item 7 (`app.json` orientation still `"portrait"`,
`supportsTablet` still `true`). This HANDOFF update is the only change this
run; no production code or plan content changed. No push notification:
nothing new for Charen beyond what the board already covers; this is the
thirty-seventh consecutive run (29-65) at zero drift while the device-pass
blocker stays outside this routine's reach.

Run 64. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-63. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `a5afcef` (run 63's own status commit, unchanged by
any code this run), `verify` check green (completed 08:10-08:11 UTC on
2026-09-20 on this same head). No new comments since run 55's flake
comment, no reviews. Issue #139 (Routine status board) re-checked via
`get`: sixteenth orchestrator entry landed since run 63's check
(`updated_at` now `2026-09-20T12:05:18Z`), still purely a re-verification:
ipad-worker section still "approved, nothing owed," blocker still the
device pass gated on PR #133 merging behind PR #132's payments gate
(decision 6). Decision queue now 13 days untouched per the board's own
count; item 11's sanctioned escalation stands unanswered per the board's
own "no further notifications until something lands" posture, and item 12
(the habitDetection.ts flake) is unchanged; neither is this routine's to
act on or re-notify. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen beyond what the board already
covers; this is the thirty-sixth consecutive run (29-64) at zero drift
while the device-pass blocker stays outside this routine's reach.

Run 63. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-62. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `88f4c2e` (run 62's own status commit, unchanged by
any code this run), `verify` check green (completed 02:10-02:12 UTC on
2026-09-20 on this same head). No new comments since run 55's flake
comment, no reviews. Issue #139 (Routine status board) re-checked via
`get`: `updated_at` unchanged at `2026-09-19T12:04:19Z`, still the
fifteenth orchestrator entry run 62 already saw, still purely a
re-verification: ipad-worker section still "approved, nothing owed,"
blocker still the device pass gated on PR #133 merging behind PR #132's
payments gate (decision 6). Decision queue still 12 days untouched per the
board's own count; item 11's sanctioned escalation stands unanswered per
the board's own "no further notifications until something lands" posture,
and item 12 (the habitDetection.ts flake) is unchanged; neither is this
routine's to act on or re-notify. Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). This HANDOFF update is
the only change this run; no production code or plan content changed. No
push notification: nothing new for Charen beyond what the board already
covers; this is the thirty-fifth consecutive run (29-63) at zero drift
while the device-pass blocker stays outside this routine's reach.

Run 62. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-61. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `e741f26` (run 61's own status commit, unchanged by
any code this run), `verify` check green (completed 20:10-20:11 UTC on
2026-09-19 on this same head). No new comments since run 55's flake
comment, no reviews. Issue #139 (Routine status board) re-checked via
`get`: `updated_at` unchanged at `2026-09-19T12:04:19Z`, still the
fifteenth orchestrator entry run 61 already saw, still purely a
re-verification: ipad-worker section still "approved, nothing owed,"
blocker still the device pass gated on PR #133 merging behind PR #132's
payments gate (decision 6). Decision queue still 12 days untouched per the
board's own count; item 11's sanctioned escalation stands unanswered per
the board's own "no further notifications until something lands" posture,
and item 12 (the habitDetection.ts flake) is unchanged; neither is this
routine's to act on or re-notify. Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). This HANDOFF update is
the only change this run; no production code or plan content changed. No
push notification: nothing new for Charen beyond what the board already
covers; this is the thirty-fourth consecutive run (29-62) at zero drift
while the device-pass blocker stays outside this routine's reach.

Run 61. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-60. PR #133:
re-checked via `get`/`get_check_runs`/`get_comments`/`get_reviews`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `2dd4581` (run 60's own status commit, unchanged by
any code this run), `verify` check green (completed 14:09-14:11 UTC on
2026-09-19 on this same head). No new comments since run 55's flake
comment, no reviews. Issue #139 (Routine status board) re-checked via
`get`: `updated_at` unchanged at `2026-09-19T12:04:19Z`, still the
fifteenth orchestrator entry run 60 already saw, still purely a
re-verification: ipad-worker section still "approved, nothing owed,"
blocker still the device pass gated on PR #133 merging behind PR #132's
payments gate (decision 6). Decision queue still 12 days untouched per the
board's own count; item 11's sanctioned escalation (pause/thin worker
cadence) stands unanswered per the board's own "no further notifications
until something lands" posture, and item 12 (the habitDetection.ts flake)
is unchanged; neither is this routine's to act on or re-notify. Re-verified
item 7 (`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for Charen
beyond what the board already covers; this is the thirty-third consecutive
run (29-61) at zero drift while the device-pass blocker stays outside this
routine's reach.

Run 59. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-58. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `1f5be9c` (run 58's own status commit, unchanged by
any code this run), `verify` check green (completed 02:11-02:12 UTC on
2026-09-19 on this same head). No new comments since run 55's flake
comment, no reviews. Issue #139 (Routine status board) re-checked via
`get`/`get_comments`: unchanged since run 58's check (`updated_at` still
`2026-09-18T12:06:23Z`, still the fourteenth orchestrator entry), ipad-
worker section still "approved, nothing owed," blocker still the device
pass gated on PR #133 merging behind PR #132's payments gate (decision 6).
Decision queue still 11+ days untouched per the board's own count; items 11
(pause/thin worker cadence) and 12 (the habitDetection.ts flake) unchanged,
neither this routine's to act on or re-notify. Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen beyond what the board already covers; this is the thirty-first
consecutive run (29-59) at zero drift while the device-pass blocker stays
outside this routine's reach.

Run 58. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-57. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `2d909d6` (run 57's own status commit, unchanged by
any code this run), `verify` check green (completed 20:10-20:12 UTC on
2026-09-18 on this same head). No new comments since run 55's flake
comment, no reviews. Issue #139 (Routine status board) re-checked via
`get`/`get_comments`: unchanged since run 57's check (`updated_at` still
`2026-09-18T12:06:23Z`, still the fourteenth orchestrator entry), ipad-
worker section still "approved, nothing owed," blocker still the device
pass gated on PR #133 merging behind PR #132's payments gate (decision 6).
Decision queue still 11 days untouched per the board's own count; items 11
(pause/thin worker cadence) and 12 (the habitDetection.ts flake) unchanged,
neither this routine's to act on or re-notify. Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen beyond what the board already covers; this is the thirtieth
consecutive run (29-58) at zero drift while the device-pass blocker stays
outside this routine's reach.

Run 57. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-56. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
unchanged), head still `a882afa` (run 56's own status commit, unchanged by
any code this run), `verify` check green (completed 14:11-14:12 UTC on this
same head, well after run 56's push, confirming the flake stayed resolved).
No new comments since run 55's flake comment, no reviews. Issue #139
(Routine status board) re-checked via `get`/`get_comments`: unchanged since
run 56's check (`updated_at` still `2026-09-18T12:06:23Z`, still the
fourteenth orchestrator entry), ipad-worker section still "approved,
nothing owed," blocker still the device pass gated on PR #133 merging
behind PR #132's payments gate (decision 6). Decision queue still 11 days
untouched per the board's own count; items 11 (pause/thin worker cadence)
and 12 (the habitDetection.ts flake) unchanged, neither this routine's to
act on or re-notify. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen beyond what the board already covers;
this is the twenty-ninth consecutive run (29-57) at zero drift while the
device-pass blocker stays outside this routine's reach.

Run 56. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-55. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`: still
open, not draft, `mergeable_state: clean` (back from run 55's `unstable`),
base SHA `3890ba1` (main's tip, unchanged), head still `e8c1c8f` (run 55's
own status commit, unchanged by any code this run). The `verify` check that
failed once on run 55 (job 105455253405, the `habitDetection.ts` `spanDays`
CI-jitter flake diagnosed and reported there) is now green on a re-run of
the same head (job 105530162545, completed 08:13:37 UTC, after run 55's PR
comment at 08:11:49 UTC), confirming the flake diagnosis: no code changed,
the same commit now passes. No new comments or reviews since run 55's own
comment. Issue #139 (Routine status board) re-checked via `get`/
`get_comments`: fourteenth orchestrator entry landed since run 55's check
(`updated_at` now `2026-09-18T12:06:23Z`), reviewing run 55's flake handling
explicitly: "approved, nothing owed... The flake handling followed the
drive-to-green rules exactly," plus a standing instruction for future runs
("a second failure of the same assertion on a head that is green locally is
real, not flake; escalate then"), noted here for the next run that sees a
red `verify` check. Board also logged a new item 12 (the flake itself, as a
main-owned decision item for Charen: spin a fix session, fold into the next
`habitDetection.ts` touch, or accept occasional red checks) and repeats item
11 (pause/thin worker cadence, core-worker's sanctioned escalation already
sent 2026-09-18); neither is this routine's to act on or re-notify. Blocker
unchanged: the device pass, gated on PR #133 merging behind PR #132's
payments gate (decision 6). Decision queue now 11 days untouched per the
board's own count. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: the flake that worried run 55 is confirmed resolved (green
again, no code owed from this branch), and everything else on the board is
already known to Charen or not this routine's to escalate; this is the
twenty-eighth consecutive run (29-56, i.e. runs 29 through 56) at zero
drift while the device-pass blocker stays outside this routine's reach.

Run 55. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake, locally: 122 suites / 1335 tests, zero drift from runs 33-54.
**PR #133's `verify` check failed for the first time in 26 runs** (job
105455253405, commit `d90c96c`, run 54's own pre-push head): one assertion
in `__tests__/habitDetection.test.ts` (`spanDays` expected `0`, got
`1.157e-8`, i.e. 1ms of CI-runner jitter between the fixture's five
separate `new Date()` calls, since `spanDays` at `utils/habitDetection.ts:
482-484` is a raw millisecond-difference float with no flooring). Confirmed
via `get_files` that neither `utils/habitDetection.ts` nor its test file
are touched by this branch's diff (layout/width-cap only): not this PR's
failure to fix. `rerun_failed_jobs` returned 403 (no permission to re-run
the job directly); a fresh local full-suite run on the same commit passed
clean (122/122, including this file), which is the flake evidence available
without that permission. Per the drive-to-green rules, a fix for code
outside this PR's scope does not get pushed into it: posted one PR comment
(https://github.com/charenk/habitcents-mobile-app/pull/133#issuecomment-5727178382)
naming the failure, the root cause, and a proposed patch (floor `spanDays`
to whole days, or give `pizzahutCluster()` one shared timestamp instead of
five wall-clock ones) for whoever owns that file. `mergeable_state` is now
`unstable` (was `clean`) for the same reason, base SHA still `3890ba1`
(main's tip, unchanged), head still `d90c96c`. No new comments or reviews
otherwise. Issue #139 (Routine status board) re-checked via `get`/
`get_comments`: unchanged since run 54's check (`updated_at` still
`2026-09-17T12:04:29Z`, still the thirteenth orchestrator entry), ipad-
worker section still "approved, nothing owed," blocker still the device
pass gated on PR #133 merging behind PR #132's payments gate (decision 6).
Decision queue still reads 10 days untouched as of the board's last write;
today (2026-09-18) is core-worker's own fourth-day escalation threshold,
which is core-worker's to send, not this routine's, so no push notification
for that. Re-verified item 7 (`app.json` orientation still `"portrait"`,
`supportsTablet` still `true`). This HANDOFF update and the PR comment above
are the only changes this run; no production code or plan content changed.
No push notification: the CI failure is diagnosed, reported on the PR, and
not this routine's code to fix; nothing else is new for Charen beyond what
the board and core-worker's escalation slot already cover.

Run 54. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-53. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `b15cb77` (run 53's own status commit, pre-push),
no new comments or reviews, `verify` check green (completed 20:11-20:12
UTC on 2026-09-17, this same head). Issue #139 (doubling as the Routine
status board) re-checked via `get`/`get_comments`: unchanged since run
53's check (`updated_at` still `2026-09-17T12:04:29Z`, still the thirteenth
orchestrator entry), ipad-worker section still "approved, nothing owed,"
blocker still the device pass gated on PR #133 merging behind PR #132's
payments gate (decision 6). Decision queue still reads 10 days untouched
as of the board's last write; today (2026-09-18) is the fourth-day
threshold core-worker itself set for its one sanctioned escalation, which
is core-worker's to send, not this routine's; the board still asks the
orchestrator and the other workers, this one included, to stay silent to
avoid duplicates, so no push notification this run either. Re-verified
item 7 (`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen beyond what the board and core-worker's escalation slot already
cover; this is the twenty-sixth consecutive run (29-54) at zero drift
while the device-pass blocker stays outside this routine's reach.

Run 52. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-51. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `2447f50` (run 51's own status commit, pre-push),
no new comments or reviews, `verify` check green (completed 08:09-08:11
UTC on 2026-09-17, this same head). Issue #139 (doubling as the Routine
status board) re-checked via `get`/`get_comments`: thirteenth orchestrator
entry landed since run 51's check (dated 2026-09-17), but the ipad-worker
section is unchanged in substance: still "approved, nothing owed," blocker
still the device pass gated on PR #133 merging behind PR #132's payments
gate (decision 6). Decision queue now 10 days untouched. Item 11 (pause or
thin worker cadence) is now on day 3 unanswered; core-worker has set a
fourth-day threshold and will send one fresh escalation notification on
2026-09-18 if nothing lands by then, and the board explicitly asks the
orchestrator and the other workers (this one included) to stay silent to
avoid duplicates, so no push notification this run either. Re-verified
item 7 (`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen beyond what the board and core-worker's escalation slot already
cover; this is the twenty-fourth consecutive run (29-52) at zero drift
while the device-pass blocker stays outside this routine's reach.

Run 51. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-50. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `39fa07a` (run 50's own status commit, pre-push),
no new comments or reviews, `verify` check green (completed 02:10-02:11
UTC on 2026-09-17, this same head). Issue #139 (doubling as the Routine
status board) re-checked via `get`/`get_comments`: still the same twelfth
orchestrator entry runs 47-50 already saw (`updated_at` unchanged at
2026-09-16T12:12:50Z), ipad-worker section still "approved, nothing
owed," blocker still the device pass gated on PR #133 merging behind PR
#132's payments gate (decision 6). Item 11 (pause or thin the worker
routines while all three are blocked or complete) remains pushed to
Charen directly by core-worker run 42's notification on 2026-09-15 and the
board says it still awaits action; this routine is not the one that
raised it and re-notifying here would just be a duplicate, so no push
notification this run either. Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). This HANDOFF update is
the only change this run; no production code or plan content changed. No
push notification: nothing new for Charen; this is the twenty-third
consecutive run (29-51) at zero drift while the device-pass blocker stays
outside this routine's reach.

Run 50. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-49. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `32b0d79` (run 49's own status commit, pre-push),
no new comments or reviews, `verify` check green (completed 20:09-20:11
UTC on 2026-09-16, this same head). Issue #139 (doubling as the Routine
status board) re-checked via `get`/`get_comments`: still the same twelfth
orchestrator entry runs 47-49 already saw (`updated_at` unchanged at
2026-09-16T12:12:50Z), ipad-worker section still "approved, nothing
owed," blocker still the device pass gated on PR #133 merging behind PR
#132's payments gate (decision 6). Item 11 (pause or thin the worker
routines while all three are blocked or complete) was already pushed to
Charen directly by core-worker run 42's notification on 2026-09-15 and
the board says it still awaits action; this routine is not the one that
raised it and re-notifying here would just be a duplicate, so no push
notification this run either. Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). This HANDOFF update is
the only change this run; no production code or plan content changed. No
push notification: nothing new for Charen; this is the twenty-second
consecutive run (29-50) at zero drift while the device-pass blocker stays
outside this routine's reach.

Run 49. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-48. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `afbcc47` (run 48's own status commit, pre-push),
no new comments or reviews, `verify` check green (completed 14:10-14:12
UTC today on this same head). Issue #139 (doubling as the Routine status
board) re-checked via `get`/`get_comments`: still the same twelfth
orchestrator entry run 48 already saw (`updated_at` unchanged at
2026-09-16T12:12:50Z), ipad-worker section still "approved, nothing owed,"
blocker still the device pass gated on PR #133 merging behind PR #132's
payments gate (decision 6), decision queue still 9 days untouched. Still
the single 2026-09-07 decision-1 comment, zero reactions, already
implemented. Item 11 (pause or thin worker cadence) unchanged, already
pushed to Charen directly by core-worker's run 42; nothing new to add
here. Re-verified item 7 (`app.json` orientation still `"portrait"`,
`supportsTablet` still `true`). This HANDOFF update is the only change
this run; no production code or plan content changed. No push
notification: nothing new for Charen since run 11's original one, the
board's repeated surfacing, and item 11's direct delivery by core-worker.
This is the twenty-first consecutive run (29-49) at zero drift while the
device-pass blocker stays outside this routine's reach.

Run 48. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-47. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `34d28de` (run 47's own status commit, pre-push),
no new comments or reviews, `verify` check green (re-ran on this same head
at 08:10-08:11 UTC today, completed success). Issue #139 (doubling as the
Routine status board) re-checked via `get`/`get_comments`: twelfth
orchestrator run landed since run 47's check (dated 2026-09-16), but the
ipad-worker section is unchanged in substance: still "approved, nothing
owed," blocker still the device pass gated on PR #133 merging behind PR
#132's payments gate (decision 6), decision queue now 9 days untouched.
Still the single 2026-09-07 decision-1 comment, zero reactions, already
implemented. Item 11 (pause or thin worker cadence) is unchanged and
already pushed to Charen directly by core-worker's run 42; the board notes
it still awaits action, nothing new to add here. Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen since run 11's original one, the board's repeated surfacing, and
item 11's direct delivery by core-worker. This is the twentieth
consecutive run (29-48) at zero drift while the device-pass blocker stays
outside this routine's reach.

Run 47. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-46. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `8c2be96` (run 46's own status commit, pre-push),
no new comments or reviews, `verify` check green. Issue #139 (doubling as
the Routine status board) re-checked via `get_comments`: unchanged since
run 46's check, still the single 2026-09-07 decision-1 comment, zero
reactions, already implemented. Blocker unchanged: the device pass, gated
on PR #133 merging behind PR #132's payments gate (decision 6), none of
which this branch owns or can act on. Re-verified item 7 (`app.json`
orientation still `"portrait"`, `supportsTablet` still `true`). This
HANDOFF update is the only change this run; no production code or plan
content changed. No push notification: nothing new for Charen since run
11's original one and the board's repeated surfacing. This is the
nineteenth consecutive run (29-47) at zero drift while the device-pass
blocker stays outside this routine's reach.

Run 46. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-45. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `95909dc` (run 45's own status commit, pre-push),
no new comments or reviews, `verify` check green. Issue #139 (doubling as
the Routine status board) re-checked via `get`/`get_comments`: unchanged
since run 45's check (`updated_at` still `2026-09-15T12:24:23Z`, still the
eleventh orchestrator run), still the single 2026-09-07 decision-1 comment,
zero reactions, already implemented; the board's own ipad-worker section
still says "approved, nothing owed," blocker unchanged: the device pass,
gated on PR #133 merging behind PR #132's payments gate (decision 6, still
open, 8 days untouched per the board's own count as of its last write).
Decisions 2, 3, 4, 5, 7, 8, 9, 10 also remain unanswered, none of which
this branch owns or can act on. Item 11 (the orchestrator's recommendation
to pause or thin worker cadence while blocked) is unchanged and already
pushed to Charen directly by core-worker's run 42 (per the ops runs.log);
nothing new to add here. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen since run 11's original one, the
board's repeated surfacing, and item 11's direct delivery by core-worker.
This is the eighteenth consecutive run (29-46) at zero drift while the
device-pass blocker stays outside this routine's reach.

Run 45. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-44. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `6f1ad1d` (run 44's own status commit) unchanged
by any code, no new comments or reviews, `verify` check green. Issue #139
(doubling as the Routine status board) re-checked via `get`/`get_comments`:
still the single 2026-09-07 decision-1 comment, zero reactions, already
implemented; the board's own ipad-worker section (last written 2026-09-15,
eleventh orchestrator run, not yet refreshed since) still says "approved,
nothing owed," blocker unchanged: the device pass, gated on PR #133
merging behind PR #132's payments gate (decision 6, still open, 8 days
untouched per the board's own count). Decisions 2, 3, 4, 5, 7, 8, 9, 10
also remain unanswered, none of which this branch owns or can act on.
Item 11 (the orchestrator's recommendation to pause or thin worker
cadence while blocked) is still open on the board too; still a scheduling
decision for Charen, not something this routine can act on for itself.
Re-verified item 7 (`app.json` orientation still `"portrait"`,
`supportsTablet` still `true`). This HANDOFF update is the only change
this run; no production code or plan content changed. No push
notification: nothing new for Charen since run 11's original one and the
board's repeated surfacing, including item 11 which is already reported.
This is the seventeenth consecutive run (29-45) at zero drift while the
device-pass blocker stays outside this routine's reach.

Run 43. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-42. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `957c91c` unchanged, no new comments or reviews,
`verify` check green. Issue #139 (doubling as the Routine status board)
re-checked via `get`/`get_comments`: still the single 2026-09-07
decision-1 comment, zero reactions, already implemented; the board's own
ipad-worker section (last written 2026-09-14, tenth orchestrator run)
still says "approved, nothing owed, 11 consecutive zero-drift runs." Its
listed blocker is unchanged: the device pass, gated on PR #133 merging
behind PR #132's payments gate (decision 6, still open on the board, still
7 days untouched per the board's own count); decisions 2, 3, 4, 5, 7, 8, 9,
10 also remain unanswered, none of which this branch owns or can act on.
Re-verified item 7 (`app.json` orientation still `"portrait"`,
`supportsTablet` still `true`). This HANDOFF update is the only change
this run; no production code or plan content changed. No push
notification: nothing new for Charen since run 11's original one and the
board's own repeated surfacing; this is the fifteenth consecutive run
(29-43) at zero drift while the device-pass blocker stays outside this
routine's reach.

Run 42. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-41. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`, still open, not draft,
`mergeable_state: clean`, base SHA `3890ba1` (main's tip, matching
exactly), head `d6c3d3d` unchanged, no new comments or reviews. Issue #139
(doubling as the Routine status board) re-checked via `get`/`get_comments`:
still the single 2026-09-07 decision-1 comment, zero reactions, already
implemented; the board's own ipad-worker section (last written 2026-09-14)
still says "approved, nothing owed, 11 consecutive zero-drift runs." Its
listed blocker is unchanged: the device pass, gated on PR #133 merging
behind PR #132's payments gate (decision 6, still open on the board, still
7 days untouched per the board's own count as of its last write; decisions
2, 3, 4, 5, 7, 8, 9, 10 also remain unanswered, none of which this branch
owns or can act on). Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen since run 11's original one and the
board's own repeated surfacing; this is the fourteenth consecutive run
(29-42) at zero drift while the device-pass blocker stays outside this
routine's reach.

Run 40. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-39. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `054f49c` unchanged, no new comments or reviews,
`verify` check green. Issue #139 (doubling as the Routine status board)
re-checked via `get`/`get_comments` and its own 2026-09-14 tenth-orchestrator
board body: still the single 2026-09-07 decision-1 comment, zero reactions,
already implemented; the board's own ipad-worker section says "approved,
nothing owed," no new REVIEW FEEDBACK there or in this file. Its listed
blocker is unchanged: the device pass, gated on PR #133 merging behind
PR #132's payments gate (decision 6, still open on the board). Re-verified
item 7 (`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed. No push notification: nothing new for
Charen; this is the twelfth consecutive run (29-40) at zero drift while
the device-pass blocker stays outside this routine's reach.

Run 39. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-38. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `83e790b` unchanged, no new comments or reviews,
`verify` check green. Issue #139 (doubling as the Routine status board)
re-checked via `get_comments` and its own 2026-09-13 board body: still the
single 2026-09-07 decision-1 comment, zero reactions, already implemented;
the board's own ipad-worker section says "approved, nothing owed," no new
REVIEW FEEDBACK there or in this file. Its listed blocker is unchanged:
the device pass, gated on PR #133 merging behind PR #132's payments gate
(decision 6, still open on the board). Re-verified item 7 (`app.json`
orientation still `"portrait"`, `supportsTablet` still `true`). This
HANDOFF update is the only change this run; no production code or plan
content changed. No push notification: nothing new for Charen; this is
the eleventh consecutive run (29-39) at zero drift while the device-pass
blocker stays outside this routine's reach.

Run 38. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-37. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`/`get_check_runs`, still
open, not draft, `mergeable_state: clean`, base SHA `3890ba1` (main's tip,
matching exactly), head `91e5fa3` unchanged, no new comments or reviews,
`verify` check green. Issue #139 (doubling as the Routine status board)
re-checked via `get_comments` and its own 2026-09-13 board body: still the
single 2026-09-07 decision-1 comment, zero reactions, already implemented;
the board's own ipad-worker section says "approved, nothing owed," no new
REVIEW FEEDBACK there or in this file. Its listed blocker is unchanged:
the device pass, gated on PR #133 merging behind PR #132's payments gate
(decision 6, still open on the board). Re-verified item 7 (`app.json`
orientation still `"portrait"`, `supportsTablet` still `true`). This
HANDOFF update is the only change this run; no production code or plan
content changed. No push notification: nothing new for Charen; this is
the tenth consecutive run (29-38) at zero drift while the device-pass
blocker stays outside this routine's reach.

Run 37. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-36. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`, still open, not draft,
`mergeable_state: clean`, base SHA `3890ba1` (main's tip, matching
exactly), head `392e2e2` unchanged, no new comments or reviews. Issue
#139 re-checked via `get_comments`: still the single 2026-09-07 comment,
zero reactions, already implemented; no new REVIEW FEEDBACK there or in
this file. Its listed blocker is unchanged: the device pass, gated on
PR #133 merging. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen; this is the ninth consecutive run
(29-37) at zero drift while the device-pass blocker stays outside this
routine's reach.

Run 36. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. Fresh
`npm ci`, `npx tsc --noEmit` clean. Full suite green on the first pass, no
flake: 122 suites / 1335 tests, zero drift from runs 33-35. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`, still open, not draft,
`mergeable_state: clean`, base SHA `3890ba1` (main's tip, matching
exactly), head `a05ede6` unchanged, no new comments or reviews. Issue
#139 re-checked via `get_comments`: still the single 2026-09-07 comment,
zero reactions, already implemented; no new REVIEW FEEDBACK there or in
this file. Its listed blocker is unchanged: the device pass, gated on
PR #133 merging. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen; this is the eighth consecutive run
(29-36) at zero drift while the device-pass blocker stays outside this
routine's reach.

Run 35. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. `npx tsc
--noEmit` clean from a fresh `npm ci`. Full suite green on the first pass,
no flake: 122 suites / 1335 tests, zero drift from runs 33-34. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`, still open, not draft,
`mergeable_state: clean`, base SHA `3890ba1` (main's tip, matching
exactly), head `720dea1` unchanged, no new comments or reviews. Issue
#139 re-checked via `get_comments`: still the single 2026-09-07 comment,
zero reactions, already implemented; no new REVIEW FEEDBACK there or in
this file. Its listed blocker is unchanged: the device pass, gated on
PR #133 merging. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen.

Run 34. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 33's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. `npx tsc
--noEmit` clean from a fresh `npm ci`. Full suite green on the first pass,
no flake: 122 suites / 1335 tests, zero drift from run 33. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`, still open, not draft,
`mergeable_state: clean`, base SHA `3890ba1` (main's tip, matching
exactly), head `2a55906` unchanged, no new comments or reviews. Issue
#139 re-checked via `get_comments`: still the single 2026-09-07 comment,
zero reactions, already implemented; no new REVIEW FEEDBACK there or in
this file. Its listed blocker is unchanged: the device pass, gated on
PR #133 merging. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen.

Run 33. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 32's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. `npx tsc
--noEmit` clean from a fresh `npm ci`. Full suite green on the first pass,
no flake: 122 suites / 1335 tests, zero drift from run 32. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`, still open, not draft,
`mergeable_state: clean`, base SHA `3890ba1` (main's tip, matching
exactly), head `fc0969c` unchanged, no new comments or reviews. Issue
#139 re-checked via `get_comments`: still the single 2026-09-07 comment,
zero reactions, already implemented; no new REVIEW FEEDBACK there or in
this file. Its listed blocker is unchanged: the device pass, gated on
PR #133 merging. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed. No push
notification: nothing new for Charen.

Run 32. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 31's
check (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. `npx tsc
--noEmit` clean from a fresh `npm ci`. Full suite green on the first pass,
no flake: 122 suites / 1335 tests, zero drift from run 31. PR #133:
re-checked via `get`/`get_comments`/`get_reviews`, still open, not draft,
`mergeable_state: clean`, base SHA `3890ba1` (main's tip, matching
exactly), head `bcd5f83` unchanged, no new comments or reviews. Issue
#139 re-checked via `get_comments`: still the single 2026-09-07 comment,
zero reactions, already implemented; no new REVIEW FEEDBACK there or in
this file. Its listed blocker is unchanged: the device pass, gated on
PR #133 merging. Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed.

Run 31. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 30's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`3890ba1`), so no rebase and no new regression surface this run. No
REVIEW FEEDBACK section addition since run 30's check; issue #139 (last
updated 2026-09-11, before run 30's rebase and re-audit) still shows no
new activity, its listed blocker unchanged: the device pass, gated on
PR #133 merging (which per the board's stated merge order waits behind
core-p3's payments-gated PR #132). `npx tsc --noEmit` clean from a fresh
`npm ci`. Full suite green on the first pass, no flake: 122 suites / 1335
tests, zero drift from run 30. PR #133: re-checked via `get`/`get_comments`,
still open, not draft, `mergeable_state: clean`, base SHA `3890ba1`
(main's tip, matching exactly), head `cac3389` unchanged, no new comments.
Re-verified item 7 (`app.json` orientation still `"portrait"`,
`supportsTablet` still `true`). This HANDOFF update is the only change
this run; no production code or plan content changed.

Run 30. `origin/main` moved 27 commits since run 28's rebase point
(`683ecc3`..`3890ba1`, "the Upcoming wave, eight PRs merged and TestFlight
build 25": a rewrite of Money's Upcoming pane, `components/money/
UpcomingList.tsx` and `MonthDayPicker.tsx` new, `AddUpcomingSheet.tsx` and
`ExpenseRow.tsx` heavily reworked, `Sheet.tsx` and `SpentList.tsx` touched
again, plus a new `utils/textScale.ts` Dynamic Type policy). Rebased onto
it; per the run 8/14 "re-audit, not re-run" rule, did not stop at a clean
replay report. Three conflicts, all mechanical, all resolved keeping both
sides:
- `design/decisions/README.md`'s component index: main added four new
  entries (ExpenseRow, AddUpcomingSheet, MonthDayPicker, UpcomingList),
  this branch's run-5 commit carries OnboardingCarousel; unioned all five,
  nothing dropped.
- `components/money/SpentList.tsx`'s import list: main added
  `CHROME_MAX_FONT_SCALE` (from the new `utils/textScale.ts`) on the same
  line this branch's run-8 commit added `contentColumnStyle`; kept both.
  This landed on run 8's historical commit, so a duplicate `testID` briefly
  reappeared mid-replay (the exact run-14 shape) and was gone again once
  run 14's own later commit reapplied cleanly; confirmed only one
  `testID="spent-list"` remains post-rebase, not assumed from the replay
  succeeding.
- `design/decisions/modules/money.md`: both sides appended dated lines;
  kept both, ordered by date.

Re-audited every surface the incoming wave touched, not just the
conflicts:
- `components/ui/Sheet.tsx`: `panel` still carries `maxWidth:
  layout.contentMaxWidth` and `alignSelf: 'center'` after the wave: no
  change to Sheet's own shape landed here, unlike run 26.
- `components/money/SpentList.tsx`: `listContent` still spreads
  `...contentColumnStyle`; single `testID="spent-list"` confirmed (see
  above).
- `app/(tabs)/money.tsx`: the Upcoming and Habits panes both render through
  the same shared `styles.scrollContent`, which still spreads
  `...contentColumnStyle`; the new `UpcomingList.tsx` component itself owns
  no ScrollView of its own (it renders inside that already-capped parent
  ScrollView, confirmed by direct reading), so it needed no cap of its own.
- `components/money/MonthDayPicker.tsx`: its one `ScrollView` is a
  horizontal day-rail inside `AddUpcomingSheet`, which itself renders
  through the already-capped `<Sheet>` panel; same shape as a paging unit,
  not a case for its own cap.
- `components/money/AddUpcomingSheet.tsx`, `ExpenseRow.tsx`: neither reads
  `useWindowDimensions` directly (confirmed by grep), consistent with run
  26's finding that per-sheet height clamps live in `Sheet.tsx`/
  `utils/keyboard.ts` now, not in individual sheet components.
- Fresh `useWindowDimensions` grep: `CheckInCard.tsx`, `Sheet.tsx`,
  `OnboardingCarousel.tsx`, `AuroraBackground.tsx` (dead code),
  `utils/keyboard.ts`, `utils/useSegmentPager.ts` (all already known), plus
  one new site, `utils/textScale.ts`'s `useAccessibilityTextSize`: reads
  `fontScale` only, same Dynamic-Type shape as `CheckInCard.tsx`, out of
  this plan's scope (not a width/tablet concern).
`npx tsc --noEmit` clean from a fresh `npm ci`. Full suite green on the
first pass, no flake: 122 suites / 1335 tests (up from run 29's 118/1233,
entirely main's own Upcoming-wave test growth, net of nothing removed on
this branch). Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). Pushed (force-with-lease,
history rewritten). PR #133 and issue #139 both re-checked via
`get_comments`/`get_reviews`: no new activity on either since run 28/29,
zero reactions on #139. No REVIEW FEEDBACK found in this file or on the
status board.

Run 29. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 28's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`683ecc3`), so no rebase and no new regression surface this run. `npx tsc
--noEmit` clean from a fresh `npm ci`. Full suite green on the first pass,
no flake: 118 suites / 1233 tests, zero drift from run 28. PR #133: still
open, not draft, `mergeable_state: clean`, base SHA matches main's tip
exactly (`683ecc3`), head commit (`2d43522`) unchanged, its `verify` check
now confirmed green (it was still `in_progress` when run 28 checked
moments after pushing), `get_comments` and `get_reviews` both empty, no
new activity. Issue #139 re-checked via `get_comments`: still the single
2026-09-07 comment, zero reactions, already implemented; no new REVIEW
FEEDBACK there or in this file. Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). This HANDOFF update is
the only change this run; no production code or plan content changed.

Run 28. Addressed the review's 2026-09-11 action item first, per this
file's own "REVIEW FEEDBACK first" instruction. Rebased onto four new main
commits (`683ecc3`, PRs/QA #161-#164: Insights date-window and
category-name/amount-parsing fixes, the Kept-dot/FL-1/scan-link QA pass,
and #163's `app/paywall.tsx` rewrite making all three plans readable at
rest without scrolling). Two real conflicts landed on this branch's own
historical commits during replay, both in `app/paywall.tsx`:
- Run 1's original `scrollContent` cap commit conflicted with #163 on the
  same `paddingTop` line (main changed 8 to 4, this branch's commit had
  added `...contentColumnStyle` next to the original 8). Resolved by
  keeping main's `paddingTop: 8` (the newer, intentional value) and
  keeping this branch's `...contentColumnStyle` spread; nothing from
  either side was dropped.
- Run 14's fixed-footer-cap commit conflicted with #163 on the same
  region: main moved the close button out of a header row into an
  absolutely-positioned pill anchored on the hero (Charen, "unused space,
  lets move the banner to top") and added a `testID="paywall-footer"` to
  the same `footer` View this branch's commit was capping. Resolved by
  keeping both: main's repositioned close button and its `testID`, plus
  this branch's `footer` cap (unaffected, since the `footer` style itself
  was untouched by #163).
Per the run 8/14 "re-audit, not re-run" rule, did not stop at a clean
rebase report; re-checked every surface the review named:
- `app/paywall.tsx`: both capped surfaces (`scrollContent`,
  `footer`) still carry `...contentColumnStyle` after the merge (read the
  full file, not just the diff); `paywallTabletCap.test.tsx` still targets
  the same `paywall-footer` testID and still passes.
- `app/(tabs)/index.tsx` (Kept-dot rework, #164) and `app/(tabs)/
  insights.tsx` (Insights date-window fixes, #161): re-grepped
  `contentColumnStyle` in both files, confirmed all four Today sites
  (`spentScrollContent`, `ribbonWrap`, `listContent`, `keptEmptyContent`)
  and Insights' one site are unchanged and present; neither QA pass
  touched a scroll container or added a new one.
- Fresh `useWindowDimensions` grep: same six files as run 26, plus
  `utils/useSegmentPager.ts` (already known, the shared Today/Money/
  Insights pager mechanism since PR #143; reads `screenWidth` only for
  paging math and each pane's width, the same paging-unit-stays-window-width
  shape as item 4/`OnboardingCarousel`, not a new gap). No new site.
`npx tsc --noEmit` clean from a fresh `npm ci`. Full suite green on the
first pass, no flake: 118 suites / 1233 tests (up from run 27's 114/1174,
entirely main's own four-commit test growth, net of nothing removed on
this branch), including `paywallTabletCap.test.tsx`, `scopeScreen.test.tsx`,
`billsScreen.test.tsx`, and `payoffScreen.test.tsx` (the other three
decision-1 surfaces) all green. Pushed (force-with-lease, history
rewritten): PR #133 now reads `mergeable_state: clean`, base SHA
`683ecc3` (main's tip, matching exactly), head `ed18353`. Its `verify`
check was still `in_progress` moments after the push landed, too soon to
read a result this run; next run confirms it went green before treating
that as settled. `get_comments` and `get_reviews` both empty. Issue #139
re-checked via `get_comments`: still the single 2026-09-07 comment, zero
reactions, already implemented; no new REVIEW FEEDBACK there. Re-verified
item 7 (`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update (committed and pushed separately, after the
rebase push above) is the only other change this run; no plan content
changed, since the re-audit found the merge correct rather than
regressed.

Run 27. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 26's
rebase (`git merge-base routine/ipad origin/main` equals `origin/main`'s
own tip, `9376cc2`), so no rebase and no new regression surface this run.
`npx tsc --noEmit` clean from a fresh `npm ci`. Full suite: 113/114 suites
green on the first pass; `__tests__/door3BreakSheet.test.tsx` timed out
(same shape as runs 13/17/23/24's flake), isolated and re-ran standalone
(19/19 passed), confirming a scheduling flake under parallel load, not a
real regression, no code change needed. 114 suites / 1174 tests overall,
zero drift from run 26. PR #133: still open, not draft, `mergeable_state:
clean`, base SHA matches main's tip exactly (`9376cc2`), head commit
(`86d92b1`) unchanged, its `verify` check green, `get_comments` and
`get_reviews` both empty, no new activity. Issue #139 re-checked via
`get_comments`: still the single 2026-09-07 comment, zero reactions,
already implemented; no new REVIEW FEEDBACK found there or in this file.
Re-verified item 7 (`app.json` orientation still `"portrait"`,
`supportsTablet` still `true`). This HANDOFF update is the only change
this run; no production code or plan content changed.

Run 26. Heaviest rebase since run 14: `origin/main` moved 16 commits
(`bdff4c8`..`9376cc2`), a real UI wave, not docs-only like run 25, including
"sheets: one platform pattern" (`f18ff38`), which rewrote `components/ui/
Sheet.tsx` around a new 80%-of-window keyboard-aware height clamp
(`utils/sheetLayout.ts`, `utils/keyboard.ts`) and a pinned `footer` slot, plus
a Today rewrite (log-in-place, `LeakCard` renamed to `LeakRow`,
`CheckInCard` reworked). One real conflict, in `app/(tabs)/index.tsx`'s
import list (main added `shadows`, this branch's run 1 commit added
`contentColumnStyle`; kept both) and one docs-only conflict in
`design/decisions/components/Sheet.md` (both sides appended dated decision
lines; kept both, ordered by date, no content lost). 33 commits replayed.
Re-audited rather than trusting the clean replay, per the run 8/14 rule,
with extra care given `Sheet.tsx` itself changed shape this time:
- `Sheet.tsx`'s `panel` style still carries `maxWidth: layout.contentMaxWidth`
  and `alignSelf: 'center'` (item 3), and the new `footer` slot renders as a
  child inside that same `panel` node, so it inherits the cap for free; no
  new footer-outside-the-cap gap was introduced.
- The new `utils/sheetLayout.ts` (`sheetMaxHeight`) and `utils/keyboard.ts`
  only read window height and keyboard height, never width, same
  orientation-and-cap-independent shape as item 5's existing height-only
  sites; no change needed.
- Re-grepped `useWindowDimensions`: the main-side rewrite moved the old
  per-sheet `height`-only reads (ExpenseSheet, AddUpcomingSheet,
  PartialSlipSheet, BreakHabitSheet, CategoryTransactionsSheet,
  ReviewQueueSheet, PickOneSheet, AddCategoryModal) out of those components
  entirely, into the new shared `Sheet.tsx` clamp; confirmed each of those
  8 files no longer reads `useWindowDimensions` at all now (checked
  directly, not inferred), so item 5's site list shrank rather than grew.
  The two remaining known sites (`CheckInCard.tsx`, `OnboardingCarousel.tsx`)
  and the one dead one (`AuroraBackground.tsx`) are unchanged; confirmed
  `CheckInCard.tsx` still reads `fontScale` only despite its own rewrite,
  still out of this plan's scope.
- Today's new `ribbonWrapInline` (the door-1 `InfoRibbon`'s new placement,
  inline inside the logged-today block per main's log-in-place rework) sits
  inside the already-capped `spentScrollContent` ScrollView, so it inherits
  the cap from its parent content container and needs none of its own; the
  door3 ribbon's own wrapper (`ribbonWrap`/`door3-ribbon-wrap`), which sits
  outside the scroll content in the Kept pane and therefore does carry its
  own `contentColumnStyle` spread, is untouched and still there.
- The four fixed-footer caps from decision 1 (`ScopeScreen`, `BillsScreen`,
  `app/paywall.tsx`, `PayoffScreen`'s `continueButton`) are all untouched;
  none of those four files were part of this wave's diff.
`npx tsc --noEmit` clean from a fresh `npm ci`. Full suite green on the
first pass, no flake: 114 suites / 1174 tests (up from run 25's 110/1152,
entirely main's own intervening test growth across its 16 commits net of
nothing removed on this branch). PR #133: still open, not draft,
`verify` check green at the pre-rebase head, `get_comments` and
`get_reviews` both empty, no new activity. Issue #139 re-checked via
`get_comments`: still the single 2026-09-07 comment, already implemented;
zero reactions, nothing new. Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). Pushed the rebase
(force-with-lease, history rewritten) plus this HANDOFF update; no plan
content changed, since the audit above found nothing to fix this time.

Run 25. First real rebase since run 14: `origin/main` moved one merge
(`b748ca3`..`bdff4c8`, PR #152, "Today docks, Kept Zero link, zero-state
centring, scroll fade, band removal; build 22"). Checked the diff before
rebasing (`git diff --stat b748ca3..origin/main`): only `CONTENT_LOG.md`,
`agent-memory.md`, `memory.sh`, `primer.md` changed, all docs/memory
housekeeping, zero lines in `app/`, `components/`, `utils/`, or
`constants/`. Per the run 8/14 "re-audit, not re-run" rule this still
means confirming, not assuming: re-grepped `useWindowDimensions` (same 7
real sites, none new) and re-checked that no scroll container or fixed
footer this branch caps lost `contentColumnStyle` in that commit (moot
here since no app file was touched, but checked directly rather than
inferred from the file list alone). Rebase itself was conflict-free (32
commits replayed clean). `npx tsc --noEmit` clean from a fresh `npm ci`.
Full suite green on the first pass, no flake this time: 110 suites / 1152
tests, zero drift from runs 14-24. PR #133: still open, not draft,
`mergeable_state: clean` at the pre-rebase head, `verify` check green;
`get_comments` empty, no new reviews. Issue #139 re-checked via
`get_comments`: still the single 2026-09-07 comment, already implemented
(run 14); zero reactions, nothing new. Checked the Routine status board (also issue #139; its comment thread is
where decisions like the one above get posted) for any REVIEW FEEDBACK
aimed at this branch: the 2026-09-10 board entry for ipad-worker says
"approved, docs-only commits since the last board," no fixes owed, and
repeats the same two carried-forward facts already known here (the device
pass is the one remaining blocker; the guaranteed conflict is at the first
ipad x localization crossing, not yet happened, main still at the old tip
when the board was written). Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). Pushing this rebase
(force-with-lease, history rewritten) plus this HANDOFF update; no
production code changed this run.

Run 24. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean from a fresh `npm ci` this run. Full suite: 109/110 suites green on
the first pass; `__tests__/door3BreakSheet.test.tsx` timed out (same shape
as runs 13/17's flake), isolated and re-ran standalone (17/17 passed),
confirming a scheduling flake under parallel load, not a real regression,
no code change needed. 110 suites / 1152 tests overall, zero drift from
runs 14-23. PR #133: still open, not draft, `mergeable_state: clean`, base
SHA matches main's tip exactly (`b748ca3`), head commit unchanged
(`6fcb6ee`), its `verify` check re-ran today and is green, no new comments
or reviews since the 2026-09-08 review feedback already addressed in
`8a7822e`. Issue #139 unchanged via `get_comments` (Charen's run-14 answer
is still the only comment; already implemented). Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed.

Run 23. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean from a fresh `npm ci` this run. Full suite green: 110 suites / 1152
tests, zero drift from runs 14-22. One flake this run,
`door3BreakSheet.test.tsx`'s auto-open case timing out under full-suite
parallel load; re-ran that file alone and all 17 of its tests passed,
confirming it is not a real regression (not touched by this branch; no
door3/Today changes here). PR #133: still open, not draft,
`mergeable_state: clean`, base SHA matches main's tip exactly (`b748ca3`),
head commit's `verify` check green, no new comments or reviews since the
2026-09-08 review feedback already addressed in `8a7822e`. Issue #139
unchanged via `get_comments` (Charen's run-14 answer is still the only
comment; already implemented). Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). This HANDOFF update is
the only change this run; no production code or plan content changed.

Run 22. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean from a fresh `npm ci` this run. Full suite green on the first pass,
no flake: 110 suites / 1152 tests, zero drift from runs 14-21. PR #133:
still open, not draft, `mergeable_state: clean`, base SHA matches main's
tip exactly (`b748ca3`), head commit's `verify` check green, no new
comments or reviews since the 2026-09-08 review feedback already addressed
in `8a7822e`. Issue #139 unchanged via `get_comments` (Charen's run-14
answer is still the only comment; already implemented). Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed.

Run 21. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean from a fresh `npm ci` this run. Full suite green on the first pass,
no flake: 110 suites / 1152 tests, zero drift from runs 14-20. PR #133:
still open, not draft, `mergeable_state: clean`, base SHA matches main's
tip exactly (`b748ca3`), head commit's `verify` check green, no new
comments or reviews since the 2026-09-08 review feedback already addressed
in `8a7822e`. Issue #139 unchanged via `get_comments` (Charen's run-14
answer is still the only comment; already implemented). Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed.

Run 20. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean from a fresh `npm ci` this run. Full suite green on the first pass,
no flake: 110 suites / 1152 tests, zero drift from runs 14-19. PR #133:
still open, not draft, `mergeable_state: clean`, base SHA matches main's
tip exactly (`b748ca3`), head commit's `verify` check green, no new
comments or reviews since the 2026-09-08 review feedback already addressed
in `8a7822e`. Issue #139 unchanged via `get_comments` (Charen's run-14
answer is still the only comment; already implemented). Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed.

Run 19. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean from a fresh `npm ci` this run. Full suite green on the first pass,
no flake: 110 suites / 1152 tests, zero drift from runs 14-18. PR #133:
still open, not draft, `mergeable_state: clean`, base SHA matches main's
tip exactly (`b748ca3`), head commit's `verify` check green, no new
comments or reviews since the 2026-09-08 review feedback already addressed
in `8a7822e`. Issue #139 unchanged via `get_comments` (Charen's run-14
answer is still the only comment; already implemented). Re-verified item 7
(`app.json` orientation still `"portrait"`, `supportsTablet` still
`true`). This HANDOFF update is the only change this run; no production
code or plan content changed.

Run 18. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean from a fresh `npm ci` this run. Full suite green on the first pass
this time, no flake: 110 suites / 1152 tests, zero drift from runs 14-17.
PR #133: still open, not draft, `mergeable_state: clean`, base SHA matches
main's tip exactly, head commit's `verify` check green, no new comments or
reviews since the 2026-09-08 review feedback already addressed in
`8a7822e`. Issue #139 unchanged (Charen's run-14 answer is still the only
comment; already implemented). Re-verified item 7 (`app.json` orientation
still `"portrait"`, `supportsTablet` still `true`). This HANDOFF update is
the only change this run; no production code or plan content changed.

Run 17. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean from a fresh `npm ci` this run. Full suite: 109/110 suites green on
the first pass; `__tests__/door3BreakSheet.test.tsx` timed out (same shape
as run 13's flake), isolated and re-ran standalone (17/17 passed), so
confirmed a scheduling flake under parallel load, not a real regression, no
code change needed. 110 suites / 1152 tests overall, zero drift from runs
14-16. PR #133: still open, not draft, `mergeable_state: clean`, base SHA
matches main's tip exactly, head commit's `verify` check green, no new
comments or reviews since the 2026-09-08 review feedback already addressed
in `8a7822e`. Issue #139 unchanged (Charen's run-14 answer is still the
only comment; already implemented). Re-verified item 7 (`app.json`
orientation still `"portrait"`, `supportsTablet` still `true`). This
HANDOFF update is the only change this run; no production code or plan
content changed.

Run 16. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean; full suite green with zero drift from runs 14-15 (110 suites / 1152
tests, from a clean `npm ci` this run). PR #133: still open, not draft,
`mergeable_state: clean`, base SHA matches main's tip exactly, head
commit's `verify` check green, no new comments or reviews since the
2026-09-08 review feedback already addressed in `8a7822e`. Issue #139
unchanged (Charen's run-14 answer is still the only comment; already
implemented). Re-verified item 7 (`app.json` orientation still
`"portrait"`, `supportsTablet` still `true`). This HANDOFF update is the
only change this run; no production code or plan content changed.

Run 15. Verified per this file's own COMPLETE instruction: plan fully
checked, nothing new to do. `origin/main` has not moved since run 14's
rebase (`git merge-base --is-ancestor origin/main routine/ipad`, still at
`b748ca3`), so no rebase and no new regression surface. `npx tsc --noEmit`
clean; full suite green with zero drift from run 14 (110 suites / 1152
tests). PR #133: still open, not draft, `mergeable_state: clean`, base SHA
matches main's tip exactly, head commit's `verify` check green, no new
comments or reviews. Issue #139 unchanged (Charen's run-14 answer is still
the only comment; already implemented). Re-verified item 7 (`app.json`
orientation still `"portrait"`, `supportsTablet` still `true`). This
HANDOFF update is the only change this run; no production code or plan
content changed.

Run 14. Two things changed since run 13, and this run addresses both.
`origin/main` moved 6 commits (`a51ce4a` to `b748ca3`); rebased onto it (a
heavier rebase than runs 5-8, more below) and, per the run 7/8 "re-audit,
not re-run" rule, re-checked every path the incoming commits touched
rather than trusting a clean replay. **Decision 1 (issue #139, in the
`habitcents-mobile-app` repo, not the ops repo as earlier runs' shorthand
implied) landed:** Charen answered on 2026-09-07
(`#issuecomment-5575881737`, found by re-checking `get_comments`, not the
cached issue body): fixed footer/CTA bars outside the capped scroll DO cap
at 600pt too, matching the scroll column. That was the one thing blocking
item 6 and, with it, the whole plan; item 6 is now fully checked (see
PLAN.md and Completed below). `npx tsc --noEmit` clean; full suite green,
110 suites / 1152 tests (up from 106/1130 at run 13; see Completed below
for the breakdown between main's own intervening test growth and this
run's own additions). Re-verified item 7 unchanged (`app.json` still
`"orientation": "portrait"`, `"supportsTablet": true`).

**The plan is now fully checked.** Marked PR #133 ready for review this
run (it was the last step this routine owns; the device pass above is
work for a human with hardware, not this routine). Logged `ok` in
`docs/runs.log` in the ops repo.

## Completed

- Runs 1-4: plan items 1, 2 (all of a-e), 3, 4, and a first pass at 6. See
  PLAN.md for detail; unchanged this run.
- Run 5, REVIEW FEEDBACK (addressed first, per this file's own instruction):
  the orchestrator's 2026-09-05 review of runs 1-4 found the layout work
  itself sound but flagged that design decision records had not been
  updated alongside it, per `design/decisions/README.md`'s same-commit
  rule. Added, in one docs-only commit:
  - `design/decisions/components/Sheet.md`: dated line for the 600pt panel
    cap and centering, and why phones are unaffected.
  - `design/decisions/modules/today.md`: dated line for the pane content
    caps (all five paths) and the item 4 conclusion that the pager's paging
    unit stays window width by design.
  - `design/decisions/components/OnboardingCarousel.md`: new file, first
    recorded decision for this component (the `beat`/`beatContent` split
    and why `beat` must stay window width), and added to the
    `design/decisions/README.md` index.
  - `design/PATTERN_VOCABULARY.md` Surfaces section: added the readable
    column rule (cap via `contentColumnStyle` spread at the call site;
    reach for a wrapping View only when the target style merges margin onto
    a background-carrying root; paging units are never capped).
  No code changed in this commit; tsc and the full suite were still run and
  are green, per the standing rule.
- Run 5, plan item 5 (the `useWindowDimensions` audit): done, no code
  change needed anywhere. Re-grepped the repo (19 files matched; docs/plan/
  test files and the two already-resolved sites, `app/(tabs)/index.tsx`
  (item 4) and `OnboardingCarousel.tsx` (item 2c), set aside, leaving 7 real
  sites plus the two already-known non-issues):
  - `AddCategoryModal`, `PartialSlipSheet`, `AddUpcomingSheet`,
    `ExpenseSheet`, `BreakHabitSheet`, `CategoryTransactionsSheet`,
    `ReviewQueueSheet`, `PickOneSheet` all read `height` only (never
    `width`), for a `maxHeight: height * 0.82` or `* 0.86` keyboard-clearing
    cap on the sheet body. That is orientation- and device-size-agnostic
    math; it does not interact with `Sheet`'s width cap (item 3) and needed
    no change.
  - `AuroraBackground.tsx` reads `width` to size a full-bleed gradient, but
    confirmed (grep for its import) that it renders nowhere in the app: it
    is unreferenced dead code, the retired welcome screen's documented
    revert path per `PATTERN_VOCABULARY.md`. No live tablet surface to fix.
  - `CheckInCard.tsx` reads `fontScale`, confirmed out of this plan's scope
    (Dynamic Type, not window sizing).
  Did not decide the fixed-footer cap question as part of this audit, per
  the review feedback below (it is on the status board for Charen now).
- Run 6: no plan work was actionable. Rebase was a no-op, no new REVIEW
  FEEDBACK was present, and item 6 (the only unchecked line besides the
  standing item 7 re-verification) stays blocked on the footer-cap
  decision, confirmed still unanswered on `#139` (see DECISIONS NEEDED).
  Re-ran tsc and the full suite to confirm the branch is still green with
  zero drift; both are unchanged from run 5. Re-verified item 7 (`app.json`
  orientation still `"portrait"`).
- Run 7: rebased onto 12 new main commits (zero-state art, ActionDock/dock
  unification, tab-selection and toast fixes, design record catch-up),
  resolving a real conflict in `app/(tabs)/index.tsx` (import line plus
  three `paddingBottom` sites) and two docs files
  (`design/decisions/README.md`, `design/decisions/modules/today.md`)
  exactly per the resolution guidance run 5 had left recorded in
  today.md's Open section; that note is now removed since this run is the
  merge it was written for. No plan item's code changed (nothing new was
  unblocked by main's incoming work), but re-audited rather than assumed:
  re-grepped for `useWindowDimensions` (still the same 7 real sites, none
  new) and re-checked that every scroll container main touched still
  carries `contentColumnStyle` where item 2 put it, and that the item 2e
  wrappers (`door3-ribbon-wrap`, `kept-hero-cap-wrap`) survived the
  ActionDock/zero-state rework around them. Confirmed item 6 still
  soft-blocked: `#139` still open, zero comments. Re-verified item 7.
- Run 8: rebased onto 5 new main commits (PR #143's segment-pager wave,
  PRs #142/#145's leak-finder gating, the #146 navigation-wave merge).
  Unlike runs 5-7, the conflicts landed on two of this branch's own
  historical commits during replay, not just the tip: run 1's original
  commit (pure import-list conflicts in `index.tsx`/`insights.tsx` from
  main's new `useSegmentPager`/`hapticError` imports landing on the same
  line as this branch's `contentColumnStyle` import) and run 5's
  design-record commit (`README.md`/`today.md` index and Iterations
  entries, resolved by union as before). Re-audited after the rebase
  rather than trusting it was clean, per the orchestrator's instruction,
  and found a real regression this time, not just a clean pass: main's
  same-day extraction of Money's Spent pane into
  `components/money/SpentList.tsx` dropped the tablet cap that pane's
  content had carried since item 2b, because the new file's `listContent`
  style was rebuilt without carrying `contentColumnStyle` over. Fixed,
  documented in `design/decisions/modules/money.md` (checked
  `SegmentPager.md` first; the fix belongs in the per-surface module file,
  not the pager-mechanism file), and pinned with a new jest case in
  `__tests__/spentList.test.tsx` (added a `testID` to `SpentList`'s
  `SectionList` for the query). Today's and Insights' panes were not
  extracted by that same refactor; confirmed by direct reading, not
  assumed. Checked `#139` again for the footer-cap decision: still open,
  zero comments. tsc clean, full suite green (106 suites, 1130 tests, up
  from 106/1129 from this run's one new test).
- Run 9: no plan work was actionable beyond bookkeeping. `origin/main` had
  not moved since run 8 (both branches already at the same tip commit
  before this run started), so there was nothing to rebase and no new
  regression surface to re-audit; run 8's `SpentList` fix already covers
  everything currently on main. Re-ran tsc and the full suite from a clean
  install to confirm the branch is still green with zero drift from run 8
  (106 suites / 1130 tests, matching exactly). Re-checked `#139`: still
  open, zero comments, now idle 4 runs. Re-checked PR #133: still draft,
  base SHA matches current main's tip exactly, latest commit's CI check
  green. Re-verified item 7 (`app.json` orientation still `"portrait"`,
  `supportsTablet` still `true`). Marked PLAN.md's item 2 parent checkbox
  complete: its five sub-items (2a-2e) have all been done since run 5, and
  the parent line had simply never been checked off; the fixed-footer gap
  it might be confused with is item 6's scope, not item 2's, so this is a
  pure bookkeeping fix with no behavior change.
- Run 10: no plan work was actionable and no bookkeeping gap remained
  (run 9 already closed the one that existed). `origin/main` had still not
  moved since run 8, confirmed the same way as run 9
  (`git merge-base --is-ancestor origin/main routine/ipad`), so there was
  nothing to rebase and no new regression surface. Re-ran tsc and the full
  suite from a clean install: still green, 106 suites / 1130 tests, zero
  drift from runs 8 and 9. Re-checked `#139` via `get_comments` (not just
  the cached issue body, to rule out a comment landing without updating
  the body): still zero comments, now idle 5 runs. Re-checked PR #133:
  still draft, base SHA matches current main's tip exactly. Re-verified
  item 7 (`app.json` orientation still `"portrait"`, `supportsTablet`
  still `true`). This HANDOFF update is the only change this run.
- Run 11: same shape as run 10, confirmed the same way (`git merge-base
  --is-ancestor origin/main routine/ipad`; `get_comments` on `#139`; PR
  #133 base SHA against main's tip). `origin/main` still has not moved
  since run 8 (four runs now with zero drift: 106 suites / 1130 tests,
  tsc clean, matching runs 8, 9 and 10 exactly). Issue #139 is still
  unanswered, zero comments, now idle 6 runs since run 5 first surfaced it
  on the board. Item 7 re-verified unchanged. Per run 10's own Blockers
  note, this is the point to stop quietly repeating "ok": named the idle
  stream explicitly below and sent one push notification to Charen
  directly from this run, since no prior ipad-worker run has sent one
  itself (the one prior notification, 2026-09-06, came from the
  orchestrator's board update, not this routine). This HANDOFF update is
  the only change this run; no production code or plan content changed.
- Run 12: same shape as runs 9-11, confirmed the same way (`git merge-base
  --is-ancestor origin/main routine/ipad`; `get_comments` on `#139`; PR
  #133 base SHA and check runs against main's tip). `origin/main` still
  has not moved since run 8 (five runs now with zero drift: 106 suites /
  1130 tests, tsc clean, matching runs 8-11 exactly). Issue #139 is still
  unanswered, zero comments, zero reactions, now idle 7 runs since run 5
  first surfaced it on the board (2026-09-05). Item 7 re-verified
  unchanged. Per run 11's own instruction, did not send a second push
  notification this run (already surfaced twice: orchestrator's board
  update, run 11's direct notification); kept naming the idle count
  instead. This HANDOFF update is the only change this run; no production
  code or plan content changed.
- Run 13: same shape as runs 9-12, confirmed the same way (`git merge-base
  --is-ancestor origin/main routine/ipad`; `get_comments` on `#139`; PR
  #133 base SHA and check runs against main's tip). `origin/main` still
  has not moved since run 8 (six runs now with zero drift once the flake
  below is set aside: 106 suites / 1130 tests, tsc clean, matching runs
  8-12 exactly). One test, `__tests__/door3BreakSheet.test.tsx`, timed
  out on the full suite's first pass this run; isolated it (17/17 passed
  standalone) and re-ran the full suite clean, confirming a one-off
  scheduling flake under parallel load rather than a real regression, so
  no code change was needed and none was made. Issue #139 is still
  unanswered, zero comments, now idle 8 runs since run 5 first surfaced it
  on the board (2026-09-05). Item 7 re-verified unchanged. Did not send
  another push notification this run: only two runs have passed since run
  11's direct notification, short of the "five-plus runs with zero
  engagement" bar run 12 itself set for reconsidering; kept naming the
  idle count instead. This HANDOFF update is the only change this run; no
  production code or plan content changed.
- Run 14: rebased onto 6 new main commits (`a51ce4a`..`b748ca3`); heaviest
  re-audit yet, two real findings, both fixed and tested in this run's
  commits:
  1. **`KeptHero` left the Today Kept pane entirely.** Main's 2026-09-07
     decision (Charen, "no band above the list") removed the whole
     "Kept so far" band this branch's item 2e had wrapped in
     `keptHeroCapWrap`. The rebase conflict landed exactly on that code
     (`app/(tabs)/index.tsx`'s Kept-pane JSX and its style block); resolved
     by taking main's side (no band renders there at all) and deleting the
     now-dead `keptHeroCapWrap` style, its wrapping View, and the one jest
     case in `todayQuoteRibbonPlacement.test.tsx` that asserted on it. The
     door3 ribbon and its `ribbonWrap`/`door3-ribbon-wrap` cap are
     untouched, since the ribbon still renders. `design/decisions/modules/
     today.md` updated in the same commit: the run 5 decision line amended
     to note `keptHeroCapWrap` is gone with the band, and the Open-section
     note that used to warn about this exact merge is closed out, both per
     the same-commit rule. `KeptHero` itself is not dead: it still renders,
     already capped by `body`'s `contentColumnStyle`, on the Leak Scan
     payoff screen (`components/leak-scan/PayoffScreen.tsx`), confirmed by
     direct reading, not assumed.
  2. **A duplicate `testID` on `SpentList`'s `SectionList`, a real
     `tsc` error (`TS17001`), not just a style regression.** Main's
     own PR (commit `5971e09`, the same day as run 8's fix) gave the same
     element a second, real `testID="spent-list"` for its own
     `emptyStateGeometry.test.tsx`, landing on top of this branch's
     `testID="spent-section-list"` from run 8. Neither commit conflicted
     during the rebase (they touched adjacent, not overlapping, lines), so
     this only surfaced via `tsc --noEmit`, not the rebase itself; a clean
     rebase is still not proof of no regression, same lesson as run 8's
     `contentColumnStyle` drop. Fixed by dropping this branch's redundant
     `testID` and pointing `spentList.test.tsx`'s query at `spent-list`
     instead. While in there, also fixed a second, latent bug in that same
     test: it asserted on `Object.assign({}, list.props.contentContainerStyle)`
     without flattening the array-valued style first (`contentContainerStyle`
     is `[styles.listContent, ...]`), so `Object.assign` on the raw array
     produced numeric keys, not merged properties; the assertion happened
     to still pass before only because it read a testID whose element
     resolution differed enough not to expose it. Switched to
     `StyleSheet.flatten(...)`, matching how `tabletLayout.test.tsx`'s own
     `flattenStyle` helper already does this correctly elsewhere. Also
     caught and fixed a matching import-list conflict in `money.tsx`
     (dropped `spacing` from the merged import by mistake while resolving
     the rebase, caught immediately by the same `tsc` run, not left for a
     later run).
  3. **Decision 1 (issue #139) landed and was implemented.** Charen's
     comment (2026-09-07, `#issuecomment-5575881737`): fixed footer/CTA
     bars cap at 600pt too. Applied the same `...contentColumnStyle`
     spread item 2b/2e already established for `ribbonWrap`
     (paddingHorizontal-based, no wrapping View needed) to `ScopeScreen`'s
     `footer`, `BillsScreen`'s `footer`, and `app/paywall.tsx`'s `footer`;
     `PayoffScreen`'s Continue button, a sibling of the already-capped
     `body` rather than a child of it, got a new `continueButton` style
     via its `style` prop instead. Each of the four got a dedicated jest
     case, matching the items 2c/2e/run 8 precedent of a per-surface
     structural test: extended `scopeScreen.test.tsx`, `billsScreen.test.tsx`,
     and `payoffScreen.test.tsx` (all three already had the provider/mock
     wiring); added `__tests__/paywallTabletCap.test.tsx` as a new,
     minimal harness, since no prior test rendered `app/paywall.tsx` at
     all (mocks `expo-router` and `@/utils/analytics`, mirrors
     `profile.test.tsx`'s provider wiring, scoped to only the one thing
     this plan item needs). No design/decisions module file exists for the
     Leak Scan flow or the paywall (that catalog only covers
     `today`/`drawers`/`money`/`insights`/`categories` and their listed
     components; item 2d's original cap on these same screens did not add
     one either), so none was added here, consistent with that precedent.
     PLAN.md's item 6 marked checked off with the full detail above.
  tsc clean; full suite green, 110 suites / 1152 tests. Two steps: the
  rebase alone (before any of this run's own code changes) brought the
  baseline from run 13's 106 suites / 1130 tests to 109 suites / 1148
  tests, almost entirely main's own intervening test growth across its 6
  commits, net of the one `KeptHero` case this run deleted. This run's own
  decision-1 work then added one new suite (`paywallTabletCap.test.tsx`)
  and four new cases (one each in `scopeScreen.test.tsx`,
  `billsScreen.test.tsx`, `payoffScreen.test.tsx`, and the new paywall
  file), landing at 110 suites / 1152 tests. Re-verified item 7
  unchanged. **Marked PR #133 ready for review** (`draft: false`) and
  wrote this file's COMPLETE section, per the routine's own completion
  instructions, since the plan is now fully checked and run 13's own
  stated condition for doing so ("either that decision lands and its
  follow-up test work is done") is met.

## Next

The plan is fully checked; there is no more plan-driven work queued. What
carries forward:

1. Watch PR #133 for review activity now that it is out of draft (CI,
   review comments) the way any ready PR is watched, per the routine's own
   PR-activity rules. This is now the routine's main job on this branch
   until it merges.
2. Every run, still check whether `origin/main` has moved before deciding
   how much re-audit is owed, exactly as items 1-3 below (run 8 and run 14
   both prove a clean rebase is not proof nothing regressed: run 8 found a
   dropped cap, run 14 found both a dropped cap AND a duplicate testID from
   two independent same-day commits). If it has moved, re-audit: grep
   `useWindowDimensions` fresh, check every scroll container and fixed
   footer main touched still carries `contentColumnStyle`, and re-run tsc
   even when the rebase itself reports zero conflicts, since run 14's
   testID collision proves a clean rebase can still hide a real compile
   error until tsc actually runs.
3. Re-verify item 7 (`app.json` orientation) every run regardless of
   whether anything else changed.
4. If a device pass lands (see DEVICE PASS NEEDED above) and finds a real
   visual problem, that becomes new plan work; otherwise this branch's
   remaining path to ship is PR review, an `eas build` (native fingerprint
   changed, `ios.supportsTablet: true`, not an OTA-eligible change), and
   the device pass itself.

## Blockers

None. The one real blocker this branch carried (decision 1 on `#139`) is
resolved as of this run. The device pass is not logged as a blocker in the
runs.log sense: it does not stop this routine from doing bounded,
verifiable work (rebases, re-audits, PR maintenance), it is a precondition
for shipping, already named explicitly in DEVICE PASS NEEDED above so it
stays visible without inflating every run's Status into a repeated
escalation now that the actual decision blocker is gone.

## DECISIONS NEEDED

None open. Decision 1 (fixed footer/CTA bars cap at 600pt too) was the
only one this branch raised; Charen answered it 2026-09-07
(`#issuecomment-5575881737`) and this run implemented and tested the
answer (see Completed, run 14). No new decisions raised this run.

## REVIEW FEEDBACK

2026-09-08, orchestrator, runs 14-15 reviewed (through 506e56b).
**Approved, no fixes owed.** The decision-1 footer caps follow the
established contentColumnStyle spread pattern correctly (ScopeScreen,
BillsScreen, paywall via the spread; PayoffScreen's Continue via its
style prop, rightly, since it is a sibling of the capped body), each
with a pinning test, and the new paywallTabletCap.test.tsx harness is
appropriately minimal. The run 14 post-rebase re-audit is commended:
both regressions were real (the dropped `spacing` import, the duplicate
SectionList testID), and catching the latent bare-Object.assign flatten
bug in spentList.test.tsx's assertion while fixing it is exactly what
the re-audit rule exists for. Marking PR #133 ready for review was
right; the plan is complete and only the device pass remains.

One cross-stream note, no action on this branch: paywallTabletCap,
scopeScreen, billsScreen and payoffScreen test files will need
LocaleProvider once `routine/localization`'s conversions cross (their
useStrings() hook throws without a provider). That fix belongs to the
localization stream's standing sweep and is recorded in its HANDOFF.

2026-09-05, orchestrator, runs 1-4 reviewed (57321e3..963559d). The layout
work is sound: the wrapper-not-container reasoning on `keptHeroCapWrap` and
`beatContent` is correct and well documented in code, and pinning the
pane-stays-window-width invariant in tests was the right call. One
house-rule gap to fix next run, before or alongside item 5:

- Design decision records were not updated with the code
  (design/decisions/README.md requires updating them in the same commit
  that touches a surface). Add, in one commit on this branch:
  - `design/decisions/components/Sheet.md`: one dated line for the 600pt
    cap + centering on the sheet panel and why phones are unaffected.
  - `design/decisions/modules/today.md`: one dated line for the pane
    content caps (spentScrollContent, listContent, keptEmptyContent,
    ribbonWrap, keptHeroCapWrap) and the item 4 conclusion that the
    pager's paging unit stays window width by design.
  - `design/decisions/components/OnboardingCarousel.md`: new file (first
    recorded decision about this component): the beat/beatContent split
    and why the beat itself must stay window width.
  - `design/PATTERN_VOCABULARY.md` (Surfaces section): add the readable
    column rule: scroll content caps at `layout.contentMaxWidth` (600pt)
    via `contentColumnStyle`; use a wrapping View instead of a spread when
    the target style merges margin onto a background-carrying root; paging
    units are never capped, only the content inside them. The pattern
    ships with this branch, so its vocabulary entry belongs in this
    branch, not on main ahead of it.
- The fixed-footer cap question (ScopeScreen, BillsScreen, paywall,
  PayoffScreen Continue) is now on the status board's DECISIONS NEEDED
  queue for Charen; no need to re-raise it, and do not decide it in the
  item 5 audit.

Addressed run 5 (2026-09-05): all four doc updates landed in one commit
before any other run 5 work, per the instruction above. See Completed
above for detail. The footer question was left alone as instructed.

2026-09-06, orchestrator, runs 5-7 reviewed. **Approved, no code fixes.**
The design records and the PATTERN_VOCABULARY.md readable-column entry are
exactly what was owed, the item 5 audit's reasoning (height-only reads,
AuroraBackground dead code, fontScale out of scope) is sound, and the run 7
conflict resolution in `app/(tabs)/index.tsx` was verified correct against
both parents. Two rebase items for next run:

1. Main moved again after your run 7 push: PR #143 extracted the Today
   pager into `utils/useSegmentPager.ts` and gave Money and Insights the
   same segment-swipe treatment, rewriting exactly the three tab screens
   this branch caps (`index.tsx` -141 lines, `insights.tsx`, `money.tsx`)
   plus `constants/theme.ts`, which both sides touch. Expect a heavier
   conflict than run 7's. After rebasing, apply your own run 7 "re-audit,
   not re-run" rule with extra care: each new pager pane on all three
   screens must still cap its scroll content, and the paging unit must
   stay window width (the invariant your tests pin). Main also added
   `design/decisions/components/SegmentPager.md`; if the cap interacts
   with the pager panes, add the dated line there, same-commit rule.
2. PRs #142/#145 wrapped the leak finder as coming soon behind a
   SCAN_FLOW_ENABLED gate. Your Leak Scan caps (item 2d) stay compiled
   and correct; nothing to do, just do not be surprised that the flow is
   dormant when re-auditing.

The footer-cap decision remains with Charen on #139; it has now been
re-surfaced in today's board update and push notification.

Addressed run 8 (2026-09-06): item 1's rebase and re-audit done as
instructed, with the conflicts landing one commit earlier than expected
(run 1's own commit, not just the tip) since main's segment-pager wave
touched the same import lines this branch's very first commit had
touched. The re-audit found a real gap this time (Money's `SpentList.tsx`
extraction dropping the cap, see Status/Completed above), fixed and
tested in one commit. Checked `SegmentPager.md` per item 1's instruction;
concluded the cap doesn't belong there (it documents the pager mechanism,
not per-screen content styling) and put the decision line in `money.md`
instead, matching where Today's own cap decisions already live in
`today.md`. Item 2 (the leak-finder gate) needed no action, confirmed.

2026-09-07, orchestrator, runs 8 to 11 reviewed (f1061f0..3994950).
**Approved, no fixes owed.** Run 8's SpentList catch is exactly what the
post-rebase re-audit discipline exists for: main's pager extraction
dropped the cap silently and a clean rebase would never have shown it.
The jest case pinning contentContainerStyle and the same-commit money.md
record are both right. Runs 9 to 11's idle verification posture is
correct while the footer-cap decision sits with Charen; it has been
re-surfaced on #139 again today.

Coordination notes, no action until a merge or rebase makes them live:

- routine/localization has now converted components/money/SpentList.tsx
  and components/onboarding/OnboardingCarousel.tsx to useStrings() (plus
  a buildBeats(catalog) refactor of BEATS on the carousel). Whichever
  branch crosses the other's merge keeps both changes and re-verifies
  the pair: the 600pt cap survives AND the conversion survives, with the
  carousel's paging unit still window width. Not yet crossed as of run 14
  (this branch's SpentList.tsx still has no useStrings() conversion).
- app/profile.tsx is now touched by all three routine branches (your
  cap, localization's conversion, core's share card row). Keep the union
  when its turn comes.

No orchestrator review recorded yet for runs 12-14 as of this writing;
run 14 marked the PR ready for review on its own authority per the
routine's own completion instructions once the plan was fully checked, not
pending a further review round on this branch.

2026-09-11, orchestrator, runs 16-27 reviewed (through 26b3699; runs
16-25 were docs-only status commits, runs 25-27 also carried the
rebases). **Approved, no fixes owed.** The run 26 re-audit of main's
Sheet.tsx rewrite was independently verified: the 600pt cap
(`width: '100%'`, `maxWidth: layout.contentMaxWidth`,
`alignSelf: 'center'`) is present on the rewritten panel style in
`components/ui/Sheet.tsx` with its rationale comment intact, and the
pinned footer slot renders inside that capped panel, so the audit's
"footer inherits the cap for free" claim holds. Good discipline
keeping runs 16-25 to one honest status line each instead of
manufacturing work.

Action for the next run, a real one: main gained four QA merges after
run 26's rebase (#161-#164, main now 683ecc3), and #163 rewrote
`app/paywall.tsx`'s layout (all three plans readable at rest). That is
one of your four decision-1 fixed-footer cap surfaces, so the next
rebase must re-audit the paywall cap against the new layout and re-run
`paywallTabletCap.test.tsx`, not just replay commits. `app/(tabs)/
index.tsx` (Kept-dot rework) and `app/(tabs)/insights.tsx` (`?view=`
param) also moved; both are capped surfaces, so include them in the
re-grep. Expect `logInPlace.test.tsx` and `todayQuoteRibbonPlacement.
test.tsx` growth from the QA wave in the suite counts.

Also noting for the device pass whenever it happens: TestFlight build
24 went out 2026-09-11 from main 683ecc3, which does not carry this
branch, so build 24 cannot serve as the iPad pass build. The pass
still needs PR #133 merged first and a build after that.

Addressed run 28 (2026-09-11): rebased onto 683ecc3 and re-audited the
paywall cap against #163's rewrite, plus re-grepped `index.tsx` (Kept-dot,
#164) and `insights.tsx` (#161) as instructed. All four decision-1 footer
caps and both paywall scroll/footer caps survive intact; see Status above
for the two conflicts (both mechanical, both resolved keeping both sides)
and the full re-audit detail. No new plan work; tsc and the full suite
(118/1233) are green.
