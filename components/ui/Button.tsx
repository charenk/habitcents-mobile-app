import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { radii, typeScale } from '@/constants/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'destructive'
  | 'destructiveFill';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared button per design/redesign-handoff/01-tokens-and-foundations.md
 * (Buttons). Feedback is a pressed background swap, never a scale.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const base = styles[variant];
  const labelStyle = styles[`${variant}Label` as const];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        base,
        pressed && !disabled ? styles[`${variant}Pressed` as const] : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text
        style={[styles.baseLabel, labelStyle, disabled ? styles.disabledLabel : null]}
        maxFontSizeMultiplier={1.5}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: {
      borderRadius: radii.control,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    baseLabel: {
      textAlign: 'center',
    },
    disabled: {
      backgroundColor: theme.cloud,
      borderWidth: 0,
    },
    disabledLabel: {
      // Slate, not white: white on cloud is 1.18:1, so a disabled button could
      // not be read at all. WCAG exempts disabled controls, but a user still
      // has to know what the button would do. UX-047.
      color: theme.slate,
    },

    // primary
    primary: {
      backgroundColor: theme.primary,
      minHeight: 50,
    },
    primaryPressed: {
      backgroundColor: theme.primaryPressedBg,
    },
    primaryLabel: {
      // Ink on the unchanged brand sage: 6.24:1, where white was 2.71:1.
      // Charen's call (2026-08-12): keep the green, darken the label. UX-001.
      color: theme.ink,
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.button,
    },

    // secondary
    secondary: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      minHeight: 50,
    },
    secondaryPressed: {
      backgroundColor: theme.snow,
    },
    secondaryLabel: {
      color: theme.ink,
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.button,
    },

    // tertiary
    tertiary: {
      backgroundColor: 'transparent',
      minHeight: 44,
    },
    tertiaryPressed: {
      opacity: 0.6,
    },
    tertiaryLabel: {
      color: theme.slate,
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.label,
    },

    // destructive (bare)
    destructive: {
      backgroundColor: 'transparent',
      minHeight: 50,
    },
    destructivePressed: {
      opacity: 0.6,
    },
    destructiveLabel: {
      color: theme.coral,
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.button,
    },

    // destructiveFill
    destructiveFill: {
      backgroundColor: theme.coral,
      minHeight: 50,
    },
    destructiveFillPressed: {
      opacity: 0.85,
    },
    destructiveFillLabel: {
      color: theme.white,
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.button,
    },
  });
}
