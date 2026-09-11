/**
 * UpcomingList (design/redesign-handoff/04-screens.md, "Money" > Upcoming;
 * U8 redesign).
 *
 * One card in three rows (2026-09-11): the window label and the compact filter
 * that decides it, then the total, then the payments count with the add
 * affordance beside it. Then the scheduled rows, each pressable to edit or
 * delete. The rows are left-aligned, matching Spent's and Habits' eyebrows;
 * centering was the one outlier in the Money tab.
 *
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
 * - a row's own number is `upcomingItemWindowTotal`, the same per-item helper
 *   the card's total reduces over, so the column of row numbers sums to
 *   exactly the headline above it. Where a bill lands once the two are the
 *   same figure; where it lands more than once the caption names the unit
 *   price the subtotal is built from.
 *
 * Amounts render unsigned. Nothing here has been spent yet, so a minus sign
 * would read as history rather than as a bill that is coming.
 *
 * The window itself (2 weeks / 1 month / 3 months) is defined once in
 * utils/upcomingWindow.ts; this component only zips those day counts with
 * their labels to build the SegmentedControl options. The filter uses that
 * component's compact quiet tone (ADR 0040): inside a white card the card is
 * already the raised surface, so the selected segment carries the fill rather
 * than a cloud track carrying a white thumb. It shows "2w" and says
 * "2 weeks", via labelSpoken.
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
  describeSchedule,
  resolveRule,
  shortDate,
  upcomingItemPayments,
  upcomingItemWindowTotal,
  upcomingWindowPaymentsCount,
  upcomingWindowTotal,
  type UpcomingItem,
} from '@/utils/recurring';
import { UPCOMING_WINDOW_PRESETS, type UpcomingWindowDays } from '@/utils/upcomingWindow';

/** What VoiceOver hears. "2w, selected" is not a sentence. */
const WINDOW_LABELS: Record<UpcomingWindowDays, string> = {
  14: strings.money.upcomingWindowTwoWeeks,
  30: strings.money.upcomingWindowOneMonth,
  90: strings.money.upcomingWindowThreeMonths,
};

/** What the corner filter shows. Abbreviation is visual only. */
const WINDOW_SHORT_LABELS: Record<UpcomingWindowDays, string> = {
  14: strings.money.upcomingWindowTwoWeeksShort,
  30: strings.money.upcomingWindowOneMonthShort,
  90: strings.money.upcomingWindowThreeMonthsShort,
};

