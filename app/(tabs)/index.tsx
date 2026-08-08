import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { KeptHero } from '@/components/habit-logging/KeptHero';
import { LeakCard } from '@/components/habit-logging/LeakCard';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { PartialSlipSheet } from '@/components/habit-logging/PartialSlipSheet';
import { CoachMomentSlot } from '@/components/habit-logging/CoachMomentSlot';
import { SpentKeptChips, type SpentKeptView } from '@/components/habit-logging/SpentKeptChips';
import { LogExpenseSheet, type LogExpenseSavedInfo } from '@/components/money/LogExpenseSheet';
import { EditExpenseSheet } from '@/components/money/EditExpenseSheet';
import { QuickLogRow } from '@/components/money/QuickLogRow';
import { LoggedTodayList } from '@/components/money/LoggedTodayList';
import { FirstRunRibbon } from '@/components/onboarding/FirstRunRibbon';
import { useFirstRunRibbon } from '@/components/onboarding/useFirstRunRibbon';
import { useCategories } from '@/contexts/CategoriesContext';
import type { Expense, ExpenseCategory } from '@/types/expense';
import { atMidnight, dayStateFor, isHabitLimitReached, keptOnDay } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import { cardText, type CoachMomentCardId } from '@/utils/coachMoments';
import { progressTowardDetection } from '@/utils/habitDetection';
import { formatDate } from '@/utils/dates';
import { track } from '@/utils/analytics';
import { useReducedMotion } from '@/utils/motion';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';
import { strings } from '@/constants/strings';

type BreakingItem = { habit: DetectedHabit; goal: HabitChangeGoal };

type HabitSection = {
  title: string;
  type: 'leaks' | 'breaking';
  data: (DetectedHabit | BreakingItem)[];
};

// Door 1 real-app first run (W2, "the app is the onboarding"). The FirstRunRibbon
// storage record's `door` value for this flow; Door 3's unit picks its own.
const DOOR1_KEY = 'door1';

