import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Icon, EmojiTile } from '@/components/ui';
import { deleteCategoryLabel } from '@/utils/a11y';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { typeScale, type AppTheme } from '@/constants/theme';
import type { Category } from '@/types/category';
import { strings } from '@/constants/strings';

type CategoryRowProps = {
  category: Category;
  totalSpent?: number;
  onPress?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  /** False on the last row of a card, so the card ends on a clean edge. */
  showSeparator?: boolean;
};

/**
 * One category inside a Categories card (redesign step 04). Emoji tile, name,
 * spend caption, chevron, plus the delete affordance custom rows keep. The row
 * sits directly on the card, so it carries no background of its own.
 */
export function CategoryRow({
  category,
  totalSpent = 0,
  onPress,
  onDelete,
  showDelete = false,
  showSeparator = true,
}: CategoryRowProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const spentLabel = totalSpent > 0 ? strings.categories.thisMonthSuffix(format(totalSpent)) : null;
  const rowLabel = [strings.categories.openCategoryLabel(category.name), spentLabel]
    .filter(Boolean)
    .join(', ');

  // Default categories carry legacy palette hex; the redesign identity color
  // keeps their tiles on the new palette. A custom category keeps the color
  // its owner picked.
  const tint = category.isDefault ? categoryIdentityColor(category.name) : category.color;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        showSeparator ? styles.separator : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rowLabel}
    >
      <EmojiTile emoji={categoryEmoji(category.name)} size={36} color={tint} />

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {category.name}
        </Text>
        {spentLabel && <Text style={styles.spent}>{spentLabel}</Text>}
      </View>

      {showDelete && !category.isDefault && onDelete && (
        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={deleteCategoryLabel(category.name)}
        >
          <Icon name="Trash2" size={18} color={theme.coral} />
        </Pressable>
      )}

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
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      paddingVertical: 10,
    },
    separator: {
      borderBottomWidth: 1,
      borderBottomColor: theme.hairlineSubtle,
    },
    pressed: {
      opacity: 0.6,
    },
    content: {
      flex: 1,
    },
    name: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    spent: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.mistText,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    deleteButton: {
      padding: 4,
    },
  });
}
