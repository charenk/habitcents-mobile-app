/**
 * CategoryTilePicker: the emoji tile picker shared by the log and edit expense
 * sheets (design/redesign-handoff/04-screens.md, "Log / Edit sheets").
 *
 * Not in the step-04 file list, but both sheets need the identical control and
 * the identical stored-name normalization, and two copies of a picker is how
 * they quietly drift apart. Internal to components/money/.
 *
 * Selection is a 1.5px ring in the category's own identity color, drawn on a
 * always-present transparent border so picking never shifts the layout.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import type { AppTheme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import type { Category } from '@/types/category';
import type { ExpenseCategory } from '@/types/expense';
import { selectableLabel } from '@/utils/a11y';

/**
 * Every ExpenseCategory value, as stored. 'Mortgage/Rent' is the taxonomy v2
 * DISPLAY name for the 'Mortgage' value (types/category.ts DEFAULT_CATEGORIES),
 * so a Category.name has to be mapped back before it is written to an expense.
 */
const STORED_CATEGORIES: readonly ExpenseCategory[] = [
  'Mortgage',
  'Car',
  'Entertainment',
  'Food',
  'Shopping',
  'Utilities',
  'Healthcare',
  'Transportation',
  'Software & Subscriptions',
  'Other',
];

/** Map a Category.name onto the ExpenseCategory that gets stored on the row. */
export function toExpenseCategory(name: string): ExpenseCategory {
  if (name === 'Mortgage/Rent') return 'Mortgage';
  const match = STORED_CATEGORIES.find((c) => c === name);
  return match ?? 'Other';
}

/** True when a Category is the one currently selected on the sheet. */
export function isCategorySelected(category: Category, selected: ExpenseCategory | null): boolean {
  return selected != null && toExpenseCategory(category.name) === selected;
}

type CategoryTilePickerProps = {
  categories: Category[];
  value: ExpenseCategory | null;
  onChange: (next: ExpenseCategory) => void;
};

export function CategoryTilePicker({
  categories,
  value,
  onChange,
}: CategoryTilePickerProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.grid}>
      {categories.map((category) => {
        const selected = isCategorySelected(category, value);
        const identity = categoryIdentityColor(category.name);
        return (
          <Pressable
            key={category.id}
            onPress={() => onChange(toExpenseCategory(category.name))}
            accessibilityRole="button"
            accessibilityLabel={selectableLabel(category.name, selected)}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.tileWrap,
              // Selection is sage everywhere in the app, so it stays sage here
              // too. The category's identity color still reads from the
              // EmojiTile wash below (Charen, 2026-07-31).
              { borderColor: selected ? theme.primary : 'transparent' },
              pressed ? styles.tileWrapPressed : null,
            ]}
          >
            <EmojiTile
              emoji={categoryEmoji(category.name)}
              color={identity}
              size={44}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(_theme: AppTheme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tileWrap: {
      borderWidth: 1.5,
      borderRadius: 18,
      padding: 3,
    },
    tileWrapPressed: {
      opacity: 0.7,
    },
  });
}
