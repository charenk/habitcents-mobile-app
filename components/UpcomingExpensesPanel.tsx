import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  FlatList,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { UpcomingExpenseCard } from './UpcomingExpenseCard';
import type { UpcomingItem, UpcomingTypeFilter } from '@/data/upcomingMock';
import { getTotalForDisplay } from '@/data/upcomingMock';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_PARTIAL = 0.45;

type UpcomingExpensesPanelProps = {
  items: UpcomingItem[];
  filter: UpcomingTypeFilter;
};

export function UpcomingExpensesPanel({ items, filter }: UpcomingExpensesPanelProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const total = getTotalForDisplay(items, filter);
  const panelHeight = useRef(new Animated.Value(SCREEN_HEIGHT * SNAP_PARTIAL)).current;
  const lastOffset = useRef(SCREEN_HEIGHT * SNAP_PARTIAL);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const next = lastOffset.current - gestureState.dy;
        const partial = SCREEN_HEIGHT * SNAP_PARTIAL;
        const full = SCREEN_HEIGHT * 0.95;
        const clamped = Math.max(partial, Math.min(full, next));
        panelHeight.setValue(clamped);
      },
      onPanResponderRelease: (_, gestureState) => {
        const current = lastOffset.current - gestureState.dy;
        const partial = SCREEN_HEIGHT * SNAP_PARTIAL;
        const full = SCREEN_HEIGHT * 0.95;
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

  return (
    <Animated.View style={[styles.panel, { height: panelHeight }]}>
      <View style={styles.handleWrap} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>All upcoming expenses</Text>
        <Text style={styles.total}>${total.toLocaleString()}</Text>
      </View>
      <Text style={styles.subtitle}>Based on past expenses & recurring payment setup</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UpcomingExpenseCard item={item} />}
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
      paddingHorizontal: 20,
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    total: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    listContent: {
      paddingBottom: 32,
    },
  });
}
