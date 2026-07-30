import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Delete } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { radii } from '@/constants/theme';
import { applyKeypadKey, type KeypadKey } from '@/utils/keypad';
import { hapticLight } from '@/utils/motion';

type KeypadProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

function labelFor(key: KeypadKey): string {
  if (key === 'backspace') return 'delete';
  if (key === '.') return 'decimal point';
  return key;
}

/**
 * Amount keypad (design/redesign-handoff/01-tokens-and-foundations.md, §5).
 * Owns no value of its own; it maps a keypress through applyKeypadKey and hands
 * the next string back to the caller.
 */
export function Keypad({ value, onChange, disabled = false }: KeypadProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const press = (key: KeypadKey) => {
    if (disabled) return;
    onChange(applyKeypadKey(value, key));
    hapticLight();
  };

  return (
    <View style={[styles.grid, disabled ? styles.gridDisabled : null]}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              onPress={() => press(key)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={labelFor(key)}
              accessibilityState={{ disabled }}
              style={({ pressed }) => [
                styles.key,
                pressed && !disabled ? styles.keyPressed : null,
              ]}
            >
              {key === 'backspace' ? (
                <Delete size={22} strokeWidth={1.5} color={theme.ink} />
              ) : (
                <Text style={styles.keyLabel}>{key}</Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    grid: {
      gap: 8,
    },
    gridDisabled: {
      opacity: 0.4,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
    },
    key: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.control,
      backgroundColor: theme.snow,
      borderWidth: 1,
      borderColor: theme.cloud,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyPressed: {
      backgroundColor: theme.cloud,
    },
    keyLabel: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: 18,
      color: theme.ink,
    },
  });
}
