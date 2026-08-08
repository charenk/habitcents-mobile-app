import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { KeptHero } from '@/components/habit-logging/KeptHero';
import { LeakCard } from '@/components/habit-logging/LeakCard';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { PartialSlipSheet } from '@/components/habit-logging/PartialSlipSheet';
import { CoachMomentSlot } from '@/components/habit-logging/CoachMomentSlot';
import { SpentKeptChips, type SpentKeptView } from '@/components/habit-logging/SpentKeptChips';
import { LogExpenseSheet } from '@/components/money/LogExpenseSheet';
import { EditExpenseSheet } from '@/components/money/EditExpenseSheet';
import { QuickLogRow } from '@/components/money/QuickLogRow';
import { LoggedTodayList } from '@/components/money/LoggedTodayList';
import { useCategories } from '@/contexts/CategoriesContext';
import type { Expense, ExpenseCategory } from '@/types/expense';
import { atMidnight, dayStateFor, isHabitLimitReached, keptOnDay } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import { cardText, type CoachMomentCardId } from '@/utils/coachMoments';
import { progressTowardDetection } from '@/utils/habitDetection';
import { formatDate } from '@/utils/dates';
import { track } from '@/utils/analytics';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';
import { strings } from '@/constants/strings';

type BreakingItem = { habit: DetectedHabit; goal: HabitChangeGoal };

type HabitSection = {
  title: string;
  type: 'leaks' | 'breaking';
  data: (DetectedHabit | BreakingItem)[];
};

/**
 * Today (redesign U5, ADR 0019, DI-5). Two in-page views, Spent (default) and
 * Kept, controlled by the SpentKeptChips value chips: the chips ARE the tab
 * control, there is no separate SegmentedControl. Spent holds the quick-log
 * card and today's logged expenses; Kept holds the all-time KeptHero band plus
 * the same Leaks found / Breaking now content this screen always carried.
 * Leaks live in Kept only; the quick-log category tiles are dropped (the log
 * sheet's own picker covers category choice).
 */
