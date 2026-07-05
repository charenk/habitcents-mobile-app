import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { WeekStrip } from './WeekStrip';
import { CoachMomentSlot } from './CoachMomentSlot';
import {
  atMidnight,
  canBackfillYesterday,
  chapterForTotal,
  dayStateFor,
  weekStats,
} from '@/utils/habitLogging';
import { cardText, isMilestoneCard, type CoachMomentCardId } from '@/utils/coachMoments';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit, HabitChangeGoal } from '@/types/habit';
import { strings } from '@/constants/strings';

type CheckInCardProps = {
  habit: DetectedHabit;
  goal: HabitChangeGoal;
  milestoneJustHit: 10 | 30 | 50 | 66 | null;
  /**
   * The Coach Moment selected for this goal's most recent answer, if any
   * (P2-2 §5: once per triggering event; HabitsContext clears this after a
   * Change-answer correction or once the next render has no fresh event).
   */
  coachMoment?: { goalId: string; cardId: CoachMomentCardId } | null;
  onSkip: () => void;
  onSlip: () => void;
  onChangeAnswer: () => void;
  onBackfill: (state: 'skipped' | 'slipped') => void;
  onOpenPartial: () => void;
  onOpenDetail?: () => void;
};

function chapterCopy(chapter: ReturnType<typeof chapterForTotal>): string {
  switch (chapter) {
    case 'Deciding': return strings.habitLogging.chapterDeciding;
    case 'Rhythm': return strings.habitLogging.chapterRhythm;
    case 'Cruising': return strings.habitLogging.chapterCruising;
    case 'Rewiring': return strings.habitLogging.chapterRewiring;
    case 'Rewired': return strings.habitLogging.chapterRewired;
  }
}

/**
 * The answer card (spec 01 §4.2). The single shared component used identically
 * on the Habits tab and the habit detail screen (principle 6, acceptance test
 * 6): never a different control between the two surfaces.
 */
