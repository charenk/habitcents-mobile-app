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
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useReports } from '@/contexts/ReportsContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useHabits } from '@/contexts/HabitsContext';
import { LeaksCard, type LeakRowData } from '@/components/insights/LeaksCard';
import { WhereItWentCard } from '@/components/insights/WhereItWentCard';
import { PaceCard, type PaceComparison } from '@/components/insights/PaceCard';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { hasFullMonthOfData } from '@/utils/recurring';
import { isHabitLimitReached } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import { formatDate } from '@/utils/dates';
import { typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit } from '@/types/habit';
import { strings } from '@/constants/strings';

/**
 * The "where it went" window. 'week' is the only TimeRange whose day count is
 * exact (getDateRangeForTimeRange steps back 7 days), so the range label can
 * name the window honestly.
 */
const WHERE_IT_WENT_DAYS = 7;

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
          emoji: categoryEmoji(categoryName),
          tint: categoryIdentityColor(categoryName),
        };
      });
  }, [categories, getDiscoveredHabits, getActiveHabits]);

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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LeaksCard
          rows={leakRows}
          onBreak={(habit) => setPickOneHabitId(habit.id)}
          onOpenHabit={(habitId) => router.push(`/habit/${habitId}`)}
        />

        <WhereItWentCard
          rows={spendingByCategory}
          rangeLabel={strings.insights.whereItWentRange(WHERE_IT_WENT_DAYS)}
        />

        <PaceCard monthLabel={monthLabel} projection={projection} comparison={comparison} />
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
          router.push('/paywall?placement=habit_gate');
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 100,
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
