import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { CalendarMonth } from './CalendarMonth';
import { UpcomingExpensesPanel } from './UpcomingExpensesPanel';
import {
  UPCOMING_TYPE_FILTERS,
  getFilteredUpcomingItems,
  getFilteredCalendarEvents,
  type UpcomingTypeFilter,
} from '@/data/upcomingMock';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const now = new Date();
const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

type UpcomingViewProps = {
  onRecentPress: () => void;
};

export function UpcomingView({ onRecentPress }: UpcomingViewProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [typeFilter, setTypeFilter] = useState<UpcomingTypeFilter>('All');

  const filteredItems = getFilteredUpcomingItems(typeFilter);
  const filteredEvents = getFilteredCalendarEvents(typeFilter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{dateLabel}</Text>
          </View>
        </View>
        <View style={styles.segment}>
          <TouchableOpacity onPress={onRecentPress}>
            <Text style={styles.segmentInactive}>Recent</Text>
          </TouchableOpacity>
          <Text style={styles.segmentActive}>Upcoming</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          {UPCOMING_TYPE_FILTERS.map((f) => {
            const isActive = typeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isActive ? styles.filterChipActive : styles.filterChipInactive]}
                onPress={() => setTypeFilter(f)}
              >
                <Text style={[styles.filterChipText, isActive ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.calendarWrap}>
          <CalendarMonth
            year={now.getFullYear()}
            month={now.getMonth()}
            events={filteredEvents}
            filter={typeFilter}
          />
        </View>
        <View style={{ height: SCREEN_HEIGHT * 0.48 }} />
      </ScrollView>
      <View style={[styles.panelWrap, { pointerEvents: 'box-none' }]}>
        <UpcomingExpensesPanel items={filteredItems} filter={typeFilter} />
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
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
      fontWeight: '500',
      color: theme.primary,
      lineHeight: 16,
    },
    segment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
      height: 40,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    segmentActive: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 34,
      color: theme.primary,
    },
    segmentInactive: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 34,
      color: theme.textTertiary,
    },
    filtersScroll: {
      flexGrow: 0,
      marginBottom: 12,
    },
    filtersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
    },
    filterChip: {
      height: 40,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterChipActive: {
      backgroundColor: theme.chipActiveBg,
      borderColor: theme.chipActiveBg,
    },
    filterChipInactive: {
      backgroundColor: theme.chipInactiveBg,
      borderColor: theme.chipBorder,
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 18,
    },
    filterChipTextActive: {
      color: theme.chipActiveText,
    },
    filterChipTextInactive: {
      color: theme.chipInactiveText,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.chipBorder,
    },
    addButtonText: {
      fontSize: 24,
      fontWeight: '300',
      color: theme.text,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 0,
    },
    calendarWrap: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      marginHorizontal: 20,
      marginBottom: 8,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    panelWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
  });
}
