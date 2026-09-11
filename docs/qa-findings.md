# QA findings

Running list from the daily QA loop. One entry per finding. Open items are fixed in
severity order; fixed items move down with the date and the PR that closed them.

Severity: `high` (data loss, crash, money or a core loop broken), `medium` (a flow
works but wrongly or confusingly), `low` (polish).

Categories: `functional`, `logical`, `ux`, `technical`, `telemetry`, `security`.

## Open

- [ ] (2026-09-10) [medium] [logical] Categories and category detail double-count an expense that has a custom categoryId and a stored value of "Other"
  - Repro: 1. Have a custom category, e.g. `{ id: 'cat-x', name: 'Streaming' }`. 2. Log an expense against it, which stores `categoryId: 'cat-x'` with `category: 'Other'`. 3. Open `habitcents://categories` and read both the Streaming and the Other monthly totals.
  - Expected / Actual: Expected the expense to count once, under Streaming. Actual it counts under both. `expenseBelongsToCategory` is an OR ladder (`categoryId === category.id || category === category.name || ...`), and both screens call it inside a per-category `.filter()`, so the row satisfies the id rung for Streaming and the name rung for the default Other and lands in both buckets. Insights no longer has this defect: PR #161 made the rollup resolve each expense to exactly one category before grouping, so Insights and Categories now disagree on the same numbers.
  - Evidence: `utils/expenseCategory.ts:64-72`; `app/(tabs)/categories.tsx:134-136`; `app/category/[id].tsx:65`. Found by the developer agent while implementing PR #161, not separately reproduced on device.

- [ ] (2026-09-10) [medium] [telemetry] `coach_moment_shown` FL-1 fires and burns the once-ever flag while the card is never rendered
  - Repro: 1. Wipe storage, apply the returning-user persona (or any state where a leak or breaking habit exists and `firstLogShown` is false). 2. Cold-launch. 3. Read the Metro log, then open `habitcents://?view=kept`.
  - Expected / Actual: Expected the event to fire only when the FL-1 card is actually shown. Actual the effect fires on `expenses.length > 0` alone, at screen level, and writes `firstLogShown: true` to disk; the card only renders inside the Kept pane's `isEmpty` branch, and the Kept pane had a Leaks section, so nothing was shown. The flag is then spent and the card can never appear. Real-user path: onboarding Door 3 seeds a habit, which makes `sections` non-empty on the very first log.
  - Evidence: log line `[analytics:dry-run] coach_moment_shown {"card_id": "FL-1", "trigger": "first_log"}`; fire site `app/(tabs)/index.tsx:543-550`; render site `app/(tabs)/index.tsx:1033,1060-1064`; `utils/coachMoments.ts:106-113`. **Report only, analytics contracts are human-gated.**

- [ ] (2026-09-10) [medium] [functional] A deep link walks straight past the onboarding gate on a never-onboarded install
  - Repro: 1. Wipe `RCTAsyncLocalStorage_V1` and relaunch, landing on the onboarding carousel. 2. `xcrun simctl openurl <UDID> "habitcents://insights"`.
  - Expected / Actual: Expected the gate to hold. Actual the tabs render immediately, with full access to Today, Money, Insights, Categories, Profile and the paywall. `hasOnboarded` is still false, so the next cold start throws the user back to the carousel, and Door 1's "log your first expense" beat runs against data they already entered. The gate lives only on the `/` index route; every other route is ungated.
  - Evidence: `app/index.tsx:31-36` is the only `getHasOnboarded` check; `app/_layout.tsx:104-110` registers the routes with no guard.

- [ ] (2026-09-10) [medium] [technical] Leak scan can freeze the JS thread for minutes on legally sized input, with no cancel
  - Repro (a): a single 50,000-row CSV of ordinary debit rows, which the caps permit (`MAX_ROWS = 50_000`, `MAX_FILES = 5`). Repro (b): one row whose description cell is `"insurance "` repeated to about 10 MB, under `MAX_FILE_BYTES`.
  - Expected / Actual: Expected the scan to complete or fail fast. Actual `netTransactions` runs a full `rows.filter(...)` inside a per-row loop, twice, giving O(n^2) over up to 250,000 rows; and the `insurance.*auto` keyword regex backtracks quadratically over a cell whose length is never capped. `runScan` is synchronous, so the UI freezes with no cancel path. Measured in V8: netting loop 1 alone takes 2.45s at 20,000 rows and scales quadratically; the regex takes 3.8s on a 160 KB cell. Hermes is slower. Gated today by `SCAN_FLOW_ENABLED`.
  - Evidence: `utils/leakScan/netting.ts:49-127`; `utils/leakScan/categorize.ts:128,195`; `utils/leakScan/preflight.ts:124-158` (row cap, no cell cap); `components/leak-scan/useLeakScanIntake.ts:160`.

