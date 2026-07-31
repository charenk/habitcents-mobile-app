/**
 * LogExpenseSheet (design/redesign-handoff/04-screens.md, "Log / Edit sheets").
 *
 * Amount first, then identity, then save: AmountDisplay over the emoji tile
 * picker over the keypad, with one primary "Save expense". No merchant or note
 * field, because the ten-second log is the whole promise of this sheet; the
 * edit sheet is where a row gets corrected.
 *
 * An empty amount is not an error state on the button. The button stays live
 * and tapping it toasts "Enter an amount first.", which tells the user what to
 * do instead of leaving a dead control with no explanation.
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
import type { ExpenseCategory } from '@/types/expense';
import { keypadValueToCents } from '@/utils/keypad';
import { hapticSuccess } from '@/utils/motion';
import { CategoryTilePicker, toExpenseCategory } from './CategoryTilePicker';

export type LogExpenseSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Preselects a tile, e.g. when opened from a Today quick-log category. */
  initialCategory?: ExpenseCategory;
};

export function LogExpenseSheet({
  visible,
  onClose,
  initialCategory,
}: LogExpenseSheetProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { show } = useToast();
  const { getVisibleCategories } = useCategories();
  const { addExpense } = useExpenses();

  const categories = getVisibleCategories();

  const [value, setValue] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(initialCategory ?? null);

  // Every open starts clean, so a dismissed half-typed amount never reappears
  // on the next log.
  useEffect(() => {
    if (visible) {
      setValue('');
      setCategory(initialCategory ?? null);
    }
  }, [visible, initialCategory]);

  const cents = keypadValueToCents(value);

  const handleSave = () => {
    if (cents <= 0) {
      show(strings.toasts.enterAmountFirst);
      return;
    }

    const resolved = category ?? 'Other';
    const match = categories.find((c) => toExpenseCategory(c.name) === resolved);

    void addExpense({
      title: match?.name ?? resolved,
      amount: cents,
      category: resolved,
      categoryId: match?.id,
      date: new Date(),
      isRecurring: false,
      reminderEnabled: false,
    });

    hapticSuccess();
    show(strings.toasts.logged);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={strings.expenseSheet.logEyebrow}>
      <View style={styles.content}>
        <Text style={[styles.eyebrow, styles.eyebrowFirst]}>
          {strings.expenseSheet.logEyebrow}
        </Text>

        <AmountDisplay valueCents={cents} focused size={48} zeroAsPlaceholder />

        <Text style={styles.eyebrow}>{strings.expenseSheet.categoryEyebrow}</Text>
        <CategoryTilePicker categories={categories} value={category} onChange={setCategory} />

        <View style={styles.keypad}>
          <Keypad value={value} onChange={setValue} />
        </View>

        <Button
          label={strings.expenseSheet.saveExpense}
          onPress={handleSave}
          variant="primary"
          style={styles.save}
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
      paddingBottom: 20,
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
