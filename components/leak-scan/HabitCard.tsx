import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { TierBadge } from './TierBadge';
import type { HabitCandidate } from '@/utils/leakScan/types';

type HabitCardProps = {
  rank: number;
  candidate: HabitCandidate;
  /** Month label + month total for the stats row (spec 5.4): the most recent
   *  evidence month, e.g. "$612.40 in June". */
  month: string;
  monthTotalCents: number;
  coveredDays: number;
  /**
   * Fixed class only: the upcoming month name and the extra payment amount
   * for the tip card ("July is a 3-payment month... plan for the extra
   * {amount}"). This is genuinely a different month/amount than the stats
   * row (next month's projected extra vs. this evidence month's total), so
   * it is its own prop pair rather than reusing month/monthTotalCents. Falls
   * back to the stats-row values when no matching RecurringItem exists.
   */
  tipMonth?: string;
  tipAmountCents?: number;
  onTrack?: () => void;
  onMonitor?: () => void;
  onNotAHabit?: () => void;
  onWrongDetails?: () => void;
};

/**
 * Habit card (spec 5.4, visual spec 6, max 10). Only the Govern CTA is green
 * (it leads to the win); Influence's Monitor is neutral; Fixed has no
 * tracking CTA, only a tip card. The Track CTA is wired by the caller to
 * open the identical Decision-1 pick-one sheet Door 1 uses.
 */
export function HabitCard({
  rank,
  candidate,
  month,
  monthTotalCents,
  coveredDays,
  tipMonth,
  tipAmountCents,
  onTrack,
  onMonitor,
  onNotAHabit,
  onWrongDetails,
}: HabitCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const classBadge =
    candidate.governClass === 'govern'
      ? { label: strings.leakScan.classGovern, bg: theme.classGovernBg, ink: theme.classGovernInk }
      : candidate.governClass === 'influence'
      ? { label: strings.leakScan.classInfluence, bg: theme.classInfluenceBg, ink: theme.classInfluenceInk }
      : { label: strings.leakScan.classFixed, bg: theme.classFixedBg, ink: theme.classFixedInk };

  const statsRow = strings.leakScan.habitStatsRow(
    candidate.occurrences,
    candidate.activeDays,
    coveredDays,
    format(monthTotalCents),
    month
  );

  const description =
    candidate.topMerchants.length > 0
      ? `${candidate.topMerchants.join(', ')}.`
      : undefined;

  if (candidate.governClass === 'fixed') {
    return (
      <View style={[styles.card, styles.tipCard]}>
        <View style={[styles.classPill, { backgroundColor: classBadge.bg }]}>
          <Text style={[styles.classPillText, { color: classBadge.ink }]}>{classBadge.label}</Text>
        </View>
        <Text style={styles.title}>{candidate.merchantDisplay}</Text>
        <Text style={styles.tipText}>
          {strings.leakScan.fixedTipCard(tipMonth ?? month, format(tipAmountCents ?? monthTotalCents))}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.rank}>{rank}</Text>
        <View style={[styles.classPill, { backgroundColor: classBadge.bg }]}>
          <Text style={[styles.classPillText, { color: classBadge.ink }]}>{classBadge.label}</Text>
        </View>
        <TierBadge tier={candidate.tier} />
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{candidate.merchantDisplay}</Text>
      <Text style={styles.statsRow}>{statsRow}</Text>
      {description && <Text style={styles.description}>{description}</Text>}

      <View style={styles.footerRow}>
        <View style={styles.pacePill}>
          <Text style={styles.pacePillText}>
            {strings.leakScan.yearlyPacePill(format(candidate.annualizedLeakCents))}
          </Text>
        </View>
        {candidate.governClass === 'govern' ? (
          <TouchableOpacity style={styles.trackButton} onPress={onTrack} accessibilityRole="button">
            <Text style={styles.trackButtonText}>{strings.leakScan.trackThisLeak}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.monitorButton} onPress={onMonitor} accessibilityRole="button">
            <Text style={styles.monitorButtonText}>{strings.leakScan.monitorHabit}</Text>
          </TouchableOpacity>
        )}
      </View>

      {menuOpen && (
        <View style={styles.menuSheet}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              onNotAHabit?.();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.menuItemText}>{strings.leakScan.notAHabit}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              onWrongDetails?.();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.menuItemText}>{strings.leakScan.wrongDetails}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    tipCard: {
      backgroundColor: theme.fixedTipCardBg,
      borderColor: theme.fixedTipCardBorder,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    rank: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.textSecondary,
    },
    classPill: {
      paddingHorizontal: 10,
      height: 22,
      borderRadius: 999,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    classPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    menuButton: {
      marginLeft: 'auto',
      paddingHorizontal: 6,
      minWidth: 32,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuDots: {
      fontSize: 18,
      color: theme.textSecondary,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    statsRow: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    description: {
      fontSize: 12.5,
      color: theme.textSecondary,
      marginTop: 8,
      lineHeight: 18,
    },
    tipText: {
      fontSize: 12.5,
      color: theme.textSecondary,
      marginTop: 6,
      lineHeight: 18,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    pacePill: {
      backgroundColor: theme.tierLikelyBg,
      paddingHorizontal: 10,
      height: 22,
      borderRadius: 999,
      justifyContent: 'center',
    },
    pacePillText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.tierLikelyInk,
    },
    trackButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 14,
      minHeight: 40,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trackButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.white,
    },
    monitorButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      minHeight: 40,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monitorButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    menuSheet: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 8,
      gap: 4,
    },
    menuItem: {
      paddingVertical: 8,
    },
    menuItemText: {
      fontSize: 13,
      color: theme.text,
    },
  });
}
