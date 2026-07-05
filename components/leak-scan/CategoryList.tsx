import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
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
export function CategoryList({ categories, onCategoryPress }: CategoryListProps) {
  const theme = useTheme();
  const { format } = useCurrency();
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
            <Text style={styles.categoryName}>{categoryDisplayLabel(c.category)}</Text>
            <TierBadge tier={c.tier} />
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
        <TouchableOpacity onPress={handleViewMore} accessibilityRole="button">
          <Text style={styles.viewMore}>{strings.leakScan.viewMore}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 10,
    },
    row: {
      marginBottom: 12,
    },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    rowStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    amount: {
      fontSize: 13,
      color: theme.text,
      fontVariant: ['tabular-nums'],
    },
    percent: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    barTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    barFill: {
      height: 6,
      borderRadius: 3,
    },
    viewMore: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginTop: 4,
    },
  });
}
