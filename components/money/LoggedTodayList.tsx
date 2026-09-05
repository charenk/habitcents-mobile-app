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
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ExpenseRow } from '@/components/money/ExpenseRow';
import { InfoRibbon } from '@/components/ui/InfoRibbon';
import { radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { Expense } from '@/types/expense';

export type LoggedTodayListProps = {
  expenses: Expense[];
  onEditExpense: (e: Expense) => void;
  onViewAll?: () => void;
};

/**
 * ExpenseRow is React.memo'd, which only pays off if `onPress` is
 * referentially stable. This wrapper exists so useCallback can build a
 * per-expense handler once (keyed on the expense object and the stable
 * onEditExpense setter) instead of the inline `() => onEditExpense(expense)`
 * arrow the old .map() body recreated on every render.
 */
const ExpenseRowItem = memo(function ExpenseRowItem({
  expense,
  onEditExpense,
}: {
  expense: Expense;
  onEditExpense: (e: Expense) => void;
}) {
  const handlePress = useCallback(() => onEditExpense(expense), [expense, onEditExpense]);
  return <ExpenseRow expense={expense} onPress={handlePress} />;
});

export function LoggedTodayList({ expenses, onEditExpense, onViewAll }: LoggedTodayListProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const showViewAll = !!onViewAll && expenses.length > 0;

  return (
    <View>
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow}>{strings.today.loggedTodayEyebrow}</Text>
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
        // Quiet day: the persistent InfoRibbon (no X) stands in for the card
        // (Charen's Today annotations, 2026-09-04), the same band the
        // first-run line uses under a populated card, so "nothing yet" and
        // "just logged" speak in one voice inside the list section.
        <InfoRibbon line={strings.today.loggedTodayEmpty} testID="logged-today-quiet" />
      ) : (
        <View style={styles.loggedTodayCard}>
          {expenses.map((expense, i) => (
            <View key={expense.id} style={i > 0 ? styles.loggedTodaySeparator : undefined}>
              <ExpenseRowItem expense={expense} onEditExpense={onEditExpense} />
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
      // Was 24, which was clearance from the quick-log card that used to sit
      // directly above this block. The card moved to the pane's dock in ADR
      // 0038, so that 24 stacked on the chips' own 12pt marginBottom and left
      // a 48pt hole under the scoreboard. Today (its only consumer) supplies
      // the gap now, at the pane's 12pt stack rhythm.
      marginBottom: 8,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      // UX-060: the component uppercases via style, never with a JS
      // .toUpperCase() on the string. Strings stay sentence case so screen
      // readers speak them as words rather than letters, and the transform is
      // locale-aware.
      textTransform: 'uppercase',
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
      // radii.feature, not radii.card: this is a top-level Today surface and it
      // sits directly under the quick-log card, which is feature. Two adjacent
      // cards of the same rank were carrying 14 and 20. radii.card stays the
      // inner-control radius (the quick-log amount field, chips).
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.border,
      // Was 12, the tightest interior padding on the screen and 6pt left of the
      // check-in and leak cards. spacing.xl is the ratified top-level value.
      paddingHorizontal: spacing.xl,
    },
    loggedTodaySeparator: {
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
    },
  });
}
