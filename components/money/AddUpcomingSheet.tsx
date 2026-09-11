/**
 * AddUpcomingSheet (design/redesign-handoff/04-screens.md, "Add-upcoming sheet";
 * U8 added edit mode).
 *
 * The one place a user can author a schedule by hand. Amount first, then what
 * it is, then when: the same order as the log sheet, so the two never feel like
 * different apps.
 *
 * U8: one component with a `mode`, mirroring how ExpenseSheet merges log/edit.
 * Edit prefills every field from the row's own data (amount, name, and the
 * schedule reconstructed from `resolveRule`) and adds a delete action with the
 * house no-confirm-plus-undo pattern (ExpenseSheet's handleDelete, verbatim
 * shape). The one non-obvious rule: editing amount or name alone must NOT
 * silently reschedule the bill. `scheduleTouched` tracks whether the user
 * actually touched a schedule control since the sheet opened; Save only rebuilds
 * date + rule from the draft when it's true (or in add mode, where there is no
 * "original" to preserve). Untouched, the original `expense.date` and
 * `recurrenceRule` are written back unchanged.
 *
 * The write contract matters more than the layout here (types/expense.ts,
 * RecurrenceRule):
 *
 * 1. `expense.date` is written as the FIRST scheduled occurrence, never "now".
 *    Every projection in `utils/recurring.ts` steps forward from that date, so
 *    a wrong start date silently shifts every future payment.
 * 2. `recurrenceRule` carries the real schedule.
 * 3. The legacy mirrors are written too: `isRecurring = rule.type !== 'once'`
 *    and `recurrence` set to the matching legacy string, so a reader written
 *    before step 04 still projects weekly / bi-weekly / monthly / annual items.
 *    'once' and 'custom' have no legacy equivalent and leave `recurrence`
 *    undefined, which those readers correctly treat as "no legacy schedule"
 *    rather than guessing one.
 *
 * The date math below mirrors `startFor` in utils/recurring.ts exactly, so
 * `nextOccurrence` returns the stored date unchanged on the very first read.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CategoryChipRow } from '@/components/money/CategoryChipRow';
import { MonthDayPicker } from '@/components/money/MonthDayPicker';
import { AmountField } from '@/components/ui/AmountField';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { SheetHeader } from '@/components/ui/SheetHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { strings } from '@/constants/strings';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  Expense,
  ExpenseCategory,
  MonthDayOption,
  RecurrenceFrequency,
  RecurrenceRule,
  Weekday,
} from '@/types/expense';
import { formatDate } from '@/utils/dates';
import { toExpenseCategory } from '@/utils/expenseCategory';
import { atMidnight } from '@/utils/habitLogging';
import { hapticError, hapticSuccess } from '@/utils/motion';
import { nextOccurrence, resolveRule, shortDate } from '@/utils/recurring';

export type AddUpcomingSheetMode = 'add' | 'edit';

export type AddUpcomingSheetProps = {
  mode: AddUpcomingSheetMode;
  visible: boolean;
  onClose: () => void;
  /** Edit mode only. The row being edited; deleted/renders nothing until set. */
  expense?: Expense | null;
};

type ScheduleType = 'once' | 'repeats';
type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'annual' | 'custom';
type OnceWhen = 'tomorrow' | 'nextWeek' | 'inTwoWeeks' | 'nextMonth';
type BiweekStart = 'this' | 'next';

/** Custom cadence bounds. Mirrors the clamp `utils/recurring.ts` applies on read. */
const MIN_EVERY_N_DAYS = 2;
const MAX_EVERY_N_DAYS = 90;
const DEFAULT_EVERY_N_DAYS = 10;

/**
 * The six name presets from spec 04: a name, a glyph, and the category the
 * name usually files under. Tapping one fills the name field and MOVES THE
 * CATEGORY RAIL, visibly, where the user can then change it.
 *
 * 2026-09-11: each entry used to carry its own hardcoded `tint` for the chip
 * border, quoting "spec hues: Rent lavender, Internet and Phone cyan, Gym
 * amber, Insurance blue, Utilities orange". Those hues disagreed with
 * `categoryIdentityColor` for three of the six, so a chip's border colour was
 * saying one thing about where the bill would file while the row it created
 * said another. The presets now share the log sheet's soft pill shape, with no
 * per-chip hue at all, and the category is a field the user can see.
 */
