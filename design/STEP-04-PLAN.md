# Step 04 execution plan (screens)

Working plan for the redesign step 04 work packages. Authored 2026-07-30. The
authoritative visual source is still `design/redesign-handoff/04-screens.md`
plus `01-tokens-and-foundations.md`; this file is the decomposition and the
frozen interfaces between packages.

All workers follow `CLAUDE.md`: no em dashes, sentence case, keep the
leak / skip / kept / slip vocabulary, amounts only via `useCurrency().format`
(`{ signed: true }` for the minus form), green is positive-only, honor reduced
motion, style with `createStyles(theme)` + `useMemo`.

## Cross-package rules

- `constants/strings.ts` is owned by **WP-A only**. Phase 2 workers must not
  edit it. If a key is missing, inline the literal with a
  `// TODO(step-05): hoist to strings.ts` comment and the orchestrator hoists it.
- `utils/analytics.ts` is owned by nobody: **no new events this step**, and no
  existing `track()` call site may be removed or reworded.
- `components/ui/index.ts` barrel additions: WP-A only.
- Components orphaned by this step (`AddExpenseSection`, `TodayExpensesPanel`,
  `UpcomingPanel`, `AmountInput`, `EditExpenseModal`, `RecurrenceField`) are
  left untouched; step 05 deletes dead code.
- Workers write files but never commit. The orchestrator integrates.

## Phase 1 (parallel, disjoint files)

### WP-A: shared money kit, strings, ExpensesContext

Frozen exports that phase 2 codes against:

```ts
// components/money/ExpenseRow.tsx
export type ExpenseRowProps = {
  expense: Expense;
  onPress?: () => void;
  subtitle?: string;            // default expense.time
};
export function ExpenseRow(props: ExpenseRowProps): React.JSX.Element;

// components/money/LogExpenseSheet.tsx
export type LogExpenseSheetProps = {
  visible: boolean;
  onClose: () => void;
  initialCategory?: ExpenseCategory;
};

// components/money/EditExpenseSheet.tsx
export type EditExpenseSheetProps = {
  visible: boolean;
  expense: Expense | null;
  onClose: () => void;
};

// components/ui/SegmentedControl.tsx
export type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
};

// components/ui/Chip.tsx
export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  emoji?: string;
  tint?: string;
  disabled?: boolean;
};
```

**ExpenseRow**: `EmojiTile` 36 using `categoryEmoji` / `categoryIdentityColor`
from `constants/categoryEmoji.ts`; name 15 `fonts.uiSemibold` ink; subtitle 12
mist; right amount 15/600 ink with `fontVariant: ['tabular-nums']` via
`format(expense.amount, { signed: true })`. Min height 44,
`accessibilityRole="button"` when `onPress` is set.

**LogExpenseSheet**: `Sheet` + `AmountDisplay` (serif 46-52, `focused`,
`zeroAsPlaceholder`) + `Keypad` + emoji tile picker (44-48 tiles, selected =
1.5px border in the category identity color) + primary `Button` "Save expense".
Saves through `useExpenses().addExpense`. Empty amount shows the toast
"Enter an amount first." and does not save. Success toasts "Logged.".

**EditExpenseSheet**: same body, "Save changes" -> `updateExpense`, toast
"Saved.". Coral bare "Delete expense" captures `{expense, index}` from
`useExpenses().expenses`, calls `deleteExpense(id)`, then toasts "Deleted."
with action `{ label: 'Undo', onPress: () => restoreExpense(expense, index) }`;
undo toasts "Restored.".

**SegmentedControl**: cloud track radius 999, white raised thumb (card shadow),
labels 13/600, selected ink, unselected slate.

**Chip**: selected = `theme.primary` bg with white 14/600; unselected = white bg,
1px cloud border, slate text. Min height 40 plus hitSlop, `accessibilityState`
via `selectableLabel` from `utils/a11y`.

**ExpensesContext** (additive only):
1. `restoreExpense: (expense: Expense, index: number) => Promise<void>` that
   splices at `min(index, length)` through the existing commit ref. No analytics.
2. `createExpense` passes through `recurrenceRule: input.recurrenceRule`.

**strings.ts**: pre-seed every new key phase 2 needs, from `04-screens.md` and
`05-copy.md`. Sentence case, middots not dashes.

Files: `components/money/ExpenseRow.tsx`, `components/money/LogExpenseSheet.tsx`,
`components/money/EditExpenseSheet.tsx`, `components/ui/SegmentedControl.tsx`,
`components/ui/Chip.tsx`, `components/ui/index.ts`, `contexts/ExpensesContext.tsx`,
`constants/strings.ts`.

### WP-B: recurrence engine

Files: `types/expense.ts`, `utils/recurring.ts`, `__tests__/recurrenceRule.test.ts`.
No UI. `__tests__/recurring.test.ts` must pass **unmodified**.

