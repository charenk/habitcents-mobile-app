import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { AmountInput } from './AmountInput';
import { RecurrenceField } from './RecurrenceField';
import type { AppTheme } from '@/constants/theme';
import type { Expense, ExpenseCategory, RecurrenceFrequency } from '@/types/expense';
import { strings } from '@/constants/strings';

type EditExpenseModalProps = {
  visible: boolean;
  expense: Expense | null;
  onClose: () => void;
};

export function EditExpenseModal({ visible, expense, onClose }: EditExpenseModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { getVisibleCategories } = useCategories();
  const { updateExpense, deleteExpense } = useExpenses();

  const categories = getVisibleCategories();

  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Re-sync fields whenever a different expense is opened. Without this the
  // form would show the first-opened expense's values forever (the C4 bug).
  useEffect(() => {
    if (expense) {
      setAmount(expense.amount);
      setCategoryId(expense.categoryId ?? null);
      setMerchant(expense.merchant ?? '');
      setNote(expense.title ?? '');
      setRecurrence(expense.isRecurring ? expense.recurrence ?? 'monthly' : null);
      setConfirmingDelete(false);
    }
  }, [expense]);

  const selectedCategory = categories.find(c => c.id === categoryId) ?? null;

  const handleSave = async () => {
    if (!expense || amount === 0) return;
    const category = (selectedCategory?.name ?? expense.category) as ExpenseCategory;
    const merchantValue = merchant.trim();
    await updateExpense(expense.id, {
      amount,
      category,
      categoryId: selectedCategory?.id,
      merchant: merchantValue || undefined,
      title: note.trim() || merchantValue || category,
      isRecurring: recurrence !== null,
      recurrence: recurrence ?? undefined,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!expense) return;
    await deleteExpense(expense.id);
    setConfirmingDelete(false);
    onClose();
  };

  const handleClose = () => {
    setConfirmingDelete(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} accessibilityLabel={strings.editExpenseModal.cancelAccessibilityLabel}>
              <Text style={styles.cancelText}>{strings.common.cancel}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{strings.editExpenseModal.title}</Text>
            <TouchableOpacity onPress={handleSave} disabled={amount === 0} accessibilityLabel={strings.editExpenseModal.saveAccessibilityLabel}>
              <Text style={[styles.saveText, amount === 0 && styles.saveTextDisabled]}>{strings.common.save}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.amountWrap}>
              <AmountInput value={amount} onChange={setAmount} />
            </View>

            <Text style={styles.sectionTitle}>{strings.editExpenseModal.category}</Text>
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

            <Text style={styles.sectionTitle}>{strings.editExpenseModal.merchant}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="storefront-outline" size={20} color={theme.textSecondary} />
              <TextInput
                style={styles.input}
                value={merchant}
                onChangeText={setMerchant}
                placeholder={strings.editExpenseModal.merchantPlaceholder}
                placeholderTextColor={theme.textTertiary}
                maxLength={60}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.sectionTitle}>{strings.editExpenseModal.note}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder={strings.editExpenseModal.notePlaceholder}
                placeholderTextColor={theme.textTertiary}
                maxLength={100}
              />
            </View>

            <RecurrenceField recurrence={recurrence} onChange={setRecurrence} />

            {confirmingDelete ? (
              <View style={styles.confirmRow}>
                <TouchableOpacity
                  style={styles.confirmCancel}
                  onPress={() => setConfirmingDelete(false)}
                >
                  <Text style={styles.confirmCancelText}>{strings.common.keep}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDelete}
                  onPress={handleDelete}
                  accessibilityLabel={strings.editExpenseModal.confirmDeleteAccessibilityLabel}
                >
                  <Text style={styles.confirmDeleteText}>{strings.editExpenseModal.deleteExpense}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setConfirmingDelete(true)}
                accessibilityLabel={strings.editExpenseModal.deleteAccessibilityLabel}
              >
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
                <Text style={styles.deleteText}>{strings.editExpenseModal.deleteExpense}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    cancelText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
    },
    saveText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    saveTextDisabled: {
      color: theme.textTertiary,
    },
    content: {
      paddingHorizontal: 16,
    },
    amountWrap: {
      paddingVertical: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 12,
      marginTop: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chipsScroll: {
      flexGrow: 0,
      marginBottom: 16,
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
    },
    chipTextActive: {
      color: theme.chipActiveText,
    },
    chipTextInactive: {
      color: theme.chipInactiveText,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      marginLeft: 12,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.danger,
      marginTop: 8,
    },
    deleteText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.danger,
    },
    confirmRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    confirmCancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.surface,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.chipBorder,
    },
    confirmCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    confirmDelete: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.danger,
      alignItems: 'center',
    },
    confirmDeleteText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    bottomPadding: {
      height: 40,
    },
  });
}
