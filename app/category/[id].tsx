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

  // Get expenses for this category
  const categoryExpenses = useMemo(() => {
    if (!category) return [];
    return expenses.filter(
      e => e.category === category.name || e.categoryId === category.id
    );
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

  // UX-044: borderTopWidth lives on logRow itself, so the first-row
  // suppression has to be applied on that style, not on a wrapper View
  // (matches how merchantRow does it below, styles.merchantRow +
  // styles.rowNoBorder in one array).
  const renderLogRow = ({ item, isFirst }: { item: Expense; isFirst?: boolean }) => (
    <View key={item.id} style={[styles.logRow, isFirst && styles.rowNoBorder]}>
      <View style={styles.logContent}>
        <Text style={styles.logTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.logDate}>
          {strings.categoryDetail.logTimestamp(item.date.toLocaleDateString(), item.time)}
        </Text>
      </View>
      <Text style={styles.logAmount}>{format(item.amount, { signed: true })}</Text>
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

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryAmount}>{format(stats.thisMonth)}</Text>
            <Text style={styles.summaryLabel}>{strings.categoryDetail.thisMonth}</Text>
          </View>
          {stats.lastMonth > 0 && (
            // UX-008: both directions render in theme.slate. Coral/sage
            // (red/green P&L coding) shame-coded a month where someone spent
            // more; the arrow direction and the wording already carry the
            // meaning, color should not add judgment on top.
            <View style={styles.summaryTrend}>
              <Icon
                name={trendPercentage > 0 ? 'TrendingUp' : 'TrendingDown'}
                size={18}
                color={theme.slate}
              />
              <Text
                style={[
                  styles.summaryTrendText,
                  { color: theme.slate },
                ]}
              >
                {strings.categoryDetail.vsLastMonth(Math.abs(trendPercentage))}
              </Text>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.logCount}</Text>
            <Text style={styles.statLabel}>{strings.categoryDetail.logsStat}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{format(stats.average)}</Text>
            <Text style={styles.statLabel}>{strings.categoryDetail.averageStat}</Text>
          </View>
        </View>

        {/* Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.categoryDetail.sixMonthTrend}</Text>
          <View style={styles.trendCard}>
            {hasTrendData ? (
              <View style={styles.trendChart}>
                {/* UX-056: keyed by index before; the 6 months in this
                    window are always distinct, so the month label is a
                    stable, non-positional key. */}
                {trendData.map((item) => (
                  <View key={item.month} style={styles.trendBar}>
                    {/* UX-009: spend bars are mist on snow, never the raw
                        category identity color. Matches the track/fill
                        approach in WhereItWentCard and ScanSnapshotCard. */}
                    <View style={styles.trendBarTrack}>
                      <View
                        style={[
                          styles.trendBarFill,
                          { height: `${(item.amount / maxTrendAmount) * 100}%` },
                        ]}
                      />
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
            <Text style={styles.sectionTitle}>{strings.categoryDetail.topMerchants}</Text>
            <View style={styles.merchantsCard}>
              {/* UX-056: keyed by index before; merchant.name is already
                  the merchantMap key upstream, so it is guaranteed unique
                  within topMerchants. */}
              {stats.topMerchants.map((merchant, index) => (
                <View
                  key={merchant.name}
                  style={[styles.merchantRow, index === 0 && styles.rowNoBorder]}
                >
                  <View style={styles.merchantRank}>
                    <Text style={styles.merchantRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.merchantContent}>
                    <Text style={styles.merchantName} numberOfLines={1}>
                      {merchant.name}
                    </Text>
                    <Text style={styles.merchantCount}>
                      {strings.categoryDetail.logCount(merchant.count)}
                    </Text>
                  </View>
                  <Text style={styles.merchantTotal}>{format(merchant.total)}</Text>
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
          <Text style={styles.sectionTitle}>
            {recentLogs.length < categoryExpenses.length
              ? `${strings.categoryDetail.recentLogs} · ${strings.categoryDetail.recentLogsCount(recentLogs.length, categoryExpenses.length)}`
              : strings.categoryDetail.recentLogs}
          </Text>
          <View style={styles.logsCard}>
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
    summaryCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.feature,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16,
    },
    summaryMain: {
      alignItems: 'center',
      marginBottom: 8,
    },
    // Money, hero scale: the display serif with tabular figures
    // (design/PATTERN_VOCABULARY.md, "Instrument Serif ... money").
    summaryAmount: {
      // Batch 2 token pass: literal 36 -> typeScale.displayLarge.
      fontSize: typeScale.displayLarge,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.ink,
    },
    summaryLabel: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    summaryTrend: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryTrendText: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiMedium,
      marginLeft: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.card,
      padding: 16,
      alignItems: 'center',
    },
    // Stat numbers are currency or counts, so they take the display serif
    // with tabular figures (same convention as app/habit/[id].tsx statValue).
    statValue: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.ink,
    },
    statLabel: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 4,
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
    // UX-009: spend bars are mist on snow (never sage, never the category's
    // raw identity color). Track reserves the full column height; fill grows
    // from the bottom within it.
    trendBarTrack: {
      flex: 1,
      width: '100%',
      borderRadius: 4,
      backgroundColor: theme.categoryBarTrack,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    trendBarFill: {
      width: '100%',
      borderRadius: 4,
      minHeight: 4,
      backgroundColor: theme.categoryBarFill,
    },
    trendLabel: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 8,
    },
    merchantsCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.card,
      paddingHorizontal: 16,
    },
    merchantRow: {
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
    merchantRank: {
      width: 28,
      height: 28,
      borderRadius: radii.pill,
      backgroundColor: theme.snow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    merchantRankText: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.slate,
    },
    merchantContent: {
      flex: 1,
    },
    merchantName: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiMedium,
      color: theme.ink,
    },
    merchantCount: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    merchantTotal: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    logsCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.card,
      paddingHorizontal: 16,
    },
    logRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
    },
    logContent: {
      flex: 1,
    },
    logTitle: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiMedium,
      color: theme.ink,
    },
    logDate: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    logAmount: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
  });
}
