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
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { strings } from '@/constants/strings';
import { lightTheme, radii, typeScale } from '@/constants/theme';
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
import { hapticSuccess } from '@/utils/motion';
import { nextOccurrence, resolveRule } from '@/utils/recurring';

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
 * Category identity hues. Read from the light palette because the chip tints
 * are the same in both themes (darkTheme.categoryColors aliases these), and
 * NAME_CHIPS is module scope, so it cannot reach useTheme().
 */
const TINTS = lightTheme.categoryColors;

/**
 * The six name chips from spec 04. Each carries the stored ExpenseCategory it
 * files under, plus its own glyph and tint, so the row it creates looks right
 * in every list without a second lookup table. Spec hues: Rent lavender,
 * Internet and Phone cyan, Gym amber, Insurance blue, Utilities orange.
 */
const NAME_CHIPS: ReadonlyArray<{
  key: string;
  label: string;
  emoji: string;
  tint: string;
  category: ExpenseCategory;
}> = [
  { key: 'rent', label: strings.addUpcoming.nameRent, emoji: '🏠', tint: TINTS.housing, category: 'Mortgage' },
  { key: 'internet', label: strings.addUpcoming.nameInternet, emoji: '📡', tint: TINTS.subscriptions, category: 'Utilities' },
  { key: 'phone', label: strings.addUpcoming.namePhone, emoji: '📱', tint: TINTS.subscriptions, category: 'Software & Subscriptions' },
  { key: 'gym', label: strings.addUpcoming.nameGym, emoji: '🏋️', tint: TINTS.entertainment, category: 'Entertainment' },
  { key: 'insurance', label: strings.addUpcoming.nameInsurance, emoji: '🛡️', tint: TINTS.transport, category: 'Other' },
  { key: 'utilities', label: strings.addUpcoming.nameUtilities, emoji: '💡', tint: TINTS.groceries, category: 'Utilities' },
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
  monthDay: MonthDayOption;
  everyNDays: number;
};

/**
 * The rule to store and the date of its first occurrence. Exported shape is
 * the whole write contract: `date` becomes `expense.date`.
 */
