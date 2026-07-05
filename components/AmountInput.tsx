import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { currencyMeta } from '@/utils/currency';

type AmountInputProps = {
  value: number; // cents
  onChange: (cents: number) => void;
  autoFocus?: boolean;
};

export function AmountInput({ value, onChange, autoFocus = false }: AmountInputProps) {
  const theme = useTheme();
  const { currency } = useCurrency();
  const meta = currencyMeta(currency);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Format cents to a display string with the active currency's decimal
  // places (0 for JPY, 2 otherwise), never a hardcoded ".00".
  const safeValue = Number.isFinite(value) ? value : 0;
  const displayValue = meta.decimals === 0
    ? String(Math.round(safeValue / 100))
    : (safeValue / 100).toFixed(meta.decimals);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handleChangeText = (text: string) => {
    // Remove all non-numeric characters
    const digits = text.replace(/[^0-9]/g, '');
    // Convert to cents (user types raw number, we interpret as cents); guard
    // against an unparseable/empty result so a corrupt amount can never reach
    // the caller.
    const parsed = parseInt(digits, 10);
    const cents = Number.isFinite(parsed) ? parsed : 0;
    onChange(cents);
  };

  // For input, we use raw digits without formatting
  const inputValue = safeValue === 0 ? '' : safeValue.toString();

  return (
    <TouchableOpacity
      style={[styles.container, isFocused && styles.containerFocused]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.dollarSign}>{meta.symbol}</Text>
      <Text style={styles.amount}>{displayValue}</Text>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={inputValue}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        caretHidden
        maxLength={9}
      />
    </TouchableOpacity>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    containerFocused: {
      borderColor: theme.primary,
    },
    dollarSign: {
      fontSize: 32,
      fontWeight: '600',
      color: theme.textSecondary,
      marginRight: 4,
    },
    amount: {
      fontSize: 48,
      fontWeight: '700',
      color: theme.text,
    },
    hiddenInput: {
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
    },
  });
}
