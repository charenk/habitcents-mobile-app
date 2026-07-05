import React, { useRef, useMemo, useState } from 'react';
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
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Expense, ExpenseSection } from '@/types/expense';
import type { Category } from '@/types/category';
import { EditExpenseModal } from './EditExpenseModal';
import { strings } from '@/constants/strings';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Collapsed peek keeps the sheet out of the way so the add-expense form (and its
// Save button) is fully visible by default. Users drag up to browse expenses.
const SNAP_COLLAPSED = 0.18;
const SNAP_PARTIAL = 0.55;
const SNAP_FULL = 0.95;

type TodayExpensesPanelProps = {
  sections: ExpenseSection[];
  categories: Category[];
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  /** Rendered by the SectionList's ListEmptyComponent when sections is empty
   * (spec 05 section 5.1: the zero-expense empty state). Null/omitted renders
   * nothing, matching the prior behavior. */
  emptyState?: React.ReactNode;
};

function ExpenseCard({
  item,
  theme,
  onPress,
}: {
  item: Expense;
  theme: ReturnType<typeof useTheme>;
  onPress: (expense: Expense) => void;
}) {
  const styles = useMemo(() => createCardStyles(theme), [theme]);
  const { format } = useCurrency();
  const amountLabel = format(item.amount, { signed: true });
  const iconBg = item.iconVariant === 'yellow' ? theme.iconBgYellow : theme.iconBgGreen;
  const iconColor = item.iconVariant === 'yellow' ? theme.iconOrange : theme.primary;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      accessibilityLabel={strings.expenses.editAccessibilityLabel(item.title, amountLabel)}
    >
      <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
        <Ionicons name="cafe-outline" size={24} color={iconColor} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardTime}>{item.time}</Text>
      </View>
      <Text style={styles.cardAmount}>{amountLabel}</Text>
    </TouchableOpacity>
  );
}

export function TodayExpensesPanel({
  sections,
  categories,
  activeCategoryId,
  onCategoryChange,
  emptyState,
}: TodayExpensesPanelProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const panelHeight = useRef(new Animated.Value(SCREEN_HEIGHT * SNAP_COLLAPSED)).current;
  const lastOffset = useRef(SCREEN_HEIGHT * SNAP_COLLAPSED);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const next = lastOffset.current - gestureState.dy;
        const collapsed = SCREEN_HEIGHT * SNAP_COLLAPSED;
        const full = SCREEN_HEIGHT * SNAP_FULL;
        const clamped = Math.max(collapsed, Math.min(full, next));
        panelHeight.setValue(clamped);
      },
      onPanResponderRelease: (_, gestureState) => {
        const collapsed = SCREEN_HEIGHT * SNAP_COLLAPSED;
        const partial = SCREEN_HEIGHT * SNAP_PARTIAL;
        const full = SCREEN_HEIGHT * SNAP_FULL;
        const current = Math.max(collapsed, Math.min(full, lastOffset.current - gestureState.dy));
        const velocity = gestureState.vy;
        const snaps = [collapsed, partial, full];
        let target: number;
        if (velocity < -0.5) {
          // Flick up: go to the next-higher snap point.
          target = snaps.find((s) => s > current + 1) ?? full;
        } else if (velocity > 0.5) {
          // Flick down: go to the next-lower snap point.
          target = [...snaps].reverse().find((s) => s < current - 1) ?? collapsed;
        } else {
          // Settle to the nearest snap point.
          target = snaps.reduce((a, b) =>
            Math.abs(b - current) < Math.abs(a - current) ? b : a
          );
        }
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
    <ExpenseCard item={item} theme={theme} onPress={setEditingExpense} />
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
        {[{ id: 'all', name: strings.expenses.all }, ...categories].map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
              onPress={() => onCategoryChange(cat.id)}
            >
              <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                {cat.name}
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
        ListEmptyComponent={emptyState ? () => <>{emptyState}</> : undefined}
      />

      <EditExpenseModal
        visible={editingExpense !== null}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
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
