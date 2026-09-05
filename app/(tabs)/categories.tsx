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
import { useEmptyStateAction } from '@/components/onboarding/useEmptyStateAction';
import { layout, radii, typeScale, type AppTheme } from '@/constants/theme';
import type { Category, CategoryIcon } from '@/types/category';
import { strings } from '@/constants/strings';
import { expenseBelongsToCategory } from '@/utils/expenseCategory';
import { hapticError, hapticWarning } from '@/utils/motion';
import { useToast } from '@/components/ui/Toast';

type CategorySection = {
  title: string;
  data: Category[];
};

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { show } = useToast();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  // deleteTarget stays set through the sheet's close animation (only
  // deleteConfirmVisible toggles), so the title/body never go blank mid-exit.
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const {
    categories,
    isLoading,
    addCategory,
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

  // Empty state as an onboarding surface (PRD v3.1 sect 5). This screen owns
  // the add modal, so the action opens in place.
  const handleEmptyAddCategory = useEmptyStateAction('categories', useCallback(() => {
    setIsModalVisible(true);
  }, []));

  // U12b: this handler used to also branch on editingCategory, but that state
  // was only ever set to null, so the AddCategoryModal edit branch was
  // unreachable from this tab (custom categories are edited via category
  // detail's pencil instead, app/category/[id].tsx). This tab only ever adds.
  const handleAddCategory = useCallback(async (
    name: string,
    icon: CategoryIcon,
    color: string
  ) => {
    // Rethrows on purpose: AddCategoryModal is the surface holding the user's
    // typed name, so it is the one that keeps the sheet open and says so.
    await addCategory(name, icon, color);
  }, [addCategory]);

  const handleDeleteCategory = useCallback((category: Category) => {
    hapticWarning();
    setDeleteTarget(category);
    setDeleteConfirmVisible(true);
  }, []);

  const confirmDeleteCategory = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
    } catch (error) {
      // Covers both the domain guard ("Cannot delete default categories") and
      // a failed write. The confirm stays up rather than closing over a
      // category that is still there.
      console.error('Error deleting category:', error);
      hapticError();
      show(strings.toasts.deleteFailed);
      return;
    }
    setDeleteConfirmVisible(false);
  }, [deleteTarget, deleteCategory, show]);

  const handleCategoryPress = useCallback((category: Category) => {
    router.push(`/category/${category.id}`);
  }, [router]);

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const getCategorySpend = useCallback((category: Category): number => {
    // UX-007: CategoryRow renders this through strings.categories.thisMonthSuffix
    // ("this month"), so the total has to actually be scoped to the current
    // calendar month, not all-time. Same month-window pattern as
    // app/category/[id].tsx's thisMonthStart/thisMonthExpenses.
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // expenseBelongsToCategory handles the display-vs-stored name split
    // (Home rows are stored as 'Mortgage').
    const categoryExpenses = expenses.filter(
      e => expenseBelongsToCategory(e, category) && e.date >= thisMonthStart
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
          <EmptyState
            layout="fill"
            icon="Folder"
            title={strings.categories.emptyTitle}
            cta={{ label: strings.categories.emptyCta, onPress: handleEmptyAddCategory }}
          />
        ) : (
          sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.eyebrow} accessibilityRole="header">
                {section.title}
              </Text>
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
      paddingBottom: layout.screenBottomClearance,
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
      color: theme.mistText,
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
  });
}
