/**
 * UpcomingList (design/redesign-handoff/04-screens.md, "Money" > Upcoming;
 * U8 redesign).
 *
 * A left-aligned "next N days" total (matching Spent's and Habits'
 * left-aligned eyebrows -- centering was the one outlier in the Money tab),
 * the window picker that decides N, a compact add affordance beside the
 * total, then the scheduled rows, each one now pressable to edit or delete.
 * Every number here is projected by `utils/recurring.ts`, so nothing on this
 * screen is invented:
 *
 * - the header total is `upcomingWindowTotal`, which counts EVERY occurrence
 *   in the window. A weekly bill due nine times in 60 days contributes nine
 *   payments, not one, which is the honest answer to "what is coming".
 * - the count line under it is `upcomingWindowPaymentsCount`, the exact same
 *   denominator the total sums over, so the two numbers can never disagree
 *   about what they're counting (U8: they used to -- the total summed
 *   occurrences while the count line counted distinct expenses).
 * - the schedule line under each row is `describeSchedule`, never hand-built
 *   text, so the row and the engine can never disagree.
 * - the amber pill is `multiPaymentMonth`: the month where three or more
 *   payments land. That is the surprise worth flagging, and amber is the
 *   token for exactly that (spec 01 §1).
 *
 * Amounts render unsigned. Nothing here has been spent yet, so a minus sign
 * would read as history rather than as a bill that is coming.
 *
 * The window itself (2 weeks / 1 month / 3 months) is defined once in
 * utils/upcomingWindow.ts; this component only zips those day counts with
 * their labels to build the SegmentedControl options.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { strings } from '@/constants/strings';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense } from '@/types/expense';
import { categoryDisplayLabel } from '@/utils/leakScanBridge';
import {
  daysUntilLabel,
  describeSchedule,
  multiPaymentMonth,
  resolveRule,
  upcomingWindowPaymentsCount,
  upcomingWindowTotal,
  type UpcomingItem,
} from '@/utils/recurring';
import { UPCOMING_WINDOW_PRESETS, type UpcomingWindowDays } from '@/utils/upcomingWindow';
import { withAlpha } from '@/utils/color';

const WINDOW_LABELS: Record<UpcomingWindowDays, string> = {
  14: strings.money.upcomingWindowTwoWeeks,
  30: strings.money.upcomingWindowOneMonth,
  90: strings.money.upcomingWindowThreeMonths,
};

const WINDOW_OPTIONS = UPCOMING_WINDOW_PRESETS.map((days) => ({
  value: days,
  label: WINDOW_LABELS[days],
}));

export type UpcomingListProps = {
  items: UpcomingItem[];
  /** The projection window these items were computed for, in days. */
  windowDays: UpcomingWindowDays;
  /** Changes the window; the caller owns persisting the selection. */
  onWindowDaysChange: (days: UpcomingWindowDays) => void;
  /** Opens the add-upcoming sheet. */
  onAdd: () => void;
  /** Empty-state first action (PRD v3.1 sect 5). Falls back to onAdd. */
  onEmptyAdd?: () => void;
  /** Opens the add-upcoming sheet in edit mode for this row's expense. */
  onEditItem: (expense: Expense) => void;
  /** True zero-data: whether ANY expense resolves to a recurrence rule at
   *  all, independent of the current window. Distinct from `items.length`,
   *  which can be empty just because the current window is narrow. */
  hasAnyRecurring: boolean;
};

