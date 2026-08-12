/**
 * LoggedTodayList (redesign U5, ADR 0019, DI-5): the logged-today block,
 * extracted verbatim from the old Today screen footer. Eyebrow, a white card
 * of ExpenseRow with hairline separators between rows, empty copy when
 * nothing has been logged yet today.
 *
 * U6 (decided fixes b and c): renamed eyebrow ("Today's log") plus an
 * optional trailing "View all" link on the eyebrow row. onViewAll stays
 * optional and the link renders only when both it is supplied AND at least
 * one expense exists today, so this component stays reusable anywhere the
 * link doesn't apply.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ExpenseRow } from '@/components/money/ExpenseRow';
import { EmptyState } from '@/components/ui';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { Expense } from '@/types/expense';

export type LoggedTodayListProps = {
  expenses: Expense[];
  onEditExpense: (e: Expense) => void;
  onViewAll?: () => void;
};

export function LoggedTodayList({ expenses, onEditExpense, onViewAll }: LoggedTodayListProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const showViewAll = !!onViewAll && expenses.length > 0;

  return (
    <View>
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow}>{strings.today.loggedTodayEyebrow.toUpperCase()}</Text>
        {showViewAll ? (
          <TouchableOpacity
            onPress={onViewAll}
            // 13pt text sits well under the 44pt minimum on its own; this
            // hitSlop pads it out to at least 44pt tall (13 + 13 + the
            // roughly 18pt line the text renders at) without changing the
            // row's visible height.
            hitSlop={{ top: 13, bottom: 13, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={strings.today.loggedTodayViewAll}
          >
            <Text style={styles.viewAllLink}>{strings.today.loggedTodayViewAll}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {expenses.length === 0 ? (
        <View style={[styles.loggedTodayCard, styles.loggedTodayEmptyWrap]}>
          <EmptyState body={strings.today.loggedTodayEmpty} />
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
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 24,
      marginBottom: 8,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.mistText,
    },
    // Tertiary text link (design/PATTERN_VOCABULARY.md controls: "tertiary
    // bare slate text"), sentence case, not an eyebrow.
    viewAllLink: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
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
    loggedTodayEmptyWrap: {
      paddingVertical: 16,
    },
  });
}
