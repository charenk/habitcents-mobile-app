/**
 * QuickLogRow (redesign U5, ADR 0019, DI-5; header gated per the 2026-08-04
 * scoreboard artifact): the amount-first quick-log card, extracted verbatim
 * from the old Today screen footer so the Spent view can mount it directly.
 * The five-category-tile row that used to gate behind a `showCategoryTiles`
 * prop shipped false and was removed (U13 dead-code sweep, 2026-08-10): the
 * log sheet's own category picker covers that choice now, so Today ships
 * without the tiles and the revert affordance is no longer needed.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Icon } from '@/components/ui/Icon';
import { radii, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { ExpenseCategory } from '@/types/expense';

export type QuickLogRowProps = {
  onOpenSheet: (category?: ExpenseCategory) => void;
};

export function QuickLogRow({
  onOpenSheet,
}: QuickLogRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.quickLogCard}>
      <View style={styles.quickLogAmountRow}>
        {/* The big zero is the obvious thing to tap, so it opens the sheet
            too; the plus stays for anyone who reads it as the only control. */}
        <Pressable
          style={styles.quickLogAmountTap}
          onPress={() => onOpenSheet(undefined)}
          accessibilityRole="button"
          accessibilityLabel={strings.today.quickLogOpenLabel}
        >
          <AmountDisplay valueCents={0} size={40} zeroAsPlaceholder />
        </Pressable>
        <TouchableOpacity
          style={styles.quickLogPlus}
          onPress={() => onOpenSheet(undefined)}
          accessibilityRole="button"
          accessibilityLabel={strings.today.quickLogOpenLabel}
        >
          <Icon name="Plus" size={22} color={theme.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    quickLogCard: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    quickLogAmountRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    // Takes the row's free width so the whole left side of the card opens the
    // sheet, not just the glyphs. No visual change: the amount still sits on
    // the baseline it did before.
    quickLogAmountTap: {
      flex: 1,
      minHeight: 44,
      justifyContent: 'flex-end',
    },
    quickLogPlus: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
