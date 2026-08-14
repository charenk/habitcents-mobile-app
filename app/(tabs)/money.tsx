/**
 * Money tab (design/redesign-handoff/04-screens.md, "Money" R7/R22).
 *
 * Three views behind one segmented control: what has already been spent,
 * what is coming, and every leak/habit under management. The screen owns the
 * split and the sheets; the three lists are presentational.
 *
 * The correctness rule this screen exists to enforce: an expense scheduled for
 * next month is NOT money spent. Storage keeps scheduled items as ordinary
 * expense rows dated at their first occurrence, so Spent filters to rows dated
 * on or before the end of today before it groups anything. Without that filter
 * a rent bill authored today for the 1st would appear as a spend the user
 * never made.
 *
 * Habits (ADR 0019 DI-8) builds the identical LeakRowData[] Insights builds
 * for "Your leaks" and wires the identical pick-one sheet + free-tier gate.
 * The two tabs deliberately show the same rows: Money is where you manage a
 * leak, Insights is where you notice it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AddUpcomingSheet } from '@/components/money/AddUpcomingSheet';
import { ExpenseSheet } from '@/components/money/ExpenseSheet';
import { HabitsList } from '@/components/money/HabitsList';
import { useEmptyStateAction } from '@/components/onboarding/useEmptyStateAction';
import { SpentList } from '@/components/money/SpentList';
import { UpcomingList } from '@/components/money/UpcomingList';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import type { LeakRowData } from '@/components/habit-logging/HabitLeakRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { habitLeakGlyph } from '@/constants/onboardingPresets';
import { strings } from '@/constants/strings';
import { layout, type AppTheme } from '@/constants/theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { DetectedHabit } from '@/types/habit';
import type { Expense } from '@/types/expense';
import { groupExpensesByDate } from '@/data/expensesMock';
import { isHabitLimitReached } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import { computeUpcoming, type UpcomingItem } from '@/utils/recurring';
import { getUpcomingWindowDays, setUpcomingWindowDays } from '@/utils/storage';
import { DEFAULT_UPCOMING_WINDOW_DAYS, type UpcomingWindowDays } from '@/utils/upcomingWindow';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type MoneyView = 'spent' | 'upcoming' | 'habits';

/**
 * Upcoming advances past a due-today occurrence (ADR 0024, U11): by the time
 * this screen renders, the materializer (contexts/ExpensesContext.tsx) has
 * already turned any occurrence due today into a real Spent row, so showing
 * it again here would resurrect the pre-ADR-0024 "same row in both tabs" bug.
 *
 * `computeUpcoming` itself stays untouched (it's pure and its own tests pin
 * "on/after from" -- this is a display-only adjustment, not a projection
 * change): an item whose earliest occurrence is today gets re-pointed at its
 * next occurrence already present in `occurrencesInWindow` (nothing here
 * re-projects anything), or dropped if today's was its only occurrence in the
 * window. `nextDate`/`daysUntil` stay relative to real "today" throughout, so
 * the "Tomorrow" / "in N days" pill keeps meaning what it says. Re-pointing
 * also trims `occurrencesInWindow` down to future dates only, which is the
 * same list #95's payments count sums over -- so "how many payments" now
 * counts only future ones for free, without touching upcomingWindowTotal/
 * upcomingWindowPaymentsCount themselves.
 */
function advancePastToday(items: UpcomingItem[], todayMid: number): UpcomingItem[] {
  const out: UpcomingItem[] = [];
  for (const item of items) {
    if (item.nextDate.getTime() > todayMid) {
      out.push(item);
      continue;
    }
    const future = item.occurrencesInWindow.filter((d) => d.getTime() > todayMid);
    if (future.length === 0) continue; // today's due date was the only one in the window
    const nextDate = future[0];
    const daysUntil = Math.round((nextDate.getTime() - todayMid) / MS_PER_DAY);
    out.push({ ...item, nextDate, daysUntil, occurrencesInWindow: future });
  }
  return out;
}

