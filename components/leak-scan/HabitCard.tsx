import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EmojiTile, Icon } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { TierBadge } from './TierBadge';
import { habitCardLabel } from '@/utils/a11y';
import type { HabitCandidate } from '@/utils/leakScan/types';

type HabitCardProps = {
  rank: number;
  candidate: HabitCandidate;
  /** Month label + month total for the stats row (spec 5.4): the most recent
   *  evidence month, e.g. "$612.40 in June". */
  month: string;
  monthTotalCents: number;
  /** Calendar length of the evidence window, the stats row's "N days"
   *  denominator and the rate divisor (UX-073). */
  spanDays: number;
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
function HabitCardImpl({
  rank,
  candidate,
  month,
  monthTotalCents,
  spanDays,
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

  const tierLabel =
    candidate.tier === 'solid'
      ? strings.leakScan.tierSolid
      : candidate.tier === 'likely'
      ? strings.leakScan.tierLikely
      : strings.leakScan.tierReview;

  const statsRow = strings.leakScan.habitStatsRow(
    candidate.occurrences,
    candidate.activeDays,
    spanDays,
    format(monthTotalCents),
    month
  );

  const description =
    candidate.topMerchants.length > 0
      ? `${candidate.topMerchants.join(', ')}.`
      : undefined;

  const emoji = categoryEmoji(candidate.category);
  const identityColor = categoryIdentityColor(candidate.category);

  if (candidate.governClass === 'fixed') {
    return (
      <View style={[styles.card, styles.tipCard]}>
        <View style={[styles.classPill, { backgroundColor: classBadge.bg }]}>
          <Text style={[styles.classPillText, { color: classBadge.ink }]}>{classBadge.label}</Text>
        </View>
        <View style={styles.titleRow}>
          <EmojiTile emoji={emoji} size={40} color={identityColor} />
          <Text style={[styles.title, styles.titleInRow]}>{candidate.merchantDisplay}</Text>
        </View>
        <Text style={styles.tipText}>
          {strings.leakScan.fixedTipCard(tipMonth ?? month, format(tipAmountCents ?? monthTotalCents))}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View
          style={styles.headerBadges}
          accessible
          accessibilityLabel={habitCardLabel(rank, classBadge.label, tierLabel)}
        >
          <Text style={styles.rank}>{rank}</Text>
          <View style={[styles.classPill, { backgroundColor: classBadge.bg }]}>
            <Text style={[styles.classPillText, { color: classBadge.ink }]}>{classBadge.label}</Text>
          </View>
          <TierBadge tier={candidate.tier} />
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={strings.leakScan.moreOptionsLabel}
          // UX-032: this menu toggles the sheet below; expose that state.
          accessibilityState={{ expanded: menuOpen }}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Icon name="Ellipsis" size={18} color={theme.slate} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleRow}>
        <EmojiTile emoji={emoji} size={40} color={identityColor} />
        <View style={styles.titleColumn}>
          <Text style={styles.title}>{candidate.merchantDisplay}</Text>
          <Text style={styles.statsRow}>{statsRow}</Text>
        </View>
      </View>
      {description && <Text style={styles.description}>{description}</Text>}

      <View style={styles.footerRow}>
        <View style={styles.pacePill}>
          <Text style={styles.pacePillText}>
            {strings.leakScan.yearlyPacePill(format(candidate.annualizedLeakCents))}
          </Text>
        </View>
        {candidate.governClass === 'govern' ? (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={onTrack}
            accessibilityRole="button"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.trackButtonText}>{strings.leakScan.trackThisLeak}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.monitorButton}
            onPress={onMonitor}
            accessibilityRole="button"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
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
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.menuItemText}>{strings.leakScan.wrongDetails}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Memoized: HabitCard renders once per ranked leak (capped at 5, ResultsScreen
 * RANKED_LEAKS_CAP) on the leak-scan results ladder. Effective at that call
 * site because ResultsScreen wraps it in HabitCardItem, which builds a
 * per-candidate stable callback via useCallback instead of the inline arrows
 * the old .map() body used.
 */
export const HabitCard = memo(HabitCardImpl);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.feature,
      padding: 16,
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
    headerBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    // UX-059: was theme.fonts.display (serif). The charter reserves serif for
    // screen titles, money, and Today quotes; a rank ordinal is none of
    // those, so it moves to Inter.
    rank: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      fontVariant: ['tabular-nums'],
      color: theme.slate,
    },
    classPill: {
      paddingHorizontal: 10,
      height: 22,
      borderRadius: radii.pill,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    classPillText: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
    },
    // UX-032: was minHeight 32 + hitSlop 6 = exactly 44 with zero margin;
    // bumped to match its sibling buttons (menu items below use minHeight 40).
    menuButton: {
      marginLeft: 'auto',
      paddingHorizontal: 6,
      minWidth: 40,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 4,
    },
    titleColumn: {
      flex: 1,
    },
    titleInRow: {
      flex: 1,
    },
    title: {
      fontSize: typeScale.button,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    statsRow: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      fontVariant: ['tabular-nums'],
      color: theme.slate,
      marginTop: 2,
    },
    description: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 10,
      lineHeight: 18,
    },
    tipText: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 8,
      lineHeight: 18,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    pacePill: {
      backgroundColor: theme.amberBg,
      paddingHorizontal: 10,
      height: 22,
      borderRadius: radii.pill,
      justifyContent: 'center',
    },
    pacePillText: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      fontVariant: ['tabular-nums'],
      color: theme.amberInk,
    },
    trackButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      minHeight: 40,
      borderRadius: radii.control,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // ADR 0027 (2026-08-16, Option A): white on the retuned sage fill is
    // 5.37:1. UX-001.
    trackButtonText: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.white,
    },
    monitorButton: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      paddingHorizontal: 16,
      minHeight: 40,
      borderRadius: radii.control,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monitorButtonText: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    menuSheet: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
      paddingTop: 8,
      gap: 4,
    },
    menuItem: {
      paddingVertical: 8,
      minHeight: 40,
      justifyContent: 'center',
    },
    menuItemText: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.ink,
    },
  });
}
