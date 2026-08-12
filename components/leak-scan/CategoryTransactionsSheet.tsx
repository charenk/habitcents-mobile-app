import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatDate, parseDateOnly } from '@/utils/dates';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
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

/** UX-050: a scan row's dateISO is a calendar day, not an instant, so it is
 *  parsed field by field. Falls back to the raw key rather than rendering
 *  "Invalid Date" if a row ever carries something unparseable. */
function formatRowDate(dateISO: string): string {
  const parsed = parseDateOnly(dateISO);
  return parsed ? formatDate(parsed, { month: 'short', day: 'numeric' }) : dateISO;
}

/**
 * Category row tap -> transaction list (spec 5.2): every row's category chip
 * is tap-to-correct (spec 8). A correction here writes the same persistent
 * rule as the merchant review queue (utils/scanRules.ts).
 *
 * House Sheet (design/leakscan-migration, U12a): was a pageSheet Modal
 * drawing its own fake grab handle under the OS one; now the shared bottom
 * Sheet supplies the real handle and scrim, capped at 82% of window height
 * like ReviewQueueSheet.
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
  const { height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [openChipFor, setOpenChipFor] = useState<string | null>(null);

  if (!category) return null;

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={categoryDisplayLabel(category)}>
      <View style={[styles.body, { maxHeight: height * 0.82 }]}>
        <Text style={styles.title} accessibilityRole="header">
          {categoryDisplayLabel(category)}
        </Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent}>
          {rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.merchantName}>{row.merchantDisplay || row.rawDescription}</Text>
                {/* UX-050: dateISO was rendered raw; route it through the app's
                    locale-aware date formatter. Parsed as a local calendar day,
                    not a UTC instant, so the label cannot slip to the day
                    before west of UTC. */}
                <Text style={styles.rowDate}>{formatRowDate(row.dateISO)}</Text>
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

        <View style={styles.footer}>
          <Button label={strings.common.ok} onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: {
      flexShrink: 1,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.fonts.uiBold,
      color: theme.ink,
      paddingHorizontal: 20,
      paddingTop: 4,
      marginBottom: 8,
    },
    scroll: {
      flexShrink: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    row: {
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.hairlineSubtle,
    },
    rowInfo: {
      marginBottom: 4,
    },
    merchantName: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    rowDate: {
      fontSize: 11,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 2,
    },
    amount: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.ink,
      marginBottom: 6,
      fontVariant: ['tabular-nums'],
    },
    chipButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: theme.snow,
      borderWidth: 1,
      borderColor: theme.chipBorder,
    },
    chipButtonText: {
      fontSize: 11.5,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.slate,
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
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: theme.chipBorder,
      backgroundColor: theme.chipInactiveBg,
    },
    chipText: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.chipInactiveText,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
    },
  });
}