- [ ] (2026-09-10) [medium] [ux] The onboarding carousel's media frame is left-aligned, not centred, on the first screen a user ever sees
  - Repro: 1. Wipe storage. 2. Relaunch and look at the first beat.
  - Expected / Actual: Expected the frame centred above the headline, like every other element in the beat. Actual it hugs the left gutter with roughly 140pt of dead space to its right. `frame` sets `width: '100%'` with `aspectRatio: 9/16` and `maxHeight: 380`; on an iPhone 16 Pro the height clamps first, so yoga recomputes the width to about 214pt, and the beat container has `justifyContent: 'center'` but no `alignItems`. Measured: frame about 211pt wide by 376pt tall inside a 353pt column. Survives the real captures landing, because the poster `Image` carries the same style.
  - Evidence: `components/onboarding/BeatMedia.tsx:82-90`; `components/onboarding/OnboardingCarousel.tsx:167-171`.

- [ ] (2026-09-10) [medium] [ux] An unanswered daily check-in sits below the fold behind the leaks section, while the chip's pending dot points at it
  - Repro: 1. Returning-user data with the Morning coffee daily goal unanswered today. 2. Open `habitcents://?view=kept`.
  - Expected / Actual: Expected Today to deliver its stated job, answer the check-in, on one screen. Actual the Kept chip shows its pending dot, and the pane's entire first screen is the Leaks section (one detected card plus three candidate rows); the "Breaking now" check-in card is off-screen under the dock. `sections` always pushes Leaks first, so a pending check-in can never be first. `today.md` describes Kept Live as "Leaks found / Breaking now straight under the chips", which only one of the two can be. The ScrollFade does signal more content, so this is prioritisation, not hidden content.
  - Evidence: `app/(tabs)/index.tsx:623-648` (section order), `:601-613` (stacking comment); `design/decisions/modules/today.md`.

- [ ] (2026-09-10) [low] [technical] A merchant stemming to "constructor" returns a prototype function as its category and display name
  - Repro: 1. Import a row described e.g. `CONSTRUCTOR SUPPLY CO`. 2. `normalizeMerchant` yields the stem `constructor`. 3. `categorize` runs on a fresh install with an empty rule store.
  - Expected / Actual: Expected `needs-review` / `Other`. Actual `rules.merchantCategory['constructor']` on a plain `{}` returns `Object` (truthy), so the function returns `{ category: Object, tier: 'solid', rowClass: 'spend' }`; `displayName` returns the same function, and both flow into `<Text>` children and into the persisted `Expense.category`. The same lookup shape permanently suppresses that merchant at `recurrence.ts:264`. True prototype pollution is not reachable (`__proto__` cannot survive the stem normaliser), so this is a read-side defect only. Gated by `SCAN_FLOW_ENABLED`.
  - Evidence: `utils/leakScan/categorize.ts:170,188,207`; `utils/leakScan/recurrence.ts:264`; `utils/scanRules.ts:46-58`.

- [ ] (2026-09-10) [low] [functional] Scientific notation in an amount cell parses as an unrelated number instead of being rejected
  - Repro: feed `parseAmount` a cell of `1e5` or `1.5e300`.
  - Expected / Actual: Expected rejection (or 10,000,000 cents). Actual 1,500 cents and 153 cents: the `[^\d.,]` strip deletes the exponent marker before `Number()` runs, so the `Number.isFinite` guard never sees it. Also `0.145` rounds to 14 cents, not 15, through float error.
  - Evidence: `utils/leakScan/parsers.ts:182,202-203`; verified in node against the source logic.

- [ ] (2026-09-10) [low] [ux] The paywall hand-rolls its buttons outside the six-variant rule, and the Monthly plan row is clipped at rest
  - Repro: 1. `habitcents://paywall?placement=habit_gate_today` on an iPhone 16 Pro at default text size. 2. Look at the screen without scrolling.
  - Expected / Actual: Expected the plan choice readable on first paint and the controls drawn from the vocabulary. Actual the Monthly row is cut mid-card, so "per month" is unreadable until the user scrolls; and all four controls are local `TouchableOpacity` plus local `StyleSheet` rather than `ui/Button`, with "Restore purchases" rendered as bare sage semibold, which is `tertiaryBrand`'s treatment outside the "empty-state CTAs only" scope. `Button.md`: "Six variants, and every button in the app is one of them".
  - Evidence: `app/paywall.tsx:236-262,477-489`; `design/decisions/components/Button.md`; `design/PATTERN_VOCABULARY.md` Controls.