export default function MoneyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { expenses } = useExpenses();
  const { categories } = useCategories();
  const {
    getDiscoveredHabits,
    getActiveHabits,
    getHabitById,
    startBreakingHabit,
  } = useHabits();

  const [view, setView] = useState<MoneyView>('spent');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [addUpcomingVisible, setAddUpcomingVisible] = useState(false);
  const [editingUpcoming, setEditingUpcoming] = useState<Expense | null>(null);
  const [pickOneHabitId, setPickOneHabitId] = useState<string | null>(null);
  // The 2 weeks / 1 month / 3 months window (U8). Starts at the default and is
  // replaced by the persisted value once storage answers, so the very first
  // paint (before that async read resolves) already shows a real preset
  // rather than a placeholder state.
  const [windowDays, setWindowDays] = useState<UpcomingWindowDays>(DEFAULT_UPCOMING_WINDOW_DAYS);

  useEffect(() => {
    let cancelled = false;
    getUpcomingWindowDays().then((days) => {
      if (!cancelled) setWindowDays(days);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleWindowDaysChange = useCallback((days: UpcomingWindowDays) => {
    setWindowDays(days);
    void setUpcomingWindowDays(days);
  }, []);

  // Spent is history only: everything dated after the end of today belongs to
  // Upcoming, where the projection engine owns it.
  const sections = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return groupExpensesByDate(
      expenses.filter((e) => e.date.getTime() <= endOfToday.getTime())
    );
  }, [expenses]);

  const upcoming = useMemo(() => {
    const todayMid = new Date();
    todayMid.setHours(0, 0, 0, 0);
    return advancePastToday(computeUpcoming(expenses, windowDays), todayMid.getTime());
  }, [expenses, windowDays]);

  const upcomingSheetVisible = addUpcomingVisible || editingUpcoming !== null;

  // Empty states as onboarding surfaces (PRD v3.1 sect 5). Logging and
  // breaking both live on Today, so those two route through the general-purpose
  // ?sheet= entry rather than mounting a second copy of either sheet here.
  // Adding an upcoming expense is owned by this screen, so it opens in place.
  const handleEmptyLog = useEmptyStateAction('money_spent', useCallback(() => {
    router.push('/(tabs)?view=spent&sheet=log');
  }, [router]));
  const handleEmptyAddUpcoming = useEmptyStateAction('money_upcoming', useCallback(() => {
    setAddUpcomingVisible(true);
  }, []));
  const handleEmptyBreak = useEmptyStateAction('money_habits', useCallback(() => {
    router.push('/(tabs)?view=kept&sheet=break');
  }, [router]));

  const closeUpcomingSheet = useCallback(() => {
    setAddUpcomingVisible(false);
    setEditingUpcoming(null);
  }, []);

  // Habits: every leak worth an action, biggest monthly drain first. Built
  // identically to Insights' leakRows (app/(tabs)/insights.tsx) so the two
  // tabs never disagree about what a leak is worth.
  const habitRows: LeakRowData[] = useMemo(() => {
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

  const managedMonthlyTotal = useMemo(
    () => getActiveHabits().reduce((sum, habit) => sum + habit.totalMonthlySpend, 0),
    [getActiveHabits]
  );

  // Entitlement touchpoint (ADR 0007, BET-004): the pick-one sheet blocks Start
  // once the active-habit count reaches the entitlement ceiling. Same gate
  // Insights wires for the identical sheet.
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

  const segments = useMemo(
    () =>
      [
        { value: 'spent' as const, label: strings.money.segmentSpent },
        { value: 'upcoming' as const, label: strings.money.segmentUpcoming },
        { value: 'habits' as const, label: strings.money.segmentHabits },
      ] as const,
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={strings.screenTitles.money}
        actions={[
          { icon: 'CircleUser', label: strings.profile.headerLabel, onPress: () => router.push('/profile') },
        ]}
      />
      <View style={styles.segments}>
        <SegmentedControl<MoneyView>
          options={segments}
          value={view}
          onChange={setView}
          accessibilityLabel={strings.money.segmentLabel}
        />
      </View>

      {/*
        UX-016: Spent renders as its own SectionList (components/money/
        SpentList.tsx) rather than nesting inside this ScrollView, since a
        SectionList already owns its own scrolling and virtualizes -- nesting
        it inside another scroll container would fight that (and re-render/
        mount every row anyway, defeating the point). Upcoming and Habits
        (both bounded lists, ~15 items or fewer) keep the plain ScrollView.
      */}
      {view === 'spent' ? (
        <SpentList sections={sections} onEditExpense={setEditing} onLogExpense={handleEmptyLog} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {view === 'upcoming' && (
            <UpcomingList
              items={upcoming}
              windowDays={windowDays}
              onWindowDaysChange={handleWindowDaysChange}
              onAdd={() => setAddUpcomingVisible(true)}
              onEmptyAdd={handleEmptyAddUpcoming}
              onEditItem={(expense) => setEditingUpcoming(expense)}
            />
          )}
          {view === 'habits' && (
            <HabitsList
              rows={habitRows}
              managedMonthlyTotal={managedMonthlyTotal}
              onBreak={(habit) => setPickOneHabitId(habit.id)}
              onOpenHabit={(habitId) => router.push(`/habit/${habitId}`)}
              onBreakHabit={handleEmptyBreak}
            />
          )}
        </ScrollView>
      )}

      <ExpenseSheet
        mode="edit"
        visible={editing !== null}
        expense={editing}
        onClose={() => setEditing(null)}
      />
      <AddUpcomingSheet
        mode={editingUpcoming ? 'edit' : 'add'}
        visible={upcomingSheetVisible}
        expense={editingUpcoming}
        onClose={closeUpcomingSheet}
      />
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
          router.push('/paywall?placement=habit_gate_money');
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
    // ScreenHeader already ends in a 4pt paddingBottom, so an 8pt top margin
    // here reproduces the 12pt gap the old single header block had between
    // the title and the segmented control.
    segments: {
      paddingHorizontal: 20,
      marginTop: 8,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: layout.screenBottomClearance,
    },
  });
}
