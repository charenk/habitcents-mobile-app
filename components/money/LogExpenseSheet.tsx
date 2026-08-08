/**
 * LogExpenseSheet (design/redesign-handoff/04-screens.md, "Log / Edit sheets").
 *
 * Amount first, then identity, then save: AmountDisplay over the emoji tile
 * picker over an optional "Where" field over the keypad, with one primary
 * "Save expense".
 *
 * The merchant field is optional but not decorative: detection groups strictly
 * on `expense.merchant` (utils/habitDetection.ts groupByMerchant), so without
 * it the app's own logging flow could never produce a leak. The recent chips
 * are the point: four logs only accumulate into a habit when the place is
 * spelled the same way each time (Charen, 2026-08-04).
 *
 * An empty amount is not an error state on the button. The button stays live
 * and tapping it toasts "Enter an amount first.", which tells the user what to
 * do instead of leaving a dead control with no explanation.
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
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Keypad } from '@/components/ui/Keypad';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { strings } from '@/constants/strings';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ExpenseCategory } from '@/types/expense';
import { keypadValueToCents } from '@/utils/keypad';
import { hapticSuccess } from '@/utils/motion';
import { CategoryTilePicker, toExpenseCategory } from './CategoryTilePicker';

/** How many recent-merchant chips the sheet offers before it stops. */
const RECENT_MERCHANT_LIMIT = 6;

/** What handleSave actually sent to addExpense, handed back via onSaved. */
export type LogExpenseSavedInfo = {
  merchant?: string;
  amount: number;
  category: ExpenseCategory;
};

export type LogExpenseSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Preselects a tile, e.g. when opened from a Today quick-log category. */
  initialCategory?: ExpenseCategory;
  /**
   * One-line coach caption above the amount (Door 1 first-run, W2). Undefined
   * (every caller but Door 1's first-run open) renders nothing.
   */
  coachLine?: string;
  /**
   * Fires once, synchronously, right before onClose, but only on a
   * successful save. Lets a caller (Door 1's first-run flow) tell a save
   * apart from a close-without-saving without a second save path to keep in
   * sync with this one.
   */
  onSaved?: (info: LogExpenseSavedInfo) => void;
};

export function LogExpenseSheet({
  visible,
  onClose,
  initialCategory,
  coachLine,
  onSaved,
}: LogExpenseSheetProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { height } = useWindowDimensions();
  const { show } = useToast();
  const { getVisibleCategories } = useCategories();
  const { addExpense, expenses } = useExpenses();

  const categories = getVisibleCategories();

  const [value, setValue] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(initialCategory ?? null);
  const [merchant, setMerchant] = useState('');

  // Every open starts clean, so a dismissed half-typed amount never reappears
  // on the next log.
  useEffect(() => {
    if (visible) {
      setValue('');
      setCategory(initialCategory ?? null);
      setMerchant('');
    }
  }, [visible, initialCategory]);

  const cents = keypadValueToCents(value);

  // Places already logged, newest first, one chip per spelling. The stored list
  // is newest first, so first seen wins and the user gets back the exact string
  // detection already groups on.
  const recentMerchants = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const expense of expenses) {
      const name = expense.merchant?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
      if (out.length === RECENT_MERCHANT_LIMIT) break;
    }
    return out;
  }, [expenses]);

  const typedMerchant = merchant.trim();

  // Tapping the chip that is already filled in clears it, so a mis-tap costs
  // one tap rather than a trip to the keyboard.
  const pickMerchant = (name: string) => {
    setMerchant((current) =>
      current.trim().toLowerCase() === name.toLowerCase() ? '' : name
    );
  };

  const handleSave = () => {
    if (cents <= 0) {
      show(strings.toasts.enterAmountFirst);
      return;
    }

    const resolved = category ?? 'Other';
    const match = categories.find((c) => toExpenseCategory(c.name) === resolved);

    void addExpense({
      // A named place titles its own row; only an unnamed log falls back to the
      // category name.
      title: typedMerchant || (match?.name ?? resolved),
      amount: cents,
      category: resolved,
      categoryId: match?.id,
      merchant: typedMerchant || undefined,
      date: new Date(),
      isRecurring: false,
      reminderEnabled: false,
    });

    hapticSuccess();
    show(strings.toasts.logged);
    // Built from the same values just sent to addExpense, not its return
    // value, so this stays correct under both the real context and any test
    // mock that doesn't echo the saved row back.
    onSaved?.({ merchant: typedMerchant || undefined, amount: cents, category: resolved });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      accessibilityLabel={strings.expenseSheet.logEyebrow}
    >
      {/* Scrolls like the add-upcoming sheet: the merchant block makes the panel
          taller than a small screen, and the keyboard takes another chunk. */}
      <ScrollView
        style={{ maxHeight: height * 0.82 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, styles.eyebrowFirst]}>
          {strings.expenseSheet.logEyebrow}
        </Text>

        {coachLine ? (
          <View style={styles.coachLine}>
            <Icon name="Sprout" size={14} color={theme.primaryDark} />
            <Text style={styles.coachLineText}>{coachLine}</Text>
          </View>
        ) : null}

        <AmountDisplay valueCents={cents} focused size={48} zeroAsPlaceholder />

        <Text style={styles.eyebrow}>{strings.expenseSheet.categoryEyebrow}</Text>
        <CategoryTilePicker categories={categories} value={category} onChange={setCategory} />

        <Text style={styles.eyebrow}>{strings.expenseSheet.whereEyebrow}</Text>
        {recentMerchants.length > 0 ? (
          <View style={styles.chipRow}>
            {recentMerchants.map((name) => (
              <Chip
                key={name.toLowerCase()}
                label={name}
                selected={typedMerchant.toLowerCase() === name.toLowerCase()}
                onPress={() => pickMerchant(name)}
              />
            ))}
          </View>
        ) : null}
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
          label={strings.expenseSheet.saveExpense}
          onPress={handleSave}
          variant="primary"
          style={styles.save}
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
    coachLine: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginBottom: 8,
    },
    coachLineText: {
      flex: 1,
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.slate,
      lineHeight: 17,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    merchantField: {
      marginTop: 10,
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