- [ ] (2026-09-10) [low] [ux] The dormant leak-scan redirect lands on "This month", not the Leak finder segment its own contract names
  - Repro: 1. `habitcents://leak-scan` with `SCAN_FLOW_ENABLED` off. 2. Observe which Insights segment is selected.
  - Expected / Actual: Expected the Leak finder segment carrying the coming-soon teaser, which the route's own header promises. Actual it lands on "This month", so a user following a stored scan link gets no answer about the scan.
  - Evidence: `app/leak-scan.tsx:19-21,33-35`.

## Fixed

- [x] (2026-09-10) [medium] [logical] Insights "Where it went, last 7 days" sums 8 calendar days, not 7
  - Repro: 1. Returning-user data (24 expenses). 2. Open `habitcents://insights`. 3. Read the "Where it went" card against the stored expense dates.
  - Expected / Actual: Expected the card to total the last 7 days as its label claims. Actual it totals midnight of (today minus 7) through end of today, which is 8 calendar days. With today = Sep 10 the window opens Sep 3 00:00, so PG&E ($87.40, Sep 3 09:00) is counted; every other figure reconciles exactly to that 8-day window. A true 7-day window would drop Utilities entirely.
  - Evidence: `contexts/ReportsContext.tsx:45-68` (`start.setDate(end.getDate() - 7)` then `start.setHours(0,0,0,0)` / `end.setHours(23,59,59,999)`); `app/(tabs)/insights.tsx:49-54` asserts the opposite in a comment. No test covers this function.
  - Fixed: 2026-09-10, PR #161.

- [x] (2026-09-10) [medium] [logical] Last-month comparison drops the entire final day of the previous month
  - Repro: 1. Have any expense on the last day of the previous month at a time other than 00:00:00 (fixture has Blue Bottle $6.50 on Aug 31, 08:32). 2. Open Insights and let the Pace card compute.
  - Expected / Actual: Expected last month to cover Aug 1 00:00 through Aug 31 23:59. Actual the end bound is `new Date(y, m, 0)`, which is Aug 31 00:00:00, so every expense after midnight on the last day is excluded from the last-month total and the percentage delta. Aug totals $2,141.40 but $6.50 is silently dropped.
  - Evidence: `contexts/ReportsContext.tsx:295` and the duplicated window in `app/(tabs)/insights.tsx:222`. Same untested code path as above.
  - Fixed: 2026-09-10, PR #161.

- [x] (2026-09-10) [medium] [logical] Insights renders stored category values while Categories renders display names, so one category has two names
  - Repro: 1. Returning-user data. 2. Open `habitcents://insights`, read the last row of "Where it went". 3. Open `habitcents://categories` and read the same category.
  - Expected / Actual: Expected one name per category. Actual Insights shows "Software & Subscriptions" and Categories shows "Subscriptions" for `cat-subs`. The rollup groups on `expense.category` then looks up with `categories.find(c => c.name === categoryName)`, which misses for the two defaults whose display name differs, so the stored value is rendered and `categoryColor` falls back to grey `#9E9E9E`. The helper written for this case, `expenseBelongsToCategory`, is not used here. Rent hits the same path: it appears on Insights as "Mortgage", a name absent from the user's Categories list (shown there as "Home").
  - Evidence: `contexts/ReportsContext.tsx:187-203`; `utils/expenseCategory.ts:36-41,55-70`.
  - Fixed: 2026-09-10, PR #161.

- [x] (2026-09-10) [medium] [functional] Leak scan parses a thousands-separated whole-dollar amount 1000 times too small
  - Repro: 1. Feed the pipeline a CSV whose amount cells are whole dollars with a thousands separator and no cents, e.g. `1,234`, `$1,500`, `-1,200`, `(2,500)`. 2. Run `parseAmount`.
  - Expected / Actual: Expected 123400 / 150000 / -120000 / -250000 cents. Actual 123 / 150 / -120 / -250 cents. The decimal separator is chosen purely by whichever of `.` or `,` appears last, with no digit-group-size check, so a lone comma is always read as a decimal point. `1,234.56` and `1.234,56` both parse correctly, which is why the fixtures never catch it. A $1,234 rent row imports as $1.23 and corrupts every KPI, category share, projection and the persisted `ScanSummary`. Gated today by `SCAN_FLOW_ENABLED`; this becomes high the day the flag flips.
  - Evidence: `utils/leakScan/parsers.ts:179-205`; verified by running the source logic in node.
  - Fixed: 2026-09-10, PR #161.
