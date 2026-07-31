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
import { useRouter, useFocusEffect } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { SettingsSheet } from '@/components/SettingsSheet';
import { useTheme } from '@/contexts/ThemeContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { KeptHero } from '@/components/habit-logging/KeptHero';
import { LeakCard } from '@/components/habit-logging/LeakCard';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { PartialSlipSheet } from '@/components/habit-logging/PartialSlipSheet';
import { CoachMomentSlot } from '@/components/habit-logging/CoachMomentSlot';
import { LogExpenseSheet } from '@/components/money/LogExpenseSheet';
import { EditExpenseSheet } from '@/components/money/EditExpenseSheet';
import { ExpenseRow } from '@/components/money/ExpenseRow';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { useCategories } from '@/contexts/CategoriesContext';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import type { Expense, ExpenseCategory } from '@/types/expense';
import { atMidnight, dayStateFor, isHabitLimitReached } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import { cardText, type CoachMomentCardId } from '@/utils/coachMoments';
import { progressTowardDetection } from '@/utils/habitDetection';
import { formatDate } from '@/utils/dates';
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
 * Today (redesign step 02). Same habit-logging content the Habits tab carried;
 * only the screen header is new: an eyebrow date line above the serif title,
 * with a gear that opens the settings sheet.
 */
export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [pickOneHabitId, setPickOneHabitId] = useState<string | null>(null);
  const [partialGoalId, setPartialGoalId] = useState<string | null>(null);
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

  // Five tiles plus a "more" affordance, per spec.
  const quickCategories = useMemo(() => getVisibleCategories().slice(0, 5), [getVisibleCategories]);

  const loggedToday = useMemo(() => {
    const start = atMidnight(new Date()).getTime();
    return expenses
      .filter((e) => atMidnight(e.date).getTime() === start)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [expenses]);

  const openLogSheet = useCallback((category?: ExpenseCategory) => {
    setLogCategory(category);
    setLogVisible(true);
  }, []);

  // Eyebrow date line, locale-aware (ADA-008): "THURSDAY, JULY 24".
  const todayLabel = useMemo(
    () => formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase(),
    []
  );

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

  // Quick log card plus today's logged rows. Rendered under the habit content
  // on both the populated and the empty screen, so logging is always one tap
  // away even before a leak exists.
  const renderTodayFooter = () => (
    <View style={styles.footerBlock}>
      <View style={styles.quickLogCard}>
        <View style={styles.quickLogHeader}>
          <Text style={styles.eyebrow}>{strings.today.quickLogEyebrow.toUpperCase()}</Text>
          <Text style={styles.quickLogHint}>{strings.today.quickLogHint}</Text>
        </View>
        <View style={styles.quickLogAmountRow}>
          <AmountDisplay valueCents={0} size={40} zeroAsPlaceholder />
          <TouchableOpacity
            style={styles.quickLogPlus}
            onPress={() => openLogSheet(undefined)}
            accessibilityRole="button"
            accessibilityLabel={strings.today.quickLogOpenLabel}
          >
            <Icon name="Plus" size={22} color={theme.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.quickLogTiles}>
          {quickCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => openLogSheet(cat.name as ExpenseCategory)}
              accessibilityRole="button"
              accessibilityLabel={strings.today.quickLogCategoryLabel(cat.name)}
            >
              <EmojiTile
                emoji={categoryEmoji(cat.name)}
                size={40}
                color={categoryIdentityColor(cat.name)}
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.quickLogMore}
            onPress={() => openLogSheet(undefined)}
            accessibilityRole="button"
            accessibilityLabel={strings.today.quickLogMoreLabel}
          >
            <Text style={styles.quickLogMoreText}>...</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.eyebrow, styles.loggedTodayEyebrow]}>
        {strings.today.loggedTodayEyebrow.toUpperCase()}
      </Text>
      {loggedToday.length === 0 ? (
        <View style={styles.loggedTodayCard}>
          <Text style={styles.loggedTodayEmpty}>{strings.today.loggedTodayEmpty}</Text>
        </View>
      ) : (
        <View style={styles.loggedTodayCard}>
          {loggedToday.map((expense, i) => (
            <View
              key={expense.id}
              style={i > 0 ? styles.loggedTodaySeparator : undefined}
            >
              <ExpenseRow expense={expense} onPress={() => setEditingExpense(expense)} />
            </View>
          ))}
        </View>
      )}
    </View>
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
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.eyebrow}>{todayLabel}</Text>
          <Text style={styles.title}>{strings.screenTitles.today}</Text>
        </View>
        <TouchableOpacity
          style={styles.gearButton}
          onPress={() => setSettingsVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={strings.settings.title}
        >
          <Icon name="Settings2" size={18} color={theme.slate} />
        </TouchableOpacity>
      </View>

      <KeptHero cents={totalKept} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{strings.habits.loading}</Text>
        </View>
      ) : isEmpty ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          showsVerticalScrollIndicator={false}
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
            onPress={() => router.push('/(tabs)/money')}
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
          {renderTodayFooter()}
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
          ListFooterComponent={renderTodayFooter}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
        />
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

      <SettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
    },
    headerTitles: {
      flex: 1,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.mist,
    },
    title: {
      fontSize: typeScale.screenTitle,
      fontFamily: theme.fonts.display,
      color: theme.ink,
    },
    gearButton: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    // Quick log and logged-today (spec 04 "Today" 3 and 4).
    footerBlock: {
      marginTop: 20,
      alignSelf: 'stretch',
    },
    quickLogCard: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    quickLogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    quickLogHint: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.uiMedium,
      color: theme.primaryDark,
    },
    quickLogAmountRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    quickLogPlus: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLogTiles: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
    },
    quickLogMore: {
      width: 40,
      height: 40,
      borderRadius: radii.control,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLogMoreText: {
      fontSize: 16,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.mist,
      marginTop: -6,
    },
    loggedTodayEyebrow: {
      marginTop: 24,
      marginBottom: 8,
    },
    loggedTodayCard: {
      backgroundColor: theme.white,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
    },
    loggedTodaySeparator: {
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
    },
    loggedTodayEmpty: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.mist,
      paddingVertical: 16,
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
    // Scrolls rather than centering in a fixed height: the quick log card and
    // logged-today list sit below this content and would otherwise overlap the
    // kept band on shorter screens.
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
