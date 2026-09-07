/**
 * BreakHabitRow: the Kept pane's dock content, the break-habit affordance.
 *
 * Until 2026-09-07 this was inline JSX in app/(tabs)/index.tsx: a dashed
 * pill with a plus icon and up to two lines of text, the app's "add another"
 * grammar borrowed from UpcomingList's add row. It sat one swipe away from
 * the quick log, a different shape at a different height, and Charen asked
 * for the two docks to be one structure. So it now takes DockCard, the same
 * shell as QuickLogRow: the label rides in the field where Spent shows the
 * amount, and the round sage plus on the right is the same control.
 *
 * The dashed grammar is not gone from the app, it has left the dock. Dashed
 * still means "add another" inside content (UpcomingList's add row, Today's
 * watch nudge). The dock is a composer, and a composer's primary action
 * should not read as a tentative placeholder.
 *
 * Label and caption are decided by the screen (state-aware since ADR 0038:
 * "Break your first habit" at zero habits, "Break another habit" after, the
 * free-plan caption only at the ceiling). This component only lays them out,
 * and lays them out so that both fit inside DOCK_FIELD_HEIGHT at the 1.5 cap.
 */
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { DockCard, DockField, DockPlusButton, DOCK_CAPTION_LINE_HEIGHT, DOCK_LABEL_LINE_HEIGHT } from './DockCard';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typeScale, type AppTheme } from '@/constants/theme';

export type BreakHabitRowProps = {
  label: string;
  /** Shown under the label only when the screen has something true to say
   *  (the free-plan ceiling). Null or undefined renders one line. */
  caption?: string | null;
  onPress: () => void;
};

export function BreakHabitRow({ label, caption, onPress }: BreakHabitRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <DockCard>
      <DockField
        onPress={onPress}
        accessibilityLabel={caption ? `${label}, ${caption}` : label}
        testID="break-habit-affordance"
      >
        <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.5}>
          {label}
        </Text>
        {caption ? (
          <Text style={styles.caption} numberOfLines={1} maxFontSizeMultiplier={1.5}>
            {caption}
          </Text>
        ) : null}
      </DockField>
      <DockPlusButton onPress={onPress} testID="break-habit-plus" />
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
    caption: {
      fontSize: typeScale.caption,
      lineHeight: DOCK_CAPTION_LINE_HEIGHT,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      marginTop: spacing.hairline,
    },
  });
}