New types, additive only. `RecurrenceFrequency`, `isRecurring` and `recurrence`
all stay exactly as they are:

```ts
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;   // JS Date.getDay(), 0 = Sunday
export type MonthDayOption = '1' | '15' | '30' | 'last';

export type RecurrenceRule =
  | { type: 'once' }
  | { type: 'weekly'; weekday: Weekday }
  | { type: 'biweekly'; weekday: Weekday; biweekAnchor: string }
  | { type: 'monthly'; monthDay?: MonthDayOption }   // absent = legacy anchor stepping
  | { type: 'annual' }                                // legacy and import only
  | { type: 'custom'; everyNDays: number };           // clamped 2..90

// Expense and AddExpenseInput each gain:
recurrenceRule?: RecurrenceRule;
```

Write invariant for newly authored rules: `expense.date` is the first scheduled
occurrence, `recurrenceRule` is set, and the legacy mirrors are written for old
readers (`isRecurring = rule.type !== 'once'`, `recurrence` set to the matching
legacy string where one exists, `undefined` for `once` and `custom`).

Read-path normalization, pure, never writes back to storage:

```ts
export function resolveRule(expense: Expense): RecurrenceRule | null;
```
- `recurrenceRule` present: return it, defensively clamping `everyNDays`; an
  unknown `type` falls through to the legacy mapping.
- else if `isRecurring && recurrence`: `weekly` -> `{type:'weekly', weekday: date.getDay()}`;
  `biweekly` -> `{type:'biweekly', weekday: date.getDay(), biweekAnchor: iso(date)}`;
  `monthly` -> `{type:'monthly'}` (no `monthDay`, which preserves anchor stepping
  and the pinned Jan 31 -> Mar 3 overflow roll); `annual` -> `{type:'annual'}`.
- else `null`.

Engine: `advance(date, rule)` replaces the frequency switch (weekly +7d,
biweekly +14d, annual +1y, custom +everyNDays, monthly without `monthDay` keeps
the existing `setMonth(+1)` math verbatim, monthly with `monthDay` uses
`monthDay === 'last' ? lastDay : min(Number(monthDay), daysInMonth)`).
`nextOccurrence(expense, from)` keeps its signature and resolves the rule first;
`once` returns the date when it is not in the past, else null.
`computeUpcoming` / `upcomingTotal` / `daysUntilLabel` / `hasFullMonthOfData`
keep their signatures and semantics. `UpcomingItem` gains one additive field
`occurrencesInWindow: Date[]` (first entry equals `nextDate`).

New exports:

```ts
export function occurrencesWithin(expense: Expense, from: Date, withinDays: number): Date[];
export function upcomingWindowTotal(items: UpcomingItem[]): number;
export function describeSchedule(rule: RecurrenceRule, nextDate: Date): string;
export function multiPaymentMonth(occurrences: Date[]): { monthLabel: string; count: number } | null;
```

`describeSchedule` renders like "Monthly · 1st · next Aug 1", "Weekly · Fridays ·
next Aug 7", "Every 2 weeks · next Aug 14", "Every 9 days · next Aug 3",
"One-time · Aug 12", "Yearly · next Jul 15", building date text through
`utils/dates.ts formatDate` so no locale is hardcoded (ADA-008).
`multiPaymentMonth` returns a month only when 3 or more occurrences share a
calendar month inside the window.

Tests to add in `__tests__/recurrenceRule.test.ts`: legacy mapping for all four
legacy values plus null for plain spends; golden-parity of `nextOccurrence`
against hand-derived legacy dates (including the Jan 31 monthly roll and
biweekly 14-day steps); `once` past/future/equal-to-from; authored weekly lands
on the stored weekday; monthly `1`/`15`/`30` (Feb clamp) and `last` across
28/30/31-day months; custom stepping plus the defensive clamp; `occurrencesWithin`
with `multiPaymentMonth`; `upcomingWindowTotal` versus `upcomingTotal`; and a
mixed legacy/rule list sorting soonest-first.

## Phase 2 (four packages, fully parallel)

Each consumes WP-A and WP-B. `PickOneSheetProps` and `PartialSlipSheet` props
are **frozen**: WP-E rebuilds their internals but must not change how
`app/(tabs)/index.tsx`, `app/habit/[id].tsx` or Insights invoke them.

### WP-C: Today
Files: `app/(tabs)/index.tsx` (body rewrite, all context wiring preserved),
`components/habit-logging/CheckInCard.tsx`, `WeekStrip.tsx`, `KeptHero.tsx`,
`LeakCard.tsx`, `CoachMomentSlot.tsx`.

