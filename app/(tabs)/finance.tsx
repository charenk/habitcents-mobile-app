import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SectionList,
  ListRenderItem,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { UpcomingView } from '@/components/UpcomingView';

type ExpenseItem = {
  id: string;
  title: string;
  time: string;
  amount: string;
  iconVariant: 'yellow' | 'green';
};

type ExpenseSection = {
  title: string;
  data: ExpenseItem[];
};

const CATEGORIES = ['All', 'Mortgage', 'Car', 'Entertainment', 'Other'];

const MOCK_SECTIONS: ExpenseSection[] = [
  {
    title: 'Feb 14',
    data: [
      { id: '1', title: 'Morning coffee', time: '9:30 AM', amount: '-5.00', iconVariant: 'yellow' },
      { id: '2', title: 'Expense 2', time: '{time}', amount: '-$.$$', iconVariant: 'green' },
      { id: '3', title: 'Expense lorem', time: '{time}', amount: '-$.$$', iconVariant: 'green' },
    ],
  },
  {
    title: 'Feb 13 - Yesterday',
    data: [
      { id: '4', title: 'Expense lorem', time: '{time}', amount: '-$.$$', iconVariant: 'green' },
      { id: '5', title: 'Expense 2', time: '2:15 PM', amount: '-12.50', iconVariant: 'green' },
    ],
  },
];

function ExpenseCard({
  item,
  styles,
  theme,
}: {
  item: ExpenseItem;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}) {
  const iconBg = item.iconVariant === 'yellow' ? theme.iconBgYellow : theme.iconBgGreen;
  const iconColor = item.iconVariant === 'yellow' ? theme.iconOrange : theme.primary;
  return (
    <View style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
        <Ionicons name="cafe-outline" size={24} color={iconColor} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardTime}>{item.time}</Text>
      </View>
      <Text style={styles.cardAmount}>{item.amount}</Text>
    </View>
  );
}

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDay, setActiveDay] = useState<'today' | 'upcoming'>('today');

  const renderItem: ListRenderItem<ExpenseItem> = ({ item }) => (
    <ExpenseCard item={item} styles={styles} theme={theme} />
  );

  const renderSectionHeader = ({ section }: { section: ExpenseSection }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  const ListHeader = (
    <>
      <View style={styles.header}>
        <View style={styles.dateRow}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>Feb 14</Text>
          </View>
        </View>
        <View style={styles.dayTabs}>
          <TouchableOpacity onPress={() => setActiveDay('today')}>
            <Text style={[styles.dayTabText, activeDay === 'today' && styles.dayTabActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveDay('upcoming')}>
            <Text style={[styles.dayTabText, styles.dayTabInactive]}>Upcoming</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
        style={styles.chipsScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  if (activeDay === 'upcoming') {
    return (
      <UpcomingView onRecentPress={() => setActiveDay('today')} />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SectionList
        sections={MOCK_SECTIONS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={ListHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        style={styles.sectionList}
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.fabGradientStart, theme.fabGradientEnd]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color={theme.text} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    dateRow: {
      marginBottom: 8,
    },
    datePill: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primaryMuted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    datePillText: {
      fontSize: 13,
      color: theme.primary,
      fontWeight: '500',
    },
    dayTabs: {
      flexDirection: 'row',
      gap: 24,
    },
    dayTabText: {
      fontSize: 28,
      fontWeight: '700',
    },
    dayTabActive: {
      color: theme.primary,
    },
    dayTabInactive: {
      color: theme.textTertiary,
      fontWeight: '400',
    },
    chipsScroll: {
      maxHeight: 44,
      marginBottom: 16,
    },
    chipsContainer: {
      paddingHorizontal: 20,
      gap: 10,
      flexDirection: 'row',
      paddingVertical: 4,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    chipActive: {
      backgroundColor: theme.chipActiveBg,
      borderColor: theme.chipActiveBg,
    },
    chipInactive: {
      backgroundColor: theme.chipInactiveBg,
      borderColor: theme.chipBorder,
    },
    chipText: {
      fontSize: 15,
      fontWeight: '500',
    },
    chipTextActive: {
      color: theme.chipActiveText,
    },
    chipTextInactive: {
      color: theme.chipInactiveText,
    },
    sectionList: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    sectionHeader: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: 16,
      marginBottom: 10,
    },
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
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    cardTime: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    cardAmount: {
      fontSize: 17,
      color: theme.text,
      fontWeight: '500',
    },
    fab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    fabGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