export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const [pickOneHabitId, setPickOneHabitId] = useState<string | null>(null);
  const [partialGoalId, setPartialGoalId] = useState<string | null>(null);
  const [todayView, setTodayView] = useState<SpentKeptView>('spent');
  // DT-1 (P2-2): resolved once, attached to whichever leak is first in the
  // list at that moment, so the card only ever renders on one LeakCard.
  const [detectionMoment, setDetectionMoment] = useState<{ habitId: string; cardId: CoachMomentCardId } | null>(null);
  // FL-1 (P2-2): resolved once, shown on the empty state (see below).
  const [firstLogCardId, setFirstLogCardId] = useState<CoachMomentCardId | null>(null);

  const {
    goals,
    isLoading,
    refreshHabits,
    dismissHabit,
    startBreakingHabit,
    answerToday,
    answerEvent,
    changeTodayAnswer,
    backfillYesterday,
    savePartialSlip,
    getActiveHabits,
    getDiscoveredHabits,
    getGoalByHabitId,
    getHabitById,
    lastMilestone,
    clearLastMilestone,
    lastCoachMoment,
    clearLastCoachMoment,
    maybeShowDetectionMoment,
    maybeShowFirstLogMoment,
  } = useHabits();

  const { expenses } = useExpenses();
  const { getVisibleCategories } = useCategories();

  // Quick log and the logged-today list (spec 04 "Today" 3 and 4).
  const [logCategory, setLogCategory] = useState<ExpenseCategory | undefined>(undefined);
  const [logVisible, setLogVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Five tiles plus a "more" affordance, per spec. Unused while showCategoryTiles
  // stays false on QuickLogRow, kept computed so a one-line flip reactivates it.
  const quickCategories = useMemo(() => getVisibleCategories().slice(0, 5), [getVisibleCategories]);

  const loggedToday = useMemo(() => {
    const start = atMidnight(new Date()).getTime();
    return expenses
      .filter((e) => atMidnight(e.date).getTime() === start)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [expenses]);

  // Spent chip (spec 04 "Today"): today's spend-class rows only. Transfers and
  // income never inflate the spent figure, so a non-spend class is excluded
  // rather than netted in.
  const spentTodayCents = useMemo(
    () =>
      loggedToday
        .filter((e) => (e.class ?? 'spend') === 'spend')
        .reduce((sum, e) => sum + e.amount, 0),
    [loggedToday]
  );

  const openLogSheet = useCallback((category?: ExpenseCategory) => {
    setLogCategory(category);
    setLogVisible(true);
  }, []);

  // Eyebrow date line, locale-aware (ADA-008): "Thursday, July 24".
  // ScreenHeader uppercases it, so this stays sentence case.
  const todayLabel = useMemo(
    () => formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }),
    []
  );

  // Deep link support: an onboarding flow can land Today on a specific view
  // via ?view=kept|spent. Anything else (missing, malformed) is ignored and
  // the default (Spent) stands.
  const params = useLocalSearchParams<{ view?: string }>();
  useEffect(() => {
    if (params.view === 'kept' || params.view === 'spent') {
      setTodayView(params.view);
    }
  }, [params.view]);

  const handleTodayViewChange = useCallback((view: SpentKeptView) => {
    setTodayView(view);
    track('today_view_switched', { to: view, method: 'tap' });
  }, []);

  // Coach Moment (P2-2, acceptance test 2): clear on blur (tab switch away)
  // so returning to an already-answered card does not re-show the same card.
  // lastMilestone has the identical lifecycle gap (state-lifecycle bug fixed
  // here alongside the Coach Moments fix it was originally applied for): clear
  // it the same way so a milestone tint doesn't persist across navigation.
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearLastCoachMoment();
        clearLastMilestone();
      };
    }, [clearLastCoachMoment, clearLastMilestone])
  );

  useEffect(() => {
    if (expenses.length > 0) {
      refreshHabits(expenses);
    }
  }, [expenses.length]);

  // FL-1 (P2-2, spec §3 "First log"): the first expense ever saved, surfaced
  // on the next Today visit. maybeShowFirstLogMoment() is idempotent
  // (null once already shown), so this is safe to re-run every time the
  // expense count changes.
  useEffect(() => {
    if (expenses.length === 0 || firstLogCardId) return;
    maybeShowFirstLogMoment().then((cardId) => {
      if (cardId) setFirstLogCardId(cardId);
    });
  }, [expenses.length, firstLogCardId, maybeShowFirstLogMoment]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHabits(expenses);
    setRefreshing(false);
  }, [refreshHabits, expenses]);

  const discoveredHabits = getDiscoveredHabits();
  const activeHabits = getActiveHabits();

  // DT-1 (P2-2, spec §3 "Detection"): the first time any leak is surfaced,
  // ever. maybeShowDetectionMoment() itself is idempotent (returns null once
  // already shown), so this effect is safe to re-run on every discovered-list
  // change; it only ever attaches a card once, to the leak on top at the time.
  useEffect(() => {
    if (discoveredHabits.length === 0 || detectionMoment) return;
    const habitId = discoveredHabits[0].id;
    maybeShowDetectionMoment().then((cardId) => {
      if (cardId) setDetectionMoment({ habitId, cardId });
    });
  }, [discoveredHabits, detectionMoment, maybeShowDetectionMoment]);

  const breakingItems: BreakingItem[] = useMemo(() => {
    return activeHabits
      .map((habit) => {
        const goal = getGoalByHabitId(habit.id);
        return goal ? { habit, goal } : null;
      })
      .filter((x): x is BreakingItem => x !== null);
  }, [activeHabits, getGoalByHabitId]);

  // Kept chip (spec 04 "Today"): kept TODAY across every goal, distinct from
  // the all-time total the KeptHero band still shows inside the Kept view.
  const keptTodayCents = useMemo(() => {
    const today = new Date();
    return goals.reduce((sum, g) => sum + keptOnDay(g, today), 0);
  }, [goals]);

  // The Kept chip's pending dot (spec: "renders a quiet dot on the Kept chip"):
  // true while any daily-cadence habit's check-in question is unanswered
  // today, the same test sortedBreakingItems below uses to rank an unanswered
  // card first.
  const checkInPending = useMemo(() => {
    const today = atMidnight(new Date());
    return breakingItems.some(
      ({ habit, goal }) => habit.frequency === 'daily' && dayStateFor(goal.dayLogs, today) === 'no-log'
    );
  }, [breakingItems]);

  // Stacking (spec §4.2): unanswered daily first, then weekly/monthly, then
  // answered-today cards.
  const sortedBreakingItems = useMemo(() => {
    const today = atMidnight(new Date());
    const rank = (item: BreakingItem): number => {
      const isDaily = item.habit.frequency === 'daily';
      if (isDaily) {
        const answered = dayStateFor(item.goal.dayLogs, today) !== 'no-log';
        return answered ? 2 : 0;
      }
      return 1;
    };
    return [...breakingItems].sort((a, b) => rank(a) - rank(b));
  }, [breakingItems]);

  const sections: HabitSection[] = useMemo(() => {
    const result: HabitSection[] = [];

    if (discoveredHabits.length > 0) {
      result.push({
        title: strings.habitLogging.leaksFoundSection,
        type: 'leaks',
        data: discoveredHabits,
      });
    }

    if (sortedBreakingItems.length > 0) {
      result.push({
        title: strings.habitLogging.breakingNowSection,
        type: 'breaking',
        data: sortedBreakingItems,
      });
    }

    return result;
  }, [discoveredHabits, sortedBreakingItems]);

  const handleDismissHabit = useCallback(async (habit: DetectedHabit) => {
    await dismissHabit(habit.id);
  }, [dismissHabit]);

  const handleHabitPress = useCallback((habitId: string) => {
    router.push(`/habit/${habitId}`);
  }, [router]);

  const pickOneHabit = pickOneHabitId ? getHabitById(pickOneHabitId) : null;
  // Entitlement touchpoint (ADR 0007, BET-004): blocked once the active-habit
  // count reaches the current entitlement's ceiling (free = 1, premium = 5).
  const freeTierBlocked = isHabitLimitReached(activeHabits.length, getEntitlement());

  // Break-another affordance (DI-6, ADR 0019): same gate freeTierBlocked
  // already drives on PickOneSheet's "start" path, reused here so a second
  // press-through leads to the identical outcome. Under the limit it reuses
  // the exact re-audit target the empty state's link already routes to.
  const handleBreakAnother = useCallback(() => {
    if (freeTierBlocked) {
      router.push('/paywall?placement=habit_gate');
    } else {
      router.push('/onboarding/welcome');
    }
  }, [freeTierBlocked, router]);

  const handleStart = useCallback(async (skipValue: number, valueEdited: boolean) => {
    if (!pickOneHabitId) return;
    await startBreakingHabit(pickOneHabitId, skipValue, valueEdited, 'detection');
    setPickOneHabitId(null);
  }, [pickOneHabitId, startBreakingHabit]);

  const partialGoal = partialGoalId ? goals.find((g) => g.id === partialGoalId) ?? null : null;

  const totalKept = goals.reduce((sum, g) => sum + (g.kept || 0), 0);

  const isEmpty = sections.length === 0;
  // Pre-detection progress state (spec 05 section 5.2): once logging has
  // started but no leak has been detected yet, the empty state shows real
  // progress toward the same threshold detectHabits() uses, never a fake
  // habit card.
  const detectionProgress = useMemo(
    () => (isEmpty && expenses.length > 0 ? progressTowardDetection(expenses) : null),
    [isEmpty, expenses]
  );

  // Persistent break-another affordance (DI-6, ADR 0019): a dashed card like
  // UpcomingList's add-upcoming row (components/money/UpcomingList.tsx),
  // chosen over the quieter reAuditLink text style for the same discoverability
  // reason the money tab already leans on it. Rendered once, reused at the
  // bottom of both the populated (SectionList footer) and empty Kept content.
  const breakAnotherAffordance = (
    <TouchableOpacity
      style={styles.breakAnother}
      onPress={handleBreakAnother}
      accessibilityRole="button"
      accessibilityLabel={`${strings.today.breakAnotherHabitCta}, ${strings.habitLogging.freeTierNote}`}
      activeOpacity={0.7}
    >
      <Icon name="Plus" size={18} color={theme.primaryDark} />
      <View style={styles.breakAnotherText}>
        <Text style={styles.breakAnotherLabel}>{strings.today.breakAnotherHabitCta}</Text>
        <Text style={styles.breakAnotherCaption}>{strings.habitLogging.freeTierNote}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item, section }: { item: DetectedHabit | BreakingItem; section: HabitSection }) => {
    if (section.type === 'leaks') {
      const habit = item as DetectedHabit;
      return (
        <LeakCard
          habit={habit}
          // A stopped habit keeps its goal, so an existing goal on a leak means
          // the user broke this one before and is being offered it again.
          breakAgain={!!getGoalByHabitId(habit.id)}
          onBreak={() => setPickOneHabitId(habit.id)}
          onDismiss={() => handleDismissHabit(habit)}
          coachMomentCardId={detectionMoment?.habitId === habit.id ? detectionMoment.cardId : null}
        />
      );
    }

    if (section.type === 'breaking') {
      const { habit, goal } = item as BreakingItem;
      const milestoneJustHit = lastMilestone?.goalId === goal.id ? lastMilestone.threshold : null;
      return (
        <CheckInCard
          habit={habit}
          goal={goal}
          milestoneJustHit={milestoneJustHit}
          coachMoment={lastCoachMoment}
          onSkip={() => (habit.frequency === 'daily' ? answerToday(goal.id, 'skipped') : answerEvent(goal.id, 'skipped'))}
          onSlip={() => (habit.frequency === 'daily' ? answerToday(goal.id, 'slipped') : answerEvent(goal.id, 'slipped'))}
          onChangeAnswer={() => changeTodayAnswer(goal.id)}
          onBackfill={(state) => backfillYesterday(goal.id, state)}
          onOpenPartial={() => setPartialGoalId(goal.id)}
          onOpenDetail={() => handleHabitPress(habit.id)}
        />
      );
    }

    return null;
  };

  const renderSectionHeader = ({ section }: { section: HabitSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={strings.screenTitles.today}
        eyebrow={todayLabel}
        actions={[
          { icon: 'CircleUser', label: strings.profile.headerLabel, onPress: () => router.push('/profile') },
        ]}
      />

      <View style={styles.chipsRow}>
        <SpentKeptChips
          spentCents={spentTodayCents}
          keptCents={keptTodayCents}
          value={todayView}
          onChange={handleTodayViewChange}
          checkInPending={checkInPending}
        />
      </View>

      {todayView === 'spent' ? (
        <ScrollView
          style={styles.spentScroll}
          contentContainerStyle={styles.spentScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
        >
          <QuickLogRow onOpenSheet={openLogSheet} categories={quickCategories} />
          <View style={styles.loggedTodaySpacer}>
            <LoggedTodayList expenses={loggedToday} onEditExpense={setEditingExpense} />
          </View>
        </ScrollView>
      ) : (
        <>
          {/* DI-6 gutter fix: the band renders full-bleed by default (see
              onboarding success, which supplies its own padded container
              instead); Today has no such wrapper, so it passes the same 20pt
              horizontal gutter the chips row and both list content styles use. */}
          <KeptHero cents={totalKept} style={styles.keptHeroGutter} />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{strings.habits.loading}</Text>
            </View>
          ) : isEmpty ? (
            <ScrollView
              contentContainerStyle={styles.emptyContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
              }
            >
              {detectionProgress ? (
                <View style={styles.progressCard}>
                  <Text style={styles.progressTitle}>{strings.habits.spottingYourLeak}</Text>
                  <View style={styles.progressMeterTrack}>
                    <View
                      style={[
                        styles.progressMeterFill,
                        { width: `${(detectionProgress.n / detectionProgress.threshold) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressCount}>
                    {strings.habits.logsAtSamePlace(detectionProgress.n, detectionProgress.threshold)}
                    <Text style={styles.progressCountSuffix}> at the same place</Text>
                  </Text>
                  <Text style={styles.progressBody}>{strings.habits.logsAtSamePlaceBody}</Text>
                </View>
              ) : (
                <>
                  <Icon
                    name="ChartLine"
                    size={64}
                    color={theme.textTertiary}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                  <Text style={styles.emptyTitle}>{strings.habitLogging.emptyLeaksTitle}</Text>
                  <Text style={styles.emptySubtitle}>{strings.habitLogging.emptyLeaksSubtitle}</Text>
                </>
              )}
              <TouchableOpacity
                style={styles.emptyCta}
                // The quick-log card now lives on the Spent view, not the Money
                // tab, so the CTA switches views in place rather than navigating
                // away (was router.push('/(tabs)/money')).
                onPress={() => setTodayView('spent')}
                accessibilityRole="button"
              >
                <Text style={styles.emptyCtaText}>{strings.habitLogging.logAnExpense}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reAuditLink}
                onPress={() => router.push('/onboarding/welcome')}
                accessibilityRole="button"
              >
                <Text style={styles.reAuditLinkText}>{strings.onboarding.reAuditLink}</Text>
              </TouchableOpacity>
              {firstLogCardId && (
                <View style={styles.emptyCoachMoment}>
                  <CoachMomentSlot text={cardText(firstLogCardId)} />
                </View>
              )}
              <View style={styles.breakAnotherWrap}>{breakAnotherAffordance}</View>
            </ScrollView>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item, index) => {
                if ('habit' in item) return item.habit.id;
                return 'id' in item ? item.id : `item-${index}`;
              }}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              ListFooterComponent={<View style={styles.breakAnotherWrap}>{breakAnotherAffordance}</View>}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
              }
            />
          )}
        </>
      )}

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

      <PartialSlipSheet
        visible={!!partialGoal}
        skipValue={partialGoal?.skipValue ?? 0}
        onCancel={() => setPartialGoalId(null)}
        onSave={async (amount) => {
          if (partialGoalId) await savePartialSlip(partialGoalId, amount);
          setPartialGoalId(null);
        }}
      />

      <LogExpenseSheet
        visible={logVisible}
        initialCategory={logCategory}
        onClose={() => setLogVisible(false)}
      />

      <EditExpenseSheet
        visible={editingExpense !== null}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
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
    chipsRow: {
      marginTop: 8,
      marginBottom: 4,
    },
    // DI-6: shares the 20pt gutter the chips row and both list content styles
    // use below, so the band no longer renders full-bleed on Today.
    keptHeroGutter: {
      marginHorizontal: 20,
    },
    spentScroll: {
      flex: 1,
    },
    spentScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 100,
    },
    loggedTodaySpacer: {
      marginTop: 20,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    sectionHeader: {
      marginTop: 20,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    // Section headers are eyebrows like every other one on this screen; the
    // uppercasing lives here so strings.ts keeps storing sentence case.
    sectionTitle: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.mist,
      textTransform: 'uppercase',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
    },
    // Scrolls rather than centering in a fixed height: on shorter screens the
    // content would otherwise overlap the kept band above it.
    emptyContainer: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 100,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.text,
      marginTop: 20,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 15,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 22,
    },
    emptyCta: {
      marginTop: 20,
      minHeight: 46,
      paddingHorizontal: 20,
      borderRadius: radii.control,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCtaText: {
      fontSize: 15,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.white,
    },
    emptyCoachMoment: {
      alignSelf: 'stretch',
      marginTop: 24,
    },
    reAuditLink: {
      marginTop: 14,
      minHeight: 44,
      justifyContent: 'center',
    },
    reAuditLinkText: {
      fontSize: 14,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.textSecondary,
    },
    // Break-another affordance (DI-6, ADR 0019): a dashed card mirroring
    // UpcomingList's add-upcoming row (components/money/UpcomingList.tsx
    // `add`/`addLabel`), picked over the quieter reAuditLink text treatment
    // for the same discoverability reason the money tab leans on it. Two
    // lines (label + caption) rather than UpcomingList's single centered
    // line, so it is left-aligned with the icon instead of centered.
    breakAnother: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      borderRadius: radii.card,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.cloudDashed,
      backgroundColor: theme.white,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    breakAnotherText: {
      flex: 1,
    },
    breakAnotherLabel: {
      fontSize: 14,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.primaryDark,
    },
    breakAnotherCaption: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      marginTop: 2,
    },
    // Wraps the affordance wherever it is placed (empty ScrollView content or
    // the populated SectionList's footer): alignSelf stretch matters in the
    // empty case, whose ScrollView centers its content (styles.emptyContainer,
    // alignItems: 'center'); the cards above never carry their own bottom
    // margin, so both spots need the same explicit top spacing too.
    breakAnotherWrap: {
      alignSelf: 'stretch',
      marginTop: 24,
    },
    progressCard: {
      alignSelf: 'stretch',
      backgroundColor: theme.surface,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      alignItems: 'flex-start',
    },
    progressTitle: {
      fontSize: 17,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.text,
    },
    progressMeterTrack: {
      alignSelf: 'stretch',
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.border,
      marginTop: 14,
      overflow: 'hidden',
    },
    progressMeterFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    progressCount: {
      fontSize: 15,
      fontFamily: theme.fonts.uiBold,
      color: theme.text,
      marginTop: 12,
    },
    progressCountSuffix: {
      fontSize: 15,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
    },
    progressBody: {
      fontSize: 14,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      marginTop: 6,
      lineHeight: 20,
    },
  });
}
