/**
 * CurrencySheet (design/selection-sheets U3): replaces the native
 * Alert.alert currency picker at app/profile.tsx (8 stacked system buttons,
 * no indicator of the current selection, centered text). Rows are
 * left-aligned and speak the same vocabulary as the Profile row that opens
 * them (the code, e.g. USD), the selected row carries a sage check plus
 * accessibilityState.selected so the status reads by shape and label, not
 * color alone, and Cancel is the only centered text in the sheet.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { CURRENCIES, type CurrencyCode } from '@/utils/currency';
import { selectableLabel } from '@/utils/a11y';

export type CurrencySheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function CurrencySheet({ visible, onClose }: CurrencySheetProps): React.JSX.Element {
  const theme = useTheme();
  const { currency, setCurrency } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleSelect = (code: CurrencyCode) => {
    void setCurrency(code);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={strings.settings.currencySheetTitle}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {strings.settings.currencySheetTitle}
        </Text>

        {CURRENCIES.map((c, index) => {
          const selected = c.code === currency;
          const label = strings.settings.currencyRowLabel(c.name, c.code);
          return (
            <Pressable
              key={c.code}
              onPress={() => handleSelect(c.code)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={selectableLabel(label, selected)}
              style={({ pressed }) => [
                styles.row,
                index === CURRENCIES.length - 1 && styles.rowLast,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowLabel}>{label}</Text>
              {selected ? <Icon name="Check" size={20} color={theme.primary} /> : null}
            </Pressable>
          );
        })}

        <Button
          label={strings.common.cancel}
          variant="tertiary"
          onPress={onClose}
          style={styles.cancel}
        />
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 12,
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: 26,
      lineHeight: 32,
      color: theme.ink,
      includeFontPadding: false,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.hairlineSubtle,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowLabel: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.body,
      color: theme.ink,
      flexShrink: 1,
    },
    cancel: {
      marginTop: 14,
    },
  });
}
