/**
 * DockCard: the one STRUCTURE both of Today's docks take (Charen, 2026-09-07).
 *
 * Spent's quick log and Kept's break-habit affordance used to be two
 * different objects one swipe apart: a rounded-rect card holding a field and
 * a square plus, beside a bare dashed pill with an icon and two lines of text.
 * Different heights, different corners, different shells. ActionDock's record
 * even carried the admission that the two "are different heights".
 *
 * Now there is one composer grammar: a rounded-rect shell holding a rounded
 * field on the left and a round plus on the right, at one fixed height. Spent puts the
 * amount in the field; Kept puts the label in it. Everything a dock can show
 * fits inside the same fixed field height, so the two docks are equal in
 * every state and the shell's top edge lands at the same y on both panes,
 * which is what stops the chrome jumping as the pager swipes.
 *
 * Same structure, two skins (Charen's second call the same day). With both
 * docks solid and sage, "Break your first habit" read as another add-expense
 * composer. So the shell and the plus each take a `tone`: Spent is the solid
 * white shell with the filled sage plus, the app's one composer; Kept is the
 * DASHED shell with a PLAIN plus, the app's "add another" grammar (the same
 * dashed edge UpcomingList's add row and the watch nudge use). What a user
 * sees is one shape they already know how to use, in two voices.
 *
 * Why a FIXED field height rather than a minimum: a minimum equalises the
 * docks only while their contents happen to be the same size, and the whole
 * point of the change was that they were not. The derivation, with the app's
 * own caps:
 *  - Spent: the 28pt Instrument Serif amount has a line box of about 34pt at
 *    default and about 44pt at AmountDisplay's 1.3 cap.
 *  - Kept: one label line, 18pt at default and 27pt at the 1.5 chrome cap.
 * 44 is therefore the floor set by Spent alone, and it is also the 44pt touch
 * target floor, so the field cannot go lower for two independent reasons. The
 * shell totals 66pt. If a device pass ever shows the amount clipping at the
 * 1.3 cap, this is the one number to move, and 48 is the fallback.
 *
 * The field was 52 and the shell 74 until 2026-09-10 (Charen: make both docks
 * more compact). The 52 was set by Kept's label-plus-caption at 51.5pt; the
 * free-plan caption is gone, so that constraint went with it.
 *
 * Why the dashed shell pads half a point less: its 1.5pt edge (cloudDashed
 * exists precisely so a dashed edge that thin still reads) would otherwise
 * make the Kept dock a point taller than Spent's, and a point is a visible
 * jump across a swipe. Border plus padding is 11 in both tones.
 *
 * Rounded rect, not a pill (Charen, 2026-09-10, reversing the fully-round
 * call of 2026-09-07). A pill shell reads wrong the moment it opens: the
 * sheet's inputs and controls underneath carry ordinary radii, so a fully
 * round composer promised a shape nothing behind it kept.
 *
 * The corners are concentric by construction: shell radii.feature (20), minus
 * the 10pt padding, is exactly radii.control (10) for the field, so the field
 * sits inside the shell with parallel curves rather than two guesses. The plus
 * stays a circle, which is a circle rather than a rounded rect and so creates
 * none of the mismatch above.
 *
 * This does put the dock on the switchers' 20 (SpentKeptChips' chip is
 * radii.feature, its track 20 plus padding), which PATTERN_VOCABULARY had
 * reserved for the two switchers. Accepted knowingly: the dock is a bordered
 * composer at the foot of the pane and the chips are a segmented track at its
 * head, they never adjoin, and concentric corners on real tokens beat a third
 * radius invented to keep the families apart.
 */
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing, type AppTheme } from '@/constants/theme';

/** The field's fixed height. See the file header for the derivation. */
export const DOCK_FIELD_HEIGHT = 44;
/** Line height the Kept field's single label line is sized against. */
export const DOCK_LABEL_LINE_HEIGHT = 18;

/** Shell edges. The dashed tone's thicker edge is paid for out of its padding
 *  so both tones share one outer height. */
