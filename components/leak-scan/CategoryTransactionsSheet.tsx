import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { categoryDisplayLabel } from '@/utils/leakScanBridge';
import type { ScanRow } from '@/utils/leakScan/types';
import type { ExpenseCategory } from '@/types/expense';

const CATEGORY_OPTIONS: ExpenseCategory[] = [
  'Food',
  'Shopping',
  'Transportation',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Car',
  'Mortgage',
  'Software & Subscriptions',
  'Other',
];

type CategoryTransactionsSheetProps = {
  visible: boolean;
  category: ExpenseCategory | null;
  rows: ScanRow[];
  onCorrect: (merchantStem: string, category: ExpenseCategory) => void;
  onClose: () => void;
};

/**
 * Category row tap -> transaction list (spec 5.2): every row's category chip
 * is tap-to-correct (spec 8). A correction here writes the same persistent
 * rule as the merchant review queue (utils/scanRules.ts).
 */
export function CategoryTransactionsSheet({
  visible,
  category,
  rows,
  onCorrect,
  onClose,
}: CategoryTransactionsSheetProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [openChipFor, setOpenChipFor] = useState<string | null>(null);

  if (!category) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.grabber} />
        <Text style={styles.title}>{categoryDisplayLabel(category)}</Text>

        <ScrollView style={styles.list}>
          {rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.merchantName}>{row.merchantDisplay || row.rawDescription}</Text>
                <Text style={styles.rowDate}>{row.dateISO}</Text>
              </View>
              <Text style={styles.amount}>{format(Math.abs(row.amountCents))}</Text>
              <TouchableOpacity
                style={styles.chipButton}
                onPress={() => setOpenChipFor(openChipFor === row.id ? null : row.id)}
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                <Text style={styles.chipButtonText}>{categoryDisplayLabel(row.category)}</Text>
              </TouchableOpacity>
              {openChipFor === row.id && (
                <View style={styles.chipRow}>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.chip}
                      onPress={() => {
                        onCorrect(row.merchantStem, cat);
                        setOpenChipFor(null);
                      }}
                      accessibilityRole="button"
                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    >
                      <Text style={styles.chipText}>{categoryDisplayLabel(cat)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button">
          <Text style={styles.closeButtonText}>{strings.common.ok}</Text>
        </TouchableOpacity>
      </View>
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
      paddingBottom: 20,
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
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
    },
    list: {
      flex: 1,
    },
    row: {
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    rowInfo: {
      marginBottom: 4,
    },
    merchantName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    rowDate: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    amount: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 6,
    },
    chipButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.chipBorder,
    },
    chipButtonText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.chipBorder,
      backgroundColor: theme.chipInactiveBg,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.chipInactiveText,
    },
    closeButton: {
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
    },
    closeButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.white,
    },
  });
}
