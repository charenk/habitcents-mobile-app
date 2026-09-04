import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useCheckInFeedback } from '@/components/habit-logging/useCheckInFeedback';
import { CheckInCard } from '@/components/habit-logging/CheckInCard';
import { LongArc } from '@/components/habit-logging/LongArc';
import { HistoryCalendar } from '@/components/habit-logging/HistoryCalendar';
import { EventHistory } from '@/components/habit-logging/EventHistory';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { PartialSlipSheet } from '@/components/habit-logging/PartialSlipSheet';
import { Sheet } from '@/components/ui/Sheet';
import { SheetHeader } from '@/components/ui/SheetHeader';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Button } from '@/components/ui/Button';
import { AmountField } from '@/components/ui/AmountField';
import { useToast } from '@/components/ui/Toast';
import { atMidnight, weekStats, isHabitLimitReached, displayChapter } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import type { CoachMomentCardId } from '@/utils/coachMoments';
import { typeScale, layout, type AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';
import { strings } from '@/constants/strings';
import { hapticError, hapticWarning } from '@/utils/motion';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { format } = useCurrency();

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
  const [stopConfirmVisible, setStopConfirmVisible] = useState(false);
  const toast = useToast();
  const answerFeedback = useCheckInFeedback();

  if (!habit) {
    return (
      <View style={styles.container}>
        <ScreenHeader onBack={() => router.back()} />
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

  // Confirm in a bottom sheet rather than a native alert (spec 04 habit
  // detail): serif title, the history-is-kept reassurance, coral confirm.
  const handleStopBreaking = () => {
    if (!goal) return;
    hapticWarning();
    setStopConfirmVisible(true);
  };

  const confirmStopBreaking = async () => {
    if (!goal) return;
    try {
      await stopBreakingHabit(goal.id);
    } catch (error) {
      // Leave the sheet up and stay on the screen: the habit is still being
      // broken, and navigating back would show the user a state that did not
      // change while telling them it did.
      console.error('Error stopping habit:', error);
      hapticError();
      toast.show(strings.toasts.stopHabitFailed);
      return;
    }
    setStopConfirmVisible(false);
    toast.show(strings.toasts.stoppedHistoryKept);
    router.back();
  };

  // Serif titles end in a period, habit names included (spec 01 s2).
  const habitTitle = /\.$/.test(habit.name) ? habit.name : `${habit.name}.`;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader title={habitTitle} onBack={() => router.back()} />
        {/* UX-061: seeded habits (the break-a-habit flow) carry description
            '', which used to render as an always-present empty block. */}
        {habit.description ? (
          <View style={styles.headerSection}>
            <Text style={styles.description}>{habit.description}</Text>
          </View>
        ) : null}

        {goal ? (
          <HabitDetailBreaking
            habit={habit}
            goal={goal}
            milestoneJustHit={lastMilestone?.goalId === goal.id ? lastMilestone.threshold : null}
            coachMoment={lastCoachMoment}
            onSkip={() => answerFeedback(() => (habit.frequency === 'daily' ? answerToday(goal.id, 'skipped') : answerEvent(goal.id, 'skipped')))}
            onSlip={() => answerFeedback(() => (habit.frequency === 'daily' ? answerToday(goal.id, 'slipped') : answerEvent(goal.id, 'slipped')))}
            onChangeAnswer={() => answerFeedback(() => changeTodayAnswer(goal.id))}
            onBackfill={(state) => answerFeedback(() => backfillYesterday(goal.id, state))}
            onOpenPartial={() => setPartialVisible(true)}
            onEditSkipValue={() => setEditSkipVisible(true)}
            onStopBreaking={handleStopBreaking}
          />
        ) : (
          <View style={styles.actionsSection}>
            <Button
              label={strings.habitLogging.startBreakingIt}
              onPress={() => setPickOneVisible(true)}
              variant="primary"
            />
          </View>
        )}
      </ScrollView>

      <PickOneSheet
        visible={pickOneVisible}
        habit={habit}
        monthTotal={habit.totalMonthlySpend}
        occurrences={habit.occurrencesPerPeriod}
        freeTierBlocked={isHabitLimitReached(getActiveHabits().length, getEntitlement())}
        onCancel={() => setPickOneVisible(false)}
        onStart={handleStart}
        onStartTrial={() => {
          setPickOneVisible(false);
          router.push('/paywall?placement=habit_gate_detail');
        }}
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
            try {
              await updateSkipValue(goal.id, value);
            } catch (error) {
              // Sheet stays open with the typed value intact, so a retry is
              // one tap rather than a re-entry.
              console.error('Error saving skip value:', error);
              hapticError();
              toast.show(strings.toasts.skipValueFailed);
              return;
            }
            setEditSkipVisible(false);
            toast.show(strings.toasts.skipValueSaved(format(value)));
          }}
        />
      )}

      <ConfirmSheet
        visible={stopConfirmVisible}
        onClose={() => setStopConfirmVisible(false)}
        onConfirm={() => {
          void confirmStopBreaking();
        }}
        title={strings.habitLogging.stopBreakingConfirmTitle}
        body={strings.habitLogging.stopBreakingConfirmMessage}
        confirmLabel={strings.habitDetailV2.stopConfirmCta}
        cancelLabel={strings.habitDetailV2.stopConfirmKeepGoing}
      />
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
        <StatBlock label={strings.habitLogging.statKept} value={format(goal.kept)} tinted />
        <StatBlock
          label={strings.habitLogging.statThisWeek}
          value={isDaily ? `${wk?.skips ?? 0} of ${wk?.answered ?? 0}` : strings.habitLogging.statThisWeekWeekly(periodSkipCount(goal))}
        />
        <StatBlock label={strings.habitLogging.statTotalSkips} value={String(goal.totalSkips)} />
      </View>

      <LongArc
        displayTotal={displayTotal}
        chapter={displayChapter(goal.totalSkips, goal.highestMilestoneReached)}
      />

      {isDaily ? (
        <HistoryCalendar dayLogs={goal.dayLogs} trackingStart={goal.trackingStart} onSelectToday={onChangeAnswer} />
      ) : (
        <EventHistory dayLogs={goal.dayLogs} skipValue={goal.skipValue} />
      )}

      <View style={styles.footerActions}>
        {/* UX-039: was a hand-rolled secondaryButton (no minHeight), now the
            shared vocabulary's secondary variant. */}
        <Button
          variant="secondary"
          label={strings.habitLogging.editSkipValue(format(goal.skipValue))}
          onPress={onEditSkipValue}
        />
        {/*
          UX-039: was a hand-rolled plainButton; now the shared tertiary
          variant (bare, slate text), which is the closest vocabulary match
          to the look this trigger has always had.

          NOTE (discrepancy, not fixed here): theme.ts documents "stop
          breaking" (theme.danger/theme.coral) as the app's one destructive
          action, but this trigger has always rendered as a muted, tier-two
          slate link, never coral. That may be a deliberate lower-emphasis
          choice (breaking a habit is reversible, "history is kept"), but it
          is a live contradiction with theme.ts's own comment. Flagging per
          the audit instruction rather than silently recoloring it to coral
          or rewriting theme.ts's comment.
        */}
        <Button
          variant="tertiary"
          label={strings.habitLogging.stopBreakingHabit}
          onPress={onStopBreaking}
        />
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

