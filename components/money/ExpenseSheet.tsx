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
 * 2. Coach line: log mode only, and only when a caller passes one via the
 *    coachLine prop (Door 1's first-run open does; a plain log open shows
 *    none since Charen's 2026-08-16 device feedback removed the sheet's own
 *    stock line). Edit never shows one.
 * 3. Primary button label: "Save expense" / "Save changes".
 * 4. Edit adds a "Delete expense" row. No confirm dialog: delete is instant
 *    and reversible from the toast's Undo, which is faster to use and easier
 *    to recover from than an alert nobody reads. Undo restores the row at the
 *    index it held, so the list looks exactly as it did before, not as if
 *    the row were re-logged.
 *
 * Amount (ADR 0023): AmountField is a real TextInput on the native decimal
 * pad, full width, auto-focused on open.
 *
 * Expense-sheet workflow redesign (Charen, 2026-08-16): the header (title +
 * Save) is pinned above the ScrollView instead of docked in a footer below
 * it, so it stays visible while the amount, WHERE, and CATEGORY sections
 * scroll underneath (composition only: components/ui/Sheet.tsx did not
 * change). Save is disabled (Button's existing disabled styling, cloud
 * background/slate label, UX-047) until an amount is entered, rather than
 * staying live and toasting "Enter an amount first." on an empty tap. The
 * amount field itself uses AmountField's 'enclosed' variant (a bordered,
 * filled rect) rather than the underline every other AmountField consumer
 * still uses. Because the native decimal pad has no done key, a slim Done
 * bar renders above the keyboard on iOS so the user has a way to dismiss it;
 * Android already has one via the pad itself and the merchant field's
 * returnKeyType="done".
 *
 * Category (U2): a single sideways-scrolling row of labeled tags
 * (CategoryChipRow) replaces the emoji-tile grid. CategoryTilePicker itself
 * was never rendered anywhere in the app and was deleted; its stored-name
 * helper (`toExpenseCategory`) moved to utils/expenseCategory.ts and is
 * imported from there here.
 *
 * Merchant (U2): the recent-merchant chip row now renders in BOTH modes
 * (the source is unchanged: the user's own recent logs), below the merchant
 * text field rather than above it, as a single horizontally-scrolling line
 * (Charen, 2026-08-16 device feedback; was a wrapping row). In edit mode the
 * expense's current merchant is guaranteed a chip, prepended if the natural
 * recency list didn't already include it, and shows pre-selected. The
 * merchant field is optional but not decorative: detection groups strictly on
 * `expense.merchant` (utils/habitDetection.ts groupByMerchant), so it is the
 * only way the app's own logging flow can ever produce a leak.
 *
 * The LogExpenseSavedInfo callback contract and Door 1's analytics wiring are
 * unchanged: onSaved still fires once, synchronously, right before onClose,
 * built from the values just sent to addExpense rather than its return value.
 */
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { strings } from '@/constants/strings';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense, ExpenseCategory } from '@/types/expense';
import { toExpenseCategory } from '@/utils/expenseCategory';
import { hapticSuccess } from '@/utils/motion';
import { CategoryChipRow } from './CategoryChipRow';

/**
 * Tracks whether the iOS keyboard is currently up, so the Done bar (below)
 * renders only while it would have something to dismiss. keyboardWillShow/
 * Hide are iOS-only events; on Android this stays permanently false, which is
 * fine since the bar is gated on Platform.OS === 'ios' anyway (Android's
 * decimal pad has its own done key).
 */
