/**
 * ExpenseSheet (U2, the expense drawer rebuild; design/redesign-handoff/
 * 04-screens.md "Log / Edit sheets"; amount input per ADR 0023).
 *
 * Log and Edit used to be two components (LogExpenseSheet, EditExpenseSheet)
 * that had to be kept in sync by hand. They are now one component with a
 * `mode`, so the only places they can differ are the four things listed
 * below; every other line of behavior is the same by construction, not by
 * discipline.
 *
 * Mode differences, exhaustively:
 * 1. Eyebrow: "Log expense" / "Edit expense".
 * 2. Coach line: log mode only (see logCoachLine below); edit never shows one.
 * 3. Primary button label: "Save expense" / "Save changes".
 * 4. Edit adds a "Delete expense" row. No confirm dialog: delete is instant
 *    and reversible from the toast's Undo, which is faster to use and easier
 *    to recover from than an alert nobody reads. Undo restores the row at the
 *    index it held, so the list looks exactly as it did before, not as if
 *    the row were re-logged.
 *
 * Amount (ADR 0023): AmountField is a real TextInput on the native decimal
 * pad, full width, auto-focused on open. Because that pad has no done key,
 * Save (and, in edit mode, Delete) live in a footer docked below the
 * ScrollView rather than inside it, so they stay visible above the keyboard
 * while the amount, category row, and merchant section scroll underneath.
 *
 * Category (U2): a single sideways-scrolling row of labeled tags
 * (CategoryChipRow) replaces the emoji-tile grid. CategoryTilePicker itself
 * stays in the codebase (AddUpcomingSheet still renders it), so only its
 * stored-name helpers are imported here.
 *
 * Merchant (U2): the recent-merchant chip row now renders in BOTH modes
 * (the source is unchanged: the user's own recent logs). In edit mode the
 * expense's current merchant is guaranteed a chip, prepended if the natural
 * recency list didn't already include it, and shows pre-selected. The
 * merchant field is optional but not decorative: detection groups strictly
 * on `expense.merchant` (utils/habitDetection.ts groupByMerchant), so it is
 * the only way the app's own logging flow can ever produce a leak.
 *
 * The LogExpenseSavedInfo callback contract and Door 1's analytics wiring are
 * unchanged: onSaved still fires once, synchronously, right before onClose,
 * built from the values just sent to addExpense rather than its return value.
 *
 * An empty amount is not an error state on the button. The button stays live
 * and tapping it toasts "Enter an amount first.", which tells the user what
 * to do instead of leaving a dead control with no explanation.
 */
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { strings } from '@/constants/strings';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense, ExpenseCategory } from '@/types/expense';
import { hapticSuccess } from '@/utils/motion';
import { CategoryChipRow } from './CategoryChipRow';
import { toExpenseCategory } from './CategoryTilePicker';

/** How many recent-merchant chips the sheet offers before it stops (log
 *  mode's natural recency list; edit mode may add one more, see below). */
const RECENT_MERCHANT_LIMIT = 6;

export type ExpenseSheetMode = 'log' | 'edit';

/** What handleSave actually sent to addExpense, handed back via onSaved. Log mode only. */
export type LogExpenseSavedInfo = {
  merchant?: string;
  amount: number;
  category: ExpenseCategory;
};

export type ExpenseSheetProps = {
  mode: ExpenseSheetMode;
  visible: boolean;
  onClose: () => void;
  /** Edit mode only. The row being edited; deleted/renders nothing until set. */
  expense?: Expense | null;
  /** Log mode only. Preselects a tile, e.g. when opened from a Today quick-log category. */
  initialCategory?: ExpenseCategory;
  /**
   * Log mode only. One-line coach caption above the amount. Undefined falls
   * back to logCoachLine (strings.expenseSheet); pass a caller-specific line
   * (Door 1's first-run open) to override it.
   */
  coachLine?: string;
  /**
   * Log mode only. Fires once, synchronously, right before onClose, but only
   * on a successful save. Lets a caller (Door 1's first-run flow) tell a save
   * apart from a close-without-saving without a second save path to keep in
   * sync with this one.
   */
  onSaved?: (info: LogExpenseSavedInfo) => void;
};

