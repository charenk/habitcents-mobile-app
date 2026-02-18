import React, { useMemo } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type ToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
};

export function ToggleRow({
  label,
  value,
  onValueChange,
  secondaryLabel,
  onSecondaryPress,
}: ToggleRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.chipBorder, true: theme.primaryMuted }}
          thumbColor={value ? theme.primary : theme.surface}
          ios_backgroundColor={theme.chipBorder}
        />
      </View>
      {value && secondaryLabel && onSecondaryPress && (
        <TouchableOpacity style={styles.secondaryRow} onPress={onSecondaryPress}>
          <Text style={styles.secondaryLabel}>Reminder time</Text>
          <Text style={styles.secondaryValue}>{secondaryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    secondaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: theme.chipBorder,
    },
    secondaryLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    secondaryValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.primary,
    },
  });
}
