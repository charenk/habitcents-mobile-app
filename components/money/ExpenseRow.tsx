/**
 * ExpenseRow (design/redesign-handoff/04-screens.md, "Today" 4 and "Money").
 *
 * The single row shape for a logged spend, shared by the Today logged-today
 * list and the Money spent groups so the same expense never looks like two
 * different objects. EmojiTile 36 for identity, name and subtitle stacked on
 * the left, the amount right-aligned in tabular figures.
 *
 * The amount renders unsigned (U7): every row in these lists is a spend, so a
 * minus sign carried no information. Matches Upcoming's unsigned amounts
 * (components/money/UpcomingList.tsx) so the drawer never mixes signed and
 * unsigned figures.
 *
 * ADR 0024 (U11): a row that's part of a recurring schedule -- a materialized
 * child OR the parent's own historical-first-spend row -- carries a small
 * cycle glyph in the trailing area, next to the amount. Shape, not color
 * alone (a Repeat icon, not a tint), and the row's accessible label spells it
 * out too, so the meaning survives VoiceOver.
 */
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { Icon } from '@/components/ui/Icon';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense } from '@/types/expense';
import { isRecurringLedgerRow } from '@/utils/recurring';

export type ExpenseRowProps = {
  expense: Expense;
  onPress?: () => void;
  /** Secondary line under the name. Defaults to the logged time. */
  subtitle?: string;
};

function ExpenseRowImpl({ expense, onPress, subtitle }: ExpenseRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { format } = useCurrency();

  const amountLabel = format(expense.amount);
  const secondary = subtitle ?? expense.time;
  const name = expense.title || expense.category;
  const recurring = isRecurringLedgerRow(expense);

  const baseLabel = onPress
    ? strings.today.editExpenseLabel(name, amountLabel)
    : `${name}, ${amountLabel}`;
  const accessibilityLabel = recurring
    ? `${baseLabel}, ${strings.money.recurringRowSuffix}`
    : baseLabel;

  const body = (
    <>
      <EmojiTile
        emoji={categoryEmoji(expense.category)}
        color={categoryIdentityColor(expense.category)}
        size={36}
      />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {secondary ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
      </View>
      {/* Decorative: the row's own accessibilityLabel above already spells
          out "recurring" in words, so this glyph doesn't need its own
          accessible node -- the parent's `accessible` + accessibilityLabel
          already collapses everything below it into one VoiceOver stop. */}
      {recurring ? <Icon name="Repeat" size={14} color={theme.slate} /> : null}
      {/* Money scales, never truncates (spec 09 section 1 rule 6): the row
          keeps its single line, but the amount shrinks to stay readable
          instead of ellipsizing the number itself. */}
      <Text
        style={styles.amount}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {amountLabel}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      {body}
    </Pressable>
  );
}

/**
 * Memoized: ExpenseRow is the row rendered inside both LoggedTodayList and
 * SpentList, so a single expense mutation elsewhere in the tree (e.g. a toast
 * on an unrelated row) must not re-render every visible row. Only effective
 * when `onPress` is referentially stable; call sites wrap it in useCallback
 * (LoggedTodayList, SpentList) so a re-render of the parent doesn't hand
 * every row a fresh function and defeat the memo.
 */
export const ExpenseRow = memo(ExpenseRowImpl);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    rowPressed: {
      opacity: 0.6,
    },
    text: {
      flex: 1,
    },
    name: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
    },
    subtitle: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
      marginTop: 1,
    },
    amount: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
      marginLeft: 8,
    },
  });
}