export function ExpenseSheet({
  mode,
  visible,
  onClose,
  expense = null,
  initialCategory,
  coachLine,
  onSaved,
}: ExpenseSheetProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { height } = useWindowDimensions();
  const { show } = useToast();
  const { format } = useCurrency();
  const { getVisibleCategories } = useCategories();
  const { addExpense, updateExpense, deleteExpense, restoreExpense, expenses } = useExpenses();

  const categories = getVisibleCategories();

  const [cents, setCents] = useState(0);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [merchant, setMerchant] = useState('');
  const [merchantFocused, setMerchantFocused] = useState(false);

  // Every open starts from a clean slate for the row it's actually editing
  // (or a blank one, for log), so a dismissed half-typed field never leaks
  // into the next open.
  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit') {
      setCents(expense?.amount ?? 0);
      setCategory(expense?.category ?? null);
      setMerchant(expense?.merchant ?? '');
    } else {
      setCents(0);
      setCategory(initialCategory ?? null);
      setMerchant('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, expense]);

  const typedMerchant = merchant.trim();

  // Places already logged, newest first, one chip per spelling (log mode's
  // list, unchanged). Edit mode additionally guarantees the row's own
  // merchant a chip: if the natural recency list already carries it (the
  // usual case, since the row being edited is itself one of `expenses`),
  // nothing changes; if older logs pushed it past the limit, it's prepended.
  const recentMerchants = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of expenses) {
      const name = e.merchant?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
      if (out.length === RECENT_MERCHANT_LIMIT) break;
    }
    if (mode === 'edit' && expense?.merchant?.trim()) {
      const name = expense.merchant.trim();
      if (!seen.has(name.toLowerCase())) {
        out.unshift(name);
      }
    }
    return out;
  }, [expenses, mode, expense]);

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

    if (mode === 'log') {
      const resolved = category ?? 'Other';
      const match = categories.find((c) => toExpenseCategory(c.name) === resolved);

      void addExpense({
        // A named place titles its own row; only an unnamed log falls back to
        // the category name.
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
      // value, so this stays correct under both the real context and any
      // test mock that doesn't echo the saved row back.
      onSaved?.({ merchant: typedMerchant || undefined, amount: cents, category: resolved });
      onClose();
      return;
    }

    if (!expense) return;

    const resolved = category ?? expense.category;
    const match = categories.find((c) => toExpenseCategory(c.name) === resolved);

    // The title is only rewritten when it was auto-derived in the first
    // place: from the category, or from the merchant the log sheet wrote. A
    // title the user typed by hand survives a recategorization and a
    // merchant rename.
    const titleWasDerived =
      expense.title === expense.category ||
      categories.some((c) => c.name === expense.title) ||
      (!!expense.merchant && expense.title === expense.merchant);

    void updateExpense(expense.id, {
      amount: cents,
      category: resolved,
      categoryId: match?.id,
      // Cleared to undefined rather than '', because detection treats an
      // empty merchant as no merchant and storage drops the key entirely.
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

  const eyebrow = mode === 'log' ? strings.expenseSheet.logEyebrow : strings.expenseSheet.editEyebrow;
  const coachLineText = mode === 'log' ? coachLine ?? strings.expenseSheet.logCoachLine : undefined;
  const saveLabel = mode === 'log' ? strings.expenseSheet.saveExpense : strings.expenseSheet.saveChanges;

  return (
    <Sheet visible={visible} onClose={onClose} avoidKeyboard accessibilityLabel={eyebrow}>
      <View style={[styles.body, { maxHeight: height * 0.82 }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.eyebrow, styles.eyebrowFirst]}>{eyebrow}</Text>

          {coachLineText ? (
            <View style={styles.coachLine}>
              <Icon name="Sprout" size={14} color={theme.primaryDark} />
              <Text style={styles.coachLineText}>{coachLineText}</Text>
            </View>
          ) : null}

          <AmountField
            valueCents={cents}
            onChangeCents={setCents}
            autoFocus={visible}
            size={48}
            accessibilityLabel={strings.expenseSheet.amountLabel(format(cents))}
          />

          <Text style={styles.eyebrow}>{strings.expenseSheet.categoryEyebrow}</Text>
          <CategoryChipRow
            categories={categories}
            value={category}
            onChange={setCategory}
            scrollToSelected={mode === 'edit' && visible}
          />

          <Text style={styles.eyebrow}>{strings.expenseSheet.whereEyebrow}</Text>
          {recentMerchants.length > 0 ? (
            <View style={styles.chipRow}>
              {recentMerchants.map((name) => (
                <Chip
                  key={name.toLowerCase()}
                  label={name}
                  tone="soft"
                  selected={typedMerchant.toLowerCase() === name.toLowerCase()}
                  onPress={() => pickMerchant(name)}
                />
              ))}
            </View>
          ) : null}
          <TextInput
            value={merchant}
            onChangeText={setMerchant}
            onFocus={() => setMerchantFocused(true)}
            onBlur={() => setMerchantFocused(false)}
            placeholder={strings.expenses.merchantPlaceholder}
            placeholderTextColor={theme.mist}
            style={[styles.merchantField, merchantFocused ? styles.merchantFieldFocused : null]}
            accessibilityLabel={strings.expenses.merchantFieldLabel}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />
        </ScrollView>

        <View style={styles.footer}>
          <Button label={saveLabel} onPress={handleSave} variant="primary" />
          {mode === 'edit' ? (
            <Button
              label={strings.expenseSheet.deleteExpense}
              onPress={handleDelete}
              variant="destructive"
              style={styles.delete}
            />
          ) : null}
        </View>
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: {
      flexShrink: 1,
    },
    scroll: {
      flexShrink: 1,
    },
    content: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
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
    merchantFieldFocused: {
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 8,
    },
    delete: {
      marginTop: 0,
    },
  });
}
