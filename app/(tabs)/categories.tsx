import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { CategoryRow } from '@/components/CategoryRow';
import { AddCategoryModal } from '@/components/AddCategoryModal';
import type { AppTheme } from '@/constants/theme';
import type { Category, CategoryIcon } from '@/types/category';
import { strings } from '@/constants/strings';

type CategorySection = {
  title: string;
  data: Category[];
};

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    getDefaultCategories,
    getCustomCategories,
  } = useCategories();

  const { expenses, getTotalByCategory } = useExpenses();

  const sections: CategorySection[] = useMemo(() => {
    const defaultCats = getDefaultCategories().filter(c => !c.isHidden);
    const customCats = getCustomCategories().filter(c => !c.isHidden);

    const result: CategorySection[] = [];

    if (defaultCats.length > 0) {
      result.push({ title: strings.categories.defaultCategories, data: defaultCats });
    }
    if (customCats.length > 0) {
      result.push({ title: strings.categories.customCategories, data: customCats });
    }

    return result;
  }, [categories, getDefaultCategories, getCustomCategories]);

  const handleAddCategory = useCallback(async (
    name: string,
    icon: CategoryIcon,
    color: string,
    monthlyBudget?: number
  ) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, { name, icon, color, monthlyBudget });
      setEditingCategory(null);
    } else {
      await addCategory(name, icon, color, monthlyBudget);
    }
  }, [editingCategory, addCategory, updateCategory]);

  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setIsModalVisible(true);
  }, []);

  const handleDeleteCategory = useCallback((category: Category) => {
    Alert.alert(
      strings.categories.deleteTitle,
      strings.categories.deleteMessage(category.name),
      [
        { text: strings.common.cancel, style: 'cancel' },
        {
          text: strings.common.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(category.id);
          },
        },
      ]
    );
  }, [deleteCategory]);

  const handleCategoryPress = useCallback((category: Category) => {
    router.push(`/category/${category.id}`);
  }, [router]);

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setEditingCategory(null);
  }, []);

  const getCategorySpend = useCallback((category: Category): number => {
    // Get spending from expenses that match this category name
    const categoryExpenses = expenses.filter(
      e => e.category === category.name || e.categoryId === category.id
    );
    return categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const renderCategory = ({ item }: { item: Category }) => (
    <CategoryRow
      category={item}
      totalSpent={getCategorySpend(item)}
      onPress={() => handleCategoryPress(item)}
      onDelete={() => handleDeleteCategory(item)}
      showDelete={!item.isDefault}
    />
  );

  const renderSectionHeader = ({ section }: { section: CategorySection }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{strings.categories.loading}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{strings.categories.title}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Add category"
        >
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={48} color={theme.textTertiary} />
            <Text style={styles.emptyText}>{strings.categories.emptyTitle}</Text>
            <Text style={styles.emptySubtext}>
              {strings.categories.emptySubtitle}
            </Text>
          </View>
        }
      />

      <AddCategoryModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onSave={handleAddCategory}
        initialName={editingCategory?.name}
        initialIcon={editingCategory?.icon}
        initialColor={editingCategory?.color}
        initialBudget={editingCategory?.monthlyBudget ? editingCategory.monthlyBudget / 100 : undefined}
        isEditing={!!editingCategory}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 24,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
  });
}
