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
import { StyleSheet, Text, View } from 'react-native';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { Keypad } from '@/components/ui/Keypad';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { strings } from '@/constants/strings';
import { typeScale } from '@/constants/theme';
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
  const { show } = useToast();
  const { getVisibleCategories } = useCategories();
  const { expenses, updateExpense, deleteExpense, restoreExpense } = useExpenses();

  const categories = getVisibleCategories();

  const [value, setValue] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);

  // Refill from the row every time the sheet opens on a (possibly different)
  // expense, so an abandoned edit never leaks into the next row.
  useEffect(() => {
    if (visible && expense) {
      setValue(centsToKeypadValue(expense.amount));
      setCategory(expense.category);
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

    // The title is only rewritten when it was auto-derived from the category in
    // the first place. A merchant-named row keeps its name through a
    // recategorization.
    const titleWasDerived =
      expense.title === expense.category || categories.some((c) => c.name === expense.title);

    void updateExpense(expense.id, {
      amount: cents,
      category: resolved,
      categoryId: match?.id,
      ...(titleWasDerived ? { title: match?.name ?? resolved } : null),
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
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={strings.expenseSheet.editEyebrow}>
      <View style={styles.content}>
        <Text style={[styles.eyebrow, styles.eyebrowFirst]}>
          {strings.expenseSheet.editEyebrow}
        </Text>

        <AmountDisplay valueCents={cents} focused size={48} zeroAsPlaceholder />

        <Text style={styles.eyebrow}>{strings.expenseSheet.categoryEyebrow}</Text>
        <CategoryTilePicker categories={categories} value={category} onChange={setCategory} />

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
      </View>
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
    keypad: {
      marginTop: 20,
    },
    save: {
      marginTop: 16,
    },
  });
}
