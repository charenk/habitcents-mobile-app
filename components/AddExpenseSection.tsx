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
import { AmountInput } from './AmountInput';
import { ToggleRow } from './ToggleRow';
import type { ExpenseCategory, AddExpenseInput } from '@/types/expense';
import { EXPENSE_CATEGORIES } from '@/data/expensesMock';

type AddExpenseSectionProps = {
  onSave: (expense: AddExpenseInput) => void;
  onCancel: () => void;
};

const REMINDER_OPTIONS = ['15m before', '30m before', '1h before', '1 day before'];

export function AddExpenseSection({ onSave, onCancel }: AddExpenseSectionProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [title, setTitle] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('1h before');

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
    outputRange: [0, 280],
  });

  const expandedOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const handleSave = () => {
    if (amount === 0) return;

    Keyboard.dismiss();
    onSave({
      title: title.trim() || 'New expense',
      amount,
      category,
      date: new Date(),
      isRecurring,
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime : undefined,
    });

    // Reset form
    setAmount(0);
    setCategory('Other');
    setTitle('');
    setIsRecurring(false);
    setReminderEnabled(false);
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    setAmount(0);
    setCategory('Other');
    setTitle('');
    setIsRecurring(false);
    setReminderEnabled(false);
    onCancel();
  };

  const cycleReminderTime = () => {
    const currentIndex = REMINDER_OPTIONS.indexOf(reminderTime);
    const nextIndex = (currentIndex + 1) % REMINDER_OPTIONS.length;
    setReminderTime(REMINDER_OPTIONS[nextIndex]);
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
        {EXPENSE_CATEGORIES.map((cat) => {
          const isActive = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Animated.View style={[styles.expandedSection, { height: expandedHeight, opacity: expandedOpacity }]}>
        <View style={styles.expandedContent}>
          <View style={styles.inputRow}>
            <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={styles.descriptionInput}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.togglesContainer}>
            <ToggleRow
              label="Recurring expense"
              value={isRecurring}
              onValueChange={setIsRecurring}
            />
            <View style={styles.toggleSpacer} />
            <ToggleRow
              label="Reminder"
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              secondaryLabel={reminderTime}
              onSecondaryPress={cycleReminderTime}
            />
          </View>

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
    togglesContainer: {
      marginBottom: 16,
    },
    toggleSpacer: {
      height: 8,
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
