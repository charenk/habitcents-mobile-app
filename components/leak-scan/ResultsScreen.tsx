import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDate } from '@/utils/dates';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useHabits } from '@/contexts/HabitsContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { KpiRow } from './KpiRow';
import { CategoryList } from './CategoryList';
import { SpendPulse } from './SpendPulse';
import { HabitCard } from './HabitCard';
import { BiggestLeakCard } from './BiggestLeakCard';
import { ProjectionSection } from './ProjectionSection';
import { ResultsFooter } from './ResultsFooter';
import { useCompleteScanOnboarding } from './useCompleteScanOnboarding';
import { ReviewQueueSheet } from './ReviewQueueSheet';
import { CategoryTransactionsSheet } from './CategoryTransactionsSheet';
import { PulseDayDetailSheet } from './PulseDayDetailSheet';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import {
  buildKpiSummary,
  buildCategorySummary,
  buildProjectionSummary,
  buildReviewQueue,
  runScan,
} from '@/utils/leakScan';
import { spendableRows } from '@/utils/leakScan/netting';
import { seedLastDays, recurringToExpenses, toAddExpenseInput } from '@/utils/leakScan/importWrite';
import { scanResultToSummary } from '@/utils/leakScan/summarize';
import type { ScanFileInput } from '@/utils/leakScan';
import type { PulseCell } from '@/utils/leakScan/spendPulse';
import type { GovernClass, HabitCandidate, ScanResult } from '@/utils/leakScan/types';
import type { ExpenseCategory } from '@/types/expense';
import {
  getScanRules,
  saveScanRules,
  setMerchantCategory,
  suppressHabit,
  type ScanRules,
} from '@/utils/scanRules';
import { habitCandidateToDetectedHabit, scanHabitId } from '@/utils/leakScanBridge';
import { saveScanSummary } from '@/utils/storage';
import { track } from '@/utils/analytics';
import { isHabitLimitReached } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';

type ResultsScreenProps = {
  result: ScanResult;
  files: ScanFileInput[];
};

/** ADR 0020: the ranked-leaks list below the biggest-leak card caps at 5. */
const RANKED_LEAKS_CAP = 5;
/** ADR 0020: the post-scan handoff CTA's import window, widened from 15 to 30
 *  days and promoted to the primary CTA. */
const BRING_IN_DAYS = 30;

function evidenceWindowLabel(result: ScanResult, nAccounts: number): string {
  if (!result.coverage) return '';
  const start = formatDate(new Date(result.coverage.startISO), { month: 'short', day: 'numeric' });
  const end = formatDate(new Date(result.coverage.endISO), { month: 'short', day: 'numeric' });
  return strings.leakScan.kpiEvidenceWindow(start, end, nAccounts);
}

function monthLabel(dateISO: string): string {
  return formatDate(new Date(dateISO), { month: 'long' });
}

/** Monthly-equivalent cost used to rank the leaks list below the biggest-leak
 *  card (ADR 0020: "ranked by monthly cost with frequency tiebreak"), a
 *  different ordering than the pipeline's own governability-weighted
 *  rankScore that picks the biggest-leak card itself. */
function monthlyCostCents(candidate: HabitCandidate, windowDays: number): number {
  return Math.round((candidate.totalCents / windowDays) * 30);
}

/**
 * Results screen orchestrator (leak-scan-spec.md section 5, visual spec).
 * Owns rule-store wiring: every correction here re-runs the pipeline against
 * the same in-memory files with the updated persisted rules, so the same
 * session reflects the correction immediately (acceptance 11's cross-session
 * guarantee is the pipeline's own contract; re-running here is the simplest
 * way to also honor it live).
 */