const SOLID_BORDER = 1;
const DASHED_BORDER = 1.5;
const SOLID_PADDING = spacing.control;
const DASHED_PADDING = SOLID_PADDING - (DASHED_BORDER - SOLID_BORDER);

/** The shell's outer height, identical in both tones: 66. */
export const DOCK_SHELL_HEIGHT = 2 * SOLID_BORDER + 2 * SOLID_PADDING + DOCK_FIELD_HEIGHT;

/** Solid: the composer (Spent). Dashed: "add another" (Kept). */
export type DockTone = 'solid' | 'dashed';
/** Filled: the sage circle (Spent). Plain: the snow circle with a sage glyph (Kept). */
export type DockPlusTone = 'filled' | 'plain';

type DockCardProps = {
  children: ReactNode;
  tone?: DockTone;
  testID?: string;
};

/** The shell: a rounded rect with a cloud edge, one row of children. */
export function DockCard({ children, tone = 'solid', testID }: DockCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.card, tone === 'dashed' ? styles.cardDashed : null]} testID={testID}>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

type DockFieldProps = {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
  /** Matches the shell it sits in: 'solid' fills with snow (Spent), 'dashed'
   *  carries no resting fill at all (Kept). Both press to cloud. */
  tone?: DockTone;
  children: ReactNode;
};

/**
 * The tappable field on the left. Cloud while pressed, the same swap Button
 * and AddUpcomingSheet's stepper use, so the primary entry to the core loop
 * acknowledges a touch before the sheet begins to rise. At rest it is snow in
 * the solid tone and nothing at all in the dashed one.
 */
export function DockField({
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
  tone = 'solid',
  children,
}: DockFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.field,
        tone === 'dashed' ? styles.fieldBare : null,
        pressed ? styles.fieldPressed : null,
      ]}
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
  tone?: DockPlusTone;
};

/**
 * The round plus on the right. Hidden from assistive tech on purpose
 * (UX-055): the field already carries the action and its spoken name, and a
 * second stop with the same name announced the same button twice. It stays a
 * real touch target for sighted and pointer users.
 */
export function DockPlusButton({ onPress, testID, tone = 'filled' }: DockPlusButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const plain = tone === 'plain';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.plus,
        plain ? styles.plusPlain : styles.plusFilled,
        pressed ? (plain ? styles.plusPlainPressed : styles.plusFilledPressed) : null,
      ]}
      onPress={onPress}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={testID}
    >
      {/* Filled: white on sage is 5.37:1 (ADR 0027), clear of the 3:1
          non-text floor. Plain: sage on snow is 5.27:1, the same glyph colour
          as the label beside it. */}
      <Icon name="Plus" size={22} color={plain ? theme.primary : theme.white} />
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: SOLID_BORDER,
      borderColor: theme.border,
      padding: SOLID_PADDING,
    },
    cardDashed: {
      borderWidth: DASHED_BORDER,
      borderStyle: 'dashed',
      borderColor: theme.cloudDashed,
      padding: DASHED_PADDING,
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
      borderRadius: radii.control,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
    },
    // Kept's field carries no resting fill (Charen, 2026-09-10): the dashed
    // shell is the whole button, so a grey slab inside a grey-edged outline
    // was two containers saying one thing. The pressed swap survives, because
    // it is the app's press convention and the only answer this dock gives a
    // finger before the sheet or the paywall arrives.
    fieldBare: {
      backgroundColor: 'transparent',
    },
    fieldPressed: {
      backgroundColor: theme.cloud,
    },
    plus: {
      alignSelf: 'stretch',
      aspectRatio: 1,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusFilled: {
      backgroundColor: theme.primary,
    },
    plusFilledPressed: {
      // sagePressed (#246242): the white glyph is 7.24:1 while held. ADR 0027.
      backgroundColor: theme.primaryPressedBg,
    },
    // Bare at rest, the same as the field it sits beside (Charen,
    // 2026-09-10); pressed swaps to cloud the same way the field does.
    plusPlain: {
      backgroundColor: 'transparent',
    },
    plusPlainPressed: {
      backgroundColor: theme.cloud,
    },
  });
}
