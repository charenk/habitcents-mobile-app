/**
 * AddUpcomingSheet (design/redesign-handoff/04-screens.md, "Add-upcoming sheet").
 *
 * The one place a user can author a schedule by hand. Amount first, then what
 * it is, then when: the same order as the log sheet, so the two never feel like
 * different apps.
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
 *    before step 04 still projects weekly / bi-weekly / monthly items. 'once'
 *    and 'custom' have no legacy equivalent and leave `recurrence` undefined,
 *    which those readers correctly treat as "no legacy schedule" rather than
 *    guessing one.
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
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Keypad } from '@/components/ui/Keypad';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { strings } from '@/constants/strings';
import { lightTheme, radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  ExpenseCategory,
  MonthDayOption,
  RecurrenceFrequency,
  RecurrenceRule,
  Weekday,
} from '@/types/expense';
import { formatDate } from '@/utils/dates';
import { toExpenseCategory } from '@/utils/expenseCategory';
import { keypadValueToCents } from '@/utils/keypad';
import { hapticSuccess } from '@/utils/motion';

export type AddUpcomingSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type ScheduleType = 'once' | 'repeats';
type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
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

  // Custom: the first payment is one full cadence away, not today.
  const everyNDays = clampEveryNDays(draft.everyNDays);
  return { rule: { type: 'custom', everyNDays }, date: addDays(today, everyNDays) };
}

export function AddUpcomingSheet({ visible, onClose }: AddUpcomingSheetProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { height } = useWindowDimensions();
  const { show } = useToast();
  const { getVisibleCategories } = useCategories();
  const { addExpense } = useExpenses();

  const categories = getVisibleCategories();

  const [value, setValue] = useState('');
  const [nameChipKey, setNameChipKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('repeats');
  const [onceWhen, setOnceWhen] = useState<OnceWhen>('tomorrow');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [weekday, setWeekday] = useState<Weekday>(new Date().getDay() as Weekday);
  const [biweekStart, setBiweekStart] = useState<BiweekStart>('this');
  const [monthDay, setMonthDay] = useState<MonthDayOption>('1');
  const [everyNDays, setEveryNDays] = useState(DEFAULT_EVERY_N_DAYS);

  // Every open starts clean, so an abandoned draft never becomes the next bill.
  useEffect(() => {
    if (!visible) return;
    setValue('');
    setNameChipKey(null);
    setName('');
    setScheduleType('repeats');
    setOnceWhen('tomorrow');
    setFrequency('monthly');
    setWeekday(new Date().getDay() as Weekday);
    setBiweekStart('this');
    setMonthDay('1');
    setEveryNDays(DEFAULT_EVERY_N_DAYS);
  }, [visible]);

  const cents = keypadValueToCents(value);

  const pickNameChip = (key: string) => {
    const chip = NAME_CHIPS.find((c) => c.key === key);
    if (!chip) return;
    setNameChipKey(key);
    // The chip prefills the field; the field stays editable, so "Gym" can
    // become "Gym membership" without losing the category the chip picked.
    setName(chip.label);
  };

  const handleSave = () => {
    if (cents <= 0) {
      show(strings.toasts.enterAmountFirst);
      return;
    }

    const chip = NAME_CHIPS.find((c) => c.key === nameChipKey);
    const category: ExpenseCategory = chip?.category ?? 'Other';
    const match = categories.find((c) => toExpenseCategory(c.name) === category);
    const title = name.trim() || chip?.label || match?.name || category;

    const { rule, date } = buildSchedule(
      { scheduleType, onceWhen, frequency, weekday, biweekStart, monthDay, everyNDays },
      startOfToday()
    );

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

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      accessibilityLabel={strings.addUpcoming.title}
    >
      <ScrollView
        style={{ maxHeight: height * 0.82 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          {strings.addUpcoming.title}
        </Text>

        <AmountDisplay valueCents={cents} focused size={44} zeroAsPlaceholder />

        <View style={styles.keypad}>
          <Keypad value={value} onChange={setValue} />
        </View>

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
          onChange={setScheduleType}
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
                  onPress={() => setOnceWhen(key)}
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
                  ['custom', strings.addUpcoming.frequencyCustom],
                ] as ReadonlyArray<[Frequency, string]>
              ).map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={frequency === key}
                  onPress={() => setFrequency(key)}
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
                      onPress={() => setWeekday(day)}
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
                      onPress={() => setBiweekStart(key)}
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
                      onPress={() => setMonthDay(option.value)}
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
                    onPress={() => setEveryNDays((n) => clampEveryNDays(n - 1))}
                  />
                  <Text style={styles.stepperValue} accessibilityLiveRegion="polite">
                    {strings.addUpcoming.everyNDaysValue(everyNDays)}
                  </Text>
                  <StepperButton
                    icon="Plus"
                    label={strings.addUpcoming.everyNDaysIncrease}
                    disabled={everyNDays >= MAX_EVERY_N_DAYS}
                    onPress={() => setEveryNDays((n) => clampEveryNDays(n + 1))}
                  />
                </View>
              </>
            ) : null}
          </>
        )}

        <Button
          label={strings.addUpcoming.save}
          onPress={handleSave}
          variant="primary"
          style={styles.save}
        />
      </ScrollView>
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
    content: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: 26,
      lineHeight: 32,
      color: theme.ink,
      includeFontPadding: false,
      marginBottom: 12,
    },
    keypad: {
      marginTop: 16,
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
    save: {
      marginTop: 20,
    },
  });
}
