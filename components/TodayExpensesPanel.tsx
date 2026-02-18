import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  SectionList,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense, ExpenseSection } from '@/types/expense';
import type { CategoryFilter } from '@/data/expensesMock';
import { ALL_CATEGORIES } from '@/data/expensesMock';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_PARTIAL = 0.55;
const SNAP_FULL = 0.95;

type TodayExpensesPanelProps = {
  sections: ExpenseSection[];
  activeCategory: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
};

function ExpenseCard({
  item,
  theme,
}: {
  item: Expense;
  theme: ReturnType<typeof useTheme>;
}) {
  const styles = useMemo(() => createCardStyles(theme), [theme]);
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
      <Text style={styles.cardAmount}>{item.amountDisplay}</Text>
    </View>
  );
}

export function TodayExpensesPanel({
  sections,
  activeCategory,
  onCategoryChange,
}: TodayExpensesPanelProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const panelHeight = useRef(new Animated.Value(SCREEN_HEIGHT * SNAP_PARTIAL)).current;
  const lastOffset = useRef(SCREEN_HEIGHT * SNAP_PARTIAL);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const next = lastOffset.current - gestureState.dy;
        const partial = SCREEN_HEIGHT * SNAP_PARTIAL;
        const full = SCREEN_HEIGHT * SNAP_FULL;
        const clamped = Math.max(partial, Math.min(full, next));
        panelHeight.setValue(clamped);
      },
      onPanResponderRelease: (_, gestureState) => {
        const current = lastOffset.current - gestureState.dy;
        const partial = SCREEN_HEIGHT * SNAP_PARTIAL;
        const full = SCREEN_HEIGHT * SNAP_FULL;
        const velocity = gestureState.vy;
        const snapToFull = current > partial + (full - partial) * 0.3 || velocity < -0.5;
        const target = snapToFull ? full : partial;
        lastOffset.current = target;
        Animated.spring(panelHeight, {
          toValue: target,
          useNativeDriver: false,
          tension: 65,
          friction: 11,
        }).start();
      },
    })
  ).current;

  const renderItem = ({ item }: { item: Expense }) => (
    <ExpenseCard item={item} theme={theme} />
  );

  const renderSectionHeader = ({ section }: { section: ExpenseSection }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <Animated.View style={[styles.panel, { height: panelHeight }]}>
      <View style={styles.handleWrap} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
        style={styles.chipsScroll}
      >
        {ALL_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
              onPress={() => onCategoryChange(cat)}
            >
              <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    panel: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 8,
    },
    handleWrap: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.chipBorder,
    },
    chipsScroll: {
      flexGrow: 0,
      marginBottom: 8,
    },
    chipsContainer: {
      paddingHorizontal: 20,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chip: {
      height: 40,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
      lineHeight: 18,
    },
    chipTextActive: {
      color: theme.chipActiveText,
    },
    chipTextInactive: {
      color: theme.chipInactiveText,
    },
    sectionHeader: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: 16,
      marginBottom: 10,
      paddingHorizontal: 20,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
  });
}

function createCardStyles(theme: ReturnType<typeof useTheme>) {
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
  });
}
