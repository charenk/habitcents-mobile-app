/**
 * Event history (design/redesign-handoff/04-screens.md, "Habit detail (R9)":
 * the weekly/monthly cadence card that replaces the calendar; product rules in
 * docs/design-package-phase2/01-habit-logging-spec.md section 4.9).
 *
 * A weekly or monthly leak has no daily question, so a month grid would be 28
 * empty circles and two answers. The list shows only what actually happened,
 * newest first: "Aug 3 · Skipped one · +$22.00" or "Aug 3 · Bought it".
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDate } from '@/utils/dates';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import type { HabitLogEntry } from '@/types/habit';
import { strings } from '@/constants/strings';
import { EmptyState } from '@/components/ui';

type EventHistoryProps = {
  dayLogs: HabitLogEntry[];
  skipValue: number;
};

function formatEventDate(d: Date): string {
  return formatDate(d, { month: 'short', day: 'numeric' });
}

// UX-058: this list renders inside the habit detail screen's ScrollView, so
// a nested VirtualizedList would be the wrong fix (RN warns against, and
// breaks, a VirtualizedList inside a ScrollView). A long-running weekly/
// monthly habit can accumulate ~100 rows over two years; capping the initial
// render and revealing the rest on request keeps the common case (a handful
// of recent events) cheap without converting this into a virtualized screen.
const INITIAL_VISIBLE_COUNT = 10;

export function EventHistory({ dayLogs, skipValue }: EventHistoryProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showAll, setShowAll] = useState(false);

  const events = useMemo(
    () => [...dayLogs].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [dayLogs]
  );

  if (events.length === 0) {
    return (
      <View style={[styles.card, styles.emptyWrap]}>
        <EmptyState body={strings.habitDetailV2.eventHistoryEmpty} />
      </View>
    );
  }

  const visibleEvents = showAll ? events : events.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMore = !showAll && events.length > INITIAL_VISIBLE_COUNT;

  return (
    <View style={styles.card}>
      {visibleEvents.map((e, i) => (
        <View
          key={`${e.date.toISOString()}-${i}`}
          style={[styles.row, (i < visibleEvents.length - 1 || hasMore) && styles.rowBorder]}
        >
          <Text style={styles.date}>{formatEventDate(e.date)}</Text>
          <Text style={styles.detail}>
            {e.state === 'skipped'
              ? strings.habitLogging.eventSkippedOne(format(skipValue))
              : e.partialAmount != null
                ? strings.habitLogging.eventBoughtItPartial(format(Math.max(0, skipValue - e.partialAmount)))
                : strings.habitLogging.eventBoughtIt}
          </Text>
        </View>
      ))}
      {hasMore && (
        <Pressable
          onPress={() => setShowAll(true)}
          accessibilityRole="button"
          style={styles.showAllRow}
        >
          <Text style={styles.showAllText}>{strings.habitLogging.eventHistoryShowAll(events.length)}</Text>
        </Pressable>
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
      paddingHorizontal: 18,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      paddingVertical: 12,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.hairlineSubtle,
    },
    date: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.mistText,
      fontVariant: ['tabular-nums'],
    },
    detail: {
      fontFamily: theme.fonts.uiMedium,
      fontSize: typeScale.label,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    emptyWrap: {
      paddingVertical: 18,
    },
    // UX-058: tertiary text link (design/PATTERN_VOCABULARY.md controls:
    // "tertiary bare slate text"), the same grammar LoggedTodayList's "View
    // all" link uses, centered since this row is the list's own footer
    // rather than a paired eyebrow-row link.
    showAllRow: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    showAllText: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.label,
      color: theme.slate,
    },
  });
}
