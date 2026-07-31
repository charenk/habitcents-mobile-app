/**
 * ExpenseRow (design/redesign-handoff/04-screens.md, "Today" 4 and "Money").
 *
 * The single row shape for a logged spend, shared by the Today logged-today
 * list and the Money spent groups so the same expense never looks like two
 * different objects. EmojiTile 36 for identity, name and subtitle stacked on
 * the left, the amount right-aligned in tabular figures.
 *
 * The amount always renders through useCurrency().format with { signed: true }:
 * a spend reads as a negative, and zero-decimal currencies stay correct.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense } from '@/types/expense';

export type ExpenseRowProps = {
  expense: Expense;
  onPress?: () => void;
  /** Secondary line under the name. Defaults to the logged time. */
  subtitle?: string;
};

export function ExpenseRow({ expense, onPress, subtitle }: ExpenseRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { format } = useCurrency();

  const amountLabel = format(expense.amount, { signed: true });
  const secondary = subtitle ?? expense.time;
  const name = expense.title || expense.category;

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
      <Text style={styles.amount} numberOfLines={1}>
        {amountLabel}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={`${name}, ${amountLabel}`}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings.today.editExpenseLabel(name, amountLabel)}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      {body}
    </Pressable>
  );
}

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
      fontSize: 12,
      color: theme.mist,
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
