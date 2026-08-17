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
        {/* The enclosed field is the obvious thing to tap, so it opens the
            sheet too; the plus stays for anyone who reads it as the only
            control. */}
        <Pressable
          style={styles.quickLogAmountField}
          onPress={() => onOpenSheet(undefined)}
          accessibilityRole="button"
          accessibilityLabel={strings.today.quickLogOpenLabel}
          testID="quick-log-field"
        >
          <AmountDisplay valueCents={0} size={40} zeroAsPlaceholder underline={false} />
        </Pressable>
        {/* UX-055: this and the amount Pressable above shared the same
            accessibilityLabel and the same action, so VoiceOver announced
            "Log an expense, button" twice in a row. The amount tap area
            already covers the action for assistive tech; this stays a real,
            tappable touch target for sighted/pointer users but is hidden
            from the accessibility tree so it is not a redundant stop. */}
        <TouchableOpacity
          style={styles.quickLogPlus}
          onPress={() => onOpenSheet(undefined)}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          testID="quick-log-plus"
        >
          {/* Deliberate, temporary exception to UX-001 (white on sage is
              2.71:1, below the 3:1 non-text contrast floor). Charen's call
              (2026-08-16): the sage primary itself is getting re-tuned at
              palette finalization to restore contrast against a white icon,
              so this ships white now to match the mock rather than block on
              a palette change. Owed a contrast re-check once primary moves. */}
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
      // Stretch (the row default) so the plus button's alignSelf: 'stretch'
      // below matches the field's full height rather than the row shrinking
      // to the shorter child.
      alignItems: 'stretch',
      gap: 12,
    },
    // Enclosed input-style field: a snow-filled rounded rect standing in for
    // the old bare-number-on-a-rule. Takes the row's free width so the whole
    // left side of the card opens the sheet, not just the digits.
    quickLogAmountField: {
      flex: 1,
      minHeight: 44,
      backgroundColor: theme.snow,
      borderRadius: radii.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: 'center',
    },
    quickLogPlus: {
      // Rounded square, not the old circle: shares the field's radius so the
      // two shapes read as one grammar. stretch takes the field's full
      // height, and aspectRatio squares the width off that height rather
      // than pinning it, so the square stays square when the field grows
      // under Dynamic Type instead of stretching into a tall bar.
      alignSelf: 'stretch',
      aspectRatio: 1,
      borderRadius: radii.card,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
