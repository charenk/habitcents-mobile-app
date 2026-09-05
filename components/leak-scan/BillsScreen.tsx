import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon } from '@/components/ui';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { contentColumnStyle, radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { hapticError } from '@/utils/motion';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { defaultSelection, offerCount, type BillsOffer } from '@/utils/leakScan/bills';
import {
  filterAlreadyImported,
  recurringToExpenses,
  toAddExpenseInput,
} from '@/utils/leakScan/importWrite';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useToast } from '@/components/ui/Toast';
import { track } from '@/utils/analytics';
import type { RecurrenceInterval, RecurringItem, ScanResult } from '@/utils/leakScan/types';

type BillsScreenProps = {
  offer: BillsOffer;
  /** Source of the rows to write; null only in degenerate states. */
  result: ScanResult | null;
  /** Leave the offer, whether anything was filed or not. */
  onDone: () => void;
};

function cadenceLabel(interval: RecurrenceInterval): string {
  if (interval === 'weekly') return strings.leakScan.billsCadenceWeekly;
  if (interval === 'biweekly') return strings.leakScan.billsCadenceBiweekly;
  if (interval === 'annual') return strings.leakScan.billsCadenceAnnual;
  return strings.leakScan.billsCadenceMonthly;
}

/**
 * The bills offer (PRD v3.1 sect 8, phase 5).
 *
 * Comes AFTER the payoff, never before it: bookkeeping must not stand between
 * the user and the moment the product exists to deliver.
 *
 * "Propose, don't ask." Cadence is already known from the statement, so each
 * row states it rather than asking; everything starts ticked and the user
 * unticks what they do not want. One confirm, and the screen is skippable.
 *
 * This is where the positioning shows whole: the deck took what you can skip,
 * this takes what you cannot, and nothing the scan found is thrown away.
 */
export function BillsScreen({ offer, result, onDone }: BillsScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { format } = useCurrency();
  const { addExpenses, expenses } = useExpenses();
  const toast = useToast();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selected, setSelected] = useState<Set<string>>(() => defaultSelection(offer));
  const [filing, setFiling] = useState(false);
  const total = offerCount(offer);

  // Reported once on arrival, against which bills_imported is read.
  useEffect(() => {
    track('bills_offered', { count_proposed: total });
  }, [total]);

  // Conditional render, not a navigation push, so VoiceOver needs telling
  // (UX-013, as with every other screen in this flow).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(strings.leakScan.billsTitle);
  }, []);

  /**
   * File the ticked rows through the same importWrite path the in-ladder save
   * uses, so they inherit its cross-import dedup AND the scan's importId. That
   * id is what keeps "Undo this import" able to remove them later: a bill
   * filed here is part of the same import, not an orphan.
   */
  const handleAdd = async () => {
    // UX-035 pattern: guard the async write against a double tap.
    if (filing) return;
    setFiling(true);
    try {
      let accepted = 0;
      if (result && selected.size > 0) {
        const candidates = recurringToExpenses(result, { onlyStems: selected });
        const fresh = filterAlreadyImported(candidates, expenses);
        // One commit, so `accepted` counts bills that are on disk rather than
        // bills that were attempted. It used to be set to fresh.length whether
        // or not the writes landed, which put a fictional number into both the
        // toast and the bills_imported event.
        try {
          await addExpenses(fresh.map(toAddExpenseInput));
        } catch (error) {
          console.error('Error filing bills:', error);
          hapticError();
          toast.show(strings.toasts.importFailed);
          return;
        }
        accepted = fresh.length;
      }
      track('bills_imported', { count_accepted: accepted, skipped: false });
      if (accepted > 0) toast.show(strings.leakScan.billsAddedToast(accepted));
      // onDone AFTER the state settles: the parent swaps this screen out on
      // done, and a setState on the unmounted screen is the warning the review
      // flagged (round 3, P3-15 minor).
    } finally {
      setFiling(false);
    }
    onDone();
  };

  const handleSkip = () => {
    track('bills_imported', { count_accepted: 0, skipped: true });
    onDone();
  };

  const toggle = (stem: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(stem)) next.delete(stem);
      else next.add(stem);
      return next;
    });
  };

  const renderRow = (item: RecurringItem) => {
    const on = selected.has(item.merchantStem);
    return (
      <Pressable
        key={item.merchantStem}
        style={({ pressed }) => [
          styles.row,
          on ? styles.rowOn : null,
          pressed ? styles.rowPressed : null,
        ]}
        onPress={() => toggle(item.merchantStem)}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={`${item.merchantDisplay}, ${format(item.amountCents)}, ${cadenceLabel(item.interval)}`}
        accessibilityHint={on ? strings.leakScan.billsRowOn : strings.leakScan.billsRowOff}
      >
        <EmojiTile
          emoji={categoryEmoji(item.category)}
          size={40}
          color={categoryIdentityColor(item.category)}
        />
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{item.merchantDisplay}</Text>
          <Text style={styles.rowMeta}>{cadenceLabel(item.interval)}</Text>
        </View>
        <Text style={styles.rowAmount}>{format(item.amountCents)}</Text>
        <View style={[styles.check, on ? styles.checkOn : null]}>
          {on ? <Icon name="Check" size={14} color={theme.white} /> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Text style={styles.title} accessibilityRole="header">
          {strings.leakScan.billsTitle}
        </Text>
        <Text style={styles.subtitle}>{strings.leakScan.billsSubtitle}</Text>

        {offer.bills.length > 0 && (
          <>
            <Text style={styles.groupHeading} accessibilityRole="header">
              {strings.leakScan.billsGroupBills}
            </Text>
            <View style={styles.rows}>{offer.bills.map(renderRow)}</View>
          </>
        )}

        {offer.subscriptions.length > 0 && (
          <>
            <Text style={styles.groupHeading} accessibilityRole="header">
              {strings.leakScan.billsGroupSubscriptions}
            </Text>
            <View style={styles.rows}>{offer.subscriptions.map(renderRow)}</View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={
            selected.size === 0
              ? strings.leakScan.billsConfirmNone
              : strings.leakScan.billsConfirm(selected.size)
          }
          onPress={handleAdd}
          disabled={filing}
        />
        <Button
          label={strings.leakScan.billsSkip}
          variant="tertiary"
          onPress={handleSkip}
          style={styles.skip}
        />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: spacing.gutter,
      ...contentColumnStyle,
    },
    title: {
      fontSize: typeScale.screenTitle,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      lineHeight: 38,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 20,
      marginBottom: 24,
    },
    groupHeading: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginBottom: 10,
    },
    rows: {
      gap: 8,
      marginBottom: 24,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radii.card,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    rowOn: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    rowPressed: {
      backgroundColor: theme.snow,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiMedium,
      color: theme.ink,
    },
    rowMeta: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 2,
    },
    rowAmount: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiMedium,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: theme.cloud,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    footer: {
      paddingHorizontal: spacing.gutter,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    skip: {
      alignSelf: 'center',
      marginTop: 6,
    },
  });
}
