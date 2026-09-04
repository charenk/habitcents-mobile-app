import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon, categoryIconName } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDate } from '@/utils/dates';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { AddCategoryModal } from '@/components/AddCategoryModal';
import { withAlpha, compositeOver, mixHex, contrastRatio } from '@/utils/color';
import { radii, typeScale, layout, type AppTheme } from '@/constants/theme';
import type { CategoryIcon } from '@/types/category';
import type { Expense } from '@/types/expense';
import { expenseBelongsToCategory } from '@/utils/expenseCategory';
import { strings } from '@/constants/strings';

// UX-067: the 40pt category identity icon renders in the raw category hue on
// its own 12% tint. Several category colors are light enough (e.g. groceries
// #FF9F43) that the icon can sit near the 3:1 non-text contrast floor
// against that tint. Rather than adding a new hex per category, compute the
// tint the icon actually sits on (the color composited at 12% over the
// screen background) and, only if that hue does not clear 3:1 there, blend
// the icon toward ink in steps until it does. A category whose color already
// clears 3:1 renders completely unchanged.
// (hexToRgb/rgbToHex/compositeOver/mixHex are general color maths with no
// policy of their own, so they live in utils/color.ts; the 3:1 threshold and
// the step-toward-ink search below are this screen's own policy and stay.)

