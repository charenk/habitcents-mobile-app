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
import { AmountInput } from '@/components/AmountInput';
import type { AppTheme } from '@/constants/theme';
import type { ExpenseCategory } from '@/types/expense';
import { strings } from '@/constants/strings';

const QUICK_CATEGORIES: { name: ExpenseCategory; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { name: strings.onboarding.food, icon: 'fast-food-outline', color: '#66BB6A' },
  { name: strings.onboarding.shopping, icon: 'cart-outline', color: '#EC407A' },
  { name: strings.onboarding.entertainment, icon: 'film-outline', color: '#42A5F5' },
  { name: strings.onboarding.transportation, icon: 'bus-outline', color: '#8D6E63' },
];

export default function FirstExpenseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { completeStep, skipStep, completeOnboarding } = useOnboarding();
  const { addExpense } = useExpenses();

  const [amount, setAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);

  const canSave = amount > 0 && selectedCategory;

  const handleSave = async () => {
    if (!canSave) return;

    await addExpense({
      title: `${selectedCategory} expense`,
      amount,
      category: selectedCategory,
      date: new Date(),
      isRecurring: false,
      reminderEnabled: false,
    });

    await completeStep('first_expense');
    router.push('/onboarding/success');
  };

  const handleSkip = async () => {
    await skipStep('first_expense');
    await completeOnboarding();
    router.replace('/(tabs)/expenses');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>{strings.onboarding.skip}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{strings.onboarding.firstExpenseTitle}</Text>
        <Text style={styles.subtitle}>
          {strings.onboarding.firstExpenseSubtitle}
        </Text>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <AmountInput
            value={amount}
            onChange={setAmount}
            autoFocus
          />
        </View>

        {/* Category Selection */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryLabel}>{strings.onboarding.whatWasItFor}</Text>
          <View style={styles.categoryGrid}>
            {QUICK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.name && styles.categoryChipActive,
                  selectedCategory === cat.name && { borderColor: cat.color },
                ]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: cat.color + '20' },
                  ]}
                >
                  <Ionicons name={cat.icon} size={24} color={cat.color} />
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat.name && styles.categoryTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.button, !canSave && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.buttonText}>{strings.onboarding.saveExpense}</Text>
          <Ionicons name="checkmark" size={20} color={theme.white} />
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
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    skipText: {
      fontSize: 16,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 40,
    },
    amountSection: {
      alignItems: 'center',
      marginBottom: 48,
    },
    categorySection: {},
    categoryLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 16,
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
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 18,
      borderRadius: 16,
      gap: 8,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.white,
    },
  });
}
