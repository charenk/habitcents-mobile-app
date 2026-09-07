/**
 * DockCard: the one shape both of Today's docks take (Charen, 2026-09-07).
 *
 * Spent's quick log and Kept's break-habit affordance used to be two
 * different objects one swipe apart: a rounded-rect card holding a field and
 * a square plus, beside a bare dashed pill with an icon and two lines of text.
 * Different heights, different corners, different shells. ActionDock's record
 * even carried the admission that the two "are different heights".
 *
 * Now there is one composer grammar: a white pill shell with a 1px cloud edge,
 * holding a pill field on the left and a round sage plus on the right. Spent
 * puts the amount in the field; Kept puts the label in it. Everything a dock
 * can show fits inside the same fixed field height, so the two docks are
 * equal in every state and the shell's top edge lands at the same y on both
 * panes, which is what stops the chrome jumping as the pager swipes.
 *
 * Why a FIXED height rather than a minimum: a minimum equalises the docks only
 * while their contents happen to be the same size, and the whole point of the
 * change was that they were not. The derivation, with the app's own caps:
 *  - Spent: the 28pt Instrument Serif amount has a line box of about 34pt at
 *    default and about 44pt at AmountDisplay's 1.3 cap.
 *  - Kept: label 18 + caption 15 + 2pt gap is 35pt at default and 51.5pt at
 *    the 1.5 chrome cap, and the caption only exists at the free-plan ceiling.
 * 52 holds every state, clears the 44pt target floor, and the shell totals
 * 74pt (1 + 10 + 52 + 10 + 1), still under the 77pt chips row above the pager.
 * If a device pass ever shows clipping, this is the one number to move.
 *
 * Pill, not the switcher family's rounded rect: PATTERN_VOCABULARY reserves
 * the rounded-rect nesting rule for the two switchers. The dock is a composer,
 * and Charen asked for fully round corners on it specifically.
 */
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing, type AppTheme } from '@/constants/theme';

/** The field's fixed height. See the file header for the derivation. */
export const DOCK_FIELD_HEIGHT = 52;
/** Line heights the Kept field's two lines are sized against. */
export const DOCK_LABEL_LINE_HEIGHT = 18;
export const DOCK_CAPTION_LINE_HEIGHT = 15;

type DockCardProps = {
  children: ReactNode;
};

/** The shell: white pill, cloud edge, one row of children. */
export function DockCard({ children }: DockCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.card}>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

type DockFieldProps = {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
  children: ReactNode;
};

/**
 * The tappable field on the left. Snow at rest, cloud while pressed: the same
 * swap Button and AddUpcomingSheet's stepper use, so the primary entry to the
 * core loop acknowledges a touch before the sheet begins to rise.
 */
export function DockField({ onPress, accessibilityLabel, accessibilityHint, testID, children }: DockFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      style={({ pressed }) => [styles.field, pressed ? styles.fieldPressed : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

type DockPlusButtonProps = {
  onPress: () => void;
  testID?: string;
};

/**
 * The round sage plus on the right. Hidden from assistive tech on purpose
 * (UX-055): the field already carries the action and its spoken name, and a
 * second stop with the same name announced the same button twice. It stays a
 * real touch target for sighted and pointer users.
 */
export function DockPlusButton({ onPress, testID }: DockPlusButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      style={({ pressed }) => [styles.plus, pressed ? styles.plusPressed : null]}
      onPress={onPress}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={testID}
    >
      {/* White on sage is 5.37:1 (ADR 0027), clear of the 3:1 non-text floor. */}
      <Icon name="Plus" size={22} color={theme.white} />
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.control,
    },
    row: {
      flexDirection: 'row',
      // Stretch so the plus takes the field's full fixed height and squares
      // its width off that, rather than the row shrinking to the shorter child.
      alignItems: 'stretch',
      gap: spacing.stack,
    },
    field: {
      flex: 1,
      height: DOCK_FIELD_HEIGHT,
      backgroundColor: theme.snow,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
    },
    fieldPressed: {
      backgroundColor: theme.cloud,
    },
    plus: {
      alignSelf: 'stretch',
      aspectRatio: 1,
      borderRadius: radii.pill,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusPressed: {
      // sagePressed (#246242): the white glyph is 7.24:1 while held. ADR 0027.
      backgroundColor: theme.primaryPressedBg,
    },
  });
}
