/**
 * SpentList (design/redesign-handoff/04-screens.md, "Money" > Spent).
 *
 * Day groups of already-spent rows: an eyebrow "TODAY · $20.70" over a white
 * card of ExpenseRows. Grouping comes from `groupExpensesByDate` so the Money
 * tab and every other list bucket a day identically.
 *
 * The day label is rebuilt here rather than taken from `section.title`, because
 * that helper formats with a hardcoded en-US locale and an ASCII hyphen. Today
 * and Yesterday come from strings.ts and any other day goes through
 * `utils/dates formatDate`, so no locale is baked in (ADA-008).
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

/** "Today" / "Yesterday" / "Jul 22", in the device locale. */
function dayLabelFor(date: Date): string {
  const today = new Date();
  if (isSameDay(date, today)) return strings.money.spentToday;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return strings.money.spentYesterday;

  return formatDate(date, { month: 'short', day: 'numeric' });
}

export function SpentList({ sections, onEditExpense }: SpentListProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { format } = useCurrency();

  if (sections.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState title={strings.money.spentEmptyTitle} body={strings.money.spentEmptyBody} />
      </View>
    );
  }

  return (
    <View>
      {sections.map((section) => {
        const groupDate = section.data[0].date;
        // Day totals are a plain sum of what was logged, so the eyebrow reads
        // as an amount, not a signed delta.
        const total = section.data.reduce((sum, e) => sum + e.amount, 0);

        return (
          <View key={section.title} style={styles.group}>
            <Text style={styles.eyebrow} accessibilityRole="header">
              {strings.money.spentGroupHeader(dayLabelFor(groupDate), format(total))}
            </Text>
            <View style={styles.card}>
              {section.data.map((expense, index) => (
                <View
                  key={expense.id}
                  style={[styles.rowWrap, index === 0 ? styles.rowWrapFirst : null]}
                >
                  <ExpenseRow expense={expense} onPress={() => onEditExpense(expense)} />
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <Text style={styles.hint}>{strings.money.spentEditHint}</Text>
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
      color: theme.mist,
      marginBottom: 6,
      marginLeft: 4,
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
    hint: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mist,
      textAlign: 'center',
      marginTop: 4,
    },
    empty: {
      paddingVertical: 40,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
  });
}
