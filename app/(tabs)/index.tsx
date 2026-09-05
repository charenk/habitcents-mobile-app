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
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { KeptHero } from '@/components/habit-logging/KeptHero';
import { LeakCard } from '@/components/habit-logging/LeakCard';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { useCheckInFeedback } from '@/components/habit-logging/useCheckInFeedback';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { PartialSlipSheet } from '@/components/habit-logging/PartialSlipSheet';
import { CoachMomentSlot } from '@/components/habit-logging/CoachMomentSlot';
import { SpentKeptChips, type SpentKeptView } from '@/components/habit-logging/SpentKeptChips';
import { ExpenseSheet, type LogExpenseSavedInfo } from '@/components/money/ExpenseSheet';
import { QuickLogRow } from '@/components/money/QuickLogRow';
import { ActionDock } from '@/components/today/ActionDock';
import { LoggedTodayList } from '@/components/money/LoggedTodayList';
import { InfoRibbon } from '@/components/ui/InfoRibbon';
import { useFirstRunRibbon } from '@/components/onboarding/useFirstRunRibbon';
import { useEmptyStateAction } from '@/components/onboarding/useEmptyStateAction';
import { BreakHabitSheet, type BreakHabitStartData } from '@/components/onboarding/BreakHabitSheet';
import { useCategories } from '@/contexts/CategoriesContext';
import { VICE_CATEGORIES } from '@/constants/onboardingPresets';
import type { Expense, ExpenseCategory } from '@/types/expense';
import { atMidnight, dayStateFor, isHabitLimitReached, keptOnDay } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import { cardText, type CoachMomentCardId } from '@/utils/coachMoments';
import { progressTowardDetection } from '@/utils/habitDetection';
import { formatDate } from '@/utils/dates';
import { track } from '@/utils/analytics';
import { hapticError, useReducedMotion } from '@/utils/motion';
import { radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';
import { strings } from '@/constants/strings';
import { useToast, useToastLift } from '@/components/ui/Toast';

type BreakingItem = { habit: DetectedHabit; goal: HabitChangeGoal };

type HabitSection = {
  title: string;
  type: 'leaks' | 'breaking';
  data: (DetectedHabit | BreakingItem)[];
};

// Door 1 real-app first run (W2, "the app is the onboarding"). The FirstRunRibbon
// storage record's `door` value for this flow.
const DOOR1_KEY = 'door1';
// Door 3 break sheet (W3): same hook, its own door key. The two ribbons share
// one storage record (useFirstRunRibbon), so only one is ever pending at a
// time; combined into a single render slot below.
const DOOR3_KEY = 'door3';

// FirstRunRibbon message keys -> copy. The hook only persists the key, so the
// mapping (and therefore the wording) lives here with the rest of Today's copy.
const FIRST_RUN_RIBBON_LINES: Record<string, string> = {
  door1_saved: strings.today.firstRunRibbonSaved,
  door1_gentle: strings.today.firstRunRibbonGentle,
  door3_started: strings.today.door3RibbonStarted,
  door3_gentle: strings.today.door3RibbonGentle,
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
  const { show } = useToast();
  const answerFeedback = useCheckInFeedback();
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
    restoreDismissedHabit,
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

  const { expenses, addExpense } = useExpenses();
  const { getCategoryByName } = useCategories();
  const {
    isLoading: onboardingLoading,
    isOnboardingComplete,
    completeStep: completeOnboardingStep,
    skipStep: skipOnboardingStep,
    completeOnboarding,
    markHabitStarted,
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
    ribbonPending: door1RibbonPending,
    messageKey: door1MessageKey,
    nudgeResolved,
    showRibbon,
    dismissRibbon: dismissDoor1Ribbon,
    resolveNudge,
  } = useFirstRunRibbon(DOOR1_KEY);

  // Door 3 break sheet (W3, "the app is the onboarding" complete): same
  // exactly-once pattern as door1CoachActive/door1HandledRef above.
  // door3CoachActive is true only while the sheet was opened via the
  // breakEntry deep link (never for a later "break another" open, which
  // happens after onboarding is already complete), so completeOnboarding only
  // ever fires from the onboarding entry path.
  const [breakSheetVisible, setBreakSheetVisible] = useState(false);
  const [door3CoachActive, setDoor3CoachActive] = useState(false);
  const door3HandledRef = useRef(false);
  // One-shot per param value, so returning to Today with a stale ?sheet= in
  // history cannot pop the sheet open again.
  const sheetHandledRef = useRef<string | null>(null);
  // Guards a double-tap on the break sheet's async Start (finding 1).
  const breakStartInFlightRef = useRef(false);
  const {
    ribbonPending: door3RibbonPending,
    messageKey: door3MessageKey,
    showRibbon: showDoor3Ribbon,
    dismissRibbon: dismissDoor3Ribbon,
  } = useFirstRunRibbon(DOOR3_KEY);

  // A gentle first-run line ("whenever you're ready") waits for something;
  // once that thing exists the line is false, and a ribbon saying something
  // false is worse than none (2026-09-04 walk: the door1 gentle line was
  // still up after four real logs). Each resolves itself, once, idempotent.
  useEffect(() => {
    if (door1RibbonPending && door1MessageKey === 'door1_gentle' && expenses.length > 0) {
      void dismissDoor1Ribbon();
    }
  }, [door1RibbonPending, door1MessageKey, expenses.length, dismissDoor1Ribbon]);
  useEffect(() => {
    if (door3RibbonPending && door3MessageKey === 'door3_gentle' && goals.length > 0) {
      void dismissDoor3Ribbon();
    }
  }, [door3RibbonPending, door3MessageKey, goals.length, dismissDoor3Ribbon]);

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

  // Spent pane, true zero state (PRD v3.1 sect 5): no expense has ever been
  // logged, not just today. Hides the logged-today list and watch-nudge and
  // centers the inline EmptyState hook in the scroller instead.
  const spentIsEmpty = expenses.length === 0;
  const handleSpentEmptyLog = useEmptyStateAction('today_spent', () => openLogSheet());

  // Kept pane, true zero state: same "switch to Spent" handler the empty
  // state has always used, wrapped so a skipper's tap reports the surface.
  const handleKeptEmptyLog = useEmptyStateAction(
    'today_kept',
    useCallback(() => {
      pagerInteracted.current = true;
      setTodayView('spent');
    }, [])
  );

  // Eyebrow date line, locale-aware (ADA-008): "Thursday, July 24".
  // ScreenHeader uppercases it, so this stays sentence case.
  //
  // UX-067: was useMemo(..., []), computed once at mount and never again, so
  // the header date went stale across midnight while the card logic below
  // (todayState, keptTodayCents, etc.) recomputes `new Date()` on every
  // render and could disagree with it. State + the focus effect below
  // recompute it whenever Today comes back into focus, the same freshness
  // boundary the rest of the screen's "today" already gets for free from
  // re-rendering on focus.
  const [todayLabel, setTodayLabel] = useState(() =>
    formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })
  );
  useFocusEffect(
    useCallback(() => {
      setTodayLabel(formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }));
    }, [])
  );

  // Deep link support: an onboarding flow can land Today on a specific view
  // via ?view=kept|spent. Anything else (missing, malformed) is ignored and
  // the default (Spent) stands.
  const params = useLocalSearchParams<{
    view?: string;
    firstLog?: string;
    breakEntry?: string;
    sheet?: string;
  }>();
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

  // Door 3 break sheet (W3): intent.tsx's break card lands here with
  // breakEntry=1 instead of pushing the retired audit-subs screen. Same
  // isOnboardingComplete() guard as door 1, for the same reason (a stale
  // breakEntry=1 in history must never reopen the coach flow once onboarding
  // is done).
  useEffect(() => {
    if (onboardingLoading) return;
    if (params.breakEntry !== '1') return;
    if (door3HandledRef.current) return;
    if (isOnboardingComplete()) return;
    setDoor3CoachActive(true);
    setBreakSheetVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingLoading, params.breakEntry]);

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
    // Re-arm the ?sheet= entry: without this, dismissing the sheet and
    // pressing the same empty-state CTA again did nothing for the rest of the
    // session (review round 3, P2-2). BOTH halves are needed: the ref so the
    // effect will act again, and clearing the param itself so the next
    // navigate() to the same href is a real param transition that re-fires
    // the effect (an identical href would otherwise change nothing).
    sheetHandledRef.current = null;
    if (params.sheet) router.setParams({ sheet: undefined });
    if (!door1CoachActive || door1HandledRef.current) return;
    door1HandledRef.current = true;
    setDoor1CoachActive(false);
    void skipOnboardingStep('guided_log');
    void completeOnboarding();
    void showRibbon('door1_gentle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [door1CoachActive, skipOnboardingStep, completeOnboarding, showRibbon, params.sheet]);

  // Door 3 break sheet "Start breaking it": builds the habit with the stated
  // cadence the user just picked (stated-rate exception, mirroring how the
  // retired audit's candidateToSeedInput set hasReliableRate true: the price
  // and cadence are the user's own input, not a fabricated projection), starts
  // it, and, only when the user answered "Yes, log it" to "Did you buy it
  // today?", writes that one expense (ADR 0020: only an explicit yes writes
  // an expense). This never answers the new habit's check-in question itself:
  // "did you skip it today?" stays unanswered even on a bought-today yes,
  // because that daily ritual is the user's to answer, not a side effect of
  // admitting today's buy while setting the habit up.
  const handleBreakSheetStart = useCallback(async (data: BreakHabitStartData) => {
    // Two guards before any await (stack review finding 1):
    // 1. A double-tap on the async Start button must not create two habits.
    // 2. The onboarding outcome is claimed NOW, so a scrim tap or back press
    //    while the writes are in flight runs handleBreakSheetClose as a
    //    visual close only, instead of firing the gentle ribbon for a habit
    //    that is actually being created.
    if (breakStartInFlightRef.current) return;
    breakStartInFlightRef.current = true;
    // UX-021: everything below can reject (seedDiscoveredHabit,
    // startBreakingHabit, addExpense are all async writes). Without
    // try/finally, a rejection left breakStartInFlightRef stuck true, which
    // permanently disabled the Start button for the rest of the session with
    // no error surfaced. The ref reset now always runs, and a failure gets a
    // toast instead of failing silently.
    // Declared outside the try so the catch can RELEASE the claim it latched
    // (review round 3, P2-5); a const inside the try is not in scope there.
    const claimedOnboarding = door3CoachActive && !door3HandledRef.current;
    try {
      if (claimedOnboarding) door3HandledRef.current = true;

      const merchantPattern = data.chipId === 'custom' ? data.name : data.chipId;
      const category: ExpenseCategory = data.chipId === 'custom' ? 'Other' : VICE_CATEGORIES[data.chipId];
      const categoryId = getCategoryByName(category)?.id ?? getCategoryByName('Other')?.id ?? 'Other';
      // Monthly-equivalent for the seeded habit's totalMonthlySpend, same
      // approx-month convention the rest of the app uses elsewhere (weekly *
      // 52/12); the honest yearly line on the sheet itself uses the exact
      // 365/52/12 multipliers instead, since that is what is actually shown.
      const monthlyMultiplier = data.cadence === 'daily' ? 30 : data.cadence === 'weekly' ? 52 / 12 : 1;

      const habit = await seedDiscoveredHabit({
        merchantPattern,
        name: data.name,
        description: '',
        categoryId,
        averageAmount: data.amountCents,
        frequency: data.cadence,
        occurrencesPerPeriod: 1,
        totalMonthlySpend: Math.round(data.amountCents * monthlyMultiplier),
      });
      // seedDiscoveredHabit protects live habits: re-picking one the user is
      // already breaking returns it unchanged. Starting it again would append
      // an orphan goal (stack review finding 2), so say so and stop; a
      // bought-today yes below still writes the expense, which is an honest
      // statement regardless.
      const alreadyBreaking = habit.status === 'changing' || habit.status === 'tracking';
      if (alreadyBreaking) {
        show(strings.today.alreadyBreakingToast);
      } else {
        await startBreakingHabit(habit.id, data.amountCents, data.valueEdited, 'onboarding');
      }

      if (data.boughtToday) {
        await addExpense({
          title: data.name,
          amount: data.amountCents,
          category,
          categoryId,
          merchant: data.name,
          date: new Date(),
          isRecurring: false,
          reminderEnabled: false,
        });
      }

      setBreakSheetVisible(false);
      if (claimedOnboarding) {
        setDoor3CoachActive(false);
        // The break beat just created a habit, and the completion event's
        // habitStarted property is the activation term of the sect 11
        // criteria; without this it read false on the one non-scan route that
        // actually starts a habit (review round 3, P2-1). Ordered before
        // completeOnboarding for the same ref-visibility reason as
        // useTrackLeak. alreadyBreaking still counts: a habit is running
        // either way, which is what the property claims.
        await markHabitStarted();
        await completeOnboarding();
        await showDoor3Ribbon('door3_started');
      }
    } catch (error) {
      // UX-021: the guard ref resets in finally, so the button comes back;
      // this tells the user why nothing happened instead of leaving a silent
      // no-op behind a button that just went live again.
      console.error('handleBreakSheetStart failed', error);
      show(strings.toasts.startHabitFailed);
      // Release the onboarding claim latched before the awaits (review round
      // 3, P2-5). Without this the write failed, completeOnboarding never ran,
      // and handleBreakSheetClose then early-returned on the still-latched
      // ref: onboarding could never complete by any route, so the next cold
      // start dropped the user back on the carousel with a habit already
      // created. Un-claiming lets the close path complete it gently, which is
      // exactly what it does for a user who dismisses without starting.
      if (claimedOnboarding) door3HandledRef.current = false;
    } finally {
      breakStartInFlightRef.current = false;
    }
  }, [
    seedDiscoveredHabit,
    startBreakingHabit,
    addExpense,
    getCategoryByName,
    door3CoachActive,
    completeOnboarding,
    markHabitStarted,
    showDoor3Ribbon,
    show,
  ]);

  // Close without starting (scrim, swipe, or the gate's "Maybe later"): same
  // exactly-once completion as handleLogSheetClose above. Only acts when the
  // sheet was opened via the onboarding deep link (door3CoachActive), so a
  // later "break another" close (onboarding already complete by then) never
  // re-fires completeOnboarding.
  const handleBreakSheetClose = useCallback(() => {
    setBreakSheetVisible(false);
    // Re-arm the ?sheet= entry (P2-2), same as the log sheet.
    sheetHandledRef.current = null;
    if (params.sheet) router.setParams({ sheet: undefined });
    if (!door3CoachActive || door3HandledRef.current) return;
    door3HandledRef.current = true;
    setDoor3CoachActive(false);
    void completeOnboarding();
    void showDoor3Ribbon('door3_gentle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [door3CoachActive, completeOnboarding, showDoor3Ribbon, params.sheet]);

  // Gate's "See Premium": leaving for the paywall is still leaving without
  // starting a habit, so it completes onboarding the same way "Maybe later"
  // does before navigating.
  const handleBreakSheetStartTrial = useCallback(() => {
    handleBreakSheetClose();
    router.push('/paywall?placement=habit_gate_today');
  }, [handleBreakSheetClose, router]);

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
  // U6: the two ribbons used to share a single render slot above the pager
  // (both panes saw whichever door was pending). They now render inside
  // their own pane instead -- door1 in Spent, door3 in Kept -- so each door's
  // line is resolved independently rather than picking one winner.
  const door1RibbonLine = door1MessageKey ? FIRST_RUN_RIBBON_LINES[door1MessageKey] ?? null : null;
  const door3RibbonLine = door3MessageKey ? FIRST_RUN_RIBBON_LINES[door3MessageKey] ?? null : null;

  // U6's rotating quote was retired from both Today panes (ADR 0037): it did
  // not fit the app, and the zero states now give their single hook the whole
  // pane. `components/today/ViewQuote.tsx` and `useViewQuote.ts` are kept
  // unreferenced as the documented revert path, the same way the dark theme
  // and AuroraBackground are.

  const handleViewAllExpenses = useCallback(() => {
    router.push('/(tabs)/money');
  }, [router]);

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

  // UX-067: keyed on expenses.length, not a content hash, on purpose. Editing
  // an existing expense's amount or merchant (no length change) will not
  // re-run detection from this effect; that is the accepted gap, not fixed
  // here. A content-derived key (e.g. summing amounts or hashing
  // merchant+amount pairs) would recompute on every render whenever any
  // expense mutates elsewhere in the tree that also touches this array's
  // identity, and refreshHabits does real work (habit detection over the
  // whole expense list) that this screen should not be re-running on
  // unrelated re-renders. length is the cheap, stable proxy for "something
  // was added", which is the case detection actually needs to react to;
  // edits to existing expenses reach detection the next time a length-
  // changing action fires (or the pull-to-refresh path below, which always
  // re-runs regardless of length).
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
    try {
      await dismissHabit(habit.id);
    } catch (error) {
      console.error('Error dismissing leak:', error);
      hapticError();
      show(strings.toasts.dismissLeakFailed);
      return;
    }
    // UX-022: every mutating action fires exactly one toast (Toast contract).
    // "Not this one" discards a detected leak the user may never see
    // surfaced again, so it gets a real undo, not just an announcement.
    show(strings.toasts.leakDismissed, {
      action: {
        label: strings.toasts.undo,
        onPress: () => {
          void restoreDismissedHabit(habit.id).catch((error) => {
            console.error('Error restoring dismissed leak:', error);
            hapticError();
            show(strings.toasts.restoreFailed);
          });
        },
      },
    });
  }, [dismissHabit, restoreDismissedHabit, show]);

  const handleHabitPress = useCallback((habitId: string) => {
    router.push(`/habit/${habitId}`);
  }, [router]);

  const pickOneHabit = pickOneHabitId ? getHabitById(pickOneHabitId) : null;
  // Entitlement touchpoint (ADR 0007, BET-004): blocked once the active-habit
  // count reaches the current entitlement's ceiling (free = 1, premium = 5).
  const entitlement = getEntitlement();
  const freeTierBlocked = isHabitLimitReached(activeHabits.length, entitlement);

  // Break-another affordance (DI-6, ADR 0019): same gate freeTierBlocked
  // already drives on PickOneSheet's "start" path, reused here so a second
  // press-through leads to the identical outcome. Under the limit it opens
  // the break sheet in place (W3: the audit it used to route to,
  // /onboarding/welcome, is deleted; the sheet lives on Today now).
  // Toast lift (ADR 0038): the pill's default spot is now behind the dock, so
  // a "Logged." toast would cover the field that produced it. Each dock
  // reports its measured height and the visible pane's is the one that counts,
  // because the two docks hold different controls at different heights.
  //
  // FOCUS-GATED, and that gate is load-bearing. Tab screens stay mounted when
  // the user switches tabs (bottom-tabs v7 has no unmountOnBlur) and
  // ToastProvider sits at the app root, so an unconditional lift from Today
  // would push every toast in the app, Money's sheets and the pushed
  // habit/profile/paywall routes included, a dock height too high. The lift
  // applies only while Today is the focused screen.
  const [spentDockHeight, setSpentDockHeight] = useState(0);
  const [keptDockHeight, setKeptDockHeight] = useState(0);
  const [todayFocused, setTodayFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setTodayFocused(true);
      return () => setTodayFocused(false);
    }, [])
  );
  useToastLift(todayFocused ? (todayView === 'spent' ? spentDockHeight : keptDockHeight) : 0);

  const handleBreakAnother = useCallback(() => {
    if (freeTierBlocked) {
      router.push('/paywall?placement=habit_gate_today');
    } else {
      setBreakSheetVisible(true);
    }
  }, [freeTierBlocked, router]);

  // General-purpose sheet entry (PRD v3.1 sect 5, phase 7).
  //
  // Deliberately SEPARATE from firstLog/breakEntry above. Those two carry
  // onboarding semantics (they arm the coach flow and complete onboarding) and
  // are guarded on isOnboardingComplete(), so they go inert exactly when an
  // empty state needs them: after the user has finished or skipped onboarding.
  // This param carries no onboarding meaning at all, which is why an empty
  // state can use it forever without ever re-triggering a coach flow.
  //
  // 'break' routes through handleBreakAnother rather than opening the sheet
  // directly, so the free-tier gate is enforced on this path exactly as it is
  // on Today's own affordance.
  const sheetParam = params.sheet;
  useEffect(() => {
    if (onboardingLoading) return;
    if (sheetParam !== 'log' && sheetParam !== 'break') return;
    if (sheetHandledRef.current === sheetParam) return;
    sheetHandledRef.current = sheetParam;
    if (sheetParam === 'log') openLogSheet();
    else handleBreakAnother();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingLoading, sheetParam]);

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

  // The break-habit affordance (DI-6, ADR 0019), which since ADR 0038 lives
  // in the Kept pane's ActionDock instead of trailing the content. It used to
  // be the SectionList's footer, so on a populated pane it could not be
  // reached without scrolling past every leak and check-in card.
  //
  // LABEL BY STATE. "Break another habit" is a lie to someone with none, and
  // the first habit is the whole point of the Kept pane, so zero habits gets
  // its own line naming the milestone. Keyed on goals.length, the same
  // predicate the chips' keptStarted uses, so the dock and the scoreboard
  // can never disagree about whether anything is going. (activeHabits counts
  // tracking-status habits too, which can exist without a goal.)
  const breakLabel =
    goals.length === 0 ? strings.today.breakFirstHabitCta : strings.today.breakAnotherHabitCta;

  // CAPTION BY STATE (ADR 0038). This used to check entitlement alone, so a
  // brand-new user with ZERO habits was told "1 habit on the free plan"
  // before anything had been refused: a growth line where there was nothing
  // to grow out of. It now shows only at the FREE ceiling, which is the one
  // state where it is both true and about to matter: pressing there jumps to
  // the paywall (handleBreakAnother), and this line is the forewarning.
  //
  // Premium at its own ceiling (5) gets no caption and still jumps to the
  // paywall. That routing question is carried as open by three records
  // (today.md, ADR 0034, the status board) and is a monetization call behind
  // the human gate; this line deliberately does not resolve it.
  const breakCaption =
    freeTierBlocked && entitlement !== 'premium' ? strings.habitLogging.freeTierNote : null;

  const breakAnotherAffordance = (
    <TouchableOpacity
      style={styles.breakAnother}
      onPress={handleBreakAnother}
      accessibilityRole="button"
      accessibilityLabel={breakCaption ? `${breakLabel}, ${breakCaption}` : breakLabel}
      testID="break-habit-affordance"
      activeOpacity={0.7}
    >
      <Icon name="Plus" size={18} color={theme.primaryDark} />
      <View style={styles.breakAnotherText}>
        <Text style={styles.breakAnotherLabel} maxFontSizeMultiplier={1.5}>
          {breakLabel}
        </Text>
        {breakCaption ? (
          <Text style={styles.breakAnotherCaption} maxFontSizeMultiplier={1.5}>
            {breakCaption}
          </Text>
        ) : null}
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
          onSkip={() => answerFeedback(() => (habit.frequency === 'daily' ? answerToday(goal.id, 'skipped') : answerEvent(goal.id, 'skipped')))}
          onSlip={() => answerFeedback(() => (habit.frequency === 'daily' ? answerToday(goal.id, 'slipped') : answerEvent(goal.id, 'slipped')))}
          onChangeAnswer={() => answerFeedback(() => changeTodayAnswer(goal.id))}
          onBackfill={(state) => answerFeedback(() => backfillYesterday(goal.id, state))}
          onOpenPartial={() => setPartialGoalId(goal.id)}
          onOpenDetail={() => handleHabitPress(habit.id)}
        />
      );
    }

    return null;
  };

  const renderSectionHeader = ({ section }: { section: HabitSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>
        {section.title}
      </Text>
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
          // Not-started is not zero (SpentKeptChips file header): amounts
          // only render once the activity exists, all-time, so a fresh
          // install never claims a measured $0.00.
          spentStarted={!spentIsEmpty}
          keptStarted={goals.length > 0}
        />
      </View>

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
          style={[styles.pane, { width: screenWidth }]}
          testID="spent-pane"
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
            {/* Spent pane, true zero state (PRD v3.1 sect 5): no expense has
                ever been logged. The logged-today list and watch-nudge have
                nothing to show, so they're hidden entirely rather than
                rendering empty; the centered EmptyState hook carries the
                first action, with the quick log in the dock below. */}
            {!spentIsEmpty ? (
              <View style={styles.loggedTodaySpacer}>
                <LoggedTodayList
                  expenses={loggedToday}
                  onEditExpense={setEditingExpense}
                  onViewAll={handleViewAllExpenses}
                />
                {/* Door 1's first-run line, the InfoRibbon pattern (ADR
                    0033, amended by 0038): inside the list section, directly
                    under the logged-today list it comments on, so it reads
                    as the receipt for the log. The old "never above an
                    input" clause retired with the dock, since the input now
                    sits at the bottom and everything is above it. The
                    watch-nudge follows: receipt first, next action second. */}
                {door1RibbonPending && door1RibbonLine ? (
                  <View style={styles.ribbonWrapInline}>
                    <InfoRibbon line={door1RibbonLine} onDismiss={dismissDoor1Ribbon} />
                  </View>
                ) : null}
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
                      // UX-031: ~41pt effective (12pt vertical padding either
                      // side of the 14pt label) without this. The accept
                      // control anxious users reach for clears 44 now.
                      hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                    >
                      <Text style={styles.watchNudgeLabel} numberOfLines={1}>
                        {strings.today.watchLeakNudgeLabel}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.watchNudgeSeparator}>·</Text>
                    <TouchableOpacity
                      onPress={handleDismissWatchNudge}
                      // UX-031: 12/12 was ~41pt effective; 14/14 clears 44.
                      hitSlop={{ top: 14, bottom: 14, left: 8, right: 12 }}
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
            ) : null}
            {/* Spent Zero: the hook centered in the scroller, which now runs
                from the chips down to the dock (ADR 0038). The quote that
                used to sit above it was retired in ADR 0037. */}
            {spentIsEmpty ? (
              <View style={styles.spentZeroWrap}>
                {/* inline, not layout="fill": the wrap centers the hook
                    between the chips and the dock, so fill's own top padding
                    would push it off centre. Mark, title, CTA and nothing
                    else. The illustration prop is layout-independent for
                    exactly this reason (ADR 0036). */}
                <EmptyState
                  layout="inline"
                  illustration="today-spent"
                  title={strings.today.spentEmptyTitle}
                  cta={{ label: strings.today.spentEmptyCta, onPress: handleSpentEmptyLog }}
                />
              </View>
            ) : null}
          </ScrollView>
          {/* The quick log moved out of the scroller and down here (ADR 0038).
              It used to be the scroller's first child, pinned under the chips,
              which put Spent's action at the top of the screen while Kept's sat
              at the bottom of a long scroll. Now both panes end in an
              ActionDock, so the action does not move while the pager swipes,
              and it sits in the thumb zone CLAUDE.md asks for. */}
          <ActionDock testID="spent-dock" onHeightChange={setSpentDockHeight}>
            <QuickLogRow onOpenSheet={openLogSheet} />
          </ActionDock>
        </View>

        <View
          style={[styles.pane, { width: screenWidth }]}
          testID="kept-pane"
          accessibilityElementsHidden={todayView !== 'kept'}
          importantForAccessibility={todayView !== 'kept' ? 'no-hide-descendants' : 'auto'}
        >
          {/* U6: door3's ribbon used to render once above the pager on both
              panes; it renders only here now, at the top of the Kept pane,
              the same spot its old global slot occupied visually. */}
          {door3RibbonPending && door3RibbonLine ? (
            <View style={styles.ribbonWrap}>
              <InfoRibbon line={door3RibbonLine} onDismiss={dismissDoor3Ribbon} />
            </View>
          ) : null}
          {/* Once a leak or a breaking habit exists the pane opens straight
              on the KeptHero band. While no kept content exists there is no
              band at all, only the centered zero block below. The band still
              mounts while loading, when isEmpty is not yet trustworthy. */}
          {isLoading || !isEmpty ? (
            // DI-6 gutter fix: the band renders full-bleed by default (see
            // onboarding success, which supplies its own padded container
            // instead); Today has no such wrapper, so it passes the same
            // 20pt horizontal gutter the chips row and both list content
            // styles use.
            <KeptHero cents={totalKept} style={styles.keptHeroGutter} />
          ) : null}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{strings.habits.loading}</Text>
            </View>
          ) : isEmpty ? (
            <ScrollView
              contentContainerStyle={styles.keptEmptyContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
              }
            >
              {/* One centered zero block for both pre-leak states: either
                  the detection progress card (some logs, no leak yet) or the
                  hook with its explainer (nothing logged, ADR 0039). The
                  in-between progress state reusing this composition is a
                  chosen default, flagged in the PR's what-to-test list. */}
              <View style={styles.keptZeroWrap}>
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
                    <Text style={styles.progressCountSuffix}>{strings.habits.logsAtSamePlaceSuffix}</Text>
                  </Text>
                  <Text style={styles.progressBody}>{strings.habits.logsAtSamePlaceBody}</Text>
                  {/* The card says "keep logging"; the button below is how.
                      Same in-place view switch as the empty state's CTA. */}
                  <Button
                    variant="secondary"
                    label={strings.habitLogging.logAnExpense}
                    onPress={() => {
                      pagerInteracted.current = true;
                      setTodayView('spent');
                    }}
                    style={styles.progressCta}
                  />
                </View>
                ) : (
                  <EmptyState
                    // inline + explicit art, same reasoning as the Spent
                    // zero block: the wrap centers this in the pane rather
                    // than letting fill's own top padding place it.
                    layout="inline"
                    illustration="today-kept"
                    title={strings.today.keptEmptyTitle}
                    // The one explainer in the app (ADR 0039). This is true
                    // zero: no expenses at all, so nothing on screen can show
                    // the mechanic and it has to be told. The adjacent Quiet
                    // state does not get one, because by then the detection
                    // meter is showing real progress toward the threshold.
                    stepsTitle={strings.today.keptHowItWorksTitle}
                    steps={strings.today.keptHowItWorks}
                    cta={{
                      // The quick-log card now lives on the Spent view, not
                      // the Money tab, so the CTA switches views in place
                      // rather than navigating away (was
                      // router.push('/(tabs)/money')). Routed through the
                      // same tap-like interaction flag as a chip tap so the
                      // pager animates over to match (DI-7), and through
                      // useEmptyStateAction so a skipper's tap reports the
                      // surface (handleKeptEmptyLog, defined above).
                      label: strings.today.keptEmptyCta,
                      onPress: handleKeptEmptyLog,
                    }}
                  />
                )}
              </View>
              {firstLogCardId && (
                <View style={styles.emptyCoachMoment}>
                  <CoachMomentSlot text={cardText(firstLogCardId)} />
                </View>
              )}
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
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
              }
            />
          )}
          {/* Same dock as the Spent pane (ADR 0038), so the action does not
              move while the pager swipes. This was the SectionList's footer,
              which meant a populated pane hid it behind every leak and
              check-in card. It renders in all three branches, loading
              included: the affordance is what a user with nothing yet is
              here to press. */}
          <ActionDock testID="kept-dock" onHeightChange={setKeptDockHeight}>{breakAnotherAffordance}</ActionDock>
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
          router.push('/paywall?placement=habit_gate_today');
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

      <ExpenseSheet
        mode="log"
        visible={logVisible}
        initialCategory={logCategory}
        coachLine={door1CoachActive ? strings.today.firstLogCoachLine : undefined}
        onSaved={door1CoachActive ? handleFirstLogSaved : undefined}
        onClose={handleLogSheetClose}
      />

      <ExpenseSheet
        mode="edit"
        visible={editingExpense !== null}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
      />

      <BreakHabitSheet
        visible={breakSheetVisible}
        freeTierBlocked={freeTierBlocked}
        onClose={handleBreakSheetClose}
        onStart={handleBreakSheetStart}
        onStartTrial={handleBreakSheetStartTrial}
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
      paddingHorizontal: spacing.gutter,
      marginTop: spacing.sm,
      marginBottom: spacing.stack,
    },
    // FirstRunRibbon, door3 (U6): the Kept pane's top-level View carries no
    // ambient horizontal padding (KeptHero gets its own via keptHeroGutter
    // below), so this style supplies the screen's 20pt gutter directly.
    ribbonWrap: {
      paddingHorizontal: spacing.gutter,
      marginBottom: spacing.stack,
    },
    // InfoRibbon, door1: renders inside the logged-today block under the log
    // card, which already carries the 20pt gutter, so this only adds the
    // same 10pt the watch-nudge below it uses, not a second horizontal inset.
    ribbonWrapInline: {
      marginTop: spacing.control,
    },
    // DI-7: the pager fills whatever vertical space is left below the chips
    // row, same as the single conditional pane did before it.
    pager: {
      flex: 1,
    },
    // Applied to both panes alongside their inline screenWidth. On native the
    // pager's contentContainer (a row, default alignItems: stretch) already
    // stretches each pane to full height, and there is no free main-axis
    // space for flexGrow to claim, so this is inert. On web, pagingEnabled
    // wraps each pane in a column snap-align div that does NOT stretch its
    // child, which left the FTE zero blocks below with no height to center
    // in; flexGrow fills that wrapper.
    pane: {
      flexGrow: 1,
    },
    // DI-6: shares the 20pt gutter the chips row and both list content styles
    // use below, so the band no longer renders full-bleed on Today.
    keptHeroGutter: {
      marginHorizontal: spacing.gutter,
    },
    spentScroll: {
      flex: 1,
    },
    spentScrollContent: {
      paddingHorizontal: spacing.gutter,
      // No paddingTop: the chips row's 12pt marginBottom is the whole gap
      // (Charen's 2026-09-03 spacing call). flexGrow lets the zero-state wrap
      // center in the leftover space; populated content taller than the
      // viewport scrolls exactly as before.
      flexGrow: 1,
      // Was screenBottomClearance (100). The dock is now a real sibling that
      // reserves its own height, so that allowance would be dead space
      // stacked on the dock's own padding (ADR 0038). This is breathing room
      // between the last row and the dock's top edge, nothing more.
      paddingBottom: spacing.xxl,
    },
    // FTE zero state (TodayFteSpent artboard): the hook centered in the
    // scroller, which since ADR 0038 runs from the chips down to the dock
    // rather than from the quick-log card down to the tab bar. One child, so
    // `justifyContent: 'center'` is the whole mechanism; the gap that used to
    // separate it from the retired quote went with it (ADR 0039).
    spentZeroWrap: {
      // flexGrow, not flex: `flex: 1` also sets flexShrink, which let this
      // squash below its own content at large Dynamic Type and clipped the
      // hook. flexGrow fills the leftover space and never shrinks (ADR 0039).
      flexGrow: 1,
      justifyContent: 'center',
    },
    // The Spent pane's first content block. The chips row's own 12pt
    // marginBottom is the whole gap (Charen's 2026-09-03 spacing call), so
    // this adds nothing on top of it; it exists to group the list, the
    // door-1 ribbon and the watch nudge as one unit.
    loggedTodaySpacer: {},
    // Watch-nudge (W2 item 3): UpcomingList's dashed-card grammar
    // (components/money/UpcomingList.tsx `add`), placed directly under the
    // logged-today card so it reads as attached to the row that just landed.
    watchNudge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 48,
      borderRadius: radii.card,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.cloudDashed,
      backgroundColor: theme.white,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.control,
    },
    watchNudgeAccept: {
      flex: 1,
      paddingVertical: spacing.stack,
    },
    watchNudgeLabel: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.label,
      color: theme.primaryDark,
    },
    watchNudgeSeparator: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.label,
      color: theme.mistText,
    },
    watchNudgeDismissText: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.label,
      color: theme.mistText,
    },
    listContent: {
      paddingHorizontal: spacing.gutter,
      // Was screenBottomClearance (100); the dock below reserves its own
      // height now (ADR 0038), so this is breathing room only.
      paddingBottom: spacing.xxl,
    },
    sectionHeader: {
      marginTop: spacing.gutter,
      marginBottom: spacing.control,
      paddingHorizontal: spacing.tight,
    },
    // Section headers are eyebrows like every other one on this screen; the
    // uppercasing lives here so strings.ts keeps storing sentence case.
    sectionTitle: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.mistText,
      textTransform: 'uppercase',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: typeScale.button,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
    },
    // Shared by both pre-leak Kept branches (progress card and true zero)
    // since the FTE pass gave them one centered composition. flexGrow, not a
    // fixed height, so content taller than the viewport (Dynamic Type, small
    // screens) still scrolls; paddingHorizontal is also the coach-moment slot
    // and break-another affordance's only horizontal inset.
    keptEmptyContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: spacing.gutter,
      // Was screenBottomClearance (100); the dock below reserves its own
      // height now (ADR 0038), so this is breathing room only.
      paddingBottom: spacing.xxl,
    },
    // FTE zero block (TodayFteKept artboard): the progress card or the hook,
    // centered in the pane; mirror of spentZeroWrap above, plus the stretch
    // the parent's alignItems: 'center' would otherwise deny it. The quote
    // above it was retired (ADR 0037).
    keptZeroWrap: {
      // See spentZeroWrap: flexGrow, never flex, or the explainer clips.
      flexGrow: 1,
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    emptyCoachMoment: {
      alignSelf: 'stretch',
      marginTop: spacing.xxl,
    },
    // Break-another affordance (DI-6, ADR 0019): a dashed card mirroring
    // UpcomingList's add-upcoming row (components/money/UpcomingList.tsx
    // `add`/`addLabel`). W3 consolidated this with the empty state's former
    // reAuditLink text link (same destination, now redundant); this dashed
    // card is the single re-entry point in both the empty and populated Kept
    // views. Two lines (label + caption) rather than UpcomingList's single
    // centered line, so it is left-aligned with the icon instead of centered.
    breakAnother: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.stack,
      minHeight: 56,
      borderRadius: radii.card,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.cloudDashed,
      backgroundColor: theme.white,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.stack,
    },
    breakAnotherText: {
      flex: 1,
    },
    breakAnotherLabel: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.primaryDark,
    },
    breakAnotherCaption: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      marginTop: spacing.hairline,
    },
    progressCard: {
      alignSelf: 'stretch',
      backgroundColor: theme.surface,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.border,
      // Was 20, putting content 2pt right of the check-in and leak cards.
      padding: spacing.xl,
      alignItems: 'flex-start',
    },
    progressTitle: {
      fontSize: typeScale.lead,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.text,
    },
    progressMeterTrack: {
      alignSelf: 'stretch',
      height: 6,
      borderRadius: radii.micro,
      backgroundColor: theme.border,
      marginTop: spacing.md,
      overflow: 'hidden',
    },
    progressMeterFill: {
      height: 6,
      borderRadius: radii.micro,
      backgroundColor: theme.primary,
    },
    progressCount: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiBold,
      color: theme.text,
      marginTop: spacing.stack,
    },
    progressCountSuffix: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
    },
    progressBody: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      marginTop: spacing.xs,
      lineHeight: 20,
    },
    progressCta: {
      alignSelf: 'stretch',
      marginTop: spacing.stack,
    },
  });
}
