/**
 * LoggedTodayList (redesign U5, ADR 0019, DI-5): the logged-today block,
 * extracted verbatim from the old Today screen footer. Eyebrow, a white card
 * of ExpenseRow with hairline separators between rows, empty copy when
 * nothing has been logged yet today.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ExpenseRow } from '@/components/money/ExpenseRow';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { Expense } from '@/types/expense';

export type LoggedTodayListProps = {
  expenses: Expense[];
  onEditExpense: (e: Expense) => void;
};

export function LoggedTodayList({ expenses, onEditExpense }: LoggedTodayListProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View>
      <Text style={[styles.eyebrow, styles.loggedTodayEyebrow]}>
        {strings.today.loggedTodayEyebrow.toUpperCase()}
      </Text>
      {expenses.length === 0 ? (
        <View style={styles.loggedTodayCard}>
          <Text style={styles.loggedTodayEmpty}>{strings.today.loggedTodayEmpty}</Text>
        </View>
      ) : (
        <View style={styles.loggedTodayCard}>
          {expenses.map((expense, i) => (
            <View key={expense.id} style={i > 0 ? styles.loggedTodaySeparator : undefined}>
              <ExpenseRow expense={expense} onPress={() => onEditExpense(expense)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.mist,
    },
    loggedTodayEyebrow: {
      marginTop: 24,
      marginBottom: 8,
    },
    loggedTodayCard: {
      backgroundColor: theme.white,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
    },
    loggedTodaySeparator: {
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
    },
    loggedTodayEmpty: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.mist,
      paddingVertical: 16,
    },
  });
}
