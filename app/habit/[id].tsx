import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useHabits } from '@/contexts/HabitsContext';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { LongArc } from '@/components/habit-logging/LongArc';
import { HistoryCalendar } from '@/components/habit-logging/HistoryCalendar';
import { EventHistory } from '@/components/habit-logging/EventHistory';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { PartialSlipSheet } from '@/components/habit-logging/PartialSlipSheet';
import { atMidnight, weekStats, FREE_TIER_HABIT_LIMIT } from '@/utils/habitLogging';
import type { CoachMomentCardId } from '@/utils/coachMoments';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';
import { strings } from '@/constants/strings';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    getHabitById,
    getGoalByHabitId,
    getActiveHabits,
    startBreakingHabit,
    answerToday,
    answerEvent,
    changeTodayAnswer,
    backfillYesterday,
    savePartialSlip,
    updateSkipValue,
    stopBreakingHabit,
    lastMilestone,
    clearLastMilestone,
    lastCoachMoment,
    clearLastCoachMoment,
  } = useHabits();

  // Coach Moment (P2-2, acceptance test 2): clear on blur so navigating away
  // and back to an already-answered card does not re-show the same card.
  // lastMilestone has the identical lifecycle gap (fixed here alongside the
  // Coach Moments fix): clear it the same way so a milestone tint doesn't
  // persist across navigation back to this screen.
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearLastCoachMoment();
        clearLastMilestone();
      };
    }, [clearLastCoachMoment, clearLastMilestone])
  );

  const habit = getHabitById(id || '');
  const goal = getGoalByHabitId(id || '');

  const [pickOneVisible, setPickOneVisible] = useState(false);
  const [partialVisible, setPartialVisible] = useState(false);
  const [editSkipVisible, setEditSkipVisible] = useState(false);

  if (!habit) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{strings.habitDetail.notFound}</Text>
        </View>
      </View>
    );
  }

  const handleStart = async (skipValue: number, valueEdited: boolean) => {
    await startBreakingHabit(habit.id, skipValue, valueEdited, 'detection');
    setPickOneVisible(false);
  };

  const handleStopBreaking = () => {
    if (!goal) return;
    Alert.alert(
      strings.habitLogging.stopBreakingConfirmTitle,
      strings.habitLogging.stopBreakingConfirmMessage,
      [
        { text: strings.common.cancel, style: 'cancel' },
        { text: strings.habitLogging.stopBreakingHabit, style: 'destructive', onPress: () => stopBreakingHabit(goal.id) },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + 44 }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>{habit.name}</Text>
          <Text style={styles.description}>{habit.description}</Text>
        </View>

        {goal ? (
          <HabitDetailBreaking
            habit={habit}
            goal={goal}
            milestoneJustHit={lastMilestone?.goalId === goal.id ? lastMilestone.threshold : null}
            coachMoment={lastCoachMoment}
            onSkip={() => (habit.frequency === 'daily' ? answerToday(goal.id, 'skipped') : answerEvent(goal.id, 'skipped'))}
            onSlip={() => (habit.frequency === 'daily' ? answerToday(goal.id, 'slipped') : answerEvent(goal.id, 'slipped'))}
            onChangeAnswer={() => changeTodayAnswer(goal.id)}
            onBackfill={(state) => backfillYesterday(goal.id, state)}
            onOpenPartial={() => setPartialVisible(true)}
            onEditSkipValue={() => setEditSkipVisible(true)}
            onStopBreaking={handleStopBreaking}
          />
        ) : (
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setPickOneVisible(true)}>
              <Ionicons name="flag-outline" size={20} color={theme.white} />
              <Text style={styles.primaryButtonText}>{strings.habitDetail.startTracking}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <PickOneSheet
        visible={pickOneVisible}
        habit={habit}
        monthTotal={habit.totalMonthlySpend}
        occurrences={habit.occurrencesPerPeriod}
        freeTierBlocked={getActiveHabits().length >= FREE_TIER_HABIT_LIMIT}
        onCancel={() => setPickOneVisible(false)}
        onStart={handleStart}
      />

      {goal && (
        <PartialSlipSheet
          visible={partialVisible}
          skipValue={goal.skipValue}
          onCancel={() => setPartialVisible(false)}
          onSave={async (amount) => {
            await savePartialSlip(goal.id, amount);
            setPartialVisible(false);
          }}
        />
      )}

      {goal && (
        <EditSkipValueSheet
          visible={editSkipVisible}
          initialValue={goal.skipValue}
          onCancel={() => setEditSkipVisible(false)}
          onSave={async (value) => {
            await updateSkipValue(goal.id, value);
            setEditSkipVisible(false);
          }}
        />
      )}
    </>
  );
}

type HabitDetailBreakingProps = {
  habit: DetectedHabit;
  goal: HabitChangeGoal;
  milestoneJustHit: 10 | 30 | 50 | 66 | null;
  coachMoment?: { goalId: string; cardId: CoachMomentCardId } | null;
  onSkip: () => void;
  onSlip: () => void;
  onChangeAnswer: () => void;
  onBackfill: (state: 'skipped' | 'slipped') => void;
  onOpenPartial: () => void;
  onEditSkipValue: () => void;
  onStopBreaking: () => void;
};

/**
 * The "breaking now" view of the detail screen (spec 01 §4.8): the same
 * check-in card, then Kept / This week / Total skips, then the long arc, then
 * history, then the footer actions. No longest-streak stat, no milestone
 * marker row; the arc replaces both.
 */
function HabitDetailBreaking({
  habit,
  goal,
  milestoneJustHit,
  coachMoment,
  onSkip,
  onSlip,
  onChangeAnswer,
  onBackfill,
  onOpenPartial,
  onEditSkipValue,
  onStopBreaking,
}: HabitDetailBreakingProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isDaily = habit.frequency === 'daily';
  const today = atMidnight(new Date());
  const wk = isDaily ? weekStats(goal.dayLogs, today, goal.trackingStart, goal.skipValue) : null;
  const displayTotal = Math.max(goal.totalSkips, goal.highestMilestoneReached);

  return (
    <View style={styles.breakingStack}>
      <CheckInCard
        habit={habit}
        goal={goal}
        milestoneJustHit={milestoneJustHit}
        coachMoment={coachMoment}
        onSkip={onSkip}
        onSlip={onSlip}
        onChangeAnswer={onChangeAnswer}
        onBackfill={onBackfill}
        onOpenPartial={onOpenPartial}
      />

      <View style={styles.statsRow}>
        <StatBlock label={strings.habitLogging.statKept} value={format(goal.kept)} />
        <StatBlock
          label={strings.habitLogging.statThisWeek}
          value={isDaily ? `${wk?.skips ?? 0} of ${wk?.answered ?? 0}` : strings.habitLogging.statThisWeekWeekly(periodSkipCount(goal))}
        />
        <StatBlock label={strings.habitLogging.statTotalSkips} value={String(goal.totalSkips)} />
      </View>

      <LongArc displayTotal={displayTotal} />

      {isDaily ? (
        <HistoryCalendar dayLogs={goal.dayLogs} trackingStart={goal.trackingStart} onSelectToday={onChangeAnswer} />
      ) : (
        <EventHistory dayLogs={goal.dayLogs} skipValue={goal.skipValue} />
      )}

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onEditSkipValue}>
          <Text style={styles.secondaryButtonText}>{strings.habitLogging.editSkipValue(format(goal.skipValue))}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.plainButton} onPress={onStopBreaking}>
          <Text style={styles.plainButtonText}>{strings.habitLogging.stopBreakingHabit}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** This week's (Mon-Sun) skip events, for the weekly/monthly stat block. */
function periodSkipCount(goal: HabitChangeGoal): number {
  const now = new Date();
  const dow = now.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = atMidnight(new Date(now));
  monday.setDate(monday.getDate() + diffToMonday);
  return goal.dayLogs.filter((e) => e.state === 'skipped' && e.date.getTime() >= monday.getTime()).length;
}

function StatBlock({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** "Edit one skip keeps" footer sheet (spec 01 §4.8): single-field amount edit. */
function EditSkipValueSheet({
  visible,
  initialValue,
  onCancel,
  onSave,
}: {
  visible: boolean;
  initialValue: number;
  onCancel: () => void;
  onSave: (value: number) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [text, setText] = useState(String((initialValue / 100).toFixed(2)));

  React.useEffect(() => {
    if (visible) setText(String((initialValue / 100).toFixed(2)));
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.editSheetContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.grabber} />
        <Text style={styles.editSheetTitle}>{strings.habitLogging.pickOneFieldLabel}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel={`${strings.habitLogging.pickOneFieldLabel}, amount`}
          />
        </View>
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              const parsed = parseFloat(text);
              onSave(Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0);
            }}
          >
            <Text style={styles.primaryButtonText}>{strings.common.save}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>{strings.common.cancel}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      padding: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    headerSection: {
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    description: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 24,
    },
    breakingStack: {
      gap: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    statBlock: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    statLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    footerActions: {
      gap: 8,
    },
    actionsSection: {
      gap: 12,
      marginTop: 8,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 14,
      gap: 8,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.white,
    },
    secondaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryButtonText: {
      fontSize: 15,
      color: theme.text,
      fontWeight: '600',
    },
    plainButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    plainButtonText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    editSheetContainer: {
      flex: 1,
      backgroundColor: theme.surface,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 28,
    },
    grabber: {
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 14,
    },
    editSheetTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
    },
    input: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
    },
  });
}
