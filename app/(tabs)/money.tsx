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
import { BreakHabitSheet, type BreakHabitStartData } from '@/components/onboarding/BreakHabitSheet';
import { useBreakHabitStart } from '@/utils/useBreakHabitStart';
import { HabitsList } from '@/components/money/HabitsList';
import { useEmptyStateAction } from '@/components/onboarding/useEmptyStateAction';
import { SpentList } from '@/components/money/SpentList';
import { UpcomingList } from '@/components/money/UpcomingList';
import { useToast } from '@/components/ui/Toast';
import { dropPaidMonths } from '@/utils/upcomingGroups';
import { hapticError, hapticSuccess } from '@/utils/motion';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import type { LeakRowData } from '@/components/habit-logging/HabitLeakRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { habitLeakGlyph } from '@/constants/onboardingPresets';
import { strings } from '@/constants/strings';
import { layout, spacing, type AppTheme } from '@/constants/theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { DetectedHabit } from '@/types/habit';
import type { Expense } from '@/types/expense';
import { groupExpensesByDate } from '@/data/expensesMock';
import { isHabitLimitReached } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import { advancePastToday, computeUpcoming, resolveRule } from '@/utils/recurring';
import { getStoredUpcomingWindowDays, setUpcomingWindowDays } from '@/utils/storage';
import {
  DEFAULT_UPCOMING_WINDOW_DAYS,
  pickDefaultUpcomingWindow,
  type UpcomingWindowDays,
} from '@/utils/upcomingWindow';
import { track } from '@/utils/analytics';
import { useSegmentPager } from '@/utils/useSegmentPager';


type MoneyView = 'spent' | 'upcoming' | 'habits';

/** Pane order, left to right. Matches the segmented control above them, and
 *  module-level so the pager's handlers keep a stable identity across renders. */
const MONEY_VIEWS = ['spent', 'upcoming', 'habits'] as const satisfies readonly MoneyView[];

