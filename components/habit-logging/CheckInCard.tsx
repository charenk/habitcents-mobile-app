import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
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
import { useReducedMotion, hapticSuccess } from '@/utils/motion';
import { motion, radii, shadows, typeScale, type AppTheme } from '@/constants/theme';
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

/** Style carrying the pulse: a native-driven scale, or an opacity fade under reduced motion. */
type PulseStyle = Animated.WithAnimatedValue<StyleProp<ViewStyle>>;

/**
 * UX-011: the last answer already spoken aloud, per goal id.
 *
 * The same goal's CheckInCard can be mounted twice at once (Today stays
 * mounted under a habit-detail push), and both instances observe the same
 * state change, so without this both would call announceForAccessibility for
 * one answer. Module scope is deliberate: it is the only place two sibling
 * component instances can agree on. Bounded by the habit cap, so it cannot
 * grow unbounded.
 */
const lastAnnouncedAnswerByGoal = new Map<string, string>();

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
 * The answer card (spec 01 §4.2, restyled for design/redesign-handoff/
 * 04-screens.md "Today" 3). The single shared component used identically on
 * Today and the habit detail screen (principle 6, acceptance test 6): never a
 * different control between the two surfaces.
 *
 * Motion budget: the redesign allows exactly one playful motion in the whole
 * app and it lives here, on the skip confirmation (280ms, scale 1 to 1.04 to
 * 1). Reduced motion swaps it for an opacity fade. Nothing else animates, and
 * a slip never animates at all.
 */
