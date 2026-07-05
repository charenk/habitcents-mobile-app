import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { PulseCell } from '@/utils/leakScan/spendPulse';
import type { ScanRow } from '@/utils/leakScan/types';

type PulseDayDetailSheetProps = {
  cell: PulseCell | null;
  /** Spend rows falling on this cell's date (day granularity) or period
   *  (month/year granularity), already resolved by the caller. */
  rows: ScanRow[];
  onClose: () => void;
};

/**
 * Pulse cell tap detail sheet (spec 5.3): date/period, total, merchant list.
 * Rendered for spend cells; a zero-spend or out-of-coverage cell tap shows
 * the same sheet with an explanatory empty state rather than nothing.
 */
export function PulseDayDetailSheet({ cell, rows, onClose }: PulseDayDetailSheetProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!cell) return null;

  return (
    <Modal visible={!!cell} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.date}>{cell.key}</Text>

          {cell.state === 'out-of-coverage' && (
            <Text style={styles.emptyText}>{strings.leakScan.pulseLegendOutOfCoverage}</Text>
          )}
          {cell.state === 'zero-spend' && (
            <Text style={styles.emptyText}>{strings.leakScan.pulseLegendZero}</Text>
          )}
          {cell.state === 'spend' && (
            <>
              <Text style={styles.total}>{format(cell.totalCents)}</Text>
              <ScrollView style={styles.list}>
                {rows.map((row) => (
                  <View key={row.id} style={styles.row}>
                    <Text style={styles.merchant}>{row.merchantDisplay || row.rawDescription}</Text>
                    <Text style={styles.amount}>{format(Math.abs(row.amountCents))}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeButtonText}>{strings.common.ok}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 340,
      maxHeight: '70%',
    },
    date: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    total: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    list: {
      marginBottom: 16,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    merchant: {
      fontSize: 13,
      color: theme.text,
      flex: 1,
    },
    amount: {
      fontSize: 13,
      color: theme.text,
      fontVariant: ['tabular-nums'],
    },
    closeButton: {
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.white,
    },
  });
}
