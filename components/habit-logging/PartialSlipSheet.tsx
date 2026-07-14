import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

type PartialSlipSheetProps = {
  visible: boolean;
  skipValue: number;
  onCancel: () => void;
  onSave: (amountSpent: number) => void;
};

/**
 * "Spent less than usual?" sheet (spec 01 §4.7). The day stays a slip;
 * max(0, skipValue - amount) is credited to Kept. Does not increment total
 * skips.
 */
export function PartialSlipSheet({ visible, skipValue, onCancel, onSave }: PartialSlipSheetProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [text, setText] = useState('');

  React.useEffect(() => {
    if (visible) setText('');
  }, [visible]);

  const parsedCents = Math.max(0, Math.round(parseFloat(text || '0') * 100));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        accessibilityViewIsModal
      >
        <View style={styles.grabber} />
        <Text style={styles.title}>{strings.habitLogging.partialSheetTitle}</Text>
        <Text style={styles.subtitle}>{strings.habitLogging.partialSheetSubtitle(format(skipValue))}</Text>

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder="0.00"
            style={styles.input}
            accessibilityLabel={strings.habitLogging.partialAmountLabel}
          />
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => onSave(parsedCents)} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>{strings.common.save}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>{strings.common.cancel}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 28,
    },
    grabber: {
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 14,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
    },
    input: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
    },
    buttons: {
      gap: 8,
      marginTop: 'auto',
    },
    primaryButton: {
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.white,
    },
    secondaryButton: {
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
  });
}
