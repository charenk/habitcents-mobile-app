/**
 * "Where it went" card on the Insights tab (spec 04 "Insights", item 2).
 *
 * One row per category: emoji tile, name, tabular amount, and a 6px bar sized
 * against the largest row. The bars are ALWAYS mist on snow, never sage: spend
 * is not a win (spec 01 section 1, "spend bars are ALWAYS mist-on-snow").
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmojiTile } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import type { SpendingByCategory } from '@/types/report';
import { strings } from '@/constants/strings';

type WhereItWentCardProps = {
  /** Rows straight from ReportsContext.calculateSpendingByCategory. */
  rows: SpendingByCategory[];
  /** Right-hand range label, e.g. "Last 7 days". */
  rangeLabel: string;
};

export function WhereItWentCard({ rows, rangeLabel }: WhereItWentCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.amount - a.amount), [rows]);
  const max = sorted.length > 0 ? sorted[0].amount : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {strings.insights.whereItWentTitle}
        </Text>
        <Text style={styles.rangeLabel}>{rangeLabel}</Text>
      </View>

      {sorted.length === 0 ? (
        <Text style={styles.empty}>{strings.insights.whereItWentEmpty}</Text>
      ) : (
        sorted.map((row) => {
          const amount = format(row.amount);
          const widthPercent = max > 0 ? Math.max(2, Math.round((row.amount / max) * 100)) : 0;

          return (
            <View
              key={row.categoryId}
              style={styles.row}
              accessible
              accessibilityLabel={`${row.categoryName}, ${amount}`}
            >
              <EmojiTile
                emoji={categoryEmoji(row.categoryName)}
                size={36}
                color={categoryIdentityColor(row.categoryName)}
              />
              <View style={styles.rowBody}>
                <View style={styles.rowLabels}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {row.categoryName}
                  </Text>
                  <Text style={styles.rowAmount}>{amount}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${widthPercent}%` }]} />
                </View>
              </View>
            </View>
          );
        })
      )}
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardTitle: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    rangeLabel: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.slate,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    rowBody: {
      flex: 1,
    },
    rowLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      marginBottom: 5,
    },
    rowName: {
      flex: 1,
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.ink,
    },
    rowAmount: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    // Spend is not a win: the track is snow and the fill is mist. Never sage.
    barTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.snow,
      overflow: 'hidden',
    },
    barFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.mist,
    },
    empty: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      paddingTop: 4,
    },
  });
}
