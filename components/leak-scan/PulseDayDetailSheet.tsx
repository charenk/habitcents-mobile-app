import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatDate, parseDateOnly } from '@/utils/dates';
import { typeScale, type AppTheme } from '@/constants/theme';
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

/** UX-050: cell.key is an ISO day (yyyy-mm-dd, length 10), ISO month
 *  (yyyy-mm, length 7), or a plain year (yyyy, length 4), per PulseCell's
 *  own granularity (utils/leakScan/spendPulse.ts). Only the day and month
 *  forms are raw enough to need locale formatting; a bare year already
 *  reads fine as-is. */
function formatCellDate(key: string): string {
  if (key.length === 10) {
    const parsed = parseDateOnly(key);
    return parsed ? formatDate(parsed, { month: 'short', day: 'numeric' }) : key;
  }
  if (key.length === 7) {
    const parsed = parseDateOnly(key);
    return parsed ? formatDate(parsed, { month: 'long', year: 'numeric' }) : key;
  }
  return key;
}

/**
 * Pulse cell tap detail sheet (spec 5.3): date/period, total, merchant list.
 * Rendered for spend cells; a zero-spend or out-of-coverage cell tap shows
 * the same sheet with an explanatory empty state rather than nothing.
 *
 * House Sheet (design/leakscan-migration, U12a): was a centered fade Modal
 * with a hardcoded rgba scrim, dismissed only by an OK button. Now the shared
 * bottom Sheet (dismiss via scrim tap) plus a quiet tertiary close (bare X,
 * never a filled OK button per PATTERN_VOCABULARY's controls list).
 */
export function PulseDayDetailSheet({ cell, rows, onClose }: PulseDayDetailSheetProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!cell) return null;

  // UX-050: cell.key is a raw ISO string (day yyyy-mm-dd, month yyyy-mm, or
  // year yyyy, per PulseCell's own granularity), which was being shown to the
  // user as-is. Route it through the app's locale-aware date formatter.
  const dateLabel = formatCellDate(cell.key);

  return (
    <Sheet visible={!!cell} onClose={onClose} accessibilityLabel={dateLabel}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.date} accessibilityRole="header" numberOfLines={1}>
            {dateLabel}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={strings.common.close}
            hitSlop={{ top: 13, bottom: 13, left: 13, right: 13 }}
          >
            <Icon name="X" size={18} color={theme.slate} />
          </TouchableOpacity>
        </View>

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
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 20,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    date: {
      // Sits beside the sheet's largest number; the date yields (ADR 0039).
      flexShrink: 1,
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiBold,
      color: theme.ink,
    },
    total: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.uiBold,
      color: theme.ink,
      marginBottom: 12,
      fontVariant: ['tabular-nums'],
    },
    emptyText: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginBottom: 4,
    },
    list: {
      maxHeight: 320,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.hairlineSubtle,
    },
    merchant: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.ink,
      flex: 1,
    },
    amount: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
  });
}
