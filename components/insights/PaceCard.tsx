/**
 * Month pace card on the Insights tab (spec 04 "Insights", item 3).
 *
 * Stays on the honest placeholder until a full calendar month of data exists
 * (the screen decides that with hasFullMonthOfData and passes projection=null),
 * because extrapolating from a partial month is a fabricated number. When a
 * projection does render, being over last month is never red: the comparison
 * line stays slate and only the wording changes.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { EmptyState } from '@/components/ui';

export type PaceProjection = {
  /** Cents spent so far this calendar month. */
  currentSpent: number;
  /** Cents projected for the whole month. */
  projectedTotal: number;
  daysRemaining: number;
};

export type PaceComparison = {
  /** Absolute gap in cents between the projection and the compared month. */
  differenceCents: number;
  direction: 'under' | 'over';
  /** The compared month, e.g. "June". */
  monthLabel: string;
};

type PaceCardProps = {
  /** Current month, e.g. "July". Titles the card as "July pace". */
  monthLabel: string;
  /** Null until a full month of data exists; the card shows the placeholder. */
  projection: PaceProjection | null;
  /** Null when the previous month has no spend to compare against. */
  comparison: PaceComparison | null;
};

export function PaceCard({ monthLabel, projection, comparison }: PaceCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const title = strings.insights.paceTitle(monthLabel);

  if (!projection) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.placeholderWrap}>
          <EmptyState body={strings.insights.pacePlaceholder} />
        </View>
      </View>
    );
  }

  const projected = format(projection.projectedTotal);
  const spent = format(projection.currentSpent);
  // UX-010: the bar is genuinely month progress now, not spend disguised as
  // progress. It used to be currentSpent / projectedTotal, which filled the
  // sage bar as the user spent more money, so a "good" (over-budget) month
  // and a "bad" one both read as visual progress toward the sage fill. Days
  // elapsed in the calendar month has nothing to do with spend, so sage no
  // longer tracks it.
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const progress = Math.min(100, Math.max(0, Math.round((dayOfMonth / daysInMonth) * 100)));

  const comparisonLine = comparison
    ? comparison.direction === 'under'
      ? strings.insights.paceSpentUnder(spent, format(comparison.differenceCents), comparison.monthLabel)
      : strings.insights.paceSpentOver(spent, format(comparison.differenceCents), comparison.monthLabel)
    : strings.insights.paceSpentOnly(spent);

  const caption = strings.insights.paceProjectedCaption(projection.daysRemaining);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {title}
      </Text>

      <View style={styles.amountRow} accessible accessibilityLabel={`${projected} ${caption}`}>
        <Text style={styles.projected}>{projected}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress}%` }]} />
      </View>

      <Text style={styles.comparison}>{comparisonLine}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 18,
    },
    cardTitle: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    projected: {
      fontSize: 30,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
      includeFontPadding: false,
    },
    caption: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    // UX-010: month progress (days elapsed / days in month), not a spend
    // bar. This is the one sanctioned sage fill on this screen (spec 04
    // "Insights": "8px sage progress bar"); it no longer tracks currentSpent,
    // so sage here never rewards spending more.
    barTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.snow,
      overflow: 'hidden',
      marginTop: 10,
    },
    barFill: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
    },
    comparison: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 6,
      fontVariant: ['tabular-nums'],
    },
    placeholderWrap: {
      marginTop: 6,
    },
  });
}