const NAME_CHIPS: ReadonlyArray<{
  key: string;
  label: string;
  emoji: string;
  category: ExpenseCategory;
}> = [
  { key: 'rent', label: strings.addUpcoming.nameRent, emoji: '🏠', category: 'Mortgage' },
  { key: 'internet', label: strings.addUpcoming.nameInternet, emoji: '📡', category: 'Utilities' },
  { key: 'phone', label: strings.addUpcoming.namePhone, emoji: '📱', category: 'Software & Subscriptions' },
  { key: 'gym', label: strings.addUpcoming.nameGym, emoji: '🏋️', category: 'Entertainment' },
  { key: 'insurance', label: strings.addUpcoming.nameInsurance, emoji: '🛡️', category: 'Other' },
  { key: 'utilities', label: strings.addUpcoming.nameUtilities, emoji: '💡', category: 'Utilities' },
];

/** Monday first, matching the week strip everywhere else in the app. */
const WEEKDAY_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** A known Sunday, so a weekday number can be named in the device locale. */
const REFERENCE_SUNDAY = new Date(2024, 0, 7);

function weekdayShortLabel(weekday: Weekday): string {
  const d = new Date(REFERENCE_SUNDAY);
  d.setDate(d.getDate() + weekday);
  return formatDate(d, { weekday: 'short' });
}

