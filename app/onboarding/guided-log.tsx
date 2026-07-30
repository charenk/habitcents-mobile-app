import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountDisplay, Button, EmojiTile, Icon, Keypad, useToast } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { keypadValueToCents } from '@/utils/keypad';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
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
 * Guided first log (spec 02 section 3.6, restyled per redesign spec 03 path A).
 * The real log form, not a simulation: saving writes a real expense and fires
 * first_log_saved. Skippable via "Later"; the success screen still shows either
 * way. Amount entry is the shared amount-first pair (AmountDisplay + Keypad),
 * so the number is serif and the keypad never summons the system keyboard.
 */
export default function OnboardingGuidedLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toast = useToast();
  const { completeStep, skipStep } = useOnboarding();
  const { addExpense } = useExpenses();
  const { getVisibleCategories } = useCategories();

  // The keypad edits a decimal string; cents stay the derived value the save
  // path has always used, so the write below is byte-for-byte the old one.
  const [amountValue, setAmountValue] = useState('');
  const amount = keypadValueToCents(amountValue);
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
    toast.show(strings.onboarding.guidedLogToast);
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
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.coachBanner}>
          <Icon name="Sprout" size={16} color={theme.primaryDark} style={styles.coachIcon} />
          <Text style={styles.coachText}>{strings.onboarding.guidedLogHint}</Text>
        </View>

        <View style={styles.amountSection}>
          <AmountDisplay valueCents={amount} focused={amount > 0} size={52} zeroAsPlaceholder />
        </View>

        <View style={styles.categoryRow}>
          {quickCategories.map((cat) => {
            const selected = selectedCategory?.id === cat.id;
            const identity = categoryIdentityColor(cat.name);
            return (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  styles.categoryTile,
                  selected ? { borderColor: identity, backgroundColor: theme.snow } : null,
                  pressed && !selected ? styles.categoryTilePressed : null,
                ]}
                onPress={() => setSelectedCategory(cat)}
                accessibilityRole="button"
                accessibilityLabel={cat.name}
                accessibilityState={{ selected }}
              >
                <EmojiTile emoji={categoryEmoji(cat.name)} size={44} color={identity} />
                <Text style={[styles.categoryText, selected ? styles.categoryTextSelected : null]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.keypadSection}>
          <Keypad value={amountValue} onChange={setAmountValue} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={strings.expenses.saveExpense}
          onPress={handleSave}
          disabled={!canSave}
          style={styles.primaryButton}
        />
        <Button
          label={strings.onboarding.guidedLogLater}
          onPress={handleLater}
          variant="tertiary"
          style={styles.laterButton}
        />
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
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    coachBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: theme.primaryLight,
      borderRadius: radii.card,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    coachIcon: {
      marginTop: 2,
    },
    coachText: {
      flex: 1,
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.ink,
      lineHeight: 21,
    },
    amountSection: {
      marginTop: 28,
      marginBottom: 24,
    },
    categoryRow: {
      flexDirection: 'row',
      gap: 10,
    },
    categoryTile: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: radii.card,
      borderWidth: 1.5,
      borderColor: theme.cloud,
      backgroundColor: theme.white,
      minHeight: 92,
      justifyContent: 'center',
    },
    categoryTilePressed: {
      backgroundColor: theme.snow,
    },
    categoryText: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.uiMedium,
      color: theme.slate,
      textAlign: 'center',
    },
    categoryTextSelected: {
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    keypadSection: {
      marginTop: 24,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      backgroundColor: theme.background,
    },
    primaryButton: {
      width: '100%',
    },
    laterButton: {
      marginTop: 6,
      alignSelf: 'center',
    },
  });
}
