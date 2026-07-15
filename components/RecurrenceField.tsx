import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import type { RecurrenceFrequency } from '@/types/expense';
import { selectableLabel } from '@/utils/a11y';

type RecurrenceFieldProps = {
  recurrence: RecurrenceFrequency | null;
  onChange: (recurrence: RecurrenceFrequency | null) => void;
};

const OPTIONS: { key: RecurrenceFrequency; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

/**
 * Real recurring control: a toggle that, when on, requires a frequency. Unlike
 * the old no-op toggle, this drives the Upcoming projection.
 */
export function RecurrenceField({ recurrence, onChange }: RecurrenceFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isOn = recurrence !== null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => onChange(isOn ? null : 'monthly')}
        accessibilityRole="switch"
        accessibilityState={{ checked: isOn }}
        accessibilityLabel="Recurring expense"
      >
        <View style={styles.labelWrap}>
          <Ionicons name="repeat-outline" size={20} color={theme.textSecondary} />
          <Text style={styles.label}>Recurring expense</Text>
        </View>
        <View style={[styles.switch, isOn && styles.switchOn]}>
          <View style={[styles.knob, isOn && styles.knobOn]} />
        </View>
      </TouchableOpacity>

      {isOn && (
        <View style={styles.chips}>
          {OPTIONS.map((opt) => {
            const active = recurrence === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                onPress={() => onChange(opt.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={selectableLabel(opt.label, active)}
                hitSlop={{ top: 6, bottom: 6 }}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    labelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    label: {
      fontSize: 15,
      color: theme.text,
    },
    switch: {
      width: 44,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.chipInactiveBg,
      padding: 3,
      justifyContent: 'center',
    },
    switchOn: {
      backgroundColor: theme.primary,
    },
    knob: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.white,
    },
    knobOn: {
      alignSelf: 'flex-end',
    },
    chips: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    chipActive: {
      backgroundColor: theme.chipActiveBg,
      borderColor: theme.chipActiveBg,
    },
    chipInactive: {
      backgroundColor: theme.chipInactiveBg,
      borderColor: theme.chipBorder,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '500',
    },
    chipTextActive: {
      color: theme.chipActiveText,
    },
    chipTextInactive: {
      color: theme.chipInactiveText,
    },
  });
}
