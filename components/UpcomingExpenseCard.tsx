import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { UpcomingItem } from '@/data/upcomingMock';

type UpcomingExpenseCardProps = {
  item: UpcomingItem;
};

function getIconName(icon: UpcomingItem['icon']) {
  if (icon === 'car') return 'car-outline';
  if (icon === 'building') return 'business-outline';
  return 'arrow-down';
}

export function UpcomingExpenseCard({ item }: UpcomingExpenseCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const iconName = getIconName(item.icon);
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
        <Ionicons name={iconName as any} size={24} color={item.iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
          <Text style={styles.frequency}>{item.frequency}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{item.amount}</Text>
        <Text style={styles.dueIn}>in {item.dueInDays} days</Text>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    frequency: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    right: {
      alignItems: 'flex-end',
    },
    amount: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
    },
    dueIn: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
  });
}
