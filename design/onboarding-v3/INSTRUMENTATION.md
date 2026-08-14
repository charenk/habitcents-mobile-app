# Onboarding v3.1: instrumentation reference

What PRD sect 11 asks for, what actually ships, and how to compute each
success criterion. Written because the PRD names events from a prototype that
this repo never had, so a literal reading of sect 11 would send someone hunting
for events that do not exist and miss the ones that do.

## PRD event names to shipped names

ADR 0020 requires existing event names to stay stable, so where the app already
had an event meaning the same thing, the shipped name wins and the PRD name is
just a synonym.

| PRD sect 11 | Ships as | Note |
|---|---|---|
| `intent_selected` | `onboarding_intent_selected` | Kept stable. Carries `intent: track \| scan \| break`. |
| `carousel_skipped` | `onboarding_intent_skipped` | Kept stable. Fires from the carousel ghost. |
| `activation` | `habit_tracking_started` | Not a separate event. Activation is habit + value + evidence, which is exactly what this fires on; a parallel event would be two names for one moment and two chances to disagree. Carries `source`. |
| `route_milestone` | (per-flow events) | Deliberately not built as one generic event. The flows have different milestones and a single event with a free-form label would need a vocabulary nobody maintains. Use `scan_*`, `deck_*`, `bills_*`. |
| `splash_shown` | `app_opened` | The splash is the OS launch screen; there is no separate moment to report. |
| `beat_viewed`, `beat_swipe` | **not built** | The carousel has no per-beat view event yet. Deliberate: with no captures in place the beats are not their final content, so per-beat engagement would measure a placeholder. Add with the captures. |
| `permission_prompted` | **not applicable** | The scan reads a user-picked CSV through the iOS document picker, which grants access to the chosen file with no permission dialog. There is no prompt to report. The PRD's "Permission" step is a prototype artifact. |
| `scope_selected` | `scope_selected` | As specified. |
| `deck_card_shown` / `deck_card_result` / `deck_exhausted` | same | As specified. |
| `bills_offered` / `bills_imported` | same | As specified. |
| `skip_activation` | `skip_activation` | Fires at CTA press, skippers only. See the event's own comment for what that does and does not measure. |
| user property `recurring_expense_count` | event `recurring_expense_count` | **Deviation.** Person properties key off `identify()`, which D-9's anonymous-device-ID posture forbids. Ships as a once-per-session snapshot event carrying the same number. |

Added beyond the PRD:

| Event | Why |
|---|---|
| `first_kept { route }` | Sect 7.5 names first-kept as the engagement metric for all routes but lists no event for it. Without `route` the headline criterion below is not computable. |

## Computing the four month-3 criteria

### 1. Scan-route first-kept vs habit-route first-kept, within 20%

```
numerator   count distinct devices with first_kept where route = 'scan'
denominator count distinct devices with habit_tracking_started where source = 'scan'
```
and the same pair for `route = 'onboarding'` (the habit route: the break beat
and the break sheet). Compare the two rates.

`route` is read off the persisted goal, not inferred from the nearest preceding
`habit_tracking_started`, because a first skip can land days later and after a
second habit was started. **Exclude `route = 'unknown'`**: those are goals
created before the field existed, kept separable precisely so they can be
dropped rather than skew the comparison.

Tests the import-as-instance decision (sect 7.5). If the scan route converts
worse, the evidence block is not carrying the payoff the way a self-declared
habit does.

### 2. Deck position-1 track rate, at least 40%

```
numerator   deck_card_result where position = 1 and result = 'tracked'
denominator deck_card_shown  where position = 1
```

Positions are ONE-indexed in the payload (`i + 1` in DeckScreen), so the top
card is `position = 1`. Querying `position = 0` returns nothing, silently.

Tests the ranking signal (sect 7.3): frequency first, per-instance cost as
tiebreak. A low rate means the deck is
leading with the wrong candidate, not that the deck is a bad idea.

### 3. `bills_imported / bills_offered`, at least 50%

```
sum(bills_imported.count_accepted) / sum(bills_offered.count_proposed)
```

Both are counts of rows, so this is per-row acceptance, not per-screen. Tests
the second payoff (sect 8): whether routing essentials to Upcoming reads as
useful or as busywork.

### 4. `scope_selected.used_defaults`, at least 70%

```
share of scope_selected where used_defaults = true
```

**Read this one first.** Heavy editing means the tier assignments are wrong,
and that has to be settled before any classifier conversation reopens (sect
11). If it fails, segment `categories_on` / `categories_off` to see which
category is being toggled: the known suspects are `Food` (groceries and eating
out share one category) and `Transportation` (transit and rideshare share one),
both flagged as a follow-up taxonomy split.

Category names travel as short codes (`SCOPE_CODE` in `utils/leakScan/scope.ts`)
because `sanitizeProps` silently drops strings over 64 characters and the full
names exceed that once most of the taxonomy is on. A dropped property looks
exactly like a property nobody sent, so the codes are load-bearing, not
cosmetic. Never renumber them.

## Nothing is live yet

Every `track()` call is a no-op unless `EXPO_PUBLIC_POSTHOG_API_KEY` is set;
PostHog is not even imported without it. None of the above produces data until
that key lands on a real build, which is a prerequisite for the month-3
checkpoint, not a detail of it.