export function CheckInCard({
  habit,
  goal,
  milestoneJustHit,
  coachMoment,
  onSkip,
  onSlip,
  onChangeAnswer,
  onBackfill,
  onOpenPartial,
  onOpenDetail,
}: CheckInCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isDaily = habit.frequency === 'daily';
  const today = atMidnight(new Date());
  const todayState = isDaily ? dayStateFor(goal.dayLogs, today) : 'no-log';
  const answered = isDaily ? todayState !== 'no-log' : false;
  const wk = isDaily ? weekStats(goal.dayLogs, today, goal.trackingStart, goal.skipValue) : null;
  const canBackfill = isDaily && canBackfillYesterday(goal.dayLogs, today, goal.trackingStart, goal.backfillUsed);
  const yesterdayState = isDaily ? dayStateFor(goal.dayLogs, new Date(today.getTime() - 86400000)) : 'no-log';

  // Weekly/monthly: last answer this period, purely for the confirmation slot;
  // the period chip and question always show (multiple skips/period allowed).
  const lastEntry = !isDaily && goal.dayLogs.length > 0 ? goal.dayLogs[goal.dayLogs.length - 1] : null;
  const showEventConfirmation = !isDaily && lastEntry != null && isSameCalendarMinute(lastEntry.date, new Date());

  // Coach Moment (P2-2, spec 01 §4.5): the trigger/dedup engine
  // (utils/coachMoments.ts, driven from HabitsContext) already decided which
  // card (if any) applies to this goal's most recent answer; this component
  // only resolves the card id to its copy and the milestone tint/headline.
  const coach = useMemo(() => {
    if (isDaily && !answered) return null;
    if (!isDaily && !showEventConfirmation) return null;
    if (!coachMoment || coachMoment.goalId !== goal.id) return null;

    const tint = isMilestoneCard(coachMoment.cardId);
    return {
      text: cardText(coachMoment.cardId),
      tint,
      headline: tint && milestoneJustHit
        ? strings.habitLogging.milestoneHeadline(goal.totalSkips, chapterCopy(chapterForTotal(milestoneJustHit)))
        : undefined,
    };
  }, [isDaily, answered, showEventConfirmation, coachMoment, goal.id, goal.totalSkips, milestoneJustHit]);

  const skipValueLabel = format(goal.skipValue);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onOpenDetail}
          disabled={!onOpenDetail}
          style={styles.headerButton}
          accessibilityRole={onOpenDetail ? 'button' : undefined}
          accessibilityLabel={onOpenDetail ? `${habit.name}, open details` : undefined}
        >
          <Text style={styles.name}>{habit.name}</Text>
          {onOpenDetail && <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />}
        </TouchableOpacity>
      </View>

      {isDaily && <WeekStrip dayLogs={goal.dayLogs} trackingStart={goal.trackingStart} skipValue={goal.skipValue} />}

      {isDaily && !answered && (
        <View style={styles.questionBlock}>
          <Text style={styles.question}>{strings.habitLogging.dailyQuestion}</Text>
          {goal.firstRun && <Text style={styles.firstRun}>{strings.habitLogging.firstRunLine}</Text>}
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={onSkip} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>{strings.habitLogging.skipButton(skipValueLabel)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onSlip} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>{strings.habitLogging.boughtItButton}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isDaily && (
        <View style={styles.questionBlock}>
          <View style={styles.eventHeaderRow}>
            <Text style={styles.question}>{strings.habitLogging.weeklyValueLine(skipValueLabel)}</Text>
            {goal.totalSkips > 0 && (
              <View style={styles.periodChip}>
                <Text style={styles.periodChipText}>{strings.habitLogging.periodChip(periodSkipCount(goal))}</Text>
              </View>
            )}
          </View>
          {goal.firstRun && <Text style={styles.firstRun}>{strings.habitLogging.firstRunLine}</Text>}
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={onSkip} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>{strings.habitLogging.skipOneButton}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onSlip} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>{strings.habitLogging.boughtItButton}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isDaily && answered && (
        <View style={styles.answeredBlock}>
          <ConfirmationLine
            isDaily
            state={todayState}
            firstEver={todayState === 'skipped' && goal.totalSkips === 1}
            skipValueLabel={skipValueLabel}
            weekSkips={wk?.skips ?? 0}
            weekAnswered={wk?.answered ?? 0}
            keptTotal={format(goal.kept)}
            keptIsZero={goal.kept === 0}
            partialAmount={goal.dayLogs.find((e) => atMidnight(e.date).getTime() === today.getTime())?.partialAmount}
            skipValue={goal.skipValue}
            format={format}
          />

          {coach && (
            <CoachMomentSlot text={coach.text} tint={coach.tint} headline={coach.headline} />
          )}

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={onChangeAnswer} accessibilityRole="button">
              <Text style={styles.linkText}>{strings.habitLogging.changeAnswer}</Text>
            </TouchableOpacity>
            {todayState === 'slipped' &&
              goal.dayLogs.find((e) => atMidnight(e.date).getTime() === today.getTime())?.partialAmount == null && (
                <TouchableOpacity onPress={onOpenPartial} accessibilityRole="button">
                  <Text style={styles.linkText}>{strings.habitLogging.spentLessThanUsual}</Text>
                </TouchableOpacity>
              )}
          </View>

          {canBackfill && (
            <View style={styles.backfillBlock}>
              <Text style={styles.backfillPrompt}>{strings.habitLogging.missedYesterday}</Text>
              <View style={styles.backfillButtons}>
                <TouchableOpacity
                  style={styles.backfillButton}
                  onPress={() => onBackfill('skipped')}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryButtonText}>{strings.habitLogging.backfillSkip}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backfillButton}
                  onPress={() => onBackfill('slipped')}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryButtonText}>{strings.habitLogging.backfillBought}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {!canBackfill && goal.backfillUsed && yesterdayState !== 'no-log' && (
            <Text style={styles.backfillDone}>
              {yesterdayState === 'skipped'
                ? strings.habitLogging.backfillYesterdaySkipped(skipValueLabel)
                : strings.habitLogging.backfillYesterdaySlipped}
            </Text>
          )}
        </View>
      )}

      {!isDaily && showEventConfirmation && lastEntry && (
        <View style={styles.answeredBlock}>
          <ConfirmationLine
            isDaily={false}
            state={lastEntry.state}
            firstEver={lastEntry.state === 'skipped' && goal.totalSkips === 1}
            skipValueLabel={skipValueLabel}
            weekSkips={periodSkipCount(goal)}
            weekAnswered={0}
            keptTotal={format(goal.kept)}
            keptIsZero={goal.kept === 0}
            partialAmount={undefined}
            skipValue={goal.skipValue}
            format={format}
          />
          {coach && <CoachMomentSlot text={coach.text} tint={coach.tint} headline={coach.headline} />}
        </View>
      )}
    </View>
  );
}

