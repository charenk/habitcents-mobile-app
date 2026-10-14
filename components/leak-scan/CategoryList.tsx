import React, { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import { TierBadge } from './TierBadge';
import { categoryDisplayLabel } from '@/utils/leakScanBridge';
import type { CategorySummary } from '@/utils/leakScan/resultsSummary';
import { track } from '@/utils/analytics';

type CategoryListProps = {
  categories: CategorySummary[];
  onCategoryPress?: (category: CategorySummary) => void;
};

/**
 * Categories section (spec 5.2, visual spec 4): top 3 by net spend, with a
 * "View more" expansion. Bars are neutral gray on purpose (spend is not a
 * win; green stays reserved for Kept).
 */
function CategoryListImpl({ categories, onCategoryPress }: CategoryListProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const strings = useStrings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) return null;

  const visible = expanded ? categories : categories.slice(0, 3);
  const maxPercent = Math.max(...categories.map((c) => c.percentOfTotal), 1);

  const handleViewMore = () => {
    track('scan_categories_expanded', {});
    setExpanded(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.leakScan.categoriesTitle}</Text>
      {visible.map((c) => (
        <TouchableOpacity
          key={c.category}
          style={styles.row}
          onPress={() => onCategoryPress?.(c)}
          accessibilityRole="button"
        >
          <View style={styles.rowHeader}>
            <View style={styles.rowHeaderLeft}>
              <Text style={styles.categoryName} numberOfLines={1}>
                {categoryDisplayLabel(c.category)}
              </Text>
              <TierBadge tier={c.tier} />
            </View>
            {/* UX-038: this row opens CategoryTransactionsSheet; the rows
                rule says a chevron names that ("opens something in-app"). */}
            <Icon
              name="ChevronRight"
              size={16}
              color={theme.mistText}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
            />
          </View>
          <View style={styles.rowStats}>
            <Text style={styles.amount}>{format(c.totalCents)}</Text>
            <Text style={styles.percent}>{strings.leakScan.percentOfTotal(c.percentOfTotal)}</Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: theme.categoryBarTrack }]}>
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: theme.categoryBarFill,
                  width: `${Math.max(2, (c.percentOfTotal / maxPercent) * 100)}%`,
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      ))}
      {!expanded && categories.length > 3 && (
        <TouchableOpacity
          onPress={handleViewMore}
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.viewMore}>{strings.leakScan.viewMore}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Memoized: renders once per leak-scan results screen, so the payoff is
 * bailing on re-renders triggered by unrelated ResultsScreen state (sheet
 * open/close, other list edits) rather than a "many rows" win. Effective at
 * its call site because ResultsScreen passes a useCallback-wrapped
 * onCategoryPress instead of the previous inline arrow.
 */
export const CategoryList = memo(CategoryListImpl);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 16,
    },
    title: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      marginBottom: 12,
    },
    row: {
      marginBottom: 14,
    },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    // UX-038: groups the name and tier badge so the chevron can sit at the
    // row's true trailing edge instead of splitting three ways.
    rowHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryName: {
      // Sits beside a tier badge and a chevron; names like "Software and
      // subscriptions" need to yield rather than push them out (ADR 0039).
      flexShrink: 1,
      fontSize: typeScale.label,
      fontFamily: theme.fonts.uiMedium,
      color: theme.ink,
    },
    rowStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 6,
    },
    amount: {
      // Deliberately a literal, not typeScale.button. This is serif money in a
      // list row, and the scale has no step for that yet: borrowing the button
      // token would couple a money figure to button-label sizing, so retuning
      // buttons would silently resize money. Awaiting a serif money step in the
      // second scale ratification. UX-018.
      fontSize: 16,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    percent: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    // Spend bars are always mist-on-snow: spend is never a win, so the fill
    // never borrows the Kept green (spec 01 section 1).
    barTrack: {
      height: 6,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    barFill: {
      height: 6,
      borderRadius: radii.pill,
    },
    viewMore: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.primaryDark,
      marginTop: 4,
      minHeight: 24,
    },
  });
}
