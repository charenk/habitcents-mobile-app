import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import { daysUntilLabel, upcomingTotal, type UpcomingItem } from '@/utils/recurring';
import { strings } from '@/constants/strings';

type UpcomingPanelProps = {
  items: UpcomingItem[];
  windowDays: number;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function UpcomingPanel({ items, windowDays }: UpcomingPanelProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="repeat-outline" size={56} color={theme.textTertiary} />
        <Text style={styles.emptyTitle}>{strings.upcoming.emptyTitle}</Text>
        <Text style={styles.emptySubtitle}>
          {strings.upcoming.emptySubtitle}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>{strings.upcoming.totalLabel(windowDays)}</Text>
        <Text style={styles.totalValue}>{format(upcomingTotal(items))}</Text>
        <Text style={styles.totalCaption}>{strings.upcoming.recurringCount(items.length)}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.expense.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name="repeat" size={20} color={theme.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.expense.merchant || item.expense.title}</Text>
              <Text style={styles.cardMeta}>
                {formatDate(item.nextDate)} · {daysUntilLabel(item.daysUntil)}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardAmount}>{format(item.expense.amount)}</Text>
              <Text style={styles.cardFreq}>{item.expense.recurrence}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    totalCard: {
      marginHorizontal: 20,
      marginTop: 4,
      marginBottom: 12,
      backgroundColor: theme.surface,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 20,
    },
    totalLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: theme.textSecondary,
    },
    totalValue: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.text,
      marginTop: 4,
    },
    totalCaption: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 120,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      backgroundColor: theme.primaryMuted,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    cardMeta: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    cardRight: {
      alignItems: 'flex-end',
    },
    cardAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    cardFreq: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
      textTransform: 'capitalize',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingBottom: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
  });
}
