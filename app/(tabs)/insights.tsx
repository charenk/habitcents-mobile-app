/**
 * Insights (redesign step 04, spec 04 "Insights").
 *
 * Three stacked cards under a serif title: your leaks, where it went, and this
 * month's pace. The configurable widget dashboard is gone; the data still comes
 * from ReportsContext so the category and projection math has exactly one
 * implementation.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useReports } from '@/contexts/ReportsContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useHabits } from '@/contexts/HabitsContext';
import { LeaksCard, type LeakRowData } from '@/components/insights/LeaksCard';
import { useEmptyStateAction } from '@/components/onboarding/useEmptyStateAction';
import { WhereItWentCard } from '@/components/insights/WhereItWentCard';
import { PaceCard, type PaceComparison } from '@/components/insights/PaceCard';
import { ScanSnapshotCard } from '@/components/insights/ScanSnapshotCard';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { habitLeakGlyph } from '@/constants/onboardingPresets';
import { hasFullMonthOfData } from '@/utils/recurring';
import { isHabitLimitReached } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import { formatDate } from '@/utils/dates';
import { getScanSummary } from '@/utils/storage';
import { layout, typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit } from '@/types/habit';
import type { ScanSummary } from '@/types/scanSummary';
import { strings } from '@/constants/strings';

type InsightsView = 'month' | 'scan';

/**
 * The "where it went" window. 'week' is the only TimeRange whose day count is
 * exact (getDateRangeForTimeRange steps back 7 days), so the range label can
 * name the window honestly.
 */
