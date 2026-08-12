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
 *
 * UX-016/034: after a year of daily logging this list can carry 1000+ rows.
 * It renders as a SectionList (app/(tabs)/index.tsx's own convention) rather
 * than mapping every row inside a plain ScrollView, so only the rows actually
 * on screen mount, and an edit to one expense re-renders one row instead of
 * the whole history. The visual output is unchanged: each day is still one
 * bordered card of ExpenseRow rows with hairline separators between them.
 * SectionList has no "wrap this section's items in one card" primitive, so
 * that card border is rebuilt per-item below (cardRow/cardRowFirst/
 * cardRowLast, plus an inner rowHairline): every row gets the card's left/right border,
 * only the first item in a section gets the top edge (with top corner
 * radius), only the last gets the bottom edge (with bottom corner radius),
 * and every non-first item gets the same internal hairline the old nested
 * rowWrap/rowWrapFirst View pair drew. Adjacent rows sit with no gap between
 * them (SectionList's default), so the seam is invisible and the result is
 * pixel-identical to the single big bordered box the old version rendered.
 */
import { memo, useCallback, useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
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

/**
 * ExpenseRow is React.memo'd (see components/money/ExpenseRow.tsx), which
 * only pays off if `onPress` is referentially stable. This wrapper builds a
 * per-expense handler once via useCallback instead of the inline
 * `() => onEditExpense(item)` arrow SectionList's renderItem would otherwise
 * recreate for every visible row on every render.
 */
const SpentExpenseRow = memo(function SpentExpenseRow({
  expense,
  onEditExpense,
}: {
  expense: Expense;
  onEditExpense: (e: Expense) => void;
}) {
  const handlePress = useCallback(() => onEditExpense(expense), [expense, onEditExpense]);
  return <ExpenseRow expense={expense} onPress={handlePress} />;
});

// Sentinel section title for the synthetic "Today, nothing logged yet"
// section (see below): never collides with a real grouping key, which is
// always `${year}-${month}-${date}` (data/expensesMock.ts groupExpensesByDate).
const TODAY_EMPTY_KEY = '__today_empty__';

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

export function SpentList({ sections, onEditExpense }: SpentListProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { format } = useCurrency();

  const today = new Date();
  // No expenses ever, today included: the whole-list EmptyState renders
  // below the (empty) Today block rather than replacing it.
  const neverLogged = sections.length === 0;

  // Today is always the first section, synthesized empty if nothing was
  // logged yet today, exactly as the old find/filter split did.
  //
  // dayKey is a real dependency, not a formality: `sections` only changes
  // identity when an expense mutates, so memoizing on it alone would keep
  // yesterday's section pinned as the head after midnight, with no empty
  // Today block above it, until the next write. The old uncached find/filter
  // could not go stale that way.
  const dayKey = today.toDateString();
  const listSections: ExpenseSection[] = useMemo(() => {
    const todaySection = sections.find((section) => isSameDay(section.data[0].date, today));
    const pastSections = sections.filter((section) => section !== todaySection);
    const head: ExpenseSection = todaySection ?? { title: TODAY_EMPTY_KEY, data: [] };
    return [head, ...pastSections];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, dayKey]);

  const renderItem = ({
    item,
    index,
    section,
  }: {
    item: Expense;
    index: number;
    section: ExpenseSection;
  }) => {
    const isFirst = index === 0;
    const isLast = index === section.data.length - 1;
    return (
      <View style={[styles.cardRow, isFirst && styles.cardRowFirst, isLast && styles.cardRowLast]}>
        {/* The hairline lives on an INNER view, inside cardRow's horizontal
            padding. Putting it on cardRow itself draws the border across the
            full border box, so separators ran edge to edge into the side
            borders instead of sitting inset like the old card's rowWrap. */}
        <View style={!isFirst ? styles.rowHairline : undefined}>
          <SpentExpenseRow expense={item} onEditExpense={onEditExpense} />
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: ExpenseSection }) => (
    <Text style={styles.eyebrow} accessibilityRole="header">
      {section.data.length > 0
        ? strings.money.spentGroupHeader(dayLabelFor(section.data[0].date), format(totalFor(section)))
        : dayLabelFor(today)}
    </Text>
  );

  // The empty-today compact card, and the 14pt gap the old `group` wrapper
  // put after every section (populated or not) before the next one starts.
  const renderSectionFooter = ({ section }: { section: ExpenseSection }) => (
    <View style={styles.sectionFooter}>
      {section.title === TODAY_EMPTY_KEY ? (
        <View style={styles.todayEmptyCard}>
          <Text style={styles.todayEmptyText}>{strings.money.spentTodayEmpty}</Text>
        </View>
      ) : null}
    </View>
  );

  const listFooter = neverLogged ? (
    <View style={styles.empty}>
      <EmptyState title={strings.money.spentEmptyTitle} body={strings.money.spentEmptyBody} />
    </View>
  ) : (
    <Text style={styles.hint}>{strings.money.spentEditHint}</Text>
  );

  return (
    <SectionList<Expense, ExpenseSection>
      sections={listSections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      renderSectionFooter={renderSectionFooter}
      ListFooterComponent={listFooter}
      style={styles.container}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    // Matches money.tsx's old outer ScrollView (style: flex:1, contentContainerStyle:
    // paddingHorizontal 20 / paddingTop 12 / paddingBottom 24), now owned here
    // since this list is its own scroll container instead of nesting inside one.
    container: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginBottom: 6,
      marginLeft: 4,
    },
    // The outer "card" border, split across every row in a section (see file
    // header comment): left/right always on, top only on the first row (with
    // top corner radius), bottom only on the last row (with bottom corner
    // radius) -- the exact box the old single wrapping `card` View drew.
    cardRow: {
      backgroundColor: theme.white,
      borderColor: theme.cloud,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      paddingHorizontal: 16,
    },
    cardRowFirst: {
      borderTopWidth: 1,
      borderTopLeftRadius: radii.card,
      borderTopRightRadius: radii.card,
    },
    cardRowLast: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: radii.card,
      borderBottomRightRadius: radii.card,
    },
    // The internal separator between rows (old rowWrap): every row except the
    // first gets this instead of the card's own (cloud) top border.
    rowHairline: {
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
    },
    sectionFooter: {
      marginBottom: 14,
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
