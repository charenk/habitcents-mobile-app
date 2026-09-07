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
  | 'tertiaryBrand'
  | 'link'
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
      // White on the retuned brand sage: 5.37:1. ADR 0027 (2026-08-16,
      // Option A) supersedes the 2026-08-12 ink-label call now that the
      // primary itself moved. UX-001.
      color: theme.white,
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

    // tertiaryBrand: tertiary's geometry, sage label (ADR 0038).
    //
    // Exists for the empty-state CTA, which is its pane's PRIMARY action once
    // the body line is gone and the button is text only. Sage is sanctioned
    // there by the vocabulary's own wording, "a kept outcome or the action
    // that produces one (CTA, ...)"; slate made the one thing the pane wants
    // you to do its quietest element. 5.37:1 on white.
    //
    // Deliberately a separate variant rather than a colour prop on `tertiary`:
    // the eight existing tertiary buttons are secondary exits (skip, cancel,
    // try a different export) and must stay slate. A variant makes the
    // distinction nameable; a prop would make it a judgment call per site.
    tertiaryBrand: {
      backgroundColor: 'transparent',
      minHeight: 44,
    },
    tertiaryBrandPressed: {
      opacity: 0.6,
    },
    tertiaryBrandLabel: {
      color: theme.primary,
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.label,
    },

    // link: a disclosure, not an action (Charen, 2026-09-07).
    //
    // The first underlined text in the app, introduced for one job: a quiet
    // trigger that opens an explanation and changes nothing ("Learn how skips
    // and habits work" on Today's Kept zero state). The underline is what
    // tells it apart from tertiaryBrand's sage CTA sitting in the same stack:
    // sage says "do the thing", an underline says "read about the thing".
    // Regular weight and the 13pt secondary size keep it the quietest element
    // on the pane; slate keeps it at 7:1 so quiet never means unreadable.
    //
    // The rule that comes with it: `link` discloses, never acts. A control that
    // writes data, navigates to a workflow or spends money is one of the other
    // variants, whatever it looks like.
    link: {
      backgroundColor: 'transparent',
      minHeight: 44,
    },
    linkPressed: {
      opacity: 0.6,
    },
    linkLabel: {
      color: theme.slate,
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      textDecorationLine: 'underline',
      // Android draws the rule in the text colour by default; iOS also does,
      // but naming it keeps the two platforms from ever drifting apart.
      textDecorationColor: theme.slate,
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
