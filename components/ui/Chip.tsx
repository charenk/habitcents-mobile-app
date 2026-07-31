/**
 * Chip (design/redesign-handoff/04-screens.md, "Add-upcoming sheet").
 *
 * One selectable pill. Selected is sage with white 14/600 text; unselected is
 * white on a 1px cloud border with slate text, so a screen of chips stays
 * quiet until the user picks one.
 *
 * `tint` is a category identity color (the same hue EmojiTile fills at 12%).
 * It colors the UNSELECTED border only: selected state is always sage, because
 * selection is a single meaning across the whole app and must never be carried
 * by a per-chip hue. Color is decoration here, never the only signal, since the
 * spoken label carries "selected" / "not selected" (utils/a11y selectableLabel).
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { radii } from '@/constants/theme';
import { selectableLabel } from '@/utils/a11y';
import { withAlpha } from '@/utils/color';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Leading glyph, e.g. the 🏠 on a "Rent" name chip. Decorative. */
  emoji?: string;
  /** Identity color; tints the unselected border only. */
  tint?: string;
  disabled?: boolean;
};

export function Chip({
  label,
  selected,
  onPress,
  emoji,
  tint,
  disabled = false,
}: ChipProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tintedBorder =
    !selected && !disabled && tint ? { borderColor: withAlpha(tint, 0.4) } : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={selectableLabel(label, selected)}
      accessibilityState={{ selected, disabled }}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        tintedBorder,
        disabled ? styles.chipDisabled : null,
        pressed && !disabled ? styles.chipPressed : null,
      ]}
    >
      <View style={styles.inner}>
        {emoji ? (
          <Text style={styles.emoji} importantForAccessibility="no">
            {emoji}
          </Text>
        ) : null}
        <Text
          style={[
            styles.label,
            selected ? styles.labelSelected : styles.labelUnselected,
            disabled ? styles.labelDisabled : null,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    chip: {
      minHeight: 40,
      borderRadius: radii.card,
      paddingHorizontal: 14,
      justifyContent: 'center',
      borderWidth: 1,
    },
    chipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    chipUnselected: {
      backgroundColor: theme.white,
      borderColor: theme.cloud,
    },
    chipDisabled: {
      backgroundColor: theme.cloud,
      borderColor: theme.cloud,
    },
    chipPressed: {
      opacity: 0.7,
    },
    inner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    emoji: {
      fontSize: 14,
      includeFontPadding: false,
    },
    label: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: 14,
    },
    labelSelected: {
      color: theme.white,
    },
    labelUnselected: {
      color: theme.slate,
    },
    labelDisabled: {
      color: theme.white,
    },
  });
}
