/**
 * Chip (design/redesign-handoff/04-screens.md, "Add-upcoming sheet").
 *
 * One selectable pill. Default tone ('solid') is sage with white 14/600 text
 * when selected; unselected is always white on a 1px cloud border with slate
 * text, so a screen of chips stays quiet until the user picks one.
 *
 * `tone="soft"` (U2, the expense drawer rebuild) is a second selected
 * treatment: sage-light fill + 1.5px sage border + ink text, no inversion to
 * white. It exists for surfaces where a solid sage fill would read as a CTA
 * rather than a selection (the drawer's category tag rail and, so the two
 * match as specified, its recent-merchant chips). `tone` never changes the
 * UNSELECTED look, which stays identical across both tones.
 *
 * `pill` (U2) switches the shape to radius 999 / min height 44pt / a
 * 1.5px border and a 12.5pt label, for the drawer's category tags. Plain
 * chips (default) keep radius 14 / min height 40pt / a 1px border / a 14pt
 * label exactly as before.
 *
 * `tint` is a category identity color (the same hue EmojiTile fills at 12%).
 * It colors the UNSELECTED border only: selected state carries the meaning,
 * because selection must never be carried by a per-chip hue alone. Color is
 * decoration here, never the only signal, since the spoken label carries
 * "selected" / "not selected" (utils/a11y selectableLabel).
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { radii, typeScale } from '@/constants/theme';
import { selectableLabel } from '@/utils/a11y';
import { withAlpha } from '@/utils/color';

export type ChipTone = 'solid' | 'soft';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Leading glyph, e.g. the 🏠 on a "Rent" name chip. Decorative. */
  emoji?: string;
  /** Identity color; tints the unselected border only. */
  tint?: string;
  disabled?: boolean;
  /** Selected-state treatment. 'solid' (default) = sage fill + ink text; 'soft' = sage-light fill + sage border + ink text. */
  tone?: ChipTone;
  /** Pill shape (radius 999, 44pt min height, 1.5px border, 12.5pt label) for the drawer's category tags. Default false keeps the original card-radius chip. */
  pill?: boolean;
};

export function Chip({
  label,
  selected,
  onPress,
  emoji,
  tint,
  disabled = false,
  tone = 'solid',
  pill = false,
}: ChipProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tintedBorder =
    !selected && !disabled && tint ? { borderColor: withAlpha(tint, 0.4) } : null;

  const selectedStyle = tone === 'soft' ? styles.chipSelectedSoft : styles.chipSelectedSolid;
  const selectedLabelStyle =
    tone === 'soft' ? styles.labelSelectedSoft : styles.labelSelectedSolid;

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
        pill ? styles.chipPill : null,
        selected ? selectedStyle : styles.chipUnselected,
        tintedBorder,
        disabled ? styles.chipDisabled : null,
        pressed && !disabled ? styles.chipPressed : null,
      ]}
    >
      <View style={styles.inner}>
        {emoji ? (
          <Text
            style={styles.emoji}
            importantForAccessibility="no"
            maxFontSizeMultiplier={1.5}
          >
            {emoji}
          </Text>
        ) : null}
        <Text
          style={[
            styles.label,
            pill ? styles.labelPill : null,
            selected ? selectedLabelStyle : styles.labelUnselected,
            disabled ? styles.labelDisabled : null,
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.5}
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
    chipPill: {
      minHeight: 44,
      borderRadius: radii.pill,
      borderWidth: 1.5,
    },
    chipSelectedSolid: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    chipSelectedSoft: {
      backgroundColor: theme.primaryLight,
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
      fontSize: typeScale.label,
      includeFontPadding: false,
    },
    label: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.label,
    },
    labelPill: {
      fontSize: typeScale.caption,
    },
    labelSelectedSolid: {
      // Ink on the sage fill: 6.24:1, where white was 2.71:1. Matches the
      // primary Button and the soft tone below, which already used ink. UX-001.
      color: theme.ink,
    },
    labelSelectedSoft: {
      color: theme.ink,
    },
    labelUnselected: {
      color: theme.slate,
    },
    labelDisabled: {
      // White on cloud is 1.18:1, unreadable. UX-047.
      color: theme.slate,
    },
  });
}