function StatBlock({ label, value, tinted }: { label: string; value: string; tinted?: boolean }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.statBlock, tinted ? styles.statBlockTinted : null]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * "Edit one skip keeps" footer sheet (spec 01 §4.8): single-field amount
 * edit. ADR 0023: a native-keyboard AmountField, auto-focused, since the
 * whole point of opening this sheet is to change the number -- there is
 * nothing else to look at first.
 *
 * Exported (not just a local closure) so it can be unit tested directly
 * without standing up the full habit detail screen's provider stack.
 */
export function EditSkipValueSheet({
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
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [cents, setCents] = useState(initialValue);

  React.useEffect(() => {
    if (visible) setCents(initialValue);
  }, [visible, initialValue]);

  // UX-051: same guard as PartialSlipSheet/PickOneSheet. Saving $0.00 here
  // would silently make every future skip on this habit keep nothing.
  // Disabled-until-valid (ops ADR 0028, 2026-08-16): Save is disabled until
  // an amount is entered, rather than staying live and toasting "Enter an
  // amount first." on an empty tap (the old house pattern).
  const canSave = cents !== 0;

  const handleSave = () => {
    // Unreachable from the UI now that Save is disabled until canSave; kept
    // as a defensive guard.
    if (!canSave) return;
    onSave(cents);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      avoidKeyboard
      accessibilityLabel={strings.habitDetailV2.skipValueSheetTitle}
    >
      {/* Pinned header-save (ADR 0031): the old small grey label becomes
          the shared serif header, and the bottom Save/Cancel pair is gone.
          Grab handle, scrim, and VoiceOver escape run onCancel via Sheet's
          onClose. Hint only while disabled (ADR 0028). */}
      <SheetHeader
        title={strings.habitDetailV2.skipValueSheetTitle}
        saveLabel={strings.habitDetailV2.skipValueSave}
        onSave={handleSave}
        saveDisabled={!canSave}
        saveHint={canSave ? undefined : strings.sheets.saveHintAmount}
      />
      <View style={styles.editSheetContainer}>
        <AmountField
          valueCents={cents}
          onChangeCents={setCents}
          autoFocus={visible}
          size={48}
          accessibilityLabel={`${strings.habitDetailV2.skipValueSheetTitle}, ${format(cents)}`}
        />
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      // Matches ScreenHeader's own 20pt gutter (PATTERN_VOCABULARY.md: one
      // 20pt horizontal gutter per screen) so the title lines up with the
      // content below it now that both share the same header component.
      paddingHorizontal: 20,
      paddingBottom: layout.screenBottomClearance,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: typeScale.button,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
    },
    headerSection: {
      marginBottom: 16,
    },
    description: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 22,
    },
    breakingStack: {
      gap: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    // Kept is the positive number, so its tile carries the sage-light tint
    // (spec 04, habit detail). The other two stay neutral white.
    statBlockTinted: {
      backgroundColor: theme.primaryLight,
      borderColor: 'transparent',
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
    // Stat numbers are currency or counts, so they take the display serif
    // with tabular figures (spec 01 section 2).
    statValue: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.ink,
    },
    statLabel: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
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
    // UX-039: secondaryButton/secondaryButtonText and plainButton/
    // plainButtonText removed; the footer actions now render on the shared
    // Button component (variant="secondary" / variant="tertiary").
    // UX-061: grabber, inputRow and input removed. Sheet (components/ui/
    // Sheet.tsx) renders its own grab handle, and EditSkipValueSheet has used
    // AmountField, not a plain TextInput, since ADR 0023. editSheetTitle
    // removed with ADR 0031: the title renders in the shared SheetHeader.
    editSheetContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      gap: 8,
    },
  });
}