// FirstRunRibbon message keys -> copy. The hook only persists the key, so the
// mapping (and therefore the wording) lives here with the rest of Today's copy.
const FIRST_RUN_RIBBON_LINES: Record<string, string> = {
  door1_saved: strings.today.firstRunRibbonSaved,
  door1_gentle: strings.today.firstRunRibbonGentle,
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
  // DI-7 pager plumbing (ADR 0019): see the comment block at the pager
  // itself, below, for the no-new-drivers / drop-safety rationale.
  const pagerRef = useRef<ScrollView>(null);
  const [pagerReady, setPagerReady] = useState(false);
  const pagerLayoutDone = useRef(false);
  // False until the first tap or swipe; deep-link/init positioning stays
  // silent (no animation) regardless of the reduced-motion setting because
  // it never happens, it only reads the setting once a person has acted.
  const pagerInteracted = useRef(false);
  const { width: screenWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
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
    seedDiscoveredHabit,
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
  const { getVisibleCategories, getCategoryByName } = useCategories();
  const {
    isLoading: onboardingLoading,
    isOnboardingComplete,
    completeStep: completeOnboardingStep,
    skipStep: skipOnboardingStep,
    completeOnboarding,
  } = useOnboarding();

  // Quick log and the logged-today list (spec 04 "Today" 3 and 4).
  const [logCategory, setLogCategory] = useState<ExpenseCategory | undefined>(undefined);
  const [logVisible, setLogVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Door 1 real-app first run (W2). door1CoachActive gates the LogExpenseSheet's
  // coach caption and save/close wiring; it's true only between the auto-open
  // effect below and whichever of the two completion paths runs first.
  // firstLogSavedInfo is set only on a successful save, and drives the
  // watch-nudge (merchant-gated) under the just-logged row. The ref, not
  // state, guards exactly-once completion: handleFirstLogSaved and
  // handleLogSheetClose can both fire from the same LogExpenseSheet.onClose
  // call (save calls onSaved then onClose synchronously), and a ref reads
  // correctly mid-callback where a state update would not have committed yet.
  const [door1CoachActive, setDoor1CoachActive] = useState(false);
  const [firstLogSavedInfo, setFirstLogSavedInfo] = useState<LogExpenseSavedInfo | null>(null);
  const door1HandledRef = useRef(false);
  const {
    ribbonPending,
    messageKey: ribbonMessageKey,
    nudgeResolved,
    showRibbon,
    dismissRibbon,
    resolveNudge,
  } = useFirstRunRibbon(DOOR1_KEY);

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
  const params = useLocalSearchParams<{ view?: string; firstLog?: string }>();
  useEffect(() => {
    if (params.view === 'kept' || params.view === 'spent') {
      setTodayView(params.view);
    }
  }, [params.view]);

  // Door 1 real-app first run (W2): intent.tsx's track card lands here with
  // firstLog=1 instead of pushing the retired guided-log screen. Opens the
  // real LogExpenseSheet in place, once, the same openLogSheet every other
  // caller uses. Guarded on isOnboardingComplete() (not just the ref) so a
  // stale firstLog=1 in history (e.g. back-navigation) can never reopen the
  // coach flow once onboarding is actually done.
  useEffect(() => {
    if (onboardingLoading) return;
    if (params.firstLog !== '1') return;
    if (door1HandledRef.current) return;
    if (isOnboardingComplete()) return;
    setDoor1CoachActive(true);
    openLogSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingLoading, params.firstLog]);

  // First save while the Door 1 coach flow is active: fires the guided-log
  // analytics equivalent for funnel continuity, completes the same
  // completeStep/completeOnboarding bookkeeping the retired guided-log
  // screen used to (guarded, exactly once via the ref), and queues the
  // FirstRunRibbon's "saved" line. The watch-nudge below reads
  // firstLogSavedInfo directly, not the ribbon record.
  const handleFirstLogSaved = useCallback((info: LogExpenseSavedInfo) => {
    if (door1HandledRef.current) return;
    door1HandledRef.current = true;
    setDoor1CoachActive(false);
    setFirstLogSavedInfo(info);
    track('first_log_saved', { guided: true });
    void completeOnboardingStep('guided_log');
    void completeOnboarding();
    void showRibbon('door1_saved');
  }, [completeOnboardingStep, completeOnboarding, showRibbon]);

  // The sheet's own dismiss path (backdrop, swipe, or the Save handler
  // itself once it has already called onSaved above). Only acts when the
  // save path hasn't already claimed this open (the ref check), so closing
  // without saving still completes onboarding, just with the gentler line
  // (they are already in the app; nothing here should trap them).
  const handleLogSheetClose = useCallback(() => {
    setLogVisible(false);
    if (!door1CoachActive || door1HandledRef.current) return;
    door1HandledRef.current = true;
    setDoor1CoachActive(false);
    void skipOnboardingStep('guided_log');
    void completeOnboarding();
    void showRibbon('door1_gentle');
  }, [door1CoachActive, skipOnboardingStep, completeOnboarding, showRibbon]);

  // Watch-nudge accept ("Buy this often? Watch it as a leak"): seeds an
  // honestly-observed discovered habit from the one log that was just saved,
  // no stated cadence, hasReliableRate false (never a fabricated monthly
  // rate). Its job stops there; the leak surfaces in Kept's "Leaks found"
  // like any other discovered habit, nothing here deep-links to it.
  const handleAcceptWatchNudge = useCallback(async () => {
    if (!firstLogSavedInfo?.merchant) return;
    const categoryId =
      getCategoryByName(firstLogSavedInfo.category)?.id ?? getCategoryByName('Other')?.id ?? 'Other';
    await seedDiscoveredHabit({
      merchantPattern: firstLogSavedInfo.merchant,
      name: firstLogSavedInfo.merchant,
      description: '',
      categoryId,
      averageAmount: firstLogSavedInfo.amount,
      frequency: 'monthly',
      occurrencesPerPeriod: 1,
      totalMonthlySpend: firstLogSavedInfo.amount,
      observedOnly: true,
    });
    await resolveNudge();
  }, [firstLogSavedInfo, getCategoryByName, resolveNudge]);

  const handleDismissWatchNudge = useCallback(() => {
    void resolveNudge();
  }, [resolveNudge]);

  const watchNudgeVisible = !!firstLogSavedInfo?.merchant && !nudgeResolved;
  const ribbonLine = ribbonMessageKey ? FIRST_RUN_RIBBON_LINES[ribbonMessageKey] ?? null : null;

  const handleTodayViewChange = useCallback((view: SpentKeptView) => {
    pagerInteracted.current = true;
    setTodayView(view);
    track('today_view_switched', { to: view, method: 'tap' });
  }, []);

  // Chips stay the source of truth for the selected state; this only moves
  // the pager to match whatever todayView currently is. animated is false
  // for the very first positioning (deep link or default) because
  // pagerInteracted is still false at that point, true once a person has
  // tapped or swiped, unless reduced motion says otherwise.
  const scrollPagerTo = useCallback((view: SpentKeptView, animated: boolean) => {
    pagerRef.current?.scrollTo({ x: view === 'kept' ? screenWidth : 0, y: 0, animated });
  }, [screenWidth]);

  const handlePagerLayout = useCallback(() => {
    if (pagerLayoutDone.current) return;
    pagerLayoutDone.current = true;
    setPagerReady(true);
  }, []);

  useEffect(() => {
    if (!pagerReady) return;
    scrollPagerTo(todayView, pagerInteracted.current && !reducedMotion);
  }, [pagerReady, todayView, reducedMotion, scrollPagerTo]);

  // Swipe path: the pager has already physically landed on a page by the
  // time momentum ends, so this only reads where it landed and syncs
  // todayView + analytics to match. A landing that matches the current
  // todayView (e.g. momentum end firing for the same programmatic scroll a
  // chip tap just triggered) fires nothing, so a tap never double-counts.
  const handlePagerMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!screenWidth) return;
    const landedIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    const landedView: SpentKeptView = landedIndex >= 1 ? 'kept' : 'spent';
    pagerInteracted.current = true;
    if (landedView !== todayView) {
      setTodayView(landedView);
      track('today_view_switched', { to: landedView, method: 'swipe' });
    }
  }, [screenWidth, todayView]);

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

      {ribbonPending && ribbonLine ? (
        <View style={styles.ribbonWrap}>
          <FirstRunRibbon line={ribbonLine} onDismiss={dismissRibbon} />
        </View>
      ) : null}

      {/*
        DI-7 pager (ADR 0019): a plain horizontal ScrollView, pagingEnabled,
        native scrolling only. No react-native-gesture-handler, no
        Reanimated worklets, no mixed animation drivers (crash-history rule;
        see design/REDESIGN_RUNBOOK.md and the release-only-animation-crash
        lesson it captures). Both panes stay mounted so each keeps its own
        scroll position across switches; selection lives in the chips'
        accessibilityState and in which page the pager has scrolled to, not
        in which pane exists. Drop-safe: this unit only touches this pager,
        the handlers above (handleTodayViewChange, scrollPagerTo,
        handlePagerLayout, handlePagerMomentumEnd, the pagerReady sync
        effect) and the two callers that flip pagerInteracted. Reverting
        them restores the plain todayView ? <SpentPane/> : <KeptPane/>
        conditional with no other effect on the app.
      */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePagerMomentumEnd}
        onLayout={handlePagerLayout}
        scrollEventThrottle={16}
        style={styles.pager}
        testID="today-pager"
      >
        <View
          style={{ width: screenWidth }}
          // Both panes stay mounted for the pager, so the off-screen one must
          // be hidden from assistive tech or VoiceOver walks into content the
          // eye cannot see.
          accessibilityElementsHidden={todayView !== 'spent'}
          importantForAccessibility={todayView !== 'spent' ? 'no-hide-descendants' : 'auto'}
        >
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
              {watchNudgeVisible ? (
                // The watch-nudge (W2 item 3): UpcomingList's dashed-card
                // grammar (components/money/UpcomingList.tsx `add`), one-shot
                // for the door 1 first-run flow only, never a permanent Today
                // feature. Two tap targets in one dashed card: the label
                // accepts (seeds an honest discovered habit), "not now"
                // dismisses; both resolve the nudge permanently.
                <View style={styles.watchNudge}>
                  <TouchableOpacity
                    style={styles.watchNudgeAccept}
                    onPress={handleAcceptWatchNudge}
                    accessibilityRole="button"
                    accessibilityLabel={strings.today.watchLeakNudgeLabel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.watchNudgeLabel} numberOfLines={1}>
                      {strings.today.watchLeakNudgeLabel}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.watchNudgeSeparator}>·</Text>
                  <TouchableOpacity
                    onPress={handleDismissWatchNudge}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={strings.today.watchLeakNudgeDismiss}
                  >
                    <Text style={styles.watchNudgeDismissText}>
                      {strings.today.watchLeakNudgeDismiss}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>

        <View
          style={{ width: screenWidth }}
          accessibilityElementsHidden={todayView !== 'kept'}
          importantForAccessibility={todayView !== 'kept' ? 'no-hide-descendants' : 'auto'}
        >
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
                // away (was router.push('/(tabs)/money')). Routed through the
                // same tap-like interaction flag as a chip tap so the pager
                // animates over to match (DI-7).
                onPress={() => {
                  pagerInteracted.current = true;
                  setTodayView('spent');
                }}
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
        coachLine={door1CoachActive ? strings.today.firstLogCoachLine : undefined}
        onSaved={door1CoachActive ? handleFirstLogSaved : undefined}
        onClose={handleLogSheetClose}
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
      // The track itself carries no horizontal padding (SegmentedControl
      // doesn't either); the 20pt gutter lives here, same as money.tsx's
      // "segments" wrapper around its own SegmentedControl.
      paddingHorizontal: 20,
      marginTop: 8,
      marginBottom: 12,
    },
    // FirstRunRibbon (W2, Door 1 real-app first run): shares the chips row's
    // gutter, sits under it on both panes since the pager starts below this.
    ribbonWrap: {
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    // DI-7: the pager fills whatever vertical space is left below the chips
    // row, same as the single conditional pane did before it.
    pager: {
      flex: 1,
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
      marginTop: 12,
    },
    // Watch-nudge (W2 item 3): UpcomingList's dashed-card grammar
    // (components/money/UpcomingList.tsx `add`), placed directly under the
    // logged-today card so it reads as attached to the row that just landed.
    watchNudge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 48,
      borderRadius: radii.card,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.cloudDashed,
      backgroundColor: theme.white,
      paddingHorizontal: 16,
      marginTop: 10,
    },
    watchNudgeAccept: {
      flex: 1,
      paddingVertical: 12,
    },
    watchNudgeLabel: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: 14,
      color: theme.primaryDark,
    },
    watchNudgeSeparator: {
      fontFamily: theme.fonts.ui,
      fontSize: 14,
      color: theme.mist,
    },
    watchNudgeDismissText: {
      fontFamily: theme.fonts.ui,
      fontSize: 14,
      color: theme.mist,
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