const MONTH_DAY_CHIPS: ReadonlyArray<{ value: MonthDayOption; label: string }> = [
  { value: '1', label: strings.addUpcoming.monthDayFirst },
  { value: '15', label: strings.addUpcoming.monthDayFifteenth },
  { value: '30', label: strings.addUpcoming.monthDayThirtieth },
  { value: 'last', label: strings.addUpcoming.monthDayLast },
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Local 'YYYY-MM-DD'. Built from local parts so it never shifts a day. */
function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The first date on or after `date` that falls on `weekday`. */
function alignToWeekday(date: Date, weekday: Weekday): Date {
  const delta = (weekday - date.getDay() + 7) % 7;
  return delta === 0 ? new Date(date) : addDays(date, delta);
}

/** The day of the month a monthDay anchor lands on inside a given month. */
function resolveMonthDay(year: number, month: number, monthDay: MonthDayOption): number {
  const dim = daysInMonth(year, month);
  return monthDay === 'last' ? dim : Math.min(Number(monthDay), dim);
}

/** Same day-of-month next month, clamped to that month's length. */
function nextMonthSameDay(today: Date): Date {
  const d = new Date(today);
  // setDate(1) first, so changing the month can never overflow on the way.
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(Math.min(today.getDate(), daysInMonth(d.getFullYear(), d.getMonth())));
  return d;
}

function clampEveryNDays(n: number): number {
  return Math.min(MAX_EVERY_N_DAYS, Math.max(MIN_EVERY_N_DAYS, Math.round(n)));
}

/** The legacy `recurrence` string for a rule, or undefined where none exists. */
function legacyRecurrence(rule: RecurrenceRule): RecurrenceFrequency | undefined {
  if (rule.type === 'weekly') return 'weekly';
  if (rule.type === 'biweekly') return 'biweekly';
  if (rule.type === 'monthly') return 'monthly';
  if (rule.type === 'annual') return 'annual';
  return undefined;
}

type ScheduleDraft = {
  scheduleType: ScheduleType;
  onceWhen: OnceWhen;
  frequency: Frequency;
  weekday: Weekday;
  biweekStart: BiweekStart;
  // Null means "a legacy monthly rule that steps from its own anchor date, so
  // none of the four chips describes it". Only edit mode can produce it; add
  // mode always starts on '1'.
  monthDay: MonthDayOption | null;
  // The yearly anchor, 0..11 and 1..31. Carried on the draft rather than read
  // off `expense.date` at save time, which is what makes the annual branch
  // immune to the `scheduleTouched` trap: seeding IS the fix, so unlike the
  // monthly branch it never needs buildSchedule's `anchorDate`.
  annualMonth: number;
  annualDay: number;
  everyNDays: number;
};

/**
 * The rule to store and the date of its first occurrence. Exported shape is
 * the whole write contract: `date` becomes `expense.date`.
 */
function buildSchedule(
  draft: ScheduleDraft,
  today: Date,
  anchorDate?: Date
): { rule: RecurrenceRule; date: Date } {
  if (draft.scheduleType === 'once') {
    const date =
      draft.onceWhen === 'tomorrow'
        ? addDays(today, 1)
        : draft.onceWhen === 'nextWeek'
          ? addDays(today, 7)
          : draft.onceWhen === 'inTwoWeeks'
            ? addDays(today, 14)
            : nextMonthSameDay(today);
    return { rule: { type: 'once' }, date };
  }

  if (draft.frequency === 'weekly') {
    // The next time that weekday comes around, today included.
    return {
      rule: { type: 'weekly', weekday: draft.weekday },
      date: alignToWeekday(today, draft.weekday),
    };
  }

  if (draft.frequency === 'biweekly') {
    const thisWeek = alignToWeekday(today, draft.weekday);
    const date = draft.biweekStart === 'next' ? addDays(thisWeek, 7) : thisWeek;
    // The anchor fixes which of the two weeks the 14-day cadence falls on, so
    // it must be the first occurrence itself, as a LOCAL calendar date.
    return {
      rule: { type: 'biweekly', weekday: draft.weekday, biweekAnchor: localISODate(date) },
      date,
    };
  }

  if (draft.frequency === 'monthly') {
    // No chip selected: keep the rule anchor-stepping rather than silently
    // moving the bill to the 1st. Reachable when the user round-trips monthly
    // to weekly and back without ever picking a day. Steps the ORIGINAL
    // anchor's day-of-month to its next occurrence after today, so "the 29th"
    // survives the round trip instead of re-anchoring on today.
    if (draft.monthDay === null) {
      const anchorDay = (anchorDate ?? today).getDate();
      const date = new Date(today);
      const thisMonthTarget = Math.min(anchorDay, daysInMonth(today.getFullYear(), today.getMonth()));
      if (today.getDate() <= thisMonthTarget) {
        date.setDate(thisMonthTarget);
      } else {
        date.setDate(1);
        date.setMonth(date.getMonth() + 1);
        date.setDate(Math.min(anchorDay, daysInMonth(date.getFullYear(), date.getMonth())));
      }
      return { rule: { type: 'monthly' }, date };
    }
    const target = resolveMonthDay(today.getFullYear(), today.getMonth(), draft.monthDay);
    let date: Date;
    if (today.getDate() <= target) {
      // The anchor has not passed yet this month.
      date = new Date(today);
      date.setDate(target);
    } else {
      date = new Date(today);
      date.setDate(1);
      date.setMonth(date.getMonth() + 1);
      date.setDate(resolveMonthDay(date.getFullYear(), date.getMonth(), draft.monthDay));
    }
    return { rule: { type: 'monthly', monthDay: draft.monthDay }, date };
  }

  if (draft.frequency === 'annual') {
    // The next time the chosen month and day comes around. STRICTLY after
    // today, never on it: a date equal to today would be materialized into
    // Spent (ADR 0024) and would also fall inside money.tsx's
    // `date <= endOfToday` Spent filter, rendering a spend the user never
    // made. Monthly's `<=` is right for monthly and wrong here.
    //
    // The rule stays payload-free. `advance()` steps annual by whole years off
    // `expense.date`, so the anchor has always lived on the date; the sheet
    // simply never let anyone set it.
    const target = Math.min(
      draft.annualDay,
      daysInMonth(today.getFullYear(), draft.annualMonth)
    );
    let date = new Date(today.getFullYear(), draft.annualMonth, target);
    if (date.getTime() <= today.getTime()) {
      const nextYear = today.getFullYear() + 1;
      date = new Date(
        nextYear,
        draft.annualMonth,
        Math.min(draft.annualDay, daysInMonth(nextYear, draft.annualMonth))
      );
    }
    return { rule: { type: 'annual' }, date };
  }

  // Custom: the first payment is one full cadence away, not today.
  const everyNDays = clampEveryNDays(draft.everyNDays);
  return { rule: { type: 'custom', everyNDays }, date: addDays(today, everyNDays) };
}

type ScheduleDraftFields = ScheduleDraft & { cents: number; nameChipKey: string | null; name: string };

/**
 * Reconstruct the sheet's fields from an existing row, for edit mode. Always
 * succeeds: `resolveRule` returns null only for a plain (non-recurring) spend,
 * and UpcomingRow only ever opens this sheet for a row that already resolved
 * to a rule (computeUpcoming's own invariant), so the 'once' fallback below is
 * defensive, not a real path.
 */
function draftFromExpense(expense: Expense): ScheduleDraftFields {
  const rule = resolveRule(expense) ?? { type: 'once' as const };
  const chip = NAME_CHIPS.find(
    (c) => c.label.toLowerCase() === (expense.title || '').trim().toLowerCase()
  );
  const rawDate = expense.date instanceof Date ? expense.date : new Date(expense.date);

  const base: ScheduleDraftFields = {
    cents: expense.amount,
    nameChipKey: chip?.key ?? null,
    name: expense.title || '',
    scheduleType: rule.type === 'once' ? 'once' : 'repeats',
    onceWhen: 'tomorrow',
    frequency: 'monthly',
    weekday: rawDate.getDay() as Weekday,
    biweekStart: 'this',
    monthDay: '1',
    // Seeded from the row itself, in `base` rather than in the annual case, so
    // switching TO yearly in edit mode starts from this bill's own anchor
    // instead of today.
    annualMonth: rawDate.getMonth(),
    annualDay: rawDate.getDate(),
    everyNDays: DEFAULT_EVERY_N_DAYS,
  };

  switch (rule.type) {
    case 'weekly':
      return { ...base, frequency: 'weekly', weekday: rule.weekday };
    case 'biweekly':
      return { ...base, frequency: 'biweekly', weekday: rule.weekday };
    case 'monthly':
      // THE FIX (2026-09-11): this used to be `rule.monthDay ?? '1'`, so a
      // legacy monthly rule with no stored anchor opened with "1st" lit up
      // while the list correctly said "Monthly, next Sep 29". The sheet was
      // stating something false, and any schedule tap rebuilt the rule from
      // the wrong anchor and moved the bill.
      return { ...base, frequency: 'monthly', monthDay: rule.monthDay ?? null };
    case 'annual':
      return { ...base, frequency: 'annual' };
    case 'custom':
      return { ...base, frequency: 'custom', everyNDays: clampEveryNDays(rule.everyNDays) };
    default:
      return base;
  }
}

export function AddUpcomingSheet({
  mode,
  visible,
  onClose,
  expense = null,
}: AddUpcomingSheetProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { show } = useToast();
  const { format } = useCurrency();
  const { getVisibleCategories } = useCategories();
  const { addExpense, updateExpense, deleteExpense, restoreExpense, expenses } = useExpenses();

  const categories = getVisibleCategories();

  const [cents, setCents] = useState(0);
  const [nameChipKey, setNameChipKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  // The category is a field on this sheet now, not a silent side effect of a
  // name preset. Add mode starts on 'Other', which is what the old chip-less
  // path wrote without ever showing it; picking a preset moves it, and the
  // user can move it back.
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('repeats');
  const [onceWhen, setOnceWhen] = useState<OnceWhen>('tomorrow');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [weekday, setWeekday] = useState<Weekday>(new Date().getDay() as Weekday);
  const [biweekStart, setBiweekStart] = useState<BiweekStart>('this');
  const [monthDay, setMonthDay] = useState<MonthDayOption | null>('1');
  const [annualMonth, setAnnualMonth] = useState(() => new Date().getMonth());
  const [annualDay, setAnnualDay] = useState(() => new Date().getDate());
  const [everyNDays, setEveryNDays] = useState(DEFAULT_EVERY_N_DAYS);
  // Edit mode only: whether the user has touched a schedule control since the
  // sheet opened. Editing amount or name alone must not silently reschedule
  // the bill, so Save only rebuilds date + rule from the draft when this is
  // true; otherwise it writes the original date/rule back unchanged.
  const [scheduleTouched, setScheduleTouched] = useState(false);

  // Every open starts from a clean slate for the row it's actually editing (or
  // a blank one, for add), so a dismissed half-typed field never leaks into
  // the next open.
  useEffect(() => {
    if (!visible) return;
    setScheduleTouched(false);

    if (mode === 'edit' && expense) {
      const draft = draftFromExpense(expense);
      setCents(draft.cents);
      setNameChipKey(draft.nameChipKey);
      setName(draft.name);
      setCategory(expense.category);
      setScheduleType(draft.scheduleType);
      setOnceWhen(draft.onceWhen);
      setFrequency(draft.frequency);
      setWeekday(draft.weekday);
      setBiweekStart(draft.biweekStart);
      setMonthDay(draft.monthDay);
      setAnnualMonth(draft.annualMonth);
      setAnnualDay(draft.annualDay);
      setEveryNDays(draft.everyNDays);
      return;
    }

    setCents(0);
    setNameChipKey(null);
    setName('');
    setCategory('Other');
    setScheduleType('repeats');
    setOnceWhen('tomorrow');
    setFrequency('monthly');
    setWeekday(new Date().getDay() as Weekday);
    setBiweekStart('this');
    setMonthDay('1');
    // Today's month and day, so an untouched Yearly save still writes
    // today + 1 year, byte-identical to what this sheet has always written.
    setAnnualMonth(new Date().getMonth());
    setAnnualDay(new Date().getDate());
    setEveryNDays(DEFAULT_EVERY_N_DAYS);
  }, [visible, mode, expense]);

  const pickNameChip = (key: string) => {
    const chip = NAME_CHIPS.find((c) => c.key === key);
    if (!chip) return;
    setNameChipKey(key);
    // The chip prefills the field; the field stays editable, so "Gym" can
    // become "Gym membership" without losing the category the chip picked.
    setName(chip.label);
    // And it moves the category rail, visibly, instead of writing one at save
    // time that the sheet never showed. The rail is the source of truth from
    // here on: a preset is a shortcut into it, not a hidden second opinion.
    setCategory(chip.category);
  };

  // Wrap every schedule setter so CHANGING any of these controls flips
  // scheduleTouched, which is what tells Save (edit mode) to rebuild the date
  // and rule from the draft instead of preserving the row's original ones.
  // Re-selecting the already-active value is deliberately a no-op: a stray
  // tap on the current chip must not count as a reschedule (queue2 review P1).
  const handleScheduleTypeChange = (v: ScheduleType) => {
    if (v !== scheduleType) setScheduleTouched(true);
    setScheduleType(v);
  };
  const handleOnceWhenChange = (v: OnceWhen) => {
    if (v !== onceWhen) setScheduleTouched(true);
    setOnceWhen(v);
  };
  const handleFrequencyChange = (v: Frequency) => {
    if (v !== frequency) setScheduleTouched(true);
    setFrequency(v);
  };
  const handleWeekdayChange = (v: Weekday) => {
    if (v !== weekday) setScheduleTouched(true);
    setWeekday(v);
  };
  const handleBiweekStartChange = (v: BiweekStart) => {
    if (v !== biweekStart) setScheduleTouched(true);
    setBiweekStart(v);
  };
  // The date the anchor note names. It must be the NEXT occurrence, not
  // `expense.date`: the stored date is the rule's anchor and is usually in the
  // past, so echoing it would say "next on Aug 29" beside a row correctly
  // reading "next Sep 29" (seen on device). Same helper the list projects with.
  const anchorNextDate = useMemo(() => {
    if (!expense) return '';
    const next = nextOccurrence(expense, startOfToday());
    return shortDate(next ?? expense.date);
  }, [expense]);

  const handleMonthDayChange = (v: MonthDayOption) => {
    if (v !== monthDay) setScheduleTouched(true);
    setMonthDay(v);
  };
  const handleAnnualMonthChange = (v: number) => {
    if (v !== annualMonth) setScheduleTouched(true);
    setAnnualMonth(v);
  };
  const handleAnnualDayChange = (v: number) => {
    if (v !== annualDay) setScheduleTouched(true);
    setAnnualDay(v);
  };
  const handleEveryNDaysChange = (v: number) => {
    if (v !== everyNDays) setScheduleTouched(true);
    setEveryNDays(v);
  };

  // Disabled-until-valid (ops ADR 0028, 2026-08-16): Save is disabled until an
  // amount is entered, rather than staying live and toasting "Enter an amount
  // first." on an empty tap (the sheet's old behavior, mirrored by ExpenseSheet
  // until it converted first). No other field is required to save.
  const canSave = cents > 0;

  // Same contract as ExpenseSheet.handleSave: the confirmation waits for the
  // write, a rejection keeps the sheet open with the user's input intact, and
  // an in-flight guard stops a second tap from creating a duplicate bill while
  // the first write is still in the air.
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await performSave();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const performSave = async () => {
    // Unreachable from the UI now that Save is disabled until canSave; kept
    // as a defensive guard.
    if (!canSave) return;

    const chip = NAME_CHIPS.find((c) => c.key === nameChipKey);
    // The category rail is the source of truth (2026-09-11). It is seeded from
    // the row in edit mode and moved by a preset tap, so "keep the row's own
    // category unless a chip says otherwise" is now just "write what the rail
    // shows". Recategorizing is still never a side effect of fixing a typo; it
    // is a thing the user can see and do on purpose.
    const match = categories.find((c) => toExpenseCategory(c.name) === category);
    const title = name.trim() || chip?.label || match?.name || category;

    const original = mode === 'edit' && expense ? resolveRule(expense) : null;
    const { rule, date } =
      mode === 'edit' && expense && !scheduleTouched && original
        ? { rule: original, date: expense.date }
        : buildSchedule(
            {
              scheduleType,
              onceWhen,
              frequency,
              weekday,
              biweekStart,
              monthDay,
              annualMonth,
              annualDay,
              everyNDays,
            },
            startOfToday(),
            mode === 'edit' && expense ? expense.date : undefined
          );

    // INVARIANT (queue2 review P1): a parent's date must never land on a
    // calendar day already owned by one of its materialized children. A
    // schedule rebuild anchors at today, and if today's occurrence has
    // already materialized, writing the parent to today would double that
    // day's spend (parent row + child row, both real). While the candidate
    // collides, advance it one period under the NEW rule. Terminates:
    // children only exist for dates up to today, so the walk clears the
    // collision set within a period or two; the guard is a hard stop.
    let safeDate = date;
    if (mode === 'edit' && expense && scheduleTouched) {
      const childDays = new Set(
        expenses
          .filter((e) => e.parentId === expense.id && e.source === 'recurring')
          .map((e) => atMidnight(e.date).getTime())
      );
      const probe: Expense = {
        ...expense,
        isRecurring: rule.type !== 'once',
        recurrence: legacyRecurrence(rule),
        recurrenceRule: rule,
      };
      let guard = 0;
      while (childDays.has(atMidnight(safeDate).getTime()) && guard < 400) {
        const dayAfter = new Date(safeDate);
        dayAfter.setDate(dayAfter.getDate() + 1);
        const next = nextOccurrence({ ...probe, date: safeDate }, dayAfter);
        safeDate = next ?? dayAfter;
        guard += 1;
      }
    }

    if (mode === 'edit' && expense) {
      try {
        await updateExpense(expense.id, {
          title,
          amount: cents,
          category,
          categoryId: match?.id,
          date: safeDate,
          isRecurring: rule.type !== 'once',
          recurrence: legacyRecurrence(rule),
          recurrenceRule: rule,
        });
      } catch (error) {
        console.error('Error editing upcoming expense:', error);
        hapticError();
        show(strings.toasts.saveFailed);
        return;
      }
      show(strings.toasts.saved);
      onClose();
      return;
    }

    try {
      await addExpense({
        title,
        amount: cents,
        category,
        categoryId: match?.id,
        // The write invariant: the stored date IS the first scheduled occurrence.
        date,
        isRecurring: rule.type !== 'once',
        recurrence: legacyRecurrence(rule),
        recurrenceRule: rule,
        reminderEnabled: false,
      });
    } catch (error) {
      console.error('Error adding upcoming expense:', error);
      hapticError();
      show(strings.toasts.addUpcomingFailed);
      return;
    }

    hapticSuccess();
    show(strings.toasts.addedToUpcoming);
    onClose();
  };

  const handleDelete = () => {
    if (!expense) return;
    const removed = expense;
    // Capture the position BEFORE the delete: undo has to put the row back
    // where it was, same shape as ExpenseSheet.handleDelete.
    const index = expenses.findIndex((e) => e.id === removed.id);

    onClose();
    // "Deleted." only after the delete lands; same shape as ExpenseSheet.
    void deleteExpense(removed.id).then(
      () => {
        show(strings.toasts.deleted, {
          action: {
            label: strings.toasts.undo,
            onPress: () => {
              void restoreExpense(removed, index < 0 ? 0 : index).then(
                () => show(strings.toasts.restored),
                (error) => {
                  console.error('Error restoring upcoming expense:', error);
                  hapticError();
                  show(strings.toasts.restoreFailed);
                }
              );
            },
          },
        });
      },
      (error) => {
        console.error('Error deleting upcoming expense:', error);
        hapticError();
        show(strings.toasts.deleteFailed);
      }
    );
  };

  const title = mode === 'edit' ? strings.addUpcoming.editTitle : strings.addUpcoming.title;
  const saveLabel = mode === 'edit' ? strings.addUpcoming.saveChanges : strings.addUpcoming.save;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={title}
      contentContainerStyle={styles.content}
      // Pinned header-save (ADR 0031) inside Sheet's drag zone, so the title
      // row drags the sheet too; hint only while disabled, so VoiceOver
      // never reads stale guidance on an enabled button (ADR 0028).
      //
      // Delete is the header's one icon action, 12pt left of Save and never
      // flush against it (ADR 0033). It was a full-width coral text row in the
      // pinned footer, which made the destructive action the loudest thing on
      // the sheet and left this the last form sheet still doing it; drawers.md
      // has had the move filed as open work since 2026-09-04. No confirm
      // sheet: the delete is instant with Undo on the toast, unchanged.
      header={
        <SheetHeader
          title={title}
          saveLabel={saveLabel}
          onSave={handleSave}
          saveDisabled={!canSave || saving}
          saveHint={canSave ? undefined : strings.sheets.saveHintAmount}
          secondaryAction={
            mode === 'edit'
              ? {
                  icon: 'Trash2',
                  accessibilityLabel: strings.addUpcoming.deleteUpcoming,
                  onPress: handleDelete,
                  tone: 'destructive',
                }
              : undefined
          }
        />
      }
    >
          {/* Enclosed at ExpenseSheet's density (Charen, 2026-09-11): the
              underline field read as a different component from the rest of
              the app's money inputs. Third consumer after ExpenseSheet and
              BreakHabitSheet, which makes enclosed the house shape. */}
          <AmountField
            valueCents={cents}
            onChangeCents={setCents}
            autoFocus={mode === 'add' && visible}
            size={40}
            variant="enclosed"
            accessibilityLabel={strings.addUpcoming.amountLabel(format(cents))}
          />

          {/* Field first, presets under it, then the category rail: the same
              three beats as the log sheet's Where and Category, in the same
              order (ExpenseSheet moved to field-first on 2026-08-16). The
              presets used to sit above the field and were the sheet's ONLY
              way to set a category, which it never showed. */}
          <Text style={styles.eyebrow}>{strings.addUpcoming.whatIsIt}</Text>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={strings.addUpcoming.namePlaceholder}
            accessibilityLabel={strings.addUpcoming.nameFieldLabel}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.presetRow}
            style={styles.chipScroll}
          >
            {NAME_CHIPS.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                emoji={chip.emoji}
                // tone and shape match the log sheet's two rails: one chip
                // shape per sheet (Chip.md, ADR 0033). The hardcoded per-chip
                // tints went with them; they disagreed with
                // categoryIdentityColor in three of six entries, so the border
                // hue was lying about where the bill would file.
                tone="soft"
                pill
                selected={nameChipKey === chip.key}
                onPress={() => pickNameChip(chip.key)}
              />
            ))}
          </ScrollView>

          {/* Borrows the log sheet's key rather than duplicating the word in
              this namespace: it is the same eyebrow over the same rail, and
              two keys for one word is two translations to keep in sync. */}
          <Text style={styles.eyebrow}>{strings.expenseSheet.categoryEyebrow}</Text>
          <CategoryChipRow
            categories={categories}
            value={category}
            onChange={setCategory}
            scrollToSelected={mode === 'edit' && visible}
          />

          <Text style={styles.eyebrow}>{strings.addUpcoming.schedule}</Text>
          <SegmentedControl<ScheduleType>
            options={[
              { value: 'once', label: strings.addUpcoming.oneTime },
              { value: 'repeats', label: strings.addUpcoming.repeats },
            ]}
            value={scheduleType}
            onChange={handleScheduleTypeChange}
            accessibilityLabel={strings.addUpcoming.scheduleSegmentLabel}
          />

          {scheduleType === 'once' ? (
            <>
              <Text style={styles.subLabel}>{strings.addUpcoming.when}</Text>
              <View style={styles.chipRow}>
                {(
                  [
                    ['tomorrow', strings.addUpcoming.whenTomorrow],
                    ['nextWeek', strings.addUpcoming.whenNextWeek],
                    ['inTwoWeeks', strings.addUpcoming.whenInTwoWeeks],
                    ['nextMonth', strings.addUpcoming.whenNextMonth],
                  ] as ReadonlyArray<[OnceWhen, string]>
                ).map(([key, label]) => (
                  <Chip
                    key={key}
                    label={label}
                    selected={onceWhen === key}
                    onPress={() => handleOnceWhenChange(key)}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={styles.chipRowTop}>
                {(
                  [
                    ['weekly', strings.addUpcoming.frequencyWeekly],
                    ['biweekly', strings.addUpcoming.frequencyBiweekly],
                    ['monthly', strings.addUpcoming.frequencyMonthly],
                    ['annual', strings.addUpcoming.frequencyAnnual],
                    ['custom', strings.addUpcoming.frequencyCustom],
                  ] as ReadonlyArray<[Frequency, string]>
                ).map(([key, label]) => (
                  <Chip
                    key={key}
                    label={label}
                    selected={frequency === key}
                    onPress={() => handleFrequencyChange(key)}
                  />
                ))}
              </View>

              {frequency === 'weekly' || frequency === 'biweekly' ? (
                <>
                  <Text style={styles.subLabel}>{strings.addUpcoming.onWhichDay}</Text>
                  <View style={styles.chipRow}>
                    {WEEKDAY_ORDER.map((day) => (
                      <Chip
                        key={day}
                        label={weekdayShortLabel(day)}
                        selected={weekday === day}
                        onPress={() => handleWeekdayChange(day)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {frequency === 'biweekly' ? (
                <>
                  <Text style={styles.subLabel}>{strings.addUpcoming.starting}</Text>
                  <View style={styles.chipRow}>
                    {(
                      [
                        ['this', strings.addUpcoming.startingThisWeek],
                        ['next', strings.addUpcoming.startingNextWeek],
                      ] as ReadonlyArray<[BiweekStart, string]>
                    ).map(([key, label]) => (
                      <Chip
                        key={key}
                        label={label}
                        selected={biweekStart === key}
                        onPress={() => handleBiweekStartChange(key)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {frequency === 'monthly' ? (
                <>
                  <Text style={styles.subLabel}>{strings.addUpcoming.onThe}</Text>
                  <View style={styles.chipRow}>
                    {MONTH_DAY_CHIPS.map((option) => (
                      <Chip
                        key={option.value}
                        label={option.label}
                        selected={monthDay === option.value}
                        onPress={() => handleMonthDayChange(option.value)}
                      />
                    ))}
                  </View>
                  {monthDay === null ? (
                    // No chip describes an anchor-stepping rule, so rather
                    // than lighting one up falsely the sheet says what the
                    // rule does and what picking a chip would cost. Also the
                    // first place either sheet echoes the date it is about to
                    // write, which is what made this defect invisible.
                    <Text style={styles.anchorNote}>
                      {strings.addUpcoming.monthDayAnchorNote(anchorNextDate)}
                    </Text>
                  ) : null}
                </>
              ) : null}

              {frequency === 'annual' ? (
                <MonthDayPicker
                  month={annualMonth}
                  day={annualDay}
                  onChangeMonth={handleAnnualMonthChange}
                  onChangeDay={handleAnnualDayChange}
                />
              ) : null}

              {frequency === 'custom' ? (
                <>
                  <Text style={styles.subLabel}>{strings.addUpcoming.everyNDaysLabel}</Text>
                  <View style={styles.stepper}>
                    <StepperButton
                      icon="Minus"
                      label={strings.addUpcoming.everyNDaysDecrease}
                      disabled={everyNDays <= MIN_EVERY_N_DAYS}
                      onPress={() => handleEveryNDaysChange(clampEveryNDays(everyNDays - 1))}
                    />
                    <Text style={styles.stepperValue} accessibilityLiveRegion="polite">
                      {strings.addUpcoming.everyNDaysValue(everyNDays)}
                    </Text>
                    <StepperButton
                      icon="Plus"
                      label={strings.addUpcoming.everyNDaysIncrease}
                      disabled={everyNDays >= MAX_EVERY_N_DAYS}
                      onPress={() => handleEveryNDaysChange(clampEveryNDays(everyNDays + 1))}
                    />
                  </View>
                </>
              ) : null}
            </>
          )}
    </Sheet>
  );
}

/**
 * One end of the custom-cadence stepper. An icon-only control, so the spoken
 * label is the only name it has: "Fewer days" / "More days" from strings.ts.
 */
function StepperButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'Minus' | 'Plus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.stepperButton,
        disabled ? styles.stepperButtonDisabled : null,
        pressed && !disabled ? styles.stepperButtonPressed : null,
      ]}
    >
      <Icon name={icon} size={16} color={disabled ? theme.mistText : theme.ink} />
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingTop: 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginTop: 18,
      marginBottom: 8,
    },
    anchorNote: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
      marginTop: 8,
      lineHeight: 17,
    },
    subLabel: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.slate,
      marginTop: 12,
      marginBottom: 8,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chipScroll: {
      marginTop: 10,
    },
    // One line, not a wrapping grid, and gap 8 to match CategoryChipRow's
    // content gap directly below it. Same shape as the log sheet's merchant
    // rail, which is the row this one is now a sibling of.
    presetRow: {
      flexDirection: 'row',
      gap: 8,
    },
    chipRowTop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    stepperButton: {
      width: 44,
      height: 44,
      borderRadius: radii.control,
      borderWidth: 1,
      borderColor: theme.cloud,
      backgroundColor: theme.snow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperButtonPressed: {
      backgroundColor: theme.cloud,
    },
    stepperButtonDisabled: {
      opacity: 0.5,
    },
    stepperValue: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
      minWidth: 110,
      textAlign: 'center',
    },
  });
}