Order: existing step-02 header, then kept band, check-in card(s), quick log
card, logged-today list. Details in `04-screens.md` section "Today". Must
preserve in `index.tsx`: the DT-1 and FL-1 coach-moment effects, the
`useFocusEffect` clears of `lastCoachMoment` and `lastMilestone`, the
`refreshHabits(expenses)` effect, `freeTierBlocked` derived from
`isHabitLimitReached(getActiveHabits().length, getEntitlement())`, and
pull-to-refresh. Reuse and never reimplement `weekStrip`, `weekStats`,
`dayStateFor`, `canBackfillYesterday` from `utils/habitLogging.ts`; every
mutation goes through `HabitsContext`; detection progress comes from
`progressTowardDetection`.

States that must exist: zero kept, answered-skip, answered-slip, milestone
crossing, backfill offer, pre-detection, stopped habit, weekly-cadence habit.
The skip confirmation is the one allowed pulse (280ms, 1 to 1.04 to 1),
opacity-only under `useReducedMotion`. A slip is never red.

### WP-D: Money and add-upcoming
Files: `app/(tabs)/money.tsx` (rewrite), `components/money/SpentList.tsx`,
`components/money/UpcomingList.tsx`, `components/money/AddUpcomingSheet.tsx`.

Spent groups reuse `groupExpensesByDate` and must filter to
`expense.date <= end of today` so scheduled future items never read as spends.
Upcoming header total uses `upcomingWindowTotal`. Schedule lines use
`describeSchedule(resolveRule(item.expense)!, item.nextDate)`. The amber
multi-payment pill uses `multiPaymentMonth(item.occurrencesInWindow)` with
`withAlpha(theme.amber, 0.14)` behind `theme.amberInk` text.

Add-upcoming sheet: serif "Add upcoming.", `AmountDisplay` + `Keypad`, name
chips that prefill an editable name field, then the One-time / Repeats
`SegmentedControl` and the frequency chips described in `04-screens.md`.
Custom stepper clamps 2 to 90. Save writes through `addExpense` with both the
new `recurrenceRule` and the legacy mirrors, then toasts "Added to upcoming.".

### WP-E: habit detail, pick-one, partial slip, paywall
Files: `app/habit/[id].tsx` (rewrite), `components/habit-logging/LongArc.tsx`,
`HistoryCalendar.tsx`, `PickOneSheet.tsx`, `PartialSlipSheet.tsx`,
`EventHistory.tsx`, `app/paywall.tsx`.

Arc weights 10/20/20/16 for Deciding 0-10, Rhythm 10-30, Cruising 30-50,
Rewired 50-66, driven by `arcProgress`; the arc never animates downward.
Chapter label uses `displayChapter(totalSkips, highestMilestoneReached)` so it
can never fall. Skip-value sheet saves through `updateSkipValue`. Stop-breaking
confirm uses coral only for the destructive action and toasts
"Stopped. Your history is kept.".

Paywall is a restyle only: keep every `track()` call, the `outcome` ref, the
mock purchase flow and the product ids. The gradient hero
(`135deg #8E7CF3 -> #4CAF82` via `expo-linear-gradient`) is the only gradient in
the app. Footer keeps "Stay on free plan", never "No thanks".

### WP-F: Insights and Categories
Files: `app/(tabs)/insights.tsx` (rewrite), `components/insights/LeaksCard.tsx`,
`WhereItWentCard.tsx`, `PaceCard.tsx`, `app/(tabs)/categories.tsx` (restyle),
`components/CategoryRow.tsx` (restyle). Does not touch `WidgetCard.tsx`.

Where-it-went bars are always mist-on-snow: spend is not a win, so they are
never sage. The pace card stays on the honest placeholder until
`hasFullMonthOfData(expenses)` is true, and never renders an over-budget state
in red.

Categories keeps all current behavior (CRUD, `/category/[id]` push, delete
confirm, `AddCategoryModal` untouched) and changes visual language only: serif
34 "Categories.", a 40px white circle Plus button, "DEFAULT" and "CUSTOM"
eyebrows, one white card per section, and `CategoryRow` rebuilt around
`EmojiTile` 36 with a 12 mist spend caption and a ChevronRight 16.

## Guards

1. No storage migration for recurrence; `resolveRule` is read-path only and the
   legacy `advance` math is preserved verbatim.
2. `__tests__/recurring.test.ts` and `__tests__/renderedA11y.test.tsx` must pass
   unmodified. Run `npx jest recurring recurrenceRule renderedA11y a11y` before
   handing a package back.
3. No analytics edits, no removed `track()` call sites.
4. No local arithmetic on `goal.kept`, skip counts or week stats: use the
   helpers named above.
5. The free-tier gate (1 habit) keeps working through `isHabitLimitReached` and
   the frozen `PickOneSheetProps`.
6. `grep -rn "—" app components constants` must stay empty.
