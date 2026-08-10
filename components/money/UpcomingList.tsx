/**
 * UpcomingList (design/redesign-handoff/04-screens.md, "Money" > Upcoming).
 *
 * A centered "next 60 days" total, the dashed add affordance, then the
 * scheduled rows. Every number here is projected by `utils/recurring.ts`, so
 * nothing on this screen is invented:
 *
 * - the header total is `upcomingWindowTotal`, which counts EVERY occurrence in
 *   the window. A weekly bill due nine times in 60 days contributes nine
 *   payments, not one, which is the honest answer to "what is coming".
 * - the schedule line under each row is `describeSchedule`, never hand-built
 *   text, so the row and the engine can never disagree.
 * - the amber pill is `multiPaymentMonth`: the month where three or more
 *   payments land. That is the surprise worth flagging, and amber is the
 *   token for exactly that (spec 01 §1).
 *
 * Amounts render unsigned. Nothing here has been spent yet, so a minus sign
 * would read as history rather than as a bill that is coming.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { strings } from '@/constants/strings';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  daysUntilLabel,
  describeSchedule,
  multiPaymentMonth,
  resolveRule,
  upcomingWindowTotal,
  type UpcomingItem,
} from '@/utils/recurring';
import { withAlpha } from '@/utils/color';

export type UpcomingListProps = {
  items: UpcomingItem[];
  /** The projection window these items were computed for, in days. */
  windowDays: number;
  /** Opens the add-upcoming sheet. */
  onAdd: () => void;
};

export function UpcomingList({ items, windowDays, onAdd }: UpcomingListProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { format } = useCurrency();

  const windowTotal = useMemo(() => upcomingWindowTotal(items), [items]);

  const addAffordance = (
    <Pressable
      onPress={onAdd}
      accessibilityRole="button"
      accessibilityLabel={strings.money.upcomingAddAffordance}
      style={({ pressed }) => [styles.add, pressed ? styles.addPressed : null]}
    >
      <Icon name="Plus" size={18} color={theme.primaryDark} />
      <Text style={styles.addLabel}>{strings.money.upcomingAddAffordance}</Text>
    </Pressable>
  );

  if (items.length === 0) {
    return (
      <View>
        {addAffordance}
        <View style={styles.emptyWrap}>
          <EmptyState body={strings.money.upcomingEmptyBody} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.totalCard}>
        <Text style={styles.totalEyebrow}>
          {strings.money.upcomingWindowEyebrow(windowDays)}
        </Text>
        <Text style={styles.totalAmount} accessibilityRole="header">
          {format(windowTotal)}
        </Text>
        <Text style={styles.totalCount}>
          {strings.money.upcomingScheduledCount(items.length)}
        </Text>
      </View>

      {addAffordance}

      <Text style={styles.eyebrow} accessibilityRole="header">
        {strings.money.upcomingListEyebrow}
      </Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <UpcomingRow key={item.expense.id} item={item} isFirst={index === 0} />
        ))}
      </View>
    </View>
  );
}

function UpcomingRow({ item, isFirst }: { item: UpcomingItem; isFirst: boolean }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { format } = useCurrency();

  const { expense, nextDate, daysUntil, occurrencesInWindow } = item;
  const name = expense.title || expense.category;
  const amountLabel = format(expense.amount);
  const cadenceLabel = daysUntilLabel(daysUntil);

  // computeUpcoming only emits items that resolved to a rule, so this is
  // always set; the fallback exists so a corrupted row degrades to its date
  // rather than crashing the tab.
  const rule = resolveRule(expense);
  const scheduleLine = rule ? describeSchedule(rule, nextDate) : cadenceLabel;

  const multi = multiPaymentMonth(occurrencesInWindow);
  const pillLabel = multi ? strings.money.multiPaymentPill(multi.count, multi.monthLabel) : null;

  const spoken = [name, pillLabel, amountLabel, scheduleLine].filter(Boolean).join(', ');

  return (
    <View
      style={[styles.row, isFirst ? styles.rowFirst : null]}
      accessible
      accessibilityLabel={spoken}
    >
      <EmojiTile
        emoji={categoryEmoji(expense.category)}
        color={categoryIdentityColor(expense.category)}
        size={36}
      />
      <View style={styles.rowText}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {pillLabel ? (
            <View style={styles.pill}>
              <Text style={styles.pillLabel} numberOfLines={1}>
                {pillLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.schedule} numberOfLines={1}>
          {scheduleLine}
        </Text>
      </View>
      <View style={styles.rowAmount}>
        <Text style={styles.amount} numberOfLines={1}>
          {amountLabel}
        </Text>
        <Text style={styles.cadence} numberOfLines={1}>
          {cadenceLabel}
        </Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    totalCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.feature,
      paddingVertical: 18,
      paddingHorizontal: 18,
      alignItems: 'center',
    },
    totalEyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mist,
    },
    totalAmount: {
      fontFamily: theme.fonts.display,
      fontSize: 36,
      lineHeight: 42,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
      includeFontPadding: false,
      marginTop: 4,
    },
    totalCount: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      marginTop: 4,
    },
    add: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      borderRadius: radii.card,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.cloudDashed,
      backgroundColor: theme.white,
      marginTop: 12,
    },
    addPressed: {
      backgroundColor: theme.snow,
    },
    addLabel: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: 14,
      color: theme.primaryDark,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mist,
      marginTop: 16,
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
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
    },
    rowFirst: {
      borderTopWidth: 0,
    },
    rowText: {
      flex: 1,
    },
    nameLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    name: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
      flexShrink: 1,
    },
    pill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.pill,
      backgroundColor: withAlpha(theme.amber, 0.14),
    },
    pillLabel: {
      fontFamily: theme.fonts.uiBold,
      fontSize: 10.5,
      color: theme.amberInk,
    },
    schedule: {
      fontFamily: theme.fonts.ui,
      fontSize: 12,
      color: theme.mist,
      marginTop: 2,
    },
    rowAmount: {
      alignItems: 'flex-end',
      marginLeft: 8,
    },
    amount: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    cadence: {
      fontFamily: theme.fonts.ui,
      fontSize: 12,
      color: theme.mist,
      marginTop: 2,
    },
    emptyWrap: {
      marginTop: 16,
      paddingHorizontal: 24,
    },
  });
}
