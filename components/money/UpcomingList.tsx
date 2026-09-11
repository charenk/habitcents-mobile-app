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
import { categoryIdentityColor, expenseGlyph } from '@/constants/categoryEmoji';
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
  scheduleParts,
  shortDate,
  upcomingWindowPaymentsCount,
  upcomingWindowTotal,
  type UpcomingItem,
} from '@/utils/recurring';
import {
  UPCOMING_WINDOW_PRESETS,
  upcomingWindowEnd,
  type UpcomingWindowDays,
} from '@/utils/upcomingWindow';
import {
  groupUpcomingByMonth,
  monthGroupTotal,
  monthRowTotal,
  type UpcomingMonthRow,
} from '@/utils/upcomingGroups';
import { formatDate } from '@/utils/dates';
import { CHROME_MAX_FONT_SCALE, useAccessibilityTextSize } from '@/utils/textScale';

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

/**
 * "September", or "January 2027" once the window reaches a different year.
 *
 * The year is not decoration: a three-month window opened in November reaches
 * January, and a bare "JANUARY" on a forward-looking pane reads as ten months
 * ago. Never a catalog string; the month comes from the locale-aware formatter
 * (ADA-008), the same way SpentList derives its day label.
 */
function monthLabel(monthStart: Date): string {
  const sameYear = monthStart.getFullYear() === new Date().getFullYear();
  return formatDate(monthStart, sameYear ? { month: 'long' } : { month: 'long', year: 'numeric' });
}

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
  const groups = useMemo(() => groupUpcomingByMonth(items), [items]);

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
          {/* The SPAN, not the duration: the duration is already in the filter
              beside it, so a label repeating it said nothing the control did
              not, and the end date is the one fact the pane could not
              otherwise give (ADR 0041). Capped at the same 1.5 the filter
              uses, since the label and the filter are a pair and an uncapped
              label wrapped to three lines next to a one-line control. */}
          <Text style={styles.windowLabel} maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}>
            {strings.money.upcomingWindowRange(shortDate(upcomingWindowEnd(windowDays)))}
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
        /* Grouped by the calendar month each payment lands in, the way Spent
           groups by day. Each header carries its own subtotal, which is what
           makes "what is left to pay this month" readable at every window
           rather than only at one (ADR 0041). Plain Views inside the pane's
           existing ScrollView: a SectionList owns its scrolling and must not
           nest inside the pager (money.md, 2026-09-06). */
        groups.map((group) => (
          <View key={group.key}>
            <Text
              style={styles.groupHeader}
              accessibilityRole="header"
              maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}
            >
              {strings.money.upcomingGroupHeader(
                monthLabel(group.monthStart),
                format(monthGroupTotal(group))
              )}
            </Text>
            <View style={styles.card}>
              {group.rows.map((row, index) => (
                <UpcomingRow
                  key={`${row.expense.id}-${group.key}`}
                  row={row}
                  isFirst={index === 0}
                  onPress={() => onEditItem(row.expense)}
                  theme={theme}
                  styles={styles}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function UpcomingRow({
  row,
  isFirst,
  onPress,
  theme,
  styles,
}: {
  row: UpcomingMonthRow;
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

  // Scoped to the month this row sits under, never the whole window: a row
  // showing a three-month number beneath an "October" header is the same
  // unreconcilable pair the card and the list were fixed for.
  const { expense } = row;
  const nextDate = row.occurrences[0];
  // Same display fallback as ExpenseRow: stored category values map to their
  // display names before rendering.
  const name = expense.title || categoryDisplayLabel(expense.category);

  // The row's big number is what this bill costs INSIDE THE WINDOW, so the
  // column of big numbers sums to exactly the card's headline. Where a bill
  // lands once the two are the same number, which is why the narrow windows
  // look untouched. Where it lands more than once, the caption names the unit
  // price the subtotal is built from, and the price the edit sheet opens on.
  const payments = row.occurrences.length;
  const amountLabel = format(monthRowTotal(row));
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
  // What the row DRAWS. The sentence above is what it says: the cadence is a
  // badge now and "next" is an elbow arrow, so the pieces and the sentence are
  // deliberately different (utils/recurring.ts scheduleParts, ADR 0040's
  // labelSpoken contract). A corrupted row that resolved no rule keeps its date
  // and simply carries no badge.
  const parts = rule ? scheduleParts(rule, nextDate) : null;

  // The bill, what the window costs, how many and what one costs, then when.
  // A user who stops listening after two words still got the two facts that
  // decide whether to keep listening.
  const spoken = [name, amountLabel, multiplierSpoken, scheduleLine].filter(Boolean).join(', ');

  // Dynamic Type: at accessibility sizes the amount moves under the name
  // rather than competing with it for a 393pt row. The name and the amount are
  // both content, so neither may be capped; the schedule line is metadata and
  // does cap. Same rule as ExpenseRow; see utils/textScale.ts.
  const stacked = useAccessibilityTextSize();

  const amountBlock = (
    <View style={[styles.rowAmount, stacked ? styles.rowAmountStacked : null]}>
      {/* Spec 09 section 1 rule 6: money numbers scale, they never truncate.
          Side by side the amount shrinks to fit rather than turning into an
          ellipsis that hides what the bill costs; stacked it has the whole row
          and needs neither. */}
      <Text
        style={styles.amount}
        numberOfLines={1}
        adjustsFontSizeToFit={!stacked}
        minimumFontScale={0.7}
      >
        {amountLabel}
      </Text>
      {multiplierLabel ? (
        <Text
          style={styles.multiplier}
          numberOfLines={1}
          adjustsFontSizeToFit={!stacked}
          minimumFontScale={0.7}
        >
          {multiplierLabel}
        </Text>
      ) : null}
      {/* The cadence sits under the amount (Charen, 2026-09-11, after seeing it
          on the left): the left column keeps two lines, the two columns balance,
          and the pill stops being the widest thing on a row's bottom edge. No
          alignSelf, so it inherits the column's own alignment: right-aligned
          beside the amount normally, left-aligned when the row stacks at
          accessibility sizes. */}
      {parts ? (
        <View style={styles.cadenceBadge}>
          <Text
            style={styles.cadenceLabel}
            numberOfLines={1}
            maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}
          >
            {parts.cadence}
          </Text>
        </View>
      ) : null}
    </View>
  );

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
        emoji={expenseGlyph(expense)}
        color={categoryIdentityColor(expense.category)}
        size={36}
      />
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={stacked ? 2 : 1}>
          {name}
        </Text>
        {/* At accessibility sizes the amount moves directly under the name, so
            the visible order matches the spoken one: the two things a user
            came to read first, then the two that qualify them. */}
        {stacked ? amountBlock : null}
        <View style={styles.dateRow}>
          <Icon
            name="CornerDownRight"
            size={14}
            color={theme.mistText}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          />
          <Text
            style={styles.schedule}
            numberOfLines={stacked ? 2 : 1}
            maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}
          >
            {parts ? parts.date : scheduleLine}
          </Text>
        </View>
      </View>
      {stacked ? null : amountBlock}
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
    // The pane's eyebrow treatment, copied from SpentList's day header, which
    // is the app's existing "header with a date and a number over rows"
    // pattern. Uppercase lives here and the string stays sentence case
    // (UX-060). Tabular figures because it holds a number sitting directly
    // above other numbers. Named as a deviation in the PR body: the card's
    // window label lost its uppercase yesterday, but that is a label on a
    // control and this is a header over rows.
    groupHeader: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      fontVariant: ['tabular-nums'],
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
      // Top-aligned unconditionally (2026-09-11): the left column is three
      // lines now, and the amount belongs beside the NAME rather than floating
      // at the vertical centre of the block. This is what the old
      // accessibility-only `rowStacked` branch already argued for, promoted to
      // the base value, so that branch collapsed.
      alignItems: 'flex-start',
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
    dateRow: {
      flexDirection: 'row',
      // Centred, not top-aligned: the icon is a fixed 14 and does not scale,
      // while the date beside it grows to the 1.5 chrome cap, so it has to sit
      // against whatever height that text takes.
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    // Geometry borrowed from SegmentedControl's internal badge, the smallest
    // sanctioned one, because this sits inside a row rather than on a card.
    // minHeight and never height: an 11pt label grows with Dynamic Type and a
    // fixed box clips it. slate on cloud, deliberately: mistText measures
    // 4.06:1 on a cloud fill (UXUI_AUDIT.md:562) and nothing here tests
    // contrast. Cadence is a fact, not a judgment, so the fill is neutral and
    // the meaning is in the word (SegmentedControl's own rule).
    // Sized BY its padding rather than by a minHeight the label is then
    // centred inside. The label's own box is what gets padded, so the pill is
    // symmetric by construction; centring a loose text box in a taller pill
    // left the word riding high, because Inter's line box carries a descender
    // ("Monthly" has a y) that the visible ink does not fill (Charen spotted
    // it on device, 2026-09-11). Padding still grows with Dynamic Type, which
    // is what the house minHeight rule is actually protecting against.
    cadenceBadge: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: radii.pill,
      backgroundColor: theme.cloud,
      marginTop: 6,
    },
    cadenceLabel: {
      fontFamily: theme.fonts.uiBold,
      fontSize: typeScale.eyebrow,
      // Tight, so the box hugs the glyphs instead of the font's full metrics.
      lineHeight: 13,
      color: theme.slate,
      includeFontPadding: false,
      textAlign: 'center',
    },
    schedule: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
      flexShrink: 1,
    },
    rowAmount: {
      alignItems: 'flex-end',
      marginLeft: 8,
      // The cap outlived its original reason: the left column's longest line
      // is a bare date now, not "Monthly, next Sep 29", so there is nothing
      // there left to truncate. It stays because the multiplier caption can
      // still win the row and steal width from the NAME on line 1, which is
      // the same defect one line up. Capped, both money lines shrink to fit,
      // which is the rule money text already follows (spec 09 section 1 rule 6).
      flexShrink: 1,
      maxWidth: '46%',
    },
    rowAmountStacked: {
      // Back under the name, on the same left edge, and no width cap: the
      // whole row is its own now.
      alignItems: 'flex-start',
      marginLeft: 0,
      marginTop: 4,
      maxWidth: undefined,
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
