/**
 * Categories (redesign step 04 restyle).
 *
 * Charen's call on 2026-07-30 keeps category management as a tab, so this is a
 * visual pass only: serif title, a circular add button, eyebrow-labelled white
 * cards, and the rebuilt CategoryRow. Every behavior is unchanged (CRUD, the
 * delete confirm, the push into /category/[id], and AddCategoryModal).
 *
 * The delete confirm moved off Alert.alert onto the house ConfirmSheet
 * (design/selection-sheets U3), matching the pattern app/habit/[id].tsx
 * already used for its own destructive confirm.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ConfirmSheet, EmptyState, ScreenHeader } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { CategoryRow } from '@/components/CategoryRow';
import { AddCategoryModal } from '@/components/AddCategoryModal';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import type { Category, CategoryIcon } from '@/types/category';
import { strings } from '@/constants/strings';
import { hapticWarning } from '@/utils/motion';

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
  // deleteTarget stays set through the sheet's close animation (only
  // deleteConfirmVisible toggles), so the title/body never go blank mid-exit.
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    getDefaultCategories,
    getCustomCategories,
  } = useCategories();

  const { expenses } = useExpenses();

  const sections: CategorySection[] = useMemo(() => {
    const defaultCats = getDefaultCategories().filter(c => !c.isHidden);
    const customCats = getCustomCategories().filter(c => !c.isHidden);

    const result: CategorySection[] = [];

    if (defaultCats.length > 0) {
      result.push({ title: strings.categories.eyebrowDefault, data: defaultCats });
    }
    if (customCats.length > 0) {
      result.push({ title: strings.categories.eyebrowCustom, data: customCats });
    }

    return result;
  }, [categories, getDefaultCategories, getCustomCategories]);

  const handleAddCategory = useCallback(async (
    name: string,
    icon: CategoryIcon,
    color: string
  ) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, { name, icon, color });
      setEditingCategory(null);
    } else {
      await addCategory(name, icon, color);
    }
  }, [editingCategory, addCategory, updateCategory]);

  const handleDeleteCategory = useCallback((category: Category) => {
    hapticWarning();
    setDeleteTarget(category);
    setDeleteConfirmVisible(true);
  }, []);

  const confirmDeleteCategory = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.id);
    setDeleteConfirmVisible(false);
  }, [deleteTarget, deleteCategory]);

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

  const headerActions = [
    { icon: 'Plus' as const, label: strings.categories.addCategoryLabel, onPress: () => setIsModalVisible(true) },
    { icon: 'CircleUser' as const, label: strings.profile.headerLabel, onPress: () => router.push('/profile') },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title={strings.screenTitles.categories} actions={headerActions} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{strings.categories.loading}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={strings.screenTitles.categories} actions={headerActions} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="Folder"
              title={strings.categories.emptyTitle}
              body={strings.categories.emptySubtitle}
            />
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.eyebrow}>{section.title}</Text>
              <View style={styles.card}>
                {section.data.map((category, index) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    totalSpent={getCategorySpend(category)}
                    onPress={() => handleCategoryPress(category)}
                    onDelete={() => handleDeleteCategory(category)}
                    showDelete={!category.isDefault}
                    showSeparator={index < section.data.length - 1}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AddCategoryModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onSave={handleAddCategory}
        initialName={editingCategory?.name}
        initialIcon={editingCategory?.icon}
        initialColor={editingCategory?.color}
        isEditing={!!editingCategory}
      />

      <ConfirmSheet
        visible={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
          void confirmDeleteCategory();
        }}
        title={strings.categories.deleteTitle(deleteTarget?.name ?? '')}
        body={strings.categories.deleteMessage}
        confirmLabel={strings.categories.deleteConfirmCta}
        cancelLabel={strings.categories.deleteCancel}
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 100,
      gap: 20,
    },
    section: {
      gap: 8,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mist,
      paddingHorizontal: 2,
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      paddingHorizontal: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 24,
    },
  });
}
