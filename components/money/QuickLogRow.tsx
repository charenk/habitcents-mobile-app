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
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Icon } from '@/components/ui/Icon';
import { radii, spacing, type AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import type { ExpenseCategory } from '@/types/expense';

// Geometry pairs with SpentKeptChips (Charen's consistency call, 2026-09-03):
// this card and the chips track directly above it read as one symmetric pair,
// so the card takes the track's exact outer radius (thumb radii.feature 20 +
// track padding 3; see SpentKeptChips.tsx TRACK_PADDING) and follows the same
// concentric nesting rule inward: inner radius = outer radius - padding. The
// card must also never render taller than the chips (~77pt), which is what
// the compact padding and the 28pt amount below are for.
const CARD_RADIUS = radii.feature + 3;
const CARD_PADDING = spacing.control;
const FIELD_RADIUS = CARD_RADIUS - CARD_PADDING;

export type QuickLogRowProps = {
  onOpenSheet: (category?: ExpenseCategory) => void;
};

export function QuickLogRow({
  onOpenSheet,
}: QuickLogRowProps): React.JSX.Element {
  const theme = useTheme();
  const strings = useStrings();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.quickLogCard}>
      <View style={styles.quickLogAmountRow}>
        {/* The enclosed field is the obvious thing to tap, so it opens the
            sheet too; the plus stays for anyone who reads it as the only
            control. */}
        <Pressable
          // Feedback on press down, not on release: a snow-filled control
          // presses to cloud, the same swap AddUpcomingSheet's stepper uses.
          // Without it the primary entry to the core loop acknowledged a tap
          // with nothing at all until the sheet began to rise.
          style={({ pressed }) => [
            styles.quickLogAmountField,
            pressed ? styles.quickLogAmountFieldPressed : null,
          ]}
          onPress={() => onOpenSheet(undefined)}
          accessibilityRole="button"
          accessibilityLabel={strings.today.quickLogOpenLabel}
          // Distinguishes this from the empty state's identically named CTA
          // two stops earlier without changing the accessible name, so tests
          // querying by role+name still find both.
          accessibilityHint={strings.today.quickLogOpenHint}
          testID="quick-log-field"
        >
          <AmountDisplay valueCents={0} size={28} zeroAsPlaceholder underline={false} />
        </Pressable>
        {/* UX-055: this and the amount Pressable above shared the same
            accessibilityLabel and the same action, so VoiceOver announced
            "Log an expense, button" twice in a row. The amount tap area
            already covers the action for assistive tech; this stays a real,
            tappable touch target for sighted/pointer users but is hidden
            from the accessibility tree so it is not a redundant stop. */}
        {/* Was a TouchableOpacity, whose default activeOpacity fade made the
            two halves of one affordance respond differently (and neither
            matched the house pressed-background convention). Now a Pressable
            on the same primary swap Button uses. */}
        <Pressable
          style={({ pressed }) => [
            styles.quickLogPlus,
            pressed ? styles.quickLogPlusPressed : null,
          ]}
          onPress={() => onOpenSheet(undefined)}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          testID="quick-log-plus"
        >
          {/* UX-001 debt closed: the primary moved to #2C7851 (ADR 0027,
              2026-08-16, Option A), where white is 5.37:1, clear of the 3:1
              non-text floor. */}
          <Icon name="Plus" size={22} color={theme.white} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    quickLogCard: {
      backgroundColor: theme.white,
      // CARD_RADIUS/CARD_PADDING, not the radii.feature + spacing.xl grammar
      // the other top-level Today cards use: this card's sibling is the chips
      // track, not the list cards, and it matches the track's radius and
      // stays under its height (file-top comment).
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: theme.border,
      padding: CARD_PADDING,
    },
    quickLogAmountRow: {
      flexDirection: 'row',
      // Stretch (the row default) so the plus button's alignSelf: 'stretch'
      // below matches the field's full height rather than the row shrinking
      // to the shorter child.
      alignItems: 'stretch',
      gap: spacing.stack,
    },
    // Enclosed input-style field: a snow-filled rounded rect standing in for
    // the old bare-number-on-a-rule. Takes the row's free width so the whole
    // left side of the card opens the sheet, not just the digits.
    quickLogAmountField: {
      flex: 1,
      minHeight: 44,
      backgroundColor: theme.snow,
      borderRadius: FIELD_RADIUS,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      justifyContent: 'center',
    },
    quickLogAmountFieldPressed: {
      backgroundColor: theme.cloud,
    },
    quickLogPlus: {
      // Rounded square, not the old circle: shares the field's radius so the
      // two shapes read as one grammar. stretch takes the field's full
      // height, and aspectRatio squares the width off that height rather
      // than pinning it, so the square stays square when the field grows
      // under Dynamic Type instead of stretching into a tall bar.
      alignSelf: 'stretch',
      aspectRatio: 1,
      borderRadius: FIELD_RADIUS,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLogPlusPressed: {
      // primaryPressedBg is sagePressed (#246242), where the white glyph is
      // 7.24:1, so the icon clears the non-text floor pressed as well as
      // resting. ADR 0027.
      backgroundColor: theme.primaryPressedBg,
    },
  });
}
