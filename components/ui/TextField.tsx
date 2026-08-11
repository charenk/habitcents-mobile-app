/**
 * TextField (design/textfield-palette, build 12): the app's last missing
 * input primitive, replacing four near-identical inline TextInput + focus
 * pairs (ExpenseSheet's merchant field, AddUpcomingSheet's name field,
 * BreakHabitSheet's custom-name field, AddCategoryModal's name field) with
 * one component so they share a look and a focus language.
 *
 * Look: `variant` fill (snow, the default, for fields on a sheet's white
 * body; white for a field that already sits on white), 1.5px cloud border,
 * radius 10 (radii.control), minHeight 44, 13.5pt ui-font ink text, mist
 * placeholder. Border width never changes between states (only color does),
 * so focusing never nudges layout.
 *
 * Focused: border goes 1.5px sage (theme.primary), the treatment the expense
 * drawer's merchant field already used before this primitive existed.
 *
 * Behavior-neutral: this unifies look and focus language only. Every other
 * TextInput prop (returnKeyType, autoCorrect, autoCapitalize, maxLength,
 * keyboardType, ...) passes straight through untouched.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';

export type TextFieldVariant = 'snow' | 'white';

export type TextFieldProps = TextInputProps & {
  /** Fill color for the field's resting state. 'snow' (default) matches most
   *  sheet fields; 'white' matches a field that already sits directly on a
   *  white sheet body with no tinted fill. */
  variant?: TextFieldVariant;
};

export function TextField({
  variant = 'snow',
  style,
  onFocus,
  onBlur,
  maxFontSizeMultiplier,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const styles = useMemo(() => createStyles(theme, variant), [theme, variant]);

  return (
    <TextInput
      {...rest}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      placeholderTextColor={theme.mist}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? 1.5}
      style={[styles.field, focused ? styles.fieldFocused : null, style]}
    />
  );
}

function createStyles(theme: AppTheme, variant: TextFieldVariant) {
  return StyleSheet.create({
    field: {
      minHeight: 44,
      borderRadius: radii.control,
      borderWidth: 1.5,
      borderColor: theme.cloud,
      backgroundColor: variant === 'white' ? theme.white : theme.snow,
      paddingHorizontal: 14,
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.control,
      color: theme.ink,
    },
    fieldFocused: {
      borderColor: theme.primary,
    },
  });
}