export default function MoneyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { expenses, isLoading: expensesLoading, addExpense } = useExpenses();
  const { show } = useToast();
  const { categories } = useCategories();
  const {
    getDiscoveredHabits,
    getActiveHabits,
    getHabitById,
    startBreakingHabit,
  } = useHabits();

  const [view, setView] = useState<MoneyView>('spent');
  // The segments double as pager pages: tap one or swipe to it. See
  // utils/useSegmentPager.ts for why this stays a plain paging ScrollView.
  const { markInteracted, pagerProps, paneProps } = useSegmentPager<MoneyView>({
    values: MONEY_VIEWS,
    value: view,
    onSwipe: useCallback((landed: MoneyView) => {
      setView(landed);
      track('money_view_switched', { to: landed, method: 'swipe' });
    }, []),
  });

  const handleViewChange = useCallback(
    (next: MoneyView) => {
      markInteracted();
      setView(next);
      track('money_view_switched', { to: next, method: 'tap' });
    },
    [markInteracted]
  );
  const [editing, setEditing] = useState<Expense | null>(null);
  const [logVisible, setLogVisible] = useState(false);
  const [breakVisible, setBreakVisible] = useState(false);
  const [addUpcomingVisible, setAddUpcomingVisible] = useState(false);
  const [editingUpcoming, setEditingUpcoming] = useState<Expense | null>(null);
  const [pickOneHabitId, setPickOneHabitId] = useState<string | null>(null);
  // The 2 weeks / 1 month / 3 months window (U8), as an explicit choice and a
  // derived default rather than one piece of state that means both.
  //
  // The user's own pick, from storage on mount or from a tap, always wins.
  // While there has never been one, the window is DERIVED from the data: the
  // narrowest preset that actually has a bill in it. A 14-day fixed default
  // opened on the window-empty state roughly half the time, because monthly
  // bills land once a month.
  //
  // Declarative rather than two setStates racing: `chosenWindow ?? autoWindow`
  // means a real choice short-circuits the derivation, and `autoWindow` is not
  // even computed while one exists.
  const [chosenWindow, setChosenWindow] = useState<UpcomingWindowDays | null>(null);
  const [windowLoaded, setWindowLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStoredUpcomingWindowDays().then((days) => {
      if (cancelled) return;
      if (days !== null) setChosenWindow(days);
      setWindowLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const autoWindow = useMemo(
    () => (chosenWindow !== null ? null : pickDefaultUpcomingWindow(expenses)),
    [chosenWindow, expenses]
  );

  const windowDays = chosenWindow ?? autoWindow ?? DEFAULT_UPCOMING_WINDOW_DAYS;

  // Both async sources have to land before the pane can paint a window, or the
  // user watches it snap: auto first and then the stored pick a tick later, or
  // the fallback first and then the real answer when the expenses hydrate. The
  // pane mounts off-screen (the pager starts on Spent), so in practice nobody
  // sees the hold.
  const upcomingReady = windowLoaded && !expensesLoading;

  const handleWindowDaysChange = useCallback((days: UpcomingWindowDays) => {
    // Re-pressing the selected segment still lands here, and that is correct:
    // an explicit tap, even a no-op one, is the user claiming the window. From
    // then on it is theirs and the derivation never runs again.
    setChosenWindow(days);
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
    return dropPaidMonths(
      advancePastToday(computeUpcoming(expenses, windowDays), todayMid.getTime()),
      expenses
    );
  }, [expenses, windowDays]);

  // True zero-data for Upcoming (PRD v3.1 sect 5): whether ANY expense
  // resolves to a recurrence rule at all, independent of the current window.
  const hasAnyRecurring = useMemo(
    () => expenses.some((e) => resolveRule(e) !== null),
    [expenses]
  );

  const upcomingSheetVisible = addUpcomingVisible || editingUpcoming !== null;

  const { start: breakStart } = useBreakHabitStart();

  // Empty states as onboarding surfaces (PRD v3.1 sect 5).
  //
  // LOGGING OPENS HERE (Charen, 2026-09-10). It used to navigate to Today with
  // ?view=spent&sheet=log, which threw the user off the screen they were
  // reading to reach a sheet that behaves identically anywhere: ExpenseSheet
  // owns addExpense, the haptic, the toast and its own close, and Today's log
  // mount adds nothing to it outside the Door 1 first run. The old comment
  // here said logging "lives on Today", but this screen already mounts
  // ExpenseSheet for edit, so a log mount is a prop, not a second copy. Saving
  // in place keeps the segment, the scroll position and the list the user came
  // for; every other surface still updates, because the write goes through
  // ExpensesContext exactly as before.
  //
  // Breaking a habit opens here too, since 2026-09-10; see its handler below.
  const handleEmptyLog = useEmptyStateAction('money_spent', useCallback(() => {
    setLogVisible(true);
  }, []));
  const handleEmptyAddUpcoming = useEmptyStateAction('money_upcoming', useCallback(() => {
    setAddUpcomingVisible(true);
  }, []));
  // BREAKING OPENS HERE TOO (Charen, 2026-09-10), completing the change
  // logging started. The writes behind Start moved to utils/useBreakHabitStart
  // so both hosts run one implementation; what stayed on Today is its door 3
  // onboarding claim, which only Today can ever be in (door3CoachActive is set
  // when Today opens the sheet via the onboarding beat, never here). So this
  // host needs no onboarding logic at all, which is what made the split safe.
  const handleEmptyBreak = useEmptyStateAction('money_habits', useCallback(() => {
    setBreakVisible(true);
  }, []));

  const handleBreakStart = useCallback(
    async (data: BreakHabitStartData) => {
      const ok = await breakStart(data);
      // A failed write keeps the sheet open, so the user can retry against the
      // toast the hook already showed rather than losing what they entered.
      if (ok) setBreakVisible(false);
    },
    [breakStart]
  );

  const handleBreakStartTrial = useCallback(() => {
    setBreakVisible(false);
    router.push('/paywall?placement=habit_gate_money');
  }, [router]);

  /**
   * The user asserting they paid an unknown-day bill. Writes exactly the row
   * the materializer would have written if it had known the day, dated TODAY,
   * because that is the day the user is telling us the money moved. ADR 0042
   * stops the materializer from guessing; this is the path that does not have
   * to (`utils/upcomingGroups.ts dropPaidMonths` then takes the month out of
   * Upcoming, mirroring the materializer's own idempotency rule).
   */
  const handleMarkPaid = useCallback(
    (bill: Expense) => {
      void addExpense({
        title: bill.title,
        amount: bill.amount,
        category: bill.category,
        categoryId: bill.categoryId,
        merchant: bill.merchant,
        emoji: bill.emoji,
        date: new Date(),
        isRecurring: false,
        reminderEnabled: false,
        source: 'recurring',
        parentId: bill.id,
        importId: bill.importId,
      }).then(
        () => {
          hapticSuccess();
          show(strings.money.upcomingMarkedPaid);
        },
        (error: unknown) => {
          console.error('Error marking bill paid:', error);
          hapticError();
          show(strings.toasts.addUpcomingFailed);
        }
      );
    },
    [addExpense, show]
  );

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
          onChange={handleViewChange}
          accessibilityLabel={strings.money.segmentLabel}
        />
      </View>

      {/*
        The three segments are pages of one pager, so they can be swiped
        between as well as tapped (utils/useSegmentPager.ts, shared with Today
        and Insights). All three stay mounted, which is what lets each keep its
        own scroll position; paneProps hides the off-screen ones from
        assistive tech.

        UX-016 still holds, now per pane: Spent renders as its own SectionList
        (components/money/SpentList.tsx) rather than nesting inside a
        ScrollView, since a SectionList already owns its scrolling and
        virtualizes, and nesting it would fight that. Upcoming and Habits are
        bounded lists (~15 items or fewer), so each takes a plain ScrollView of
        its own. What changed is that these are now siblings in the pager
        rather than two branches of one conditional.
      */}
      <ScrollView {...pagerProps} style={styles.pager} testID="money-pager">
        <View {...paneProps('spent')} testID="money-pane-spent">
          <SpentList sections={sections} onEditExpense={setEditing} onLogExpense={handleEmptyLog} />
        </View>

        <View {...paneProps('upcoming')} testID="money-pane-upcoming">
          <ScrollView
            style={styles.scroll}
            // True zero only (window-empty keeps the total card and the
            // populated padding): the content grows to the pane so the zero
            // state centres, matching Spent and Habits.
            contentContainerStyle={[styles.scrollContent, !hasAnyRecurring ? styles.scrollContentEmpty : null]}
            showsVerticalScrollIndicator={false}
          >
            {upcomingReady ? (
              <UpcomingList
                items={upcoming}
                windowDays={windowDays}
                onWindowDaysChange={handleWindowDaysChange}
                onAdd={() => setAddUpcomingVisible(true)}
                onEmptyAdd={handleEmptyAddUpcoming}
                onEditItem={(expense) => setEditingUpcoming(expense)}
                onMarkPaid={handleMarkPaid}
                hasAnyRecurring={hasAnyRecurring}
              />
            ) : null}
          </ScrollView>
        </View>

        <View {...paneProps('habits')} testID="money-pane-habits">
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, habitRows.length === 0 ? styles.scrollContentEmpty : null]}
            showsVerticalScrollIndicator={false}
          >
            <HabitsList
              rows={habitRows}
              managedMonthlyTotal={managedMonthlyTotal}
              onBreak={(habit) => setPickOneHabitId(habit.id)}
              onOpenHabit={(habitId) => router.push(`/habit/${habitId}`)}
              onBreakHabit={handleEmptyBreak}
            />
          </ScrollView>
        </View>
      </ScrollView>

      <ExpenseSheet
        mode="log"
        visible={logVisible}
        onClose={() => setLogVisible(false)}
      />
      <BreakHabitSheet
        visible={breakVisible}
        freeTierBlocked={freeTierBlocked}
        onClose={() => setBreakVisible(false)}
        onStart={handleBreakStart}
        onStartTrial={handleBreakStartTrial}
      />
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
    pager: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      // Was a literal 14 (ADR 0039 moved it from 12 to match Insights and
      // Categories) while SpentList kept 12; one token now, see
      // layout.paneContentTop.
      paddingTop: layout.paneContentTop,
      paddingBottom: layout.screenBottomClearance,
    },
    // Zero states only: grow to the pane so EmptyState's fill wrapper has a
    // height to centre in, and trade the 100pt end clearance for 24, which
    // would otherwise pull the centre 50pt high. Populated lists keep the
    // clearance above.
    scrollContentEmpty: {
      flexGrow: 1,
      paddingBottom: spacing.xxl,
    },
  });
}