function CheckInCardImpl({
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
  const reduceMotion = useReducedMotion();

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

  // The one allowed pulse (spec 01 §4, "Motion"): fires when the habit's own
  // skip total goes up, so it follows a real skip on either cadence and never
  // a slip or a re-render. goal.totalSkips is read, never recomputed.
  const pulse = useRef(new Animated.Value(1)).current;
  const prevSkips = useRef(goal.totalSkips);
  useEffect(() => {
    const skipped = goal.totalSkips > prevSkips.current;
    prevSkips.current = goal.totalSkips;
    if (!skipped) return;
    pulse.setValue(0);
    Animated.timing(pulse, {
      toValue: 1,
      duration: motion.pulse,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
  }, [goal.totalSkips, pulse]);

  const pulseStyle: PulseStyle = reduceMotion
    ? { opacity: pulse }
    : {
        transform: [
          { scale: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.04, 1] }) },
        ],
      };

  // Coach Moment (P2-2, spec 01 §4.5): the trigger/dedup engine
  // (utils/coachMoments.ts, driven from HabitsContext) already decided which
  // card (if any) applies to this goal's most recent answer; this component
  // only resolves the card id to its copy and the milestone tint/headline.
  const coach = useMemo(() => {
    if (isDaily && !answered) return null;
    if (!isDaily && !showEventConfirmation) return null;
    if (!coachMoment || coachMoment.goalId !== goal.id) return null;

    const tint = isMilestoneCard(coachMoment.cardId);
    const skipped = isDaily ? todayState === 'skipped' : lastEntry?.state === 'skipped';
    return {
      text: cardText(coachMoment.cardId),
      tint,
      tone: (skipped ? 'sage' : 'snow') as 'sage' | 'snow',
      headline: tint && milestoneJustHit
        ? strings.habitLogging.milestoneHeadline(goal.totalSkips, chapterCopy(chapterForTotal(milestoneJustHit)))
        : undefined,
    };
  }, [
    isDaily,
    answered,
    showEventConfirmation,
    coachMoment,
    goal.id,
    goal.totalSkips,
    milestoneJustHit,
    todayState,
    lastEntry,
  ]);

  const skipValueLabel = format(goal.skipValue);
  const todayEntry = goal.dayLogs.find((e) => atMidnight(e.date).getTime() === today.getTime());

  const handleSkip = () => {
    hapticSuccess();
    onSkip();
  };

  // UX-011: the skip/slip confirmation replaces the question block, and the
  // tapped button unmounts with it, so a VoiceOver user hears nothing about
  // what just happened (WCAG 4.1.3). House pattern from components/ui/
  // Toast.tsx: AccessibilityInfo.announceForAccessibility with the same
  // headline the confirmation renders, via confirmationCopy so the spoken
  // and visible text can never drift apart. Fired only when the headline
  // actually changes after the first render, never on mount, so returning to
  // an already-answered card (e.g. navigating back to Today) stays silent.
  const activeConfirmationHeadline =
    isDaily && answered
      ? confirmationCopy({
          isDaily: true,
          state: todayState,
          firstEver: todayState === 'skipped' && goal.totalSkips === 1,
          skipValueLabel,
          weekSkips: wk?.skips ?? 0,
          weekAnswered: wk?.answered ?? 0,
          keptTotal: format(goal.kept),
          keptIsZero: goal.kept === 0,
          partialAmount: todayEntry?.partialAmount,
          skipValue: goal.skipValue,
          format,
        }).headline
      : !isDaily && showEventConfirmation && lastEntry
        ? confirmationCopy({
            isDaily: false,
            state: lastEntry.state,
            firstEver: lastEntry.state === 'skipped' && goal.totalSkips === 1,
            skipValueLabel,
            weekSkips: periodSkipCount(goal),
            weekAnswered: 0,
            keptTotal: format(goal.kept),
            keptIsZero: goal.kept === 0,
            partialAmount: undefined,
            skipValue: goal.skipValue,
            format,
          }).headline
        : null;

  // UX-011: speak the confirmation, because the core loop's primary feedback
  // was otherwise silent for VoiceOver (WCAG 4.1.3).
  //
  // Two things this has to get right, both found in review:
  //
  // 1. Speak ONCE per answer. Today renders a CheckInCard per habit and habit
  //    detail renders one for the same goal; opening detail is a stack push,
  //    so Today stays mounted and both instances fire, which on iOS
  //    interrupts the utterance mid-word and on TalkBack queues it twice. The
  //    guard is the module-level map below rather than a focus check, because
  //    a card should not have to know about routing to be correct, and
  //    requiring a navigation context would make this component unrenderable
  //    in isolation.
  // 2. Dedupe on the ANSWER EVENT, not on the headline text. A weekly habit
  //    allows several skips in a period and every repeat resolves to the same
  //    string ("+$5.00 kept."), so comparing headlines swallowed every skip
  //    after the first. answerToken moves whenever an answer lands: a skip
  //    bumps totalSkips and kept, a slip appends a log, a partial changes
  //    kept, a corrected answer moves totalSkips. Same idea the pulse effect
  //    above uses, and for the same reason.
  const answerToken = `${goal.dayLogs.length}:${goal.totalSkips}:${goal.kept}`;
  const announcedOnceRef = useRef(false);
  const lastAnswerTokenRef = useRef(answerToken);
  useEffect(() => {
    const answered = answerToken !== lastAnswerTokenRef.current;
    lastAnswerTokenRef.current = answerToken;
    const wasFirstRender = !announcedOnceRef.current;
    announcedOnceRef.current = true;
    if (wasFirstRender || !answered) return;
    if (!activeConfirmationHeadline) return;
    // Cross-instance guard, see note above: whichever mounted card runs its
    // effect first speaks; the other sees the same token already claimed and
    // stays quiet.
    if (lastAnnouncedAnswerByGoal.get(goal.id) === answerToken) return;
    lastAnnouncedAnswerByGoal.set(goal.id, answerToken);
    AccessibilityInfo.announceForAccessibility(activeConfirmationHeadline);
  }, [answerToken, activeConfirmationHeadline, goal.id]);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpenDetail}
        disabled={!onOpenDetail}
        style={styles.header}
        accessibilityRole={onOpenDetail ? 'button' : undefined}
        accessibilityLabel={onOpenDetail ? strings.today.openHabitLabel(habit.name) : undefined}
      >
        <Text style={styles.name} numberOfLines={2}>{habit.name}</Text>
        {!isDaily && (
          <View style={styles.cadencePill}>
            {/* Detection emits monthly leaks too, so the pill names the real
                cadence rather than always saying weekly. */}
            <Text style={styles.cadencePillText}>
              {habit.frequency === 'monthly' ? strings.today.monthlyPill : strings.today.weeklyPill}
            </Text>
          </View>
        )}
        <View style={styles.headerSpacer} />
        {onOpenDetail && <Icon name="ChevronRight" size={16} color={theme.mistText} />}
      </Pressable>

      {isDaily && <WeekStrip dayLogs={goal.dayLogs} trackingStart={goal.trackingStart} skipValue={goal.skipValue} />}

      {isDaily && !answered && (
        <View style={styles.questionBlock}>
          <Text style={styles.question}>{strings.habitLogging.dailyQuestion}</Text>
          {goal.firstRun && <Text style={styles.firstRun}>{strings.habitLogging.firstRunLine}</Text>}
          <View style={styles.buttonsRow}>
            <Button
              label={strings.today.skipWithValue(skipValueLabel)}
              onPress={handleSkip}
              variant="primary"
              style={styles.skipButton}
            />
            <Button
              label={strings.today.boughtIt}
              onPress={onSlip}
              variant="secondary"
              style={styles.slipButton}
            />
          </View>
        </View>
      )}

      {!isDaily && (
        <View style={styles.questionBlock}>
          <View style={styles.eventHeaderRow}>
            <Text style={styles.question}>{strings.today.weeklyNoCheckIn}</Text>
            {goal.totalSkips > 0 && (
              <View style={styles.periodChip}>
                <Text style={styles.periodChipText}>{strings.habitLogging.periodChip(periodSkipCount(goal))}</Text>
              </View>
            )}
          </View>
          {goal.firstRun && <Text style={styles.firstRun}>{strings.habitLogging.firstRunLine}</Text>}
          <View style={styles.buttonsRow}>
            <Button
              label={strings.today.skipOneWithValue(skipValueLabel)}
              onPress={handleSkip}
              variant="primary"
              style={styles.skipButton}
            />
          </View>
        </View>
      )}

      {isDaily && answered && (
        <View style={styles.answeredBlock}>
          <ConfirmationBlock
            isDaily
            state={todayState}
            firstEver={todayState === 'skipped' && goal.totalSkips === 1}
            skipValueLabel={skipValueLabel}
            weekSkips={wk?.skips ?? 0}
            weekAnswered={wk?.answered ?? 0}
            keptTotal={format(goal.kept)}
            keptIsZero={goal.kept === 0}
            partialAmount={todayEntry?.partialAmount}
            skipValue={goal.skipValue}
            format={format}
            pulseStyle={pulseStyle}
            styles={styles}
            theme={theme}
          />

          {coach && (
            <CoachMomentSlot text={coach.text} tint={coach.tint} tone={coach.tone} headline={coach.headline} />
          )}

          <View style={styles.linksRow}>
            <Pressable
              onPress={onChangeAnswer}
              accessibilityRole="button"
              // UX-031: was 12/12, ~41pt effective on the 14pt semibold
              // label. 14/14 clears the 44pt minimum on the controls anxious
              // users reach for most (change answer, spent less than usual).
              hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            >
              <Text style={styles.linkText}>{strings.habitLogging.changeAnswer}</Text>
            </Pressable>
            {todayState === 'slipped' && todayEntry?.partialAmount == null && (
              <Pressable
                onPress={onOpenPartial}
                accessibilityRole="button"
                // UX-031: same 44pt correction as "change answer" above.
                hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
              >
                <Text style={styles.linkText}>{strings.habitLogging.spentLessThanUsual}</Text>
              </Pressable>
            )}
          </View>

          {canBackfill && (
            <View style={styles.backfillBlock}>
              <Text style={styles.backfillPrompt}>{strings.habitLogging.missedYesterday}</Text>
              <View style={styles.buttonsRow}>
                <Button
                  label={strings.habitLogging.backfillSkip}
                  onPress={() => onBackfill('skipped')}
                  variant="secondary"
                  style={styles.backfillButton}
                />
                <Button
                  label={strings.habitLogging.backfillBought}
                  onPress={() => onBackfill('slipped')}
                  variant="secondary"
                  style={styles.backfillButton}
                />
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
          <ConfirmationBlock
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
            pulseStyle={pulseStyle}
            styles={styles}
            theme={theme}
          />
          {coach && (
            <CoachMomentSlot text={coach.text} tint={coach.tint} tone={coach.tone} headline={coach.headline} />
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Memoized: CheckInCard renders once per habit being actively broken, on
 * both Today's "Breaking now" section and the habit detail screen. NOTE
 * (perf phase, see PR body): Today's SectionList call site
 * (app/(tabs)/index.tsx renderItem) still builds onSkip/onSlip/onChangeAnswer/
 * onBackfill/onOpenPartial/onOpenDetail as fresh inline arrows every render,
 * and the underlying HabitsContext mutators (answerToday etc.) also change
 * identity on every goals/habits mutation regardless of the call site, so the
 * memo does not fully bail there yet. Stabilizing that chain was skipped as
 * too risky for a zero-visible-change pass (see report); the detail screen
 * (app/habit/[id].tsx) renders a single instance, so it isn't a "hot list"
 * concern there either way.
 */
export const CheckInCard = memo(CheckInCardImpl);

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

type ConfirmationBlockProps = {
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
  pulseStyle: PulseStyle;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
};

type ConfirmationCopyArgs = {
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

/**
 * UX-011: pulled out of ConfirmationBlock so CheckInCardImpl's announce
 * effect and the confirmation's own render always resolve the exact same
 * text, never two copies that can drift apart.
 */
function confirmationCopy({
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
}: ConfirmationCopyArgs): { headline: string; detail: string | null } {
  const skipped = state === 'skipped';

  let headline: string;
  let detail: string | null = null;

  if (skipped) {
    headline = firstEver
      ? strings.habitLogging.skipConfirmationFirstEver(skipValueLabel)
      : strings.today.keptAdded(skipValueLabel);
    if (!firstEver) {
      detail = isDaily
        ? strings.today.daysThisWeek(weekSkips, weekAnswered)
        : strings.habitLogging.periodChip(weekSkips);
    }
  } else if (partialAmount != null) {
    headline = strings.habitLogging.partialConfirmation(
      format(partialAmount),
      skipValueLabel,
      format(Math.max(0, skipValue - partialAmount))
    );
  } else if (keptIsZero) {
    headline = strings.habitLogging.slipConfirmationZero;
  } else if (isDaily) {
    headline = strings.today.slipLogged;
    detail = strings.today.slipKeptStays(weekSkips, weekAnswered);
  } else {
    headline = strings.habitLogging.slipConfirmationWeekly(keptTotal);
  }

  return { headline, detail };
}

/**
 * The confirmation slot: a 40px badge plus one or two lines. A skip is a sage
 * circle-check, a slip is a cloud circle-minus. The slip badge is deliberately
 * neutral: a slip is not a failure and never subtracts from kept.
 */
function ConfirmationBlock({
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
  pulseStyle,
  styles,
  theme,
}: ConfirmationBlockProps) {
  const skipped = state === 'skipped';
  const { headline, detail } = confirmationCopy({
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
  });

  return (
    <Animated.View style={[styles.confirmationRow, skipped ? pulseStyle : null]}>
      <View style={[styles.badge, skipped ? styles.badgeSkip : styles.badgeSlip]}>
        {/* UX-001: the skip badge is sage (theme.primary); white on sage was
            2.71:1, below the 3:1 icon floor. The slip badge is cloud, so
            mistText there is unaffected. */}
        <Icon
          name={skipped ? 'Check' : 'Minus'}
          size={20}
          color={skipped ? theme.ink : theme.mistText}
        />
      </View>
      <View style={styles.confirmationText}>
        <Text style={styles.confirmationHeadline}>{headline}</Text>
        {detail && <Text style={styles.confirmationDetail}>{detail}</Text>}
      </View>
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.cloud,
      ...shadows.card,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerSpacer: {
      flex: 1,
    },
    name: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.button,
      color: theme.ink,
      flexShrink: 1,
    },
    cadencePill: {
      backgroundColor: theme.coachMomentMilestoneBg,
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    // UX-005: ink on the lavender tint, not lavender on lavender. Same fix as
    // LongArc's chapter pill: lavender text on this 14% lavender background
    // was 2.9:1, below AA at this size.
    cadencePillText: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      color: theme.ink,
    },
    questionBlock: {
      marginTop: 14,
    },
    question: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.body,
      color: theme.ink,
      flexShrink: 1,
    },
    eventHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    periodChip: {
      backgroundColor: theme.snow,
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    periodChipText: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.caption,
      color: theme.slate,
      fontVariant: ['tabular-nums'],
    },
    firstRun: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      marginTop: 4,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    // The skip is the point of the card, so it carries the wider share of the
    // row as well as the only sage fill on this surface.
    skipButton: {
      flex: 1.6,
    },
    slipButton: {
      flex: 1,
    },
    backfillButton: {
      flex: 1,
    },
    answeredBlock: {
      marginTop: 14,
    },
    confirmationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    badge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeSkip: {
      backgroundColor: theme.primary,
    },
    badgeSlip: {
      backgroundColor: theme.cloud,
    },
    confirmationText: {
      flex: 1,
    },
    confirmationHeadline: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    confirmationDetail: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    linksRow: {
      flexDirection: 'row',
      gap: 18,
      marginTop: 14,
      flexWrap: 'wrap',
    },
    linkText: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.label,
      color: theme.slate,
    },
    backfillBlock: {
      borderTopWidth: 1,
      borderTopColor: theme.hairlineSubtle,
      marginTop: 14,
      paddingTop: 12,
    },
    backfillPrompt: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
    },
    backfillDone: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      marginTop: 12,
      fontVariant: ['tabular-nums'],
    },
  });
}
