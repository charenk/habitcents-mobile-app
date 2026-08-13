import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
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
 *
 * House Sheet (design/leakscan-migration, U12a): was a pageSheet Modal
 * drawing its own fake grab handle under the OS one; now the shared bottom
 * Sheet supplies the real handle and scrim. Capped at 82% of window height so
 * a full 10-item queue scrolls under a docked footer button rather than
 * pushing it off-screen, matching ExpenseSheet's own sizing.
 */
export function ReviewQueueSheet({ visible, items, onCorrect, onClose }: ReviewQueueSheetProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const { height } = useWindowDimensions();
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
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={strings.leakScan.reviewQueueTitle(items.length)}
    >
      <View style={[styles.body, { maxHeight: height * 0.82 }]}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {strings.leakScan.reviewQueueTitle(items.length)}
          </Text>
          <Text style={styles.progress}>{strings.leakScan.reviewQueueProgress(doneCount, items.length)}</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent}>
          {remaining.map((item) => (
            <View key={item.merchantStem} style={styles.itemCard}>
              <View
                accessible
                accessibilityLabel={strings.leakScan.reviewQueueGuessedLabel(
                  item.merchantDisplay,
                  categoryDisplayLabel(item.guessedCategory),
                  strings.leakScan.tierReview
                )}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.merchantName}>{item.merchantDisplay}</Text>
                  <TierBadge tier="needs-review" />
                </View>
                <Text style={styles.amount}>{format(item.totalCents)}</Text>
                <Text style={styles.guessLabel}>
                  {strings.leakScan.reviewQueueGuessedCaption(categoryDisplayLabel(item.guessedCategory))}
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

        <View style={styles.footer}>
          <Button
            label={remaining.length === 0 ? strings.leakScan.reviewQueueDone : strings.leakScan.reviewQueueSkipRest}
            onPress={onClose}
          />
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
    header: {
      paddingHorizontal: 20,
      paddingTop: 4,
    },
    // BATCH 2: literal 18 -> typeScale.titleSm, the compact bold sheet-title
    // step the token sweep ratified for exactly this kind of data sheet.
    title: {
      fontSize: typeScale.titleSm,
      fontFamily: theme.fonts.uiBold,
      color: theme.ink,
    },
    progress: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 4,
      marginBottom: 4,
    },
    scroll: {
      flexShrink: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    itemCard: {
      backgroundColor: theme.snow,
      borderRadius: radii.card,
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
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiBold,
      color: theme.ink,
    },
    amount: {
      fontSize: typeScale.button,
      fontFamily: theme.fonts.uiBold,
      color: theme.ink,
      marginBottom: 4,
      fontVariant: ['tabular-nums'],
    },
    guessLabel: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
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