const WHERE_IT_WENT_DAYS = 7;

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Empty state as an onboarding surface (PRD v3.1 sect 5). Insights' leaks
  // list is empty because nothing has been logged often enough to detect yet,
  // so the honest first action is logging, not breaking.
  const handleEmptyLog = useEmptyStateAction('insights_leaks', useCallback(() => {
    router.navigate('/(tabs)?view=spent&sheet=log');
  }, [router]));
  // This month segment, true zero state (no data at all, not just no leaks):
  // its own surface, so the two zero states never get conflated in the funnel.
  const handleMonthEmptyLog = useEmptyStateAction('insights_month', useCallback(() => {
    router.navigate('/(tabs)?view=spent&sheet=log');
  }, [router]));
  // First scan segment, loaded-but-no-scan state.
  const handleScanEmptyOpen = useEmptyStateAction('insights_scan', useCallback(() => {
    router.push('/leak-scan');
  }, [router]));
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { isLoading, calculateSpendingByCategory, calculateMonthlyProjection } = useReports();
  const { expenses } = useExpenses();
  const { categories } = useCategories();
  const {
    getDiscoveredHabits,
    getActiveHabits,
    getHabitById,
    startBreakingHabit,
  } = useHabits();

  const [pickOneHabitId, setPickOneHabitId] = useState<string | null>(null);

  // First scan segment (W5, OB-6 Insights half, ADR 0020: kept until
  // replaced, no expiry). Re-read on every focus, not just mount, so a scan
  // run elsewhere and then returned to shows up here without a reload.
  // undefined = not loaded yet (distinct from null = loaded, no scan on
  // file): without the distinction, the pre-scan empty state flashed for a
  // beat before getScanSummary() resolved, on every focus.
  const [scanSummary, setScanSummary] = useState<ScanSummary | null | undefined>(undefined);
  const [view, setView] = useState<InsightsView>('month');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getScanSummary().then((summary) => {
        if (!cancelled) setScanSummary(summary);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const segments = useMemo(
    () =>
      [
        { value: 'month' as const, label: strings.insights.monthSegment },
        { value: 'scan' as const, label: strings.insights.scanSegment },
      ] as const,
    []
  );

  // 1. Your leaks: everything worth an action, biggest monthly drain first.
  // Discovered-not-dismissed leaks come from getDiscoveredHabits; habits
  // already being broken (changing) or merely watched (tracking) come from
  // getActiveHabits. LeaksCard picks the row action from habit.status.
  const leakRows: LeakRowData[] = useMemo(() => {
    const nameFor = (habit: DetectedHabit): string =>
      categories.find((c) => c.id === habit.categoryId)?.name ?? habit.categoryId;

    return [...getDiscoveredHabits(), ...getActiveHabits()]
      .sort((a, b) => b.totalMonthlySpend - a.totalMonthlySpend)
      .map((habit) => {
        const categoryName = nameFor(habit);
        return {
          habit,
          emoji: habitLeakGlyph(habit, categoryEmoji(categoryName)),
          tint: categoryIdentityColor(categoryName),
        };
      });
  }, [categories, getDiscoveredHabits, getActiveHabits]);

  // This month segment, true zero state: nothing to show at all, not even a
  // partial-data card. Distinct from LeaksCard's own empty state below, which
  // still applies once there IS month data but no leak has been detected yet.
  const monthHasData = expenses.length > 0 || leakRows.length > 0;

  // 2. Where it went: reuse the single category rollup implementation.
  const spendingByCategory = useMemo(
    () => calculateSpendingByCategory(expenses, categories, 'week'),
    [calculateSpendingByCategory, expenses, categories]
  );

  // 3. Pace: honest placeholder until a full calendar month of data exists.
  const covered = hasFullMonthOfData(expenses);
  const projection = useMemo(
    () => (covered ? calculateMonthlyProjection(expenses) : null),
    [covered, calculateMonthlyProjection, expenses]
  );

  const monthLabel = useMemo(() => formatDate(new Date(), { month: 'long' }), []);

  // The projection contract returns the last-month delta as a percentage only,
  // so the money gap is summed here over the same previous-calendar-month
  // window ReportsContext uses. No projection math is duplicated.
  const comparison: PaceComparison | null = useMemo(() => {
    if (!projection) return null;
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthTotal = expenses
      .filter((e) => e.date >= lastMonthStart && e.date <= lastMonthEnd)
      .reduce((sum, e) => sum + e.amount, 0);
    if (lastMonthTotal === 0) return null;

    const delta = projection.projectedTotal - lastMonthTotal;
    return {
      differenceCents: Math.abs(delta),
      direction: delta <= 0 ? 'under' : 'over',
      monthLabel: formatDate(lastMonthStart, { month: 'long' }),
    };
  }, [projection, expenses]);

  // Entitlement touchpoint (ADR 0007, BET-004): the pick-one sheet blocks Start
  // once the active-habit count reaches the entitlement ceiling.
  const freeTierBlocked = isHabitLimitReached(getActiveHabits().length, getEntitlement());
  const pickOneHabit = pickOneHabitId ? getHabitById(pickOneHabitId) : null;

  const handleStart = useCallback(
    async (skipValue: number, valueEdited: boolean) => {
      if (!pickOneHabitId) return;
      await startBreakingHabit(pickOneHabitId, skipValue, valueEdited, 'detection');
      setPickOneHabitId(null);
    },
    [pickOneHabitId, startBreakingHabit]
  );

  const profileAction = [
    { icon: 'CircleUser' as const, label: strings.profile.headerLabel, onPress: () => router.push('/profile') },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title={strings.screenTitles.insights} actions={profileAction} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{strings.reports.loading}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={strings.screenTitles.insights} actions={profileAction} />
      {/* Same composition the Today tab uses: ScreenHeader owns the chrome,
          the switcher sits below it as its own row (merge of first-scan onto
          the DI stack, resolution per the independents review). Always
          renders now: First scan is a real destination (a fill empty state
          when nothing has been scanned yet) rather than a segment that only
          exists once a scan has happened. */}
      <View style={styles.segments}>
        <SegmentedControl<InsightsView>
          options={segments}
          value={view}
          onChange={setView}
          accessibilityLabel={strings.insights.scanSegmentControlLabel}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {view === 'scan' ? (
          // scanSummary undefined means getScanSummary() hasn't resolved yet
          // (this focus's fetch is still in flight): render nothing rather
          // than flashing the "no scan yet" empty state for a beat before the
          // real answer (truthy or null) lands.
          scanSummary === undefined ? null : scanSummary ? (
            <ScanSnapshotCard summary={scanSummary} />
          ) : (
            <EmptyState
              layout="fill"
              illustration="insights-scan"
              title={strings.insights.scanEmptyTitle}
              body={strings.insights.scanEmptyBody}
              cta={{ label: strings.insights.scanEmptyCta, onPress: handleScanEmptyOpen }}
            />
          )
        ) : monthHasData ? (
          <>
            <LeaksCard
              onLogExpense={handleEmptyLog}
              rows={leakRows}
              onBreak={(habit) => setPickOneHabitId(habit.id)}
              onOpenHabit={(habitId) => router.push(`/habit/${habitId}`)}
            />

            <WhereItWentCard
              rows={spendingByCategory}
              rangeLabel={strings.insights.whereItWentRange(WHERE_IT_WENT_DAYS)}
            />

            <PaceCard monthLabel={monthLabel} projection={projection} comparison={comparison} />
          </>
        ) : (
          <EmptyState
            layout="fill"
            illustration="insights-month"
            title={strings.insights.monthEmptyTitle}
            body={strings.insights.monthEmptyBody}
            cta={{ label: strings.insights.monthEmptyCta, onPress: handleMonthEmptyLog }}
          />
        )}
      </ScrollView>

      <PickOneSheet
        visible={!!pickOneHabit}
        habit={pickOneHabit ?? null}
        monthTotal={pickOneHabit?.totalMonthlySpend ?? 0}
        occurrences={pickOneHabit?.occurrencesPerPeriod ?? 0}
        freeTierBlocked={freeTierBlocked}
        onCancel={() => setPickOneHabitId(null)}
        onStart={handleStart}
        onStartTrial={() => {
          setPickOneHabitId(null);
          router.push('/paywall?placement=habit_gate_insights');
        }}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    segments: {
      // The control used to render only once a scan existed, which hid the
      // fact that this row never carried the screen gutter Money's identical
      // row does: it sat flush against both screen edges. Now that it is
      // always visible, that lands on every first-time user, so it takes the
      // same 20pt gutter as the rest of the app's screen chrome.
      paddingHorizontal: 20,
      marginTop: 12,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: layout.screenBottomClearance,
      gap: 12,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
  });
}
