import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { AmountInput } from './AmountInput';
import { RecurrenceField } from './RecurrenceField';
import type { ExpenseCategory, AddExpenseInput, RecurrenceFrequency } from '@/types/expense';

type AddExpenseSectionProps = {
  onSave: (expense: AddExpenseInput) => void;
  onCancel: () => void;
};

export function AddExpenseSection({ onSave, onCancel }: AddExpenseSectionProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { getVisibleCategories } = useCategories();
  const { expenses } = useExpenses();

  const categories = getVisibleCategories();

  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | null>(null);

  const resetForm = () => {
    setAmount(0);
    setCategoryId(null);
    setMerchant('');
    setTitle('');
    setRecurrence(null);
  };

  const selectedCategory = categories.find(c => c.id === categoryId) ?? null;

  // Merchant autocomplete: distinct prior merchants matching what's typed.
  const merchantSuggestions = useMemo(() => {
    const query = merchant.trim().toLowerCase();
    if (!query) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of expenses) {
      const m = e.merchant?.trim();
      if (!m) continue;
      const key = m.toLowerCase();
      if (key === query || seen.has(key)) continue;
      if (key.startsWith(query)) {
        seen.add(key);
        out.push(m);
      }
      if (out.length >= 4) break;
    }
    return out;
  }, [merchant, expenses]);

  const expandAnim = useRef(new Animated.Value(0)).current;
  const isExpanded = amount > 0;

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, expandAnim]);

  const expandedHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    // Fits merchant + optional suggestions + note + recurrence + buttons. The
    // fixed height is a known limitation slated for the P2-4 form redesign.
    outputRange: [0, 340],
  });

  const expandedOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const handleSave = () => {
    if (amount === 0) return;

    const category = (selectedCategory?.name ?? 'Other') as ExpenseCategory;
    const merchantValue = merchant.trim();

    Keyboard.dismiss();
    onSave({
      title: title.trim() || merchantValue || category,
      amount,
      category,
      categoryId: selectedCategory?.id,
      merchant: merchantValue || undefined,
      date: new Date(),
      isRecurring: recurrence !== null,
      recurrence: recurrence ?? undefined,
      reminderEnabled: false,
    });

    resetForm();
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    resetForm();
    onCancel();
  };

  return (
    <View style={styles.container}>
      <AmountInput value={amount} onChange={setAmount} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
        style={styles.chipsScroll}
      >
        {categories.map((cat) => {
          const isActive = categoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Animated.View style={[styles.expandedSection, { height: expandedHeight, opacity: expandedOpacity }]}>
        <View style={styles.expandedContent}>
          <View style={styles.inputRow}>
            <Ionicons name="storefront-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={styles.descriptionInput}
              placeholder="Merchant (e.g. Starbucks)"
              placeholderTextColor={theme.textTertiary}
              value={merchant}
              onChangeText={setMerchant}
              maxLength={60}
              autoCapitalize="words"
            />
          </View>

          {merchantSuggestions.length > 0 && (
            <View style={styles.suggestionsRow}>
              {merchantSuggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionChip}
                  onPress={() => setMerchant(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.inputRow}>
            <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={styles.descriptionInput}
              placeholder="Note (optional)"
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <RecurrenceField recurrence={recurrence} onChange={setRecurrence} />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, amount === 0 && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={amount === 0}
            >
              <Text style={styles.saveButtonText}>Save Expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
    },
    chipsScroll: {
      marginTop: 12,
      flexGrow: 0,
    },
    chipsContainer: {
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chip: {
      height: 40,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chipActive: {
      backgroundColor: theme.chipActiveBg,
      borderColor: theme.chipActiveBg,
    },
    chipInactive: {
      backgroundColor: theme.chipInactiveBg,
      borderColor: theme.chipBorder,
    },
    chipText: {
      fontSize: 15,
      fontWeight: '500',
      lineHeight: 18,
    },
    chipTextActive: {
      color: theme.chipActiveText,
    },
    chipTextInactive: {
      color: theme.chipInactiveText,
    },
    expandedSection: {
      overflow: 'hidden',
    },
    expandedContent: {
      paddingTop: 16,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
    },
    descriptionInput: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      marginLeft: 12,
    },
    suggestionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: -4,
      marginBottom: 12,
    },
    suggestionChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.chipInactiveBg,
      borderWidth: 1,
      borderColor: theme.chipBorder,
    },
    suggestionText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.surface,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.chipBorder,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    saveButton: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.white,
    },
  });
}
