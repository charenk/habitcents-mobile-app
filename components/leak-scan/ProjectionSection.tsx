import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { TierBadge } from './TierBadge';
import { categoryDisplayLabel } from '@/utils/leakScanBridge';
import type { ProjectionSummary } from '@/utils/leakScan/projection';
import { track } from '@/utils/analytics';

type ProjectionSectionProps = {
  summary: ProjectionSummary;
  onSave: (remindBefore: Record<string, boolean>) => void;
};

/** Month name for the "next month" label, from today's date. */
function nextMonthName(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Next-month projection (spec 5.5, visual spec 7). Renders only once coverage
 * clears a full calendar month; otherwise the pre-coverage placeholder.
 * Locked-in recurring items show a 3-payment-month amber flag; run-rate items
 * carry their own tier; buffer is a single labeled line. Save persists
 * recurring items and each item's reminder-intent toggle (v1: intent capture
 * only, no notification scheduled).
 */
export function ProjectionSection({ summary, onSave }: ProjectionSectionProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [remindBefore, setRemindBefore] = useState<Record<string, boolean>>({});
  const month = useMemo(() => nextMonthName(), []);

  if (!summary.hasFullMonth) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{strings.leakScan.projectionTitle}</Text>
        <Text style={styles.placeholder}>{strings.leakScan.projectionPlaceholder}</Text>
      </View>
    );
  }

  const toggleRemind = (stem: string) => {
    setRemindBefore((prev) => {
      const next = { ...prev, [stem]: !prev[stem] };
      track('scan_reminder_intent_set', {});
      return next;
    });
  };

  const handleSave = () => {
    track('scan_projection_saved', { n_recurring: summary.lockedIn.length });
    onSave(remindBefore);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.leakScan.projectionTitle}</Text>

      {summary.lockedIn.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{strings.leakScan.projectionLockedIn}</Text>
          {summary.lockedIn.map((item) => (
            <View key={item.merchantStem} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.merchantDisplay}</Text>
                <Text style={styles.itemNext}>{item.nextDateISO}</Text>
                {item.interval === 'biweekly' && item.nextMonthHits >= 3 && (
                  <View style={styles.flagPill}>
                    <Text style={styles.flagPillText}>
                      {strings.leakScan.threePaymentMonth(month)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.itemActions}>
                <Text style={styles.itemAmount}>{format(item.amountCents)}</Text>
                <View style={styles.remindRow}>
                  <Text style={styles.remindLabel}>{strings.leakScan.remindDayBefore}</Text>
                  <Switch
                    value={!!remindBefore[item.merchantStem]}
                    onValueChange={() => toggleRemind(item.merchantStem)}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {summary.runRate.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{strings.leakScan.projectionRunRate}</Text>
          {summary.runRate.map((item) => (
            <View key={item.category} style={styles.itemRow}>
              <Text style={styles.itemName}>{categoryDisplayLabel(item.category)}</Text>
              <View style={styles.itemActions}>
                <Text style={styles.itemAmount}>{format(item.medianMonthlyCents)}</Text>
                <TierBadge tier={item.tier} />
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.buffer}>{strings.leakScan.projectionBuffer}</Text>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} accessibilityRole="button">
        <Text style={styles.saveButtonText}>{strings.leakScan.saveToHabitCents}</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 10,
    },
    placeholder: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    group: {
      marginBottom: 14,
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    itemNext: {
      fontSize: 11,
      color: theme.textTertiary,
      marginTop: 2,
    },
    flagPill: {
      backgroundColor: theme.tierLikelyBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    flagPillText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.tierLikelyInk,
    },
    itemActions: {
      alignItems: 'flex-end',
      gap: 4,
    },
    itemAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      fontVariant: ['tabular-nums'],
    },
    remindRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    remindLabel: {
      fontSize: 10.5,
      color: theme.textTertiary,
    },
    buffer: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    saveButton: {
      backgroundColor: theme.primary,
      minHeight: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.white,
    },
  });
}
