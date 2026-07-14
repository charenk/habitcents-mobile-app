import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { TierBadge } from './TierBadge';
import { categoryDisplayLabel } from '@/utils/leakScanBridge';
import type { ReviewQueueItem } from '@/utils/leakScan/reviewQueue';
import type { ExpenseCategory } from '@/types/expense';
import { track } from '@/utils/analytics';

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

type ReviewQueueSheetProps = {
  visible: boolean;
  items: ReviewQueueItem[];
  onCorrect: (merchantStem: string, category: ExpenseCategory) => void;
  onClose: () => void;
};

/**
 * Merchant review queue (spec 6/7 "quick check", visual spec 10): framed as
 * almost-done, capped at 10 by dollar impact. Each correction writes a
 * persistent rule (via the caller's onCorrect -> utils/scanRules.ts) and
 * fires scan_correction (structural only: stage + fromTier, never the
 * merchant string or amount). A persistent Done/Skip-the-rest exit; never a
 * wall the user cannot leave.
 */
export function ReviewQueueSheet({ visible, items, onCorrect, onClose }: ReviewQueueSheetProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [doneStems, setDoneStems] = useState<Set<string>>(new Set());

  const remaining = items.filter((i) => !doneStems.has(i.merchantStem));
  const doneCount = items.length - remaining.length;

  const handleCorrect = (item: ReviewQueueItem, category: ExpenseCategory) => {
    onCorrect(item.merchantStem, category);
    track('scan_correction', { stage: 'categorize', from_tier: 'needs-review' });
    setDoneStems((prev) => new Set(prev).add(item.merchantStem));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.grabber} />
        <Text style={styles.title}>{strings.leakScan.reviewQueueTitle(items.length)}</Text>
        <Text style={styles.progress}>{strings.leakScan.reviewQueueProgress(doneCount, items.length)}</Text>

        <ScrollView style={styles.list}>
          {remaining.map((item) => (
            <View key={item.merchantStem} style={styles.itemCard}>
              <View
                accessible
                accessibilityLabel={`${item.merchantDisplay}, we guessed ${categoryDisplayLabel(
                  item.guessedCategory
                )}, ${strings.leakScan.tierReview}`}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.merchantName}>{item.merchantDisplay}</Text>
                  <TierBadge tier="needs-review" />
                </View>
                <Text style={styles.amount}>{format(item.totalCents)}</Text>
                <Text style={styles.guessLabel}>
                  Guessed: {categoryDisplayLabel(item.guessedCategory)}
                </Text>
              </View>
              <View style={styles.chipRow}>
                {CATEGORY_OPTIONS.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.chip}
                    onPress={() => handleCorrect(item, cat)}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                  >
                    <Text style={styles.chipText}>{categoryDisplayLabel(cat)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.doneButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.doneButtonText}>
              {remaining.length === 0 ? strings.leakScan.reviewQueueDone : strings.leakScan.reviewQueueSkipRest}
            </Text>
          </TouchableOpacity>
        </View>
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
    },
    progress: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
      marginBottom: 12,
    },
    list: {
      flex: 1,
    },
    itemCard: {
      backgroundColor: theme.background,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    merchantName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    amount: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    guessLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 10,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
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
    footerButtons: {
      marginTop: 12,
    },
    doneButton: {
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.white,
    },
  });
}