function isSameCalendarMinute(a: Date, b: Date): boolean {
  // Weekly/monthly events don't have a persistent "today's answer"; treat the
  // most recent event as "just answered" for the confirmation slot when it
  // happened today, matching the daily-cadence UX of confirming the latest tap.
  return atMidnight(a).getTime() === atMidnight(b).getTime();
}

function periodSkipCount(goal: HabitChangeGoal): number {
  // This week's Mon-Sun skip events for the period chip (spec §3.3).
  const now = new Date();
  const dow = now.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = atMidnight(new Date(now));
  monday.setDate(monday.getDate() + diffToMonday);
  return goal.dayLogs.filter((e) => e.state === 'skipped' && e.date.getTime() >= monday.getTime()).length;
}

type ConfirmationLineProps = {
  isDaily: boolean;
  state: 'skipped' | 'slipped' | 'no-log';
  firstEver: boolean;
  skipValueLabel: string;
  weekSkips: number;
  weekAnswered: number;
  keptTotal: string;
  keptIsZero: boolean;
  partialAmount: number | undefined;
  skipValue: number;
  format: (cents: number) => string;
};

function ConfirmationLine({
  isDaily,
  state,
  firstEver,
  skipValueLabel,
  weekSkips,
  weekAnswered,
  keptTotal,
  keptIsZero,
  partialAmount,
  skipValue,
  format,
}: ConfirmationLineProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  let text: string;
  if (state === 'skipped') {
    text = firstEver
      ? strings.habitLogging.skipConfirmationFirstEver(skipValueLabel)
      : isDaily
        ? strings.habitLogging.skipConfirmationDaily(skipValueLabel, weekSkips, weekAnswered)
        : strings.habitLogging.skipConfirmationWeekly(skipValueLabel, weekSkips);
  } else if (partialAmount != null) {
    const difference = format(Math.max(0, skipValue - partialAmount));
    text = strings.habitLogging.partialConfirmation(format(partialAmount), skipValueLabel, difference);
  } else if (keptIsZero) {
    text = strings.habitLogging.slipConfirmationZero;
  } else {
    text = isDaily
      ? strings.habitLogging.slipConfirmationDaily(weekSkips, weekAnswered, keptTotal)
      : strings.habitLogging.slipConfirmationWeekly(keptTotal);
  }

  return <Text style={styles.confirmation}>{text}</Text>;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    name: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
    },
    questionBlock: {
      marginTop: 12,
    },
    question: {
      fontSize: 15,
      color: theme.text,
    },
    eventHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    periodChip: {
      backgroundColor: theme.background,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    periodChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    firstRun: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    primaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.white,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    answeredBlock: {
      marginTop: 10,
    },
    confirmation: {
      fontSize: 15,
      color: theme.text,
      fontWeight: '500',
    },
    linksRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 10,
      flexWrap: 'wrap',
    },
    linkText: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    backfillBlock: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 12,
      paddingTop: 10,
    },
    backfillPrompt: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    backfillButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    backfillButton: {
      flex: 1,
      minHeight: 38,
      borderRadius: 10,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    backfillDone: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 10,
    },
  });
}