function buildSchedule(draft: ScheduleDraft, today: Date): { rule: RecurrenceRule; date: Date } {
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
    // Same month/day as today, one year out -- matches `advance()`'s own
    // annual step in utils/recurring.ts exactly, so the first stored
    // occurrence is what that function would compute as "the next one" too.
    const date = new Date(today);
    date.setFullYear(date.getFullYear() + 1);
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
    everyNDays: DEFAULT_EVERY_N_DAYS,
  };

  switch (rule.type) {
    case 'weekly':
      return { ...base, frequency: 'weekly', weekday: rule.weekday };
    case 'biweekly':
      return { ...base, frequency: 'biweekly', weekday: rule.weekday };
    case 'monthly':
      return { ...base, frequency: 'monthly', monthDay: rule.monthDay ?? '1' };
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
  const { height } = useWindowDimensions();
  const { show } = useToast();
  const { format } = useCurrency();
  const { getVisibleCategories } = useCategories();
  const { addExpense, updateExpense, deleteExpense, restoreExpense, expenses } = useExpenses();

  const categories = getVisibleCategories();

  const [cents, setCents] = useState(0);
  const [nameChipKey, setNameChipKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('repeats');
  const [onceWhen, setOnceWhen] = useState<OnceWhen>('tomorrow');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [weekday, setWeekday] = useState<Weekday>(new Date().getDay() as Weekday);
  const [biweekStart, setBiweekStart] = useState<BiweekStart>('this');
  const [monthDay, setMonthDay] = useState<MonthDayOption>('1');
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
      setScheduleType(draft.scheduleType);
      setOnceWhen(draft.onceWhen);
      setFrequency(draft.frequency);
      setWeekday(draft.weekday);
      setBiweekStart(draft.biweekStart);
      setMonthDay(draft.monthDay);
      setEveryNDays(draft.everyNDays);
      return;
    }

    setCents(0);
    setNameChipKey(null);
    setName('');
    setScheduleType('repeats');
    setOnceWhen('tomorrow');
    setFrequency('monthly');
    setWeekday(new Date().getDay() as Weekday);
    setBiweekStart('this');
    setMonthDay('1');
    setEveryNDays(DEFAULT_EVERY_N_DAYS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, expense]);

  const pickNameChip = (key: string) => {
    const chip = NAME_CHIPS.find((c) => c.key === key);
    if (!chip) return;
    setNameChipKey(key);
    // The chip prefills the field; the field stays editable, so "Gym" can
    // become "Gym membership" without losing the category the chip picked.
    setName(chip.label);
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
  const handleMonthDayChange = (v: MonthDayOption) => {
    if (v !== monthDay) setScheduleTouched(true);
    setMonthDay(v);
  };
  const handleEveryNDaysChange = (v: number) => {
    if (v !== everyNDays) setScheduleTouched(true);
    setEveryNDays(v);
  };

  const handleSave = () => {
    if (cents <= 0) {
      show(strings.toasts.enterAmountFirst);
      return;
    }

    const chip = NAME_CHIPS.find((c) => c.key === nameChipKey);
    // Edit mode with no chip selected keeps the row's own category rather than
    // falling back to 'Other', so recategorizing was never a silent side
    // effect of, say, just fixing a typo in the name.
    const fallbackCategory: ExpenseCategory = mode === 'edit' && expense ? expense.category : 'Other';
    const category: ExpenseCategory = chip?.category ?? fallbackCategory;
    const match = categories.find((c) => toExpenseCategory(c.name) === category);
    const title = name.trim() || chip?.label || match?.name || category;

    const original = mode === 'edit' && expense ? resolveRule(expense) : null;
    const { rule, date } =
      mode === 'edit' && expense && !scheduleTouched && original
        ? { rule: original, date: expense.date }
        : buildSchedule(
            { scheduleType, onceWhen, frequency, weekday, biweekStart, monthDay, everyNDays },
            startOfToday()
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
      void updateExpense(expense.id, {
        title,
        amount: cents,
        category,
        categoryId: match?.id,
        date: safeDate,
        isRecurring: rule.type !== 'once',
        recurrence: legacyRecurrence(rule),
        recurrenceRule: rule,
      });
      show(strings.toasts.saved);
      onClose();
      return;
    }

    void addExpense({
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
    void deleteExpense(removed.id);
    show(strings.toasts.deleted, {
      action: {
        label: strings.toasts.undo,
        onPress: () => {
          void restoreExpense(removed, index < 0 ? 0 : index).then(() => {
            show(strings.toasts.restored);
          });
        },
      },
    });
  };

  const title = mode === 'edit' ? strings.addUpcoming.editTitle : strings.addUpcoming.title;
  const saveLabel = mode === 'edit' ? strings.addUpcoming.saveChanges : strings.addUpcoming.save;

  return (
    <Sheet visible={visible} onClose={onClose} avoidKeyboard accessibilityLabel={title}>
      <View style={[styles.body, { maxHeight: height * 0.82 }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
            {title}
          </Text>

          <AmountField
            valueCents={cents}
            onChangeCents={setCents}
            autoFocus={mode === 'add' && visible}
            size={48}
            accessibilityLabel={strings.addUpcoming.amountLabel(format(cents))}
          />

          <Text style={styles.eyebrow}>{strings.addUpcoming.whatIsIt}</Text>
          <View style={styles.chipRow}>
            {NAME_CHIPS.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                emoji={chip.emoji}
                tint={chip.tint}
                selected={nameChipKey === chip.key}
                onPress={() => pickNameChip(chip.key)}
              />
            ))}
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={strings.addUpcoming.namePlaceholder}
            placeholderTextColor={theme.mist}
            style={styles.nameField}
            accessibilityLabel={strings.addUpcoming.nameFieldLabel}
            returnKeyType="done"
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
                </>
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
        </ScrollView>

        <View style={styles.footer}>
          <Button label={saveLabel} onPress={handleSave} variant="primary" style={styles.save} />
          {mode === 'edit' ? (
            <Button
              label={strings.addUpcoming.deleteUpcoming}
              onPress={handleDelete}
              variant="destructive"
              style={styles.delete}
            />
          ) : null}
        </View>
      </View>
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
      <Icon name={icon} size={16} color={disabled ? theme.mist : theme.ink} />
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: {
      flexShrink: 1,
    },
    scroll: {
      flexShrink: 1,
    },
    content: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: 26,
      lineHeight: 32,
      color: theme.ink,
      includeFontPadding: false,
      marginBottom: 12,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mist,
      marginTop: 18,
      marginBottom: 8,
    },
    subLabel: {
      fontFamily: theme.fonts.ui,
      fontSize: 12,
      color: theme.slate,
      marginTop: 12,
      marginBottom: 8,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chipRowTop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
    },
    nameField: {
      marginTop: 10,
      minHeight: 44,
      borderRadius: radii.control,
      borderWidth: 1,
      borderColor: theme.cloud,
      backgroundColor: theme.snow,
      paddingHorizontal: 14,
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.body,
      color: theme.ink,
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
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 8,
    },
    save: {
      marginTop: 0,
    },
    delete: {
      marginTop: 0,
    },
  });
}
