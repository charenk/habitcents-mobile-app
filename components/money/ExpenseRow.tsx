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
 *
 * DYNAMIC TYPE (2026-09-11): at the five iOS accessibility sizes this row
 * STACKS instead of competing. The name and the amount are both content, so
 * neither may be capped (see utils/textScale.ts), and at AX3 they each want
 * ~43pt type in a 393pt row: the name was starving to "S.." while the amount
 * sat at its 0.7 floor. ADR 0039 had already given the amount `flexShrink` and
 * `adjustsFontSizeToFit`, which is the right answer up to XXXL and simply runs
 * out of room past it. Stacked, both get the full width and nothing truncates.
 * The subtitle is metadata, so it caps.
 */
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { Icon } from '@/components/ui/Icon';
import { categoryIdentityColor, expenseGlyph } from '@/constants/categoryEmoji';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense } from '@/types/expense';
import { categoryDisplayLabel } from '@/utils/leakScanBridge';
import { isRecurringLedgerRow } from '@/utils/recurring';
import { CHROME_MAX_FONT_SCALE, useAccessibilityTextSize } from '@/utils/textScale';

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
  const stacked = useAccessibilityTextSize();

  const amountLabel = format(expense.amount);
  const secondary = subtitle ?? expense.time;
  // Untitled rows fall back to the category, mapped to its display name so a
  // stored 'Mortgage' / 'Software & Subscriptions' never reaches the screen.
  const name = expense.title || categoryDisplayLabel(expense.category);
  const recurring = isRecurringLedgerRow(expense);

  const baseLabel = onPress
    ? strings.today.editExpenseLabel(name, amountLabel)
    : `${name}, ${amountLabel}`;
  const accessibilityLabel = recurring
    ? `${baseLabel}, ${strings.money.recurringRowSuffix}`
    : baseLabel;

  const amountText = (
    /* Money scales, never truncates (spec 09 section 1 rule 6): side by side
       the amount shrinks to stay readable rather than ellipsizing the number.
       Stacked it has the whole row, so it neither shrinks nor truncates. */
    <Text
      style={[styles.amount, stacked ? styles.amountStacked : null]}
      numberOfLines={1}
      adjustsFontSizeToFit={!stacked}
      minimumFontScale={0.7}
    >
      {amountLabel}
    </Text>
  );

  const body = (
    <>
      <EmojiTile
        emoji={expenseGlyph(expense)}
        color={categoryIdentityColor(expense.category)}
        size={36}
      />
      <View style={styles.text}>
        {/* Two lines when stacked: a long merchant gets to finish its word
            rather than ellipsizing, and the row is already growing anyway. */}
        <Text style={styles.name} numberOfLines={stacked ? 2 : 1}>
          {name}
        </Text>
        {secondary ? (
          <Text
            style={styles.subtitle}
            numberOfLines={1}
            maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}
          >
            {secondary}
          </Text>
        ) : null}
        {stacked ? amountText : null}
      </View>
      {/* Decorative: the row's own accessibilityLabel above already spells
          out "recurring" in words, so this glyph doesn't need its own
          accessible node -- the parent's `accessible` + accessibilityLabel
          already collapses everything below it into one VoiceOver stop. */}
      {recurring ? <Icon name="Repeat" size={14} color={theme.slate} /> : null}
      {stacked ? null : amountText}
    </>
  );

  // Stacked rows align to the top so the tile sits beside the NAME rather than
  // floating at the centre of a three-line block.
  const rowStyle = [styles.row, stacked ? styles.rowStacked : null];

  if (!onPress) {
    return (
      <View style={rowStyle} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...rowStyle, pressed ? styles.rowPressed : null]}
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
    rowStacked: {
      alignItems: 'flex-start',
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
      // Without this the adjustsFontSizeToFit above never fires (ADR 0039).
      // RN defaults flexShrink to 0, so the amount took its full intrinsic
      // width, nothing constrained it, and there was nothing to shrink. The
      // name block beside it absorbed the whole deficit and starved to an
      // ellipsis at large text. One line fixes both halves.
      flexShrink: 1,
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
      marginLeft: 8,
    },
    amountStacked: {
      // Back under the name, so it reads as part of the same block and takes
      // the left edge the name and subtitle already sit on.
      marginLeft: 0,
      marginTop: 4,
      alignSelf: 'flex-start',
    },
  });
}
