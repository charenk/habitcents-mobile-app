/**
 * SegmentedControl (design/redesign-handoff/04-screens.md, "Money").
 *
 * A cloud track with a single white raised thumb: the selected segment is the
 * only white surface, so the control reads as one physical switch rather than
 * two buttons. Labels are 13/600, ink when selected and slate when not, which
 * keeps the state legible without relying on the fill alone.
 *
 * No motion: the thumb is the selected segment's own background, so it swaps
 * instantly. That is deliberate. A sliding thumb would be a second animated
 * surface competing with the sheet and toast motion the spec already budgets.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { radii, shadows, typeScale } from '@/constants/theme';
import { selectableLabel } from '@/utils/a11y';

export type SegmentedControlProps<T extends string | number> = {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  /** Names the whole control, e.g. "Money view". */
  accessibilityLabel?: string;
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={styles.track}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={selectableLabel(option.label, selected)}
            accessibilityState={{ selected }}
            // UX-030: minHeight 38 sits below the 44pt target floor. The
            // track's 3pt padding plus this segment's own edge leaves 3pt of
            // headroom top and bottom before hitting the track edge, so this
            // extends the hit area without changing the visual.
            hitSlop={{ top: 3, bottom: 3 }}
            style={({ pressed }) => [
              styles.segment,
              selected ? styles.segmentSelected : null,
              pressed && !selected ? styles.segmentPressed : null,
            ]}
          >
            <Text
              style={[styles.label, selected ? styles.labelSelected : null]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.5}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      backgroundColor: theme.cloud,
      borderRadius: radii.pill,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      minHeight: 38,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    segmentSelected: {
      backgroundColor: theme.white,
      ...shadows.card,
    },
    segmentPressed: {
      opacity: 0.6,
    },
    label: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.secondary,
      color: theme.slate,
    },
    labelSelected: {
      color: theme.ink,
    },
  });
}
