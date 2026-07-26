import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon, CATEGORY_ICON_MAP, type IconName } from '@/components/ui/Icon';
import { deleteCategoryLabel } from '@/utils/a11y';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import type { Category } from '@/types/category';
import { strings } from '@/constants/strings';

type CategoryRowProps = {
  category: Category;
  totalSpent?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  trendPercentage?: number;
  onPress?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
};

export function CategoryRow({
  category,
  totalSpent = 0,
  trend,
  trendPercentage,
  onPress,
  onDelete,
  showDelete = false,
}: CategoryRowProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const getTrendIcon = (): IconName => {
    switch (trend) {
      case 'increasing':
        return 'TrendingUp';
      case 'decreasing':
        return 'TrendingDown';
      default:
        return 'Minus';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'increasing':
        return theme.danger;
      case 'decreasing':
        return theme.primary;
      default:
        return theme.textSecondary;
    }
  };

  const showTrend = !!trend && trendPercentage !== undefined && trendPercentage > 0;
  const trendWord = trend === 'increasing' ? 'up' : trend === 'decreasing' ? 'down' : 'flat';
  const rowLabel = [
    category.name,
    totalSpent > 0 ? strings.categories.thisMonthSuffix(format(totalSpent)) : '',
    showTrend ? `trending ${trendWord} ${trendPercentage}%` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={rowLabel}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Icon
          name={CATEGORY_ICON_MAP[category.icon]}
          size={24}
          color={category.color}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{category.name}</Text>
        {totalSpent > 0 && (
          <Text style={styles.spent}>{strings.categories.thisMonthSuffix(format(totalSpent))}</Text>
        )}
      </View>

      {showTrend && (
        <View style={styles.trendContainer}>
          <Icon
            name={getTrendIcon()}
            size={16}
            color={getTrendColor()}
          />
          <Text style={[styles.trendText, { color: getTrendColor() }]}>
            {trendPercentage}%
          </Text>
        </View>
      )}

      {showDelete && !category.isDefault && onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={deleteCategoryLabel(category.name)}
        >
          <Icon name="Trash2" size={20} color={theme.danger} />
        </TouchableOpacity>
      )}

      <Icon
        name="ChevronRight"
        size={20}
        color={theme.textTertiary}
        style={styles.chevron}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    </TouchableOpacity>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    content: {
      flex: 1,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    spent: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    trendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
    },
    trendText: {
      fontSize: 13,
      fontWeight: '500',
      marginLeft: 4,
    },
    deleteButton: {
      padding: 8,
      marginRight: 4,
    },
    chevron: {
      marginLeft: 4,
    },
  });
}