function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => setVisible(true));
    const hideSub = Keyboard.addListener('keyboardWillHide', () => setVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return visible;
}

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
   * Log mode only. One-line coach caption above the amount. There is no
   * default: undefined renders nothing. Pass a caller-specific line (Door 1's
   * first-run open) to show one.
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
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { show } = useToast();
  const { format } = useCurrency();
  const { getVisibleCategories } = useCategories();
  const { addExpense, updateExpense, deleteExpense, restoreExpense, expenses } = useExpenses();

  const categories = getVisibleCategories();

  const [cents, setCents] = useState(0);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [merchant, setMerchant] = useState('');

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
    // Unreachable from the UI now that Save is disabled until cents > 0
    // (Charen's call, 2026-08-16); kept as a defensive guard.
    if (cents <= 0) return;

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
  const coachLineText = mode === 'log' ? coachLine : undefined;
  const saveLabel = mode === 'log' ? strings.expenseSheet.saveExpense : strings.expenseSheet.saveChanges;

  // iOS only: Android's decimal pad has its own done key and the merchant
  // field already sets returnKeyType="done", so there is nothing for a Done
  // bar to add there.
  const showDoneBar = Platform.OS === 'ios' && keyboardVisible;
  // Sheet gives the panel `paddingBottom: insets.bottom` unconditionally
  // (constants/theme.ts via components/ui/Sheet.tsx), sized for the resting,
  // no-keyboard case (home-indicator clearance). With the keyboard up,
  // avoidKeyboard's KeyboardAvoidingView already lifts the whole panel to sit
  // right above the keyboard, so that same bottom padding becomes a stray
  // gap between the Done bar and the keyboard's top edge. Pulling the bar
  // down by that same inset while the keyboard is visible closes the gap
  // without touching Sheet.tsx.
  const doneBarLift = insets.bottom > 0 ? { marginBottom: -insets.bottom } : undefined;

  return (
    <Sheet visible={visible} onClose={onClose} avoidKeyboard accessibilityLabel={eyebrow}>
      <View style={[styles.body, { maxHeight: height * 0.82 }]}>
        {/* Expense-sheet workflow redesign (2026-08-16): title + Save pinned
            above the scroll area, a sibling of the ScrollView rather than its
            first child, so it stays fixed while everything else scrolls. */}
        <View style={styles.header}>
          {/* UX-040: was an 11pt eyebrow, the only Money sheet not heading
              itself with the serif sheetTitle treatment that AddUpcomingSheet,
              AddCategoryModal and CurrencySheet all share. Brought onto the
              majority pattern so the two Money sheets read as one system. */}
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
            {eyebrow}
          </Text>
          <Button
            label={saveLabel}
            onPress={handleSave}
            variant="primary"
            disabled={cents <= 0}
            style={styles.headerSave}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
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
            // Density pass (Charen, 2026-08-16 device feedback): 48 -> 40,
            // paired with AmountField's enclosed paddingVertical 14 -> 8, for
            // a field about 25% shorter overall.
            size={40}
            variant="enclosed"
            accessibilityLabel={strings.expenseSheet.amountLabel(format(cents))}
          />

          <Text style={styles.eyebrow}>{strings.expenseSheet.whereEyebrow}</Text>
          <TextField
            value={merchant}
            onChangeText={setMerchant}
            placeholder={strings.expenses.merchantPlaceholder}
            accessibilityLabel={strings.expenses.merchantFieldLabel}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />
          {recentMerchants.length > 0 ? (
            // One-line horizontal scroll (Charen, 2026-08-16 device
            // feedback), matching CategoryChipRow below: same
            // showsHorizontalScrollIndicator/gap convention. keyboardShould-
            // PersistTaps is set here too, not just on the outer ScrollView,
            // so a chip tap registers on the first press while the keyboard
            // is up. No right-edge fade: CategoryChipRow's fade is a
            // LinearGradient plus its own theme/withAlpha plumbing, and
            // duplicating that for one more chip row isn't worth it here.
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chipRow}
              style={styles.chipScroll}
            >
              {recentMerchants.map((name) => (
                <Chip
                  key={name.toLowerCase()}
                  label={name}
                  tone="soft"
                  selected={typedMerchant.toLowerCase() === name.toLowerCase()}
                  onPress={() => pickMerchant(name)}
                />
              ))}
            </ScrollView>
          ) : null}

          <Text style={styles.eyebrow}>{strings.expenseSheet.categoryEyebrow}</Text>
          <CategoryChipRow
            categories={categories}
            value={category}
            onChange={setCategory}
            scrollToSelected={mode === 'edit' && visible}
          />
        </ScrollView>

        {mode === 'edit' ? (
          <View style={styles.footer}>
            <Button
              label={strings.expenseSheet.deleteExpense}
              onPress={handleDelete}
              variant="destructive"
              style={styles.delete}
            />
          </View>
        ) : null}

        {showDoneBar ? (
          <View style={[styles.doneBar, doneBarLift]}>
            <Button
              label={strings.expenseSheet.keyboardDone}
              onPress={() => Keyboard.dismiss()}
              variant="tertiary"
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: {
      flexShrink: 1,
    },
    // Pinned header row: title left, Save right. A hairline bottom border
    // marks the fixed edge; no scroll-driven shadow or animation.
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.cloud,
    },
    // UX-040: sheet header, matching CurrencySheet/AddUpcomingSheet/
    // AddCategoryModal's serif treatment (theme.fonts.display at
    // typeScale.sheetTitle) instead of the old 11pt uppercase eyebrow.
    title: {
      flex: 1,
      fontFamily: theme.fonts.display,
      fontSize: typeScale.sheetTitle,
      lineHeight: 32,
      color: theme.ink,
      includeFontPadding: false,
      marginRight: 12,
    },
    // Compact enough to sit in a header row without touching Button.tsx: a
    // shorter minHeight than the default primary (50) and tighter horizontal
    // padding than the default 20.
    headerSave: {
      minHeight: 44,
      paddingHorizontal: 16,
    },
    scroll: {
      flexShrink: 1,
    },
    content: {
      paddingTop: 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginBottom: 6,
      marginTop: 18,
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
    // Below the merchant field now (was above it); same 10pt gap the field
    // used to carry above the chips.
    chipScroll: {
      marginTop: 10,
    },
    // Single line now (was a wrapping row); gap 8 matches CategoryChipRow's
    // content gap below it.
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 12,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 8,
    },
    delete: {
      marginTop: 0,
    },
    // iOS-only Done bar, last child of the body View so it rides the Sheet's
    // own KeyboardAvoidingView.
    doneBar: {
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingHorizontal: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.cloud,
    },
  });
}
