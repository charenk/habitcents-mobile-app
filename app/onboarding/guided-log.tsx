import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { AmountInput } from '@/components/AmountInput';
import type { AppTheme } from '@/constants/theme';
import type { Category } from '@/types/category';
import type { ExpenseCategory } from '@/types/expense';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';

// The four everyday categories offered on the guided log, taxonomy v2 names
// (docs/design-context/decisions/0006-category-taxonomy-v2.md). Typed against
// ExpenseCategory so a category rename can't silently produce an invalid
// Expense.category at runtime.
const QUICK_CATEGORY_NAMES: ExpenseCategory[] = ['Food', 'Shopping', 'Entertainment', 'Transportation'];

/**
 * Guided first log (spec 02 section 3.6). The real log form, not a
 * simulation: saving writes a real expense and fires first_log_saved.
 * Skippable via "Later"; the success screen still shows either way.
 */
export default function OnboardingGuidedLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { completeStep, skipStep } = useOnboarding();
  const { addExpense } = useExpenses();
  const { getVisibleCategories } = useCategories();

  const [amount, setAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const quickCategories = useMemo(() => {
    const all = getVisibleCategories();
    return QUICK_CATEGORY_NAMES.map((name) => all.find((c) => c.name === name)).filter(
      (c): c is Category => !!c
    );
  }, [getVisibleCategories]);

  const canSave = amount > 0 && !!selectedCategory;

  const handleSave = async () => {
    if (!canSave || !selectedCategory) return;

    await addExpense({
      title: `${selectedCategory.name} expense`,
      amount,
      category: selectedCategory.name as never,
      categoryId: selectedCategory.id,
      date: new Date(),
      isRecurring: false,
      reminderEnabled: false,
    });

    track('first_log_saved', { guided: true });
    await completeStep('guided_log');
    router.push('/onboarding/success');
  };

  const handleLater = async () => {
    await skipStep('guided_log');
    router.push('/onboarding/success');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.hint}>{strings.onboarding.guidedLogHint}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.amountSection}>
          <AmountInput value={amount} onChange={setAmount} autoFocus />
        </View>

        <View style={styles.categoryGrid}>
          {quickCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory?.id === cat.id && styles.categoryChipActive,
                selectedCategory?.id === cat.id && { borderColor: cat.color },
              ]}
              onPress={() => setSelectedCategory(cat)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory?.id === cat.id }}
            >
              <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon} size={24} color={cat.color} />
              </View>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory?.id === cat.id && styles.categoryTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.button, !canSave && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{strings.expenses.saveExpense}</Text>
          <Ionicons name="checkmark" size={20} color={theme.white} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLater} accessibilityRole="button" style={styles.plainButton}>
          <Text style={styles.plainButtonText}>{strings.onboarding.guidedLogLater}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    hint: {
      fontSize: 14,
      color: theme.textSecondary,
      backgroundColor: theme.coachMomentBg,
      borderRadius: 10,
      padding: 12,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 24,
      paddingTop: 8,
    },
    amountSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      minWidth: '45%',
      flex: 1,
    },
    categoryChipActive: {
      backgroundColor: theme.background,
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    categoryText: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.text,
    },
    categoryTextActive: {
      fontWeight: '600',
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 16,
      backgroundColor: theme.background,
      alignItems: 'center',
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 18,
      borderRadius: 16,
      gap: 8,
      width: '100%',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.white,
    },
    plainButton: {
      marginTop: 10,
      minHeight: 44,
      justifyContent: 'center',
    },
    plainButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
  });
}
