/**
 * One 48pt settings row, lifted out of app/profile.tsx (formerly
 * components/SettingsSheet.tsx) verbatim so the developer menu section can
 * reuse it without importing the page back into itself (a require cycle).
 * Styling still lives in the page's createStyles and is passed in, so there
 * is exactly one place that defines how a row looks.
 *
 * Interactive rows are buttons; a static row (Version, Build) stays a labelled,
 * non-actionable element so VoiceOver never offers a dead activation.
 */
import React from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Icon } from '@/components/ui/Icon';
import type { AppTheme } from '@/constants/theme';

/**
 * The subset of the settings sheet's stylesheet a row needs. Structural, so the
 * sheet can keep owning createStyles and just hand the result over.
 */
export type SettingsRowStyles = {
  row: StyleProp<ViewStyle>;
  rowLast: StyleProp<ViewStyle>;
  rowPressed: StyleProp<ViewStyle>;
  rowLabel: StyleProp<TextStyle>;
  rowLabelDestructive: StyleProp<TextStyle>;
  rowTrailing: StyleProp<ViewStyle>;
  rowValue: StyleProp<TextStyle>;
  rowHint: StyleProp<TextStyle>;
};

export type SettingsRowProps = {
  styles: SettingsRowStyles;
  theme: AppTheme;
  label: string;
  /** Trailing value, e.g. the currency code or the app version. */
  value?: string;
  /** Trailing hint in small mist type, e.g. the sign-out reassurance. */
  hint?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  /** Last row in its group: no separator below it. */
  last?: boolean;
  accessibilityLabel?: string;
};

export function SettingsRow({
  styles,
  theme,
  label,
  value,
  hint,
  onPress,
  chevron,
  destructive,
  last,
  accessibilityLabel,
}: SettingsRowProps): React.JSX.Element {
  const rowStyle: StyleProp<ViewStyle> = [styles.row, last ? styles.rowLast : null];
  const body = (
    <>
      <Text style={[styles.rowLabel, destructive ? styles.rowLabelDestructive : null]}>
        {label}
      </Text>
      <View style={styles.rowTrailing}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        {chevron ? <Icon name="ChevronRight" size={16} color={theme.mist} /> : null}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={rowStyle} accessible accessibilityLabel={accessibilityLabel ?? label}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [rowStyle, pressed ? styles.rowPressed : null]}
    >
      {body}
    </Pressable>
  );
}
