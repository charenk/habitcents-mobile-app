/**
 * SpentList (design/redesign-handoff/04-screens.md, "Money" > Spent; U7).
 *
 * Today always renders first, pinned above every other day, in both states: a
 * card of rows under a totalled eyebrow, or (nothing logged yet today) the
 * same eyebrow with no total over one compact line. Without this pin, the
 * list opened on whichever day happened to have the most recent data and
 * today could scroll off entirely.
 *
 * Grouping comes from `groupExpensesByDate` (data/expensesMock.ts), which
 * returns a stable per-day key only, never display text. This component is
 * the single label pipeline: `dayLabelFor` is the only place a day turns into
 * "Today" / "Yesterday" / a formatted date, via the locale-aware helpers in
 * utils/dates (ADA-008). Nothing else should re-derive a day label.
 *
 * This component renders history only. The caller is responsible for excluding
 * anything scheduled in the future: a bill due next month is not money spent.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ExpenseRow } from '@/components/money/ExpenseRow';
import { EmptyState } from '@/components/ui';
import { strings } from '@/constants/strings';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense, ExpenseSection } from '@/types/expense';
import { formatDate } from '@/utils/dates';

export type SpentListProps = {
  sections: ExpenseSection[];
  /** Opens the edit sheet for a row. */
  onEditExpense: (expense: Expense) => void;
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Today · Aug 10" / "Yesterday · Aug 9" / "Aug 8", in the device locale. */
function dayLabelFor(date: Date): string {
  const dateLabel = formatDate(date, { month: 'short', day: 'numeric' });
  const today = new Date();
  if (isSameDay(date, today)) {
    return strings.money.spentDayLabel(strings.money.spentToday, dateLabel);
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return strings.money.spentDayLabel(strings.money.spentYesterday, dateLabel);
  }

  return dateLabel;
}

// Day totals are a plain sum of what was logged, so the eyebrow reads as an
// amount, not a signed delta.
function totalFor(section: ExpenseSection): number {
  return section.data.reduce((sum, e) => sum + e.amount, 0);
}

function DayCard({
  section,
  onEditExpense,
  styles,
}: {
  section: ExpenseSection;
  onEditExpense: (expense: Expense) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.card}>
      {section.data.map((expense, index) => (
        <View key={expense.id} style={[styles.rowWrap, index === 0 ? styles.rowWrapFirst : null]}>
          <ExpenseRow expense={expense} onPress={() => onEditExpense(expense)} />
        </View>
      ))}
    </View>
  );
}

export function SpentList({ sections, onEditExpense }: SpentListProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { format } = useCurrency();

  const today = new Date();
  const todaySection = sections.find((section) => isSameDay(section.data[0].date, today));
  const pastSections = sections.filter((section) => section !== todaySection);
  // No expenses ever, today included: the whole-list EmptyState renders
  // below the (empty) Today block rather than replacing it.
  const neverLogged = sections.length === 0;

  return (
    <View>
      <View style={styles.group}>
        <Text style={styles.eyebrow} accessibilityRole="header">
          {todaySection
            ? strings.money.spentGroupHeader(dayLabelFor(today), format(totalFor(todaySection)))
            : dayLabelFor(today)}
        </Text>
        {todaySection ? (
          <DayCard section={todaySection} onEditExpense={onEditExpense} styles={styles} />
        ) : (
          <View style={styles.todayEmptyCard}>
            <Text style={styles.todayEmptyText}>{strings.money.spentTodayEmpty}</Text>
          </View>
        )}
      </View>

      {pastSections.map((section) => (
        <View key={section.title} style={styles.group}>
          <Text style={styles.eyebrow} accessibilityRole="header">
            {strings.money.spentGroupHeader(dayLabelFor(section.data[0].date), format(totalFor(section)))}
          </Text>
          <DayCard section={section} onEditExpense={onEditExpense} styles={styles} />
        </View>
      ))}

      {neverLogged ? (
        <View style={styles.empty}>
          <EmptyState title={strings.money.spentEmptyTitle} body={strings.money.spentEmptyBody} />
        </View>
      ) : (
        <Text style={styles.hint}>{strings.money.spentEditHint}</Text>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    group: {
      marginBottom: 14,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginBottom: 6,
      marginLeft: 4,
      // UX-066: the day total lives in this string (spentGroupHeader), so it
      // needs the same tabular treatment as every other number that can sit
      // above another number.
      fontVariant: ['tabular-nums'],
    },
    card: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.card,
      paddingHorizontal: 16,
    },
    rowWrap: {
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
    },
    rowWrapFirst: {
      borderTopWidth: 0,
    },
    // Deliberately not the EmptyState primitive: one compact line so past
    // days stay visible below it, not a full centered empty treatment.
    todayEmptyCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    todayEmptyText: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
    },
    hint: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
      textAlign: 'center',
      marginTop: 24,
    },
    empty: {
      paddingVertical: 40,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
  });
}