export function UpcomingList({
  items,
  windowDays,
  onWindowDaysChange,
  onAdd,
  onEmptyAdd,
  onEditItem,
  hasAnyRecurring,
}: UpcomingListProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { format } = useCurrency();

  const windowTotal = useMemo(() => upcomingWindowTotal(items), [items]);
  const paymentsCount = useMemo(() => upcomingWindowPaymentsCount(items), [items]);

  const addAffordance = (
    <Pressable
      onPress={onAdd}
      accessibilityRole="button"
      accessibilityLabel={strings.money.upcomingAddAffordance}
      style={({ pressed }) => [styles.addCompact, pressed ? styles.addCompactPressed : null]}
    >
      {/* UX-064: adding a bill is amber-domain money-out, not a kept
          outcome, so this is slate like header chrome icons, never sage. */}
      <Icon name="Plus" size={20} color={theme.slate} />
    </Pressable>
  );

  // Two distinct empties (PRD v3.1 sect 5). True zero-data (no recurring
  // expense exists at all) drops the whole total/summary card too: a window
  // picker and a $0 total over nothing repeating would be chrome around an
  // empty room. Window-empty (something repeats, just not inside the
  // currently picked window) keeps the total card exactly as before, since
  // the window picker itself is how the user gets back to their data.
  if (!hasAnyRecurring) {
    return (
      <EmptyState
        layout="fill"
        illustration="money-upcoming"
        title={strings.money.upcomingEmptyTitle}
        body={strings.money.upcomingEmptyBody}
        cta={{ label: strings.money.upcomingEmptyCta, onPress: onEmptyAdd ?? onAdd }}
      />
    );
  }

  return (
    <View>
      <View style={styles.totalCard}>
        <View style={styles.windowSegment}>
          <SegmentedControl<UpcomingWindowDays>
            options={WINDOW_OPTIONS}
            value={windowDays}
            onChange={onWindowDaysChange}
            accessibilityLabel={strings.money.upcomingWindowSegmentLabel}
          />
        </View>
        <View style={styles.totalHeaderRow}>
          <View style={styles.totalTextBlock} testID="upcoming-total-text">
            <Text style={styles.totalEyebrow}>
              {strings.money.upcomingWindowEyebrow(windowDays)}
            </Text>
            {items.length > 0 ? (
              <>
                <Text style={styles.totalAmount} accessibilityRole="header">
                  {format(windowTotal)}
                </Text>
                <Text style={styles.totalCount}>
                  {strings.money.upcomingPaymentsCount(paymentsCount, items.length)}
                </Text>
              </>
            ) : null}
          </View>
          {addAffordance}
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            body={strings.money.upcomingEmptyBody}
            cta={{ label: strings.money.upcomingAddAffordance, onPress: onEmptyAdd ?? onAdd }}
          />
        </View>
      ) : (
        <>
          <Text style={styles.eyebrow} accessibilityRole="header">
            {strings.money.upcomingListEyebrow}
          </Text>
          <View style={styles.card}>
            {items.map((item, index) => (
              <UpcomingRow
                key={item.expense.id}
                item={item}
                isFirst={index === 0}
                onPress={() => onEditItem(item.expense)}
                theme={theme}
                styles={styles}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function UpcomingRow({
  item,
  isFirst,
  onPress,
  theme,
  styles,
}: {
  item: UpcomingItem;
  isFirst: boolean;
  onPress: () => void;
  theme: AppTheme;
  // UX-056: createStyles is a ~30-entry StyleSheet.create; it used to be
  // recomputed once per row instance (this component's own useMemo, keyed
  // only on theme, still ran that memo hook fresh per row). Hoisted to the
  // parent's single call and passed down instead.
  styles: ReturnType<typeof createStyles>;
}) {
  const { format } = useCurrency();

  const { expense, nextDate, daysUntil, occurrencesInWindow } = item;
  // Same display fallback as ExpenseRow: stored category values map to their
  // display names before rendering.
  const name = expense.title || categoryDisplayLabel(expense.category);
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      style={({ pressed }) => [
        styles.row,
        isFirst ? styles.rowFirst : null,
        pressed ? styles.rowPressed : null,
      ]}
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
        {/* Spec 09 section 1 rule 6: money numbers scale, they never
            truncate. numberOfLines={1} keeps the row's shape, so the amount
            shrinks to fit rather than turning into an ellipsis that hides
            what the bill costs. */}
        <Text
          style={styles.amount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {amountLabel}
        </Text>
        <Text style={styles.cadence} numberOfLines={1}>
          {cadenceLabel}
        </Text>
      </View>
      <Icon
        name="ChevronRight"
        size={16}
        color={theme.mistText}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    </Pressable>
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
    },
    windowSegment: {
      marginBottom: 14,
    },
    totalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    totalTextBlock: {
      alignItems: 'flex-start',
      flexShrink: 1,
    },
    totalEyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
    },
    totalAmount: {
      fontFamily: theme.fonts.display,
      // Batch 2 token pass: literal 36 -> typeScale.displayLarge.
      fontSize: typeScale.displayLarge,
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
    addCompact: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.control,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.cloudDashed,
      backgroundColor: theme.white,
      marginLeft: 12,
    },
    addCompactPressed: {
      backgroundColor: theme.snow,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
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
    rowPressed: {
      opacity: 0.6,
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
      fontSize: typeScale.eyebrow,
      color: theme.amberInk,
    },
    schedule: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
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
      fontSize: typeScale.caption,
      color: theme.mistText,
      marginTop: 2,
    },
    emptyWrap: {
      marginTop: 16,
      paddingHorizontal: 24,
    },
  });
}