/** The category's own hue, darkened toward ink only as far as needed to clear 3:1 on its 12% tint. */
function accessibleIdentityColor(categoryColor: string, screenBg: string, ink: string): string {
  const tint = compositeOver(categoryColor, 0.12, screenBg);
  if (contrastRatio(categoryColor, tint) >= 3) return categoryColor;
  for (let t = 0.15; t <= 0.75; t += 0.15) {
    const candidate = mixHex(categoryColor, ink, t);
    if (contrastRatio(candidate, tint) >= 3) return candidate;
  }
  return ink;
}

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const { getCategoryById, updateCategory } = useCategories();
  const { expenses } = useExpenses();

  const category = getCategoryById(id || '');

  // Get expenses for this category. expenseBelongsToCategory handles the
  // display-vs-stored name split (Home rows are stored as 'Mortgage').
  const categoryExpenses = useMemo(() => {
    if (!category) return [];
    return expenses.filter(e => expenseBelongsToCategory(e, category));
  }, [expenses, category]);

  // Calculate stats
  const stats = useMemo(() => {
    if (categoryExpenses.length === 0) {
      return {
        total: 0,
        thisMonth: 0,
        lastMonth: 0,
        logCount: categoryExpenses.length,
        average: 0,
        topMerchants: [] as { name: string; count: number; total: number }[],
      };
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthExpenses = categoryExpenses.filter(e => e.date >= thisMonthStart);
    const lastMonthExpenses = categoryExpenses.filter(
      e => e.date >= lastMonthStart && e.date <= lastMonthEnd
    );

    const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
    const thisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const lastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Top merchants
    const merchantMap = new Map<string, { count: number; total: number }>();
    for (const expense of categoryExpenses) {
      const merchantName = expense.merchant || expense.title;
      const existing = merchantMap.get(merchantName) || { count: 0, total: 0 };
      merchantMap.set(merchantName, {
        count: existing.count + 1,
        total: existing.total + expense.amount,
      });
    }

    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      total,
      thisMonth,
      lastMonth,
      logCount: categoryExpenses.length,
      average: Math.round(total / categoryExpenses.length),
      topMerchants,
    };
  }, [categoryExpenses]);

  // Monthly trend data
  const trendData = useMemo(() => {
    const months: { month: string; amount: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthExpenses = categoryExpenses.filter(
        e => e.date >= monthStart && e.date <= monthEnd
      );
      const amount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      months.push({
        month: formatDate(monthStart, { month: 'short' }),
        amount,
      });
    }

    return months;
  }, [categoryExpenses]);

  const handleEdit = useCallback(async (
    name: string,
    icon: CategoryIcon,
    color: string
  ) => {
    if (!category) return;
    // Rethrows: AddCategoryModal holds the edited name and owns the failure
    // message, and only closes itself once the write lands.
    await updateCategory(category.id, { name, icon, color });
    setIsEditModalVisible(false);
  }, [category, updateCategory]);

  if (!category) {
    return (
      <View style={styles.container}>
        <ScreenHeader onBack={() => router.back()} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{strings.categoryDetail.notFound}</Text>
        </View>
      </View>
    );
  }

  const trendPercentage = stats.lastMonth > 0
    ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)
    : 0;

  // UX-067: darkened toward ink only if the category's raw hue does not
  // already clear 3:1 on its own 12% tint; see accessibleIdentityColor above.
  const identityIconColor = accessibleIdentityColor(category.color, theme.background, theme.ink);

  // Empty trend bars used to always draw (minHeight stubs, a chart of
  // nothing) when the range has zero spend everywhere. The house EmptyState
  // primitive covers that case now instead (U12b).
  const hasTrendData = trendData.some(d => d.amount > 0);
  const maxTrendAmount = Math.max(...trendData.map(d => d.amount), 1);

  // UX-044: borderTopWidth lives on listRow itself, so the first-row
  // suppression has to be applied on that style, not on a wrapper View
  // (both lists apply styles.listRow + styles.rowNoBorder in one array).
  const renderLogRow = ({ item, isFirst }: { item: Expense; isFirst?: boolean }) => (
    <View key={item.id} style={[styles.listRow, isFirst && styles.rowNoBorder]}>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowCaption}>
          {/* UX-072: this called item.date.toLocaleDateString() with no
              options, which on Hermes without full ICU returns an unformatted
              ISO-ish string, so recent logs read "2026-08-01 at 8:14 AM". Every
              other date in the app goes through formatDate, which passes
              explicit options; this one site had bypassed it. */}
          {strings.categoryDetail.logTimestamp(
            formatDate(item.date, { month: 'short', day: 'numeric' }),
            item.time
          )}
        </Text>
      </View>
      {/* Unsigned (U7, ExpenseRow's rule): every row in this list is a
          spend, so the minus carried no information, and Top merchants
          right above it was already unsigned. */}
      <Text style={styles.rowAmount}>{format(item.amount)}</Text>
    </View>
  );

  // UX-023: the list caps at 10 so the eyebrow can name what is shown out of
  // what exists.
  const recentLogs = categoryExpenses.slice(0, 10);

  // Serif titles end in a period, category names included (spec 01 s2).
  const categoryTitle = /\.$/.test(category.name) ? category.name : `${category.name}.`;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader
          title={categoryTitle}
          onBack={() => router.back()}
          actions={
            !category.isDefault
              ? [
                  {
                    icon: 'Pencil',
                    label: strings.categoryDetail.editCategoryLabel,
                    onPress: () => setIsEditModalVisible(true),
                  },
                ]
              : undefined
          }
        />
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={[styles.iconContainer, { backgroundColor: withAlpha(category.color, 0.12) }]}>
            <Icon
              name={categoryIconName(category.icon)}
              size={40}
              color={identityIconColor}
            />
          </View>
        </View>

        {/* Stat band (Charen, 2026-09-04): the full-width this-month card
            and the two half-width stat cards merged into one horizontal
            band, three columns with hairline dividers. The lead column
            keeps the trend line. */}
        <View style={styles.statBand}>
          <View style={[styles.statBandCol, styles.statBandLead]}>
            <Text style={styles.statBandAmount}>{format(stats.thisMonth)}</Text>
            <Text style={styles.statBandLabel}>{strings.categoryDetail.thisMonth}</Text>
            {stats.lastMonth > 0 && (
              // UX-008: both directions render in theme.slate. Coral/sage
              // (red/green P&L coding) shame-coded a month where someone
              // spent more; the arrow direction and the wording already
              // carry the meaning, color should not add judgment on top.
              <View style={styles.summaryTrend}>
                <Icon
                  name={trendPercentage > 0 ? 'TrendingUp' : 'TrendingDown'}
                  size={14}
                  color={theme.slate}
                />
                <Text style={[styles.summaryTrendText, { color: theme.slate }]}>
                  {strings.categoryDetail.vsLastMonth(Math.abs(trendPercentage))}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.statBandDivider} />
          <View style={styles.statBandCol}>
            <Text style={styles.statValue}>{stats.logCount}</Text>
            <Text style={styles.statBandLabel}>{strings.categoryDetail.logsStat}</Text>
          </View>
          <View style={styles.statBandDivider} />
          <View style={[styles.statBandCol, styles.statBandColWide]}>
            <Text style={styles.statValue}>{format(stats.average)}</Text>
            <Text style={styles.statBandLabel}>{strings.categoryDetail.averageStat}</Text>
          </View>
        </View>

        {/* Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {strings.categoryDetail.sixMonthTrend}
          </Text>
          <View style={styles.trendCard}>
            {hasTrendData ? (
              <View style={styles.trendChart}>
                {/* UX-056: keyed by index before; the 6 months in this
                    window are always distinct, so the month label is a
                    stable, non-positional key. */}
                {trendData.map((item) => (
                  <View key={item.month} style={styles.trendBar}>
                    {/* UX-009: spend bars are mist, never sage, never the
                        raw category identity color. No full-height track
                        (Charen, 2026-09-04): six ghost columns made every
                        month read as a tall block, so bars rise from the
                        shared baseline and a zero month shows only a quiet
                        baseline tick. Tiny spends keep a 6% floor so they
                        stay visible next to the max month. */}
                    <View style={styles.trendBarArea}>
                      {item.amount > 0 ? (
                        <View
                          style={[
                            styles.trendBarFill,
                            { height: `${Math.max((item.amount / maxTrendAmount) * 100, 6)}%` },
                          ]}
                        />
                      ) : (
                        <View style={styles.trendBarZero} />
                      )}
                    </View>
                    <Text style={styles.trendLabel}>{item.month}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState body={strings.categoryDetail.trendEmpty} />
            )}
          </View>
        </View>

        {/* Top Merchants */}
        {stats.topMerchants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {strings.categoryDetail.topMerchants}
            </Text>
            <View style={styles.listCard}>
              {/* UX-056: keyed by index before; merchant.name is already
                  the merchantMap key upstream, so it is guaranteed unique
                  within topMerchants. Rank circles removed (Charen,
                  2026-09-04): the list is sorted, so order already carries
                  the rank, and the 28pt circles pushed this card's text
                  40pt right of the recent-logs card below it, making two
                  cards on one screen read as two designs. Both lists now
                  share one row grammar (styles.listRow/rowTitle/rowCaption/
                  rowAmount, the ExpenseRow type ramp). */}
              {stats.topMerchants.map((merchant, index) => (
                <View
                  key={merchant.name}
                  style={[styles.listRow, index === 0 && styles.rowNoBorder]}
                >
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {merchant.name}
                    </Text>
                    <Text style={styles.rowCaption}>
                      {strings.categoryDetail.logCount(merchant.count)}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{format(merchant.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent logs */}
        <View style={styles.section}>
          {/* UX-023: name what's shown out of what exists once the list is
              capped, so a heavy category doesn't read as having only 10 logs.
              Silent when shown === total (nothing to disclose). Separator
              matches the house convention for a combined eyebrow, e.g.
              strings.money.spentGroupHeader's " · ". */}
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {recentLogs.length < categoryExpenses.length
              ? `${strings.categoryDetail.recentLogs} · ${strings.categoryDetail.recentLogsCount(recentLogs.length, categoryExpenses.length)}`
              : strings.categoryDetail.recentLogs}
          </Text>
          <View style={styles.listCard}>
            {recentLogs.map((expense, index) => renderLogRow({ item: expense, isFirst: index === 0 }))}
            {categoryExpenses.length === 0 && (
              <EmptyState body={strings.categoryDetail.noExpensesLogged} />
            )}
          </View>
        </View>
      </ScrollView>

      <AddCategoryModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleEdit}
        initialName={category.name}
        initialIcon={category.icon}
        initialColor={category.color}
        isEditing
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      // Matches ScreenHeader's own 20pt gutter (PATTERN_VOCABULARY.md: one
      // 20pt horizontal gutter per screen) so the title lines up with the
      // content below it now that both share the same header component.
      paddingHorizontal: 20,
      paddingBottom: layout.screenBottomClearance,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: radii.feature,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    // One horizontal band replaces summaryCard + statsGrid (Charen,
    // 2026-09-04): feature-card chrome, three centered columns, hairline
    // dividers between them.
    statBand: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.feature,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'stretch',
      marginBottom: 24,
    },
    // Left-aligned inside every column (Charen, 2026-09-04): value, label,
    // and trend caption share one left edge per column, so the band reads
    // as three aligned blocks instead of three centered islands.
    statBandCol: {
      flex: 1,
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: 12,
    },
    // The month total leads: a wider column and one serif rank up (26 vs 22)
    // so the primary number reads first without dwarfing its neighbors the
    // way the old 36pt hero card did. Its left padding matches trendCard's
    // 16pt inner padding so the two cards' content edges line up.
    statBandLead: {
      // 1.6, not 1.35: left alignment costs the centered layout's shared
      // slack, and the trend caption ("97% vs last month") needs the room
      // to stay on one line at the default type size.
      flex: 1.6,
      paddingLeft: 16,
      paddingRight: 4,
    },
    statBandColWide: {
      flex: 1.15,
    },
    statBandDivider: {
      width: 1,
      backgroundColor: theme.hairlineSubtle,
      marginVertical: 2,
    },
    // Money at band scale: the display serif with tabular figures
    // (design/PATTERN_VOCABULARY.md, "Instrument Serif ... money").
    statBandAmount: {
      fontSize: typeScale.sheetTitle,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.ink,
    },
    statBandLabel: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    summaryTrend: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    summaryTrendText: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.uiMedium,
      marginLeft: 4,
    },
    // Stat numbers are currency or counts, so they take the display serif
    // with tabular figures (same convention as app/habit/[id].tsx statValue).
    statValue: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.ink,
    },
    section: {
      marginBottom: 24,
    },
    // Eyebrow: all-caps via the style, stored sentence case
    // (design/PATTERN_VOCABULARY.md).
    sectionTitle: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginBottom: 12,
    },
    trendCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.feature,
      padding: 16,
    },
    trendChart: {
      flexDirection: 'row',
      height: 100,
      // UX-009: stretch (not flex-end) so each column gets the full chart
      // height, letting trendBarTrack reserve real, visible space to sit in
      // as unfilled mist rather than only the filled portion having geometry.
      alignItems: 'stretch',
      justifyContent: 'space-between',
    },
    trendBar: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    // UX-009: spend bars are mist (never sage, never the category's raw
    // identity color). The area is an invisible full-height column so the
    // percentage heights resolve; only the fill and the zero tick paint.
    trendBarArea: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
    },
    trendBarFill: {
      width: '100%',
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      borderBottomLeftRadius: 3,
      borderBottomRightRadius: 3,
      backgroundColor: theme.categoryBarFill,
    },
    // A month with zero spend is a measurement, not missing data: it keeps
    // a quiet baseline tick instead of a full-height ghost column.
    trendBarZero: {
      width: '100%',
      height: 4,
      borderRadius: 3,
      backgroundColor: theme.hairlineSubtle,
    },
    trendLabel: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 8,
    },
    // One row grammar for both lists on this screen (Charen, 2026-09-04):
    // Top merchants and Recent logs were two hand-rolled near-twins (rank
    // circles, uiMedium titles, slate secondary captions, one signed
    // amount) that read as two designs stacked on one screen. Both now use
    // this shared set, on ExpenseRow's type ramp (uiSemibold body title,
    // caption mistText line, uiSemibold tabular amount, unsigned).
    listCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.card,
      paddingHorizontal: 16,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
    },
    // First row in a card carries no top hairline (matches
    // components/money/SpentList.tsx's rowWrapFirst).
    rowNoBorder: {
      borderTopWidth: 0,
    },
    rowContent: {
      flex: 1,
    },
    rowTitle: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    rowCaption: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.mistText,
      marginTop: 1,
    },
    rowAmount: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
      marginLeft: 8,
    },
  });
}
