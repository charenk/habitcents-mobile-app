import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { TierBadge } from './TierBadge';
import type { KpiSummary } from '@/utils/leakScan/resultsSummary';

type KpiRowProps = {
  kpi: KpiSummary;
  /**
   * Evidence window string, e.g. "Jul 1 to Jun 30 · 3 accounts" (spec 5.1).
   * Optional: the redesigned results screen carries it in the screen eyebrow
   * instead, so the first card omits the subtitle when nothing is passed.
   */
  evidenceWindow?: string;
};

/**
 * The KPI row (spec 5.1, visual spec 3): three stat cards, each with a big
 * serif tabular-nums number, label, evidence-window subtitle, and the tier
 * badge of its weakest input. No motion.
 */
export function KpiRow({ kpi, evidenceWindow }: KpiRowProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const purchasesPerDayLabel = strings.leakScan.kpiPurchasesPerDay(kpi.purchasesPerDay.toFixed(1));

  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <View style={styles.badgeSlot}>
          <TierBadge tier={kpi.totalSpentTier} />
        </View>
        <Text style={styles.amount}>{format(kpi.totalSpentCents)}</Text>
        <Text style={styles.label}>{strings.leakScan.kpiTotalSpent}</Text>
        {evidenceWindow ? <Text style={styles.subtitle}>{evidenceWindow}</Text> : null}
      </View>

      <View style={styles.card}>
        <View style={styles.badgeSlot}>
          <TierBadge tier={kpi.totalSpentTier} />
        </View>
        <Text style={styles.amount}>{format(kpi.perDayCents)}</Text>
        <Text style={styles.label}>{strings.leakScan.kpiPerDay}</Text>
        <Text style={styles.subtitle}>{strings.leakScan.kpiOverCoveredDays(kpi.coveredDays)}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.badgeSlot}>
          <TierBadge tier={kpi.totalSpentTier} />
        </View>
        <Text style={styles.amount}>{kpi.transactionCount}</Text>
        <Text style={styles.label}>{strings.leakScan.kpiTransactions}</Text>
        <Text style={styles.subtitle}>{purchasesPerDayLabel}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    card: {
      flex: 1,
      backgroundColor: theme.white,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 12,
    },
    badgeSlot: {
      alignItems: 'flex-end',
      marginBottom: 4,
    },
    amount: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    label: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiMedium,
      color: theme.slate,
      marginTop: 3,
    },
    subtitle: {
      // Informational metadata (evidence window, covered days), so it uses
      // slate for the 4.5:1 contrast floor, not mist (spec 09 §1.5).
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 2,
    },
  });
}