export function ResultsScreen({ result: initialResult, files }: ResultsScreenProps) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { addExpense, deleteExpense, expenses } = useExpenses();
  const { addScanHabit, startBreakingHabit, dismissHabit, getHabitById, getActiveHabits } = useHabits();
  const completeScanOnboarding = useCompleteScanOnboarding();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [result, setResult] = useState(initialResult);
  const [rules, setRulesState] = useState<ScanRules | null>(null);
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [pickOneHabit, setPickOneHabit] = useState<ReturnType<typeof habitCandidateToDetectedHabit> | null>(null);
  const [pickOneCandidate, setPickOneCandidate] = useState<HabitCandidate | null>(null);
  const [openCategory, setOpenCategory] = useState<ExpenseCategory | null>(null);
  const [openPulseCell, setOpenPulseCell] = useState<PulseCell | null>(null);
  const [undone, setUndone] = useState(false);
  // Finding-first ladder (ADR 0020): collapsed on first render, local state so
  // a re-visit within this session (i.e. this mount) keeps it expanded.
  const [ladderExpanded, setLadderExpanded] = useState(false);

  React.useEffect(() => {
    getScanRules().then(setRulesState);
  }, []);

  const rerun = useCallback(
    async (updatedRules: ScanRules) => {
      await saveScanRules(updatedRules);
      setRulesState(updatedRules);
      const next = runScan(files, { rules: updatedRules, importId: initialResult.importId });
      setResult(next);
      // Corrections change what the scan concluded, so the persisted summary
      // follows the corrected result too (same write the intake hook does).
      if (!next.gracefulFailure) {
        void saveScanSummary(scanResultToSummary(next, new Date()));
      }
    },
    [files, initialResult.importId]
  );

  const kpi = useMemo(() => buildKpiSummary(result), [result]);
  const categories = useMemo(() => buildCategorySummary(result), [result]);
  const reviewQueue = useMemo(() => buildReviewQueue(result.rows), [result]);
  const evidenceWindow = useMemo(() => evidenceWindowLabel(result, kpi.nAccounts), [result, kpi]);

  // Finding-first ladder (ADR 0020): ONE ranking governs the whole ladder,
  // monthly cost with frequency tiebreak. The card takes its head, the list
  // takes the rest, so "Your biggest leak" is literally true against
  // everything shown below it. (The pipeline's governability-weighted order
  // is deliberately not used here; a card claiming "biggest" must never sit
  // above a pricier leak.) Zero candidates means there is no finding to lead
  // with, so the screen falls back to the pre-W4 order in full below.
  const rankedLeaksWindowDays = Math.max(result.coverage?.coveredDays ?? 0, 1);
  const rankedByMonthlyCost = useMemo(
    () =>
      result.habits
        .slice()
        .sort((a, b) => {
          const byMonthlyCost =
            monthlyCostCents(b, rankedLeaksWindowDays) - monthlyCostCents(a, rankedLeaksWindowDays);
          if (byMonthlyCost !== 0) return byMonthlyCost;
          return b.occurrences - a.occurrences; // frequency tiebreak
        }),
    [result.habits, rankedLeaksWindowDays]
  );
  const topCandidate = rankedByMonthlyCost[0] ?? null;
  const hasFinding = !!topCandidate;
  const rankedLeaksBelow = useMemo(
    () => (topCandidate ? rankedByMonthlyCost.slice(1, 1 + RANKED_LEAKS_CAP) : result.habits),
    [rankedByMonthlyCost, topCandidate, result.habits]
  );
  // Zero-candidate fallback (existing dashboard order, spec: "skip the card
  // entirely"): the ranked-leaks section then shows the full unfiltered list,
  // same as before W4.
  const leaksToShow = hasFinding ? rankedLeaksBelow : result.habits;
  const openCategoryRows = useMemo(
    () => (openCategory ? spendableRows(result.rows).filter((r) => r.category === openCategory) : []),
    [openCategory, result.rows]
  );
  const openPulseCellRows = useMemo(() => {
    if (!openPulseCell || openPulseCell.state !== 'spend') return [];
    // Cell key is an ISO day (yyyy-mm-dd), month (yyyy-mm), or year (yyyy);
    // a rowspend's own dateISO always starts with the cell key at every granularity.
    return spendableRows(result.rows).filter((r) => r.dateISO.startsWith(openPulseCell.key));
  }, [openPulseCell, result.rows]);

  const habitClassByCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, GovernClass>();
    for (const h of result.habits) map.set(h.category, h.governClass);
    return map;
  }, [result.habits]);

  // Fixed habit cards' tip-card copy ("July is a 3-payment month... plan for
  // the extra {amount}") needs the matching RecurringItem's next-month data
  // (interval, nextMonthHits), which HabitCandidate itself does not carry.
  const recurringByStem = useMemo(() => {
    const map = new Map<string, (typeof result.recurring)[number]>();
    for (const r of result.recurring) map.set(r.merchantStem, r);
    return map;
  }, [result.recurring]);

  const projection = useMemo(
    () => buildProjectionSummary(result.rows, result.recurring, result.coverage?.coveredDays ?? 0, habitClassByCategory),
    [result, habitClassByCategory]
  );

  // Habit-card stats row month (spec 5.4: "{monthTotal} in {month}") is the
  // most recent evidence month, not next month -- next month is the
  // projection's own concept (ProjectionSection computes that separately).
  const evidenceMonthISO = result.coverage?.endISO ?? new Date().toISOString().slice(0, 10);
  const evidenceMonthLabel = useMemo(() => monthLabel(evidenceMonthISO), [evidenceMonthISO]);
  // The Fixed tip card's own copy is about NEXT month's extra payment (spec
  // 5.4's "July is a 3-payment month" example), a different month than the
  // stats row above.
  const upcomingMonthLabel = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return formatDate(d, { month: 'long' });
  }, []);

  const handleCategoryCorrect = useCallback(
    async (merchantStem: string, category: ExpenseCategory) => {
      if (!rules) return;
      const updated = setMerchantCategory(rules, merchantStem, category);
      await rerun(updated);
    },
    [rules, rerun]
  );

  /** Govern class only: "Track this leak" opens the identical Decision-1
   *  pick-one sheet Door 1 uses (visual spec acceptance 6). Nothing is
   *  created until Start breaking it is tapped on that sheet. */
  const handleTrackLeak = useCallback(
    async (candidate: HabitCandidate) => {
      const habit = habitCandidateToDetectedHabit(candidate, result.coverage?.coveredDays ?? 0);
      await addScanHabit(habit);
      setPickOneCandidate(candidate);
      setPickOneHabit(habit);
    },
    [addScanHabit, result.coverage]
  );

  /** Influence class only: "Monitor" creates a monitor-only habit (discovered
   *  status, no HabitChangeGoal, no skip loop) -- distinct from Track. */
  const handleMonitor = useCallback(
    async (candidate: HabitCandidate) => {
      const habit = habitCandidateToDetectedHabit(candidate, result.coverage?.coveredDays ?? 0);
      await addScanHabit(habit);
      track('scan_habit_tracked', { class: 'influence', cadence_route: 'monitor' });
    },
    [addScanHabit, result.coverage]
  );

  const handlePickOneStart = useCallback(
    async (skipValue: number, valueEdited: boolean) => {
      if (!pickOneHabit) return;
      await startBreakingHabit(pickOneHabit.id, skipValue, valueEdited, 'scan');
      if (pickOneCandidate) {
        track('scan_habit_tracked', {
          class: pickOneCandidate.governClass,
          cadence_route: pickOneHabit.frequency,
        });
      }
      setPickOneHabit(null);
      setPickOneCandidate(null);
    },
    [pickOneHabit, pickOneCandidate, startBreakingHabit]
  );

  const handleNotAHabit = useCallback(
    async (candidate: HabitCandidate) => {
      if (!rules) return;
      const updated = suppressHabit(rules, candidate.merchantStem);
      await rerun(updated);
      track('scan_habit_dismissed', { class: candidate.governClass });
      // Also dismiss if it happens to already be a discovered habit in HabitsContext
      // (admitted via a prior Track tap on the same session).
      const existing = getHabitById(scanHabitId(candidate.merchantStem));
      if (existing) await dismissHabit(existing.id);
    },
    [rules, rerun, getHabitById, dismissHabit]
  );

  const handleSaveProjection = useCallback(
    async (remindBefore: Record<string, boolean>) => {
      const recurringExpenses = recurringToExpenses(result, { remindBefore });
      // toAddExpenseInput (utils/leakScan/importWrite.ts) carries source and
      // importId through, not just the fields a manual log would set -- the
      // fix for undo previously removing nothing (see its own doc comment).
      for (const exp of recurringExpenses) {
        await addExpense(toAddExpenseInput(exp));
      }
    },
    [result, addExpense]
  );

  const handleUndo = useCallback(async () => {
    // undoImport is the pure filter the pipeline exports (acceptance 14); applied
    // here via per-item deleteExpense calls so ExpensesContext's own persistence
    // and analytics stay the single write path (no parallel storage write).
    const toDelete = expenses.filter((e) => e.importId === result.importId);
    for (const exp of toDelete) {
      await deleteExpense(exp.id);
    }
    track('scan_undone', {});
    setUndone(true);
  }, [expenses, result.importId, deleteExpense]);

  const handleBringInDays = useCallback(async () => {
    const seeded = seedLastDays(result, BRING_IN_DAYS);
    for (const exp of seeded) {
      await addExpense(toAddExpenseInput(exp));
    }
    track('scan_seed_applied', { rows: seeded.length, days: BRING_IN_DAYS });
    // This is the scan door's only exit into the app; it must complete
    // onboarding here or the user loops back into an empty scan on relaunch.
    await completeScanOnboarding();
    router.push('/(tabs)');
    // Every mutating action confirms itself (spec 01 section 5). This one
    // writes about 30 expenses, so landing on Today in silence left the user
    // with no evidence the import happened.
    toast.show(strings.leakScan.savedToHabitCents);
  }, [result, addExpense, router, toast, completeScanOnboarding]);

  // Dashed expander (ADR 0020): mirrors CategoryList's "View more" analytics
  // pattern, fired once per expand.
  const handleToggleLadder = useCallback(() => {
    setLadderExpanded((prev) => {
      const next = !prev;
      if (next) track('scan_leak_ladder_expanded', {});
      return next;
    });
  }, []);

  if (undone) {
    // Dead-end fix (design/leakscan-migration, U12a): this used to be a bare
    // confirmation with no exit except the invisible iOS edge swipe. The
    // confirmation line is unchanged; the only addition is a way out.
    // router.replace (not push) so a repeat visit to this state never stacks
    // another copy of the tab navigator underneath.
    return (
      <View style={[styles.screen, styles.undoneCenter]}>
        <Text style={styles.undoneText}>{strings.leakScan.undoneMessage}</Text>
        <Button
          label={strings.leakScan.undoneContinue}
          onPress={() => router.replace('/(tabs)')}
          style={styles.undoneButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {evidenceWindow ? <Text style={styles.eyebrow}>{evidenceWindow}</Text> : null}
          <Text style={styles.screenTitle}>{strings.leakScan.resultsTitle}</Text>
        </View>

        {hasFinding && topCandidate && (
          <>
            <BiggestLeakCard
              candidate={topCandidate}
              coveredDays={result.coverage?.coveredDays ?? 0}
              onBreak={() => handleTrackLeak(topCandidate)}
              onDismiss={() => handleNotAHabit(topCandidate)}
            />
            <View style={styles.spacer} />
            <TouchableOpacity
              style={styles.ladderExpander}
              onPress={handleToggleLadder}
              accessibilityRole="button"
              accessibilityState={{ expanded: ladderExpanded }}
            >
              <Text style={styles.ladderExpanderText}>{strings.leakScan.seeFullPicture}</Text>
            </TouchableOpacity>
          </>
        )}

        {(!hasFinding || ladderExpanded) && (
          <>
            {/* Zero-candidate fallback renders the pre-W4 order exactly (header
                directly into KpiRow, no extra gap); the expanded ladder adds
                the gap after the dashed expander above. */}
            {hasFinding && <View style={styles.spacer} />}
            <KpiRow kpi={kpi} />

            <View style={styles.spacer} />
            <CategoryList categories={categories} onCategoryPress={(c) => setOpenCategory(c.category)} />

            <View style={styles.spacer} />
            <SpendPulse result={result} onCellPress={setOpenPulseCell} />

            <View style={styles.spacer} />
            {leaksToShow.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>{strings.leakScan.leaksRankedTitle}</Text>
                {leaksToShow.map((candidate, i) => {
                  const windowDays = Math.max(result.coverage?.coveredDays ?? 0, 1);
                  const monthTotalCents = Math.round((candidate.totalCents / windowDays) * 30);
                  const recurringMatch = recurringByStem.get(candidate.merchantStem);
                  // Extra-payment amount for a biweekly 3-payment month is the
                  // third occurrence's amount, i.e. the item's own per-payment
                  // amount (nextMonthHits already reflects the 3-hit month).
                  const tipAmountCents = recurringMatch ? recurringMatch.amountCents : undefined;
                  return (
                    <HabitCard
                      key={candidate.merchantStem}
                      rank={i + 1}
                      candidate={candidate}
                      month={evidenceMonthLabel}
                      monthTotalCents={monthTotalCents}
                      coveredDays={result.coverage?.coveredDays ?? 0}
                      tipMonth={upcomingMonthLabel}
                      tipAmountCents={tipAmountCents}
                      onTrack={() => handleTrackLeak(candidate)}
                      onMonitor={() => handleMonitor(candidate)}
                      onNotAHabit={() => handleNotAHabit(candidate)}
                      onWrongDetails={() => setOpenCategory(candidate.category)}
                    />
                  );
                })}
              </View>
            )}

            <View style={styles.spacer} />
            <ProjectionSection summary={projection} onSave={handleSaveProjection} />
          </>
        )}

        {/* The review-queue banner qualifies every number above it, including
            the biggest-leak card's evidence, so it renders above the fold
            regardless of the ladder state (independents review finding;
            honesty surfaces never sit behind an expander). */}
        {reviewQueue.length > 0 && (
          <>
            <View style={styles.spacer} />
            <TouchableOpacity
              style={styles.reviewQueueBanner}
              onPress={() => setReviewQueueOpen(true)}
              accessibilityRole="button"
            >
              <Text style={styles.reviewQueueBannerText}>
                {strings.leakScan.reviewQueueTitle(reviewQueue.length)}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Button
          label={strings.leakScan.bringInLastDays(BRING_IN_DAYS)}
          onPress={handleBringInDays}
          style={styles.handoffButton}
        />

        <ResultsFooter
          files={result.files}
          duplicatesMerged={result.duplicatesMerged}
          transfersNetted={result.transfers.length}
          onUndo={handleUndo}
        />
      </ScrollView>

      <ReviewQueueSheet
        visible={reviewQueueOpen}
        items={reviewQueue}
        onCorrect={handleCategoryCorrect}
        onClose={() => setReviewQueueOpen(false)}
      />

      <CategoryTransactionsSheet
        visible={!!openCategory}
        category={openCategory}
        rows={openCategoryRows}
        onCorrect={handleCategoryCorrect}
        onClose={() => setOpenCategory(null)}
      />

      <PulseDayDetailSheet
        cell={openPulseCell}
        rows={openPulseCellRows}
        onClose={() => setOpenPulseCell(null)}
      />

      <PickOneSheet
        visible={!!pickOneHabit}
        habit={pickOneHabit}
        monthTotal={pickOneCandidate?.totalCents ?? 0}
        occurrences={pickOneCandidate?.occurrences ?? 0}
        onCancel={() => {
          setPickOneHabit(null);
          setPickOneCandidate(null);
        }}
        onStart={handlePickOneStart}
        freeTierBlocked={isHabitLimitReached(getActiveHabits().length, getEntitlement())}
        onStartTrial={() => {
          setPickOneHabit(null);
          setPickOneCandidate(null);
          router.push('/paywall?placement=habit_gate_scan');
        }}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.mist,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    screenTitle: {
      fontSize: typeScale.screenTitle,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      lineHeight: 38,
    },
    sectionTitle: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    spacer: {
      height: 14,
    },
    // Dashed expander (ADR 0020, "app's dashed grammar"): matches
    // components/money/UpcomingList.tsx's dashed add affordance.
    ladderExpander: {
      minHeight: 52,
      borderRadius: radii.card,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.cloudDashed,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    ladderExpanderText: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: 14,
      color: theme.primaryDark,
      textAlign: 'center',
    },
    reviewQueueBanner: {
      backgroundColor: theme.white,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 14,
    },
    reviewQueueBannerText: {
      fontSize: 14,
      fontFamily: theme.fonts.uiMedium,
      color: theme.ink,
    },
    handoffButton: {
      marginTop: 14,
    },
    undoneCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    undoneText: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      textAlign: 'center',
      marginBottom: 20,
    },
    undoneButton: {
      alignSelf: 'stretch',
    },
  });
}
