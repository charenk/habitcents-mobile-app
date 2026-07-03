import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import type { Category, CategoryIcon } from '@/types/category';

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

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing':
        return 'trending-up';
      case 'decreasing':
        return 'trending-down';
      default:
        return 'remove';
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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
        <Ionicons
          name={category.icon as keyof typeof Ionicons.glyphMap}
          size={24}
          color={category.color}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{category.name}</Text>
        {totalSpent > 0 && (
          <Text style={styles.spent}>{format(totalSpent)} this month</Text>
        )}
      </View>

      {trend && trendPercentage !== undefined && trendPercentage > 0 && (
        <View style={styles.trendContainer}>
          <Ionicons
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
        >
          <Ionicons name="trash-outline" size={20} color={theme.danger} />
        </TouchableOpacity>
      )}

      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.textTertiary}
        style={styles.chevron}
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