const WINDOW_OPTIONS = UPCOMING_WINDOW_PRESETS.map((days) => ({
  value: days,
  label: WINDOW_SHORT_LABELS[days],
  labelSpoken: WINDOW_LABELS[days],
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
        cta={{ label: strings.money.upcomingEmptyCta, onPress: onEmptyAdd ?? onAdd }}
      />
    );
  }

  return (
    <View>
      {/* Three rows, and every one of them renders in every state. The card
          holding its shape is the point, not a nicety: the filter is in row 1,
          so a row that collapsed on an empty window would shrink the card
          under the user's own finger and shove the list up as they tapped.
          Rows 2 and 3 are unconditional, and window-empty falls out as an
          honest $0.00 / 0 payments with no extra branch and no extra string:
          upcomingWindowTotal([]) is 0, and upcomingPaymentsCount(0, 0) already
          drops its "from N bills" clause when the two counts agree. */}
      <View style={styles.totalCard}>
        <View style={styles.windowRow}>
          {/* Capped at the same 1.5 the filter beside it uses: the label and
              the filter are a pair, and an uncapped label wrapped to three
              lines next to a one-line control at accessibility sizes. */}
          <Text style={styles.windowLabel} maxFontSizeMultiplier={1.5}>
            {strings.money.upcomingWindowEyebrow(windowDays)}
          </Text>
          <SegmentedControl<UpcomingWindowDays>
            options={WINDOW_OPTIONS}
            value={windowDays}
            onChange={onWindowDaysChange}
            accessibilityLabel={strings.money.upcomingWindowSegmentLabel}
            size="compact"
            tone="quiet"
          />
        </View>

        <View style={styles.totalAmountRow} testID="upcoming-total-text">
          <Text style={styles.totalAmount} accessibilityRole="header">
            {format(windowTotal)}
          </Text>
        </View>

        <View style={styles.countRow}>
          {/* No numberOfLines: at accessibility text sizes a one-line clamp
              cropped this line to a band of half-glyphs (seen on device at
              XXXL). It wraps instead, and the row grows, which is what the
              44pt button beside it can afford. The 1.5 cap is the app's own
              ceiling for chrome text, the same one SegmentedControl and the
              tab bar use. */}
          <Text style={styles.totalCount} maxFontSizeMultiplier={1.5}>
            {strings.money.upcomingPaymentsCount(paymentsCount, items.length)}
          </Text>
          {addAffordance}
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            // Its own line, not upcomingEmptyBody: that copy tells the user
            // to mark an expense as repeating, which anyone reaching this
            // branch has already done (ADR 0039 review).
            //
            // No CTA (2026-09-11): the dashed plus sits 40pt above this line
            // and does the same thing in the same words. One affordance.
            body={strings.money.upcomingWindowEmptyBody}
          />
        </View>
      ) : (
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

  const { expense, nextDate } = item;
  // Same display fallback as ExpenseRow: stored category values map to their
  // display names before rendering.
  const name = expense.title || categoryDisplayLabel(expense.category);

  // The row's big number is what this bill costs INSIDE THE WINDOW, so the
  // column of big numbers sums to exactly the card's headline. Where a bill
  // lands once the two are the same number, which is why the narrow windows
  // look untouched. Where it lands more than once, the caption names the unit
  // price the subtotal is built from, and the price the edit sheet opens on.
  const payments = upcomingItemPayments(item);
  const amountLabel = format(upcomingItemWindowTotal(item));
  const unitLabel = format(expense.amount);
  const multiplierLabel =
    payments > 1 ? strings.money.upcomingRowMultiplier(payments, unitLabel) : null;
  const multiplierSpoken =
    payments > 1 ? strings.money.upcomingRowMultiplierSpoken(payments, unitLabel) : null;

  // computeUpcoming only emits items that resolved to a rule, so this is
  // always set; the fallback exists so a corrupted row degrades to its date
  // rather than crashing the tab.
  const rule = resolveRule(expense);
  const scheduleLine = rule ? describeSchedule(rule, nextDate) : shortDate(nextDate);

  // The bill, what the window costs, how many and what one costs, then when.
  // A user who stops listening after two words still got the two facts that
  // decide whether to keep listening.
  const spoken = [name, amountLabel, multiplierSpoken, scheduleLine].filter(Boolean).join(', ');

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
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
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
        {multiplierLabel ? (
          // Carries money, so it takes the same treatment as the number above
          // it rather than the cadence line's: it shrinks to fit instead of
          // truncating. "in 21 days" could afford an ellipsis; "$2,100.00
          // each" cannot.
          <Text
            style={styles.multiplier}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {multiplierLabel}
          </Text>
        ) : null}
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
    windowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    // A label, not an eyebrow, so it loses the caps AND the 0.88 tracking:
    // that tracking exists to open up capitals and reads loose on sentence
    // case. The string was always sentence case (UX-060 keeps casing in the
    // stylesheet), so this is a style change with no copy change. Named as a
    // deviation in the PR body: the pane's other two eyebrows stay uppercase.
    windowLabel: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.caption,
      color: theme.mistText,
      flexShrink: 1,
    },
    totalAmountRow: {
      alignItems: 'flex-start',
    },
    countRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    totalAmount: {
      fontFamily: theme.fonts.display,
      // Batch 2 token pass: literal 36 -> typeScale.displayLarge.
      fontSize: typeScale.displayLarge,
      lineHeight: 42,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
      includeFontPadding: false,
      marginTop: 6,
    },
    totalCount: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      flexShrink: 1,
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
    },
    addCompactPressed: {
      backgroundColor: theme.snow,
    },
    card: {
      // Was the "Scheduled" eyebrow's marginTop 16 plus its own 6; the eyebrow
      // retired (2026-09-11) and the card takes the gap directly.
      marginTop: 16,
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
    name: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
      flexShrink: 1,
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
      // The multiplier line is the widest thing this column ever holds, and
      // without a cap its intrinsic width won the row and truncated the
      // schedule line beside it ("Monthly, next Se..."). Capped, both money
      // lines shrink to fit instead, which is the rule money text already
      // follows (spec 09 section 1 rule 6).
      flexShrink: 1,
      maxWidth: '46%',
    },
    amount: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    // Inherits the retired cadence line's slot and tokens exactly, so the row
    // keeps its shape and this introduces no new type step and no new colour.
    multiplier: {
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
