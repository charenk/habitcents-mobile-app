/**
 * EditExpenseSheet (design/redesign-handoff/04-screens.md, "Log / Edit sheets").
 *
 * The same body as the log sheet, prefilled, plus a bare coral "Delete expense".
 * Delete is not guarded by a confirm dialog: it is instant and reversible from
 * the toast's Undo, which is faster to use and easier to recover from than an
 * alert nobody reads. Undo restores the row at the index it held, so the list
 * looks exactly as it did before, not as if the row were re-logged.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { Keypad } from '@/components/ui/Keypad';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { strings } from '@/constants/strings';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense, ExpenseCategory } from '@/types/expense';
import { centsToKeypadValue, keypadValueToCents } from '@/utils/keypad';
import { CategoryTilePicker, toExpenseCategory } from './CategoryTilePicker';

export type EditExpenseSheetProps = {
  visible: boolean;
  expense: Expense | null;
  onClose: () => void;
};

export function EditExpenseSheet({
  visible,
  expense,
  onClose,
}: EditExpenseSheetProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { height } = useWindowDimensions();
  const { show } = useToast();
  const { getVisibleCategories } = useCategories();
  const { expenses, updateExpense, deleteExpense, restoreExpense } = useExpenses();

  const categories = getVisibleCategories();

  const [value, setValue] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [merchant, setMerchant] = useState('');

  // Refill from the row every time the sheet opens on a (possibly different)
  // expense, so an abandoned edit never leaks into the next row.
  useEffect(() => {
    if (visible && expense) {
      setValue(centsToKeypadValue(expense.amount));
      setCategory(expense.category);
      setMerchant(expense.merchant ?? '');
    }
  }, [visible, expense]);

  const cents = keypadValueToCents(value);

  const handleSave = () => {
    if (!expense) return;
    if (cents <= 0) {
      show(strings.toasts.enterAmountFirst);
      return;
    }

    const resolved = category ?? expense.category;
    const match = categories.find((c) => toExpenseCategory(c.name) === resolved);
    const typedMerchant = merchant.trim();

    // The title is only rewritten when it was auto-derived in the first place:
    // from the category, or from the merchant the log sheet wrote. A title the
    // user typed by hand survives a recategorization and a merchant rename.
    const titleWasDerived =
      expense.title === expense.category ||
      categories.some((c) => c.name === expense.title) ||
      (!!expense.merchant && expense.title === expense.merchant);

    void updateExpense(expense.id, {
      amount: cents,
      category: resolved,
      categoryId: match?.id,
      // Cleared to undefined rather than '', because detection treats an empty
      // merchant as no merchant and storage drops the key entirely.
      merchant: typedMerchant || undefined,
      ...(titleWasDerived ? { title: typedMerchant || (match?.name ?? resolved) } : null),
    });

    show(strings.toasts.saved);
    onClose();
  };

  const handleDelete = () => {
    if (!expense) return;
    const removed = expense;
    // Capture the position BEFORE the delete: undo has to put the row back
    // where it was, not at the top like a fresh log.
    const index = expenses.findIndex((e) => e.id === removed.id);

    onClose();
    void deleteExpense(removed.id);
    show(strings.toasts.deleted, {
      action: {
        label: strings.toasts.undo,
        onPress: () => {
          void restoreExpense(removed, index < 0 ? 0 : index).then(() => {
            show(strings.toasts.restored);
          });
        },
      },
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      accessibilityLabel={strings.expenseSheet.editEyebrow}
    >
      <ScrollView
        style={{ maxHeight: height * 0.82 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, styles.eyebrowFirst]}>
          {strings.expenseSheet.editEyebrow}
        </Text>

        <AmountDisplay valueCents={cents} focused size={48} zeroAsPlaceholder />

        <Text style={styles.eyebrow}>{strings.expenseSheet.categoryEyebrow}</Text>
        <CategoryTilePicker categories={categories} value={category} onChange={setCategory} />

        <Text style={styles.eyebrow}>{strings.expenseSheet.whereEyebrow}</Text>
        <TextInput
          value={merchant}
          onChangeText={setMerchant}
          placeholder={strings.expenses.merchantPlaceholder}
          placeholderTextColor={theme.mist}
          style={styles.merchantField}
          accessibilityLabel={strings.expenses.merchantFieldLabel}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />

        <View style={styles.keypad}>
          <Keypad value={value} onChange={setValue} />
        </View>

        <Button
          label={strings.expenseSheet.saveChanges}
          onPress={handleSave}
          variant="primary"
          style={styles.save}
        />
        <Button
          label={strings.expenseSheet.deleteExpense}
          onPress={handleDelete}
          variant="destructive"
        />
      </ScrollView>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mist,
      marginBottom: 6,
      marginTop: 18,
    },
    eyebrowFirst: {
      marginTop: 0,
    },
    merchantField: {
      marginTop: 4,
      minHeight: 44,
      borderRadius: radii.control,
      borderWidth: 1,
      borderColor: theme.cloud,
      backgroundColor: theme.snow,
      paddingHorizontal: 14,
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.body,
      color: theme.ink,
    },
    keypad: {
      marginTop: 20,
    },
    save: {
      marginTop: 16,
    },
  });
}
