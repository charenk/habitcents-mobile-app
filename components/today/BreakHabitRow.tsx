/**
 * BreakHabitRow: the Kept pane's dock content, the break-habit affordance.
 *
 * Until 2026-09-07 this was inline JSX in app/(tabs)/index.tsx: a dashed
 * pill with a plus icon and up to two lines of text, the app's "add another"
 * grammar borrowed from UpcomingList's add row. It sat one swipe away from
 * the quick log, a different shape at a different height, and Charen asked
 * for the two docks to be one structure. So it now takes DockCard, the same
 * shell as QuickLogRow: the label rides in the field where Spent shows the
 * amount, and the round plus on the right is the same control.
 *
 * Same structure, its own skin (Charen, later the same day): with both docks
 * solid and sage, this read as another add-expense composer. So it takes
 * DockCard's dashed tone and the plain plus: the dashed edge is the app's
 * "add another" grammar (UpcomingList's add row, Today's watch nudge), and an
 * unfilled circle with a sage glyph is quieter than Spent's filled one. The
 * shape, the field, the round button and the height are Spent's exactly.
 *
 * The label is decided by the screen (state-aware since ADR 0038: "Break your
 * first habit" at zero habits, "Break another habit" after). This component
 * only lays it out, inside DOCK_FIELD_HEIGHT at the 1.5 cap.
 *
 * Border only, one line (Charen, 2026-09-10). The field's snow fill and the
 * plus's snow fill are both gone, so the dashed edge is the entire button and
 * the label and glyph sit on the pane. The free-plan caption is gone with
 * them: growth copy now lives only where a user has actually reached for a
 * second habit, which is the gate card inside PickOneSheet and BreakHabitSheet
 * and the paywall this dock routes to. A ceiling the user has not touched yet
 * says nothing.
 */
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { DockCard, DockField, DockPlusButton, DOCK_LABEL_LINE_HEIGHT } from './DockCard';
import { useTheme } from '@/contexts/ThemeContext';
import { typeScale, type AppTheme } from '@/constants/theme';

export type BreakHabitRowProps = {
  label: string;
  onPress: () => void;
};

export function BreakHabitRow({ label, onPress }: BreakHabitRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <DockCard tone="dashed" testID="break-habit-card">
      <DockField
        onPress={onPress}
        accessibilityLabel={label}
        testID="break-habit-affordance"
        tone="dashed"
      >
        <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.5}>
          {label}
        </Text>
      </DockField>
      <DockPlusButton onPress={onPress} testID="break-habit-plus" tone="plain" />
    </DockCard>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    label: {
      fontSize: typeScale.label,
      lineHeight: DOCK_LABEL_LINE_HEIGHT,
      fontFamily: theme.fonts.uiSemibold,
      // primary, to match the plus beside it; the old inline row used
      // primaryDark, which since ADR 0027 is the same value under another name.
      color: theme.primary,
    },
  });
}
