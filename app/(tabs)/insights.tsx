/**
 * Insights (redesign step 04, spec 04 "Insights").
 *
 * Three stacked cards under a serif title: your leaks, where it went, and this
 * month's pace. The configurable widget dashboard is gone; the data still comes
 * from ReportsContext so the category and projection math has exactly one
 * implementation.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { LeakFinderTeaser } from '@/components/insights/LeakFinderTeaser';
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
import { getLeakFinderInterest, getScanSummary, saveLeakFinderInterest } from '@/utils/storage';
import { track } from '@/utils/analytics';
import { contentColumnStyle, layout, typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit } from '@/types/habit';
import type { ScanSummary } from '@/types/scanSummary';
import { strings } from '@/constants/strings';
import { useSegmentPager } from '@/utils/useSegmentPager';

type InsightsView = 'month' | 'scan';

/** Pane order, left to right. Matches the segmented control above them, and
 *  module-level so the pager's handlers keep a stable identity across renders. */
const INSIGHTS_VIEWS = ['month', 'scan'] as const satisfies readonly InsightsView[];

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
  // Leak finder co-build opt-in (decision 0009). Same undefined-means-loading
  // discipline as the summary above, and for the same reason: without it the
  // "Count me in" CTA flashed for a beat on every focus for a user who had
  // already tapped it.
  const [interestRecorded, setInterestRecorded] = useState<boolean | undefined>(undefined);
  const [view, setView] = useState<InsightsView>('month');
  // The segments double as pager pages: tap one or swipe to it. See
  // utils/useSegmentPager.ts for why this stays a plain paging ScrollView.
  const { markInteracted, pagerProps, paneProps } = useSegmentPager<InsightsView>({
    values: INSIGHTS_VIEWS,
    value: view,
    onSwipe: useCallback((landed: InsightsView) => {
      setView(landed);
      track('insights_view_switched', { to: landed, method: 'swipe' });
    }, []),
  });

  const handleViewChange = useCallback(
    (next: InsightsView) => {
      markInteracted();
      setView(next);
      track('insights_view_switched', { to: next, method: 'tap' });
    },
    [markInteracted]
  );

  // Guards a fast double tap from writing and reporting the opt-in twice
  // before the first await resolves (UX-062, same idiom as onboarding's pick).
  const interestInFlightRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getScanSummary().then((summary) => {
        if (!cancelled) setScanSummary(summary);
      });
      getLeakFinderInterest().then((interest) => {
        if (!cancelled) setInterestRecorded(interest !== null);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleRecordInterest = useCallback(async () => {
    if (interestInFlightRef.current) return;
    interestInFlightRef.current = true;
    try {
      await saveLeakFinderInterest();
      track('leak_finder_interest_recorded', {});
      setInterestRecorded(true);
    } finally {
      interestInFlightRef.current = false;
    }
  }, []);

  const segments = useMemo(
    () =>
      [
        { value: 'month' as const, label: strings.insights.monthSegment },
        {
          value: 'scan' as const,
          label: strings.insights.scanSegment,
          // Coming soon (decision 0009): the segment is a real destination
          // with a real teaser, so the badge sets the expectation before the
          // tap rather than after it.
          badge: strings.insights.scanSegmentBadge,
          badgeSpoken: strings.insights.scanSegmentBadgeSpoken,
        },
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
          renders: Leak finder is a real destination (the coming soon teaser,
          or a scan already on file) rather than a segment that only exists
          once a scan has happened. */}
      <View style={styles.segments}>
        <SegmentedControl<InsightsView>
          options={segments}
          value={view}
          onChange={handleViewChange}
          accessibilityLabel={strings.insights.scanSegmentControlLabel}
        />
      </View>

      {/* Both segments are pages of one pager, swipeable as well as tappable
          (utils/useSegmentPager.ts, shared with Today and Money). They stay
          mounted so each keeps its own scroll position; paneProps hides the
          off-screen one from assistive tech. The pager mounts only after the
          isLoading return above has cleared, and its first positioning is
          silent, so a late mount cannot animate a page into view. */}
      <ScrollView {...pagerProps} style={styles.pager} testID="insights-pager">
        <View {...paneProps('month')} testID="insights-pane-month">
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {monthHasData ? (
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
                cta={{ label: strings.insights.monthEmptyCta, onPress: handleMonthEmptyLog }}
              />
            )}
          </ScrollView>
        </View>

        <View {...paneProps('scan')} testID="insights-pane-scan">
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Either fetch still in flight means this focus has no real
                answer yet: render nothing rather than flashing a state for a
                beat before the true one lands. */}
            {scanSummary === undefined || interestRecorded === undefined ? null : scanSummary ? (
              // A scan already on file is still shown in full (ADR 0020, kept
              // until replaced). The figures were true when they were computed
              // and the pause does not change that; only the footer's offer to
              // run another one goes away with the flow.
              <ScanSnapshotCard summary={scanSummary} />
            ) : (
              // Coming soon (decision 0009). The scan flow is dormant behind
              // SCAN_FLOW_ENABLED, so the pane recruits for the rework instead
              // of offering an action the app cannot honour.
              <LeakFinderTeaser
                interestRecorded={interestRecorded}
                onRecordInterest={handleRecordInterest}
              />
            )}
          </ScrollView>
        </View>
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
      // Was 12, which made the control sit 4pt lower than Money's and jump
      // visibly when switching tabs. ScreenHeader ends in a 4pt paddingBottom,
      // so 8 here gives the same 12pt title-to-control gap Money and Today's
      // chips row both use. Insights was the only one of the three that had
      // not been revisited since the shared-header migration. ADR 0039.
      marginTop: 8,
    },
    pager: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: layout.screenBottomClearance,
      gap: 12,
      ...contentColumnStyle,
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
