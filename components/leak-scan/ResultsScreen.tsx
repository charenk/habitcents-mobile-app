import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useHabits } from '@/contexts/HabitsContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { KpiRow } from './KpiRow';
import { CategoryList } from './CategoryList';
import { SpendPulse } from './SpendPulse';
import { HabitCard } from './HabitCard';
import { ProjectionSection } from './ProjectionSection';
import { ResultsFooter } from './ResultsFooter';
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
import { seedLast15Days, recurringToExpenses } from '@/utils/leakScan/importWrite';
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
import { track } from '@/utils/analytics';
import { FREE_TIER_HABIT_LIMIT } from '@/utils/habitLogging';

type ResultsScreenProps = {
  result: ScanResult;
  files: ScanFileInput[];
};

function evidenceWindowLabel(result: ScanResult, nAccounts: number): string {
  if (!result.coverage) return '';
  const start = new Date(result.coverage.startISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = new Date(result.coverage.endISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return strings.leakScan.kpiEvidenceWindow(start, end, nAccounts);
}

function monthLabel(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('en-US', { month: 'long' });
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
  const { addExpense, deleteExpense, expenses } = useExpenses();
  const { addScanHabit, startBreakingHabit, dismissHabit, getHabitById, getActiveHabits } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [result, setResult] = useState(initialResult);
  const [rules, setRulesState] = useState<ScanRules | null>(null);
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [pickOneHabit, setPickOneHabit] = useState<ReturnType<typeof habitCandidateToDetectedHabit> | null>(null);
  const [pickOneCandidate, setPickOneCandidate] = useState<HabitCandidate | null>(null);
  const [openCategory, setOpenCategory] = useState<ExpenseCategory | null>(null);
  const [openPulseCell, setOpenPulseCell] = useState<PulseCell | null>(null);
  const [undone, setUndone] = useState(false);

  React.useEffect(() => {
    getScanRules().then(setRulesState);
  }, []);

  const rerun = useCallback(
    async (updatedRules: ScanRules) => {
      await saveScanRules(updatedRules);
      setRulesState(updatedRules);
      const next = runScan(files, { rules: updatedRules, importId: initialResult.importId });
      setResult(next);
    },
    [files, initialResult.importId]
  );

  const kpi = useMemo(() => buildKpiSummary(result), [result]);
  const categories = useMemo(() => buildCategorySummary(result), [result]);
  const reviewQueue = useMemo(() => buildReviewQueue(result.rows), [result]);
  const evidenceWindow = useMemo(() => evidenceWindowLabel(result, kpi.nAccounts), [result, kpi]);
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
    return d.toLocaleDateString('en-US', { month: 'long' });
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
      for (const exp of recurringExpenses) {
        await addExpense({
          title: exp.title,
          amount: exp.amount,
          category: exp.category,
          merchant: exp.merchant,
          date: exp.date,
          isRecurring: exp.isRecurring,
          recurrence: exp.recurrence,
          reminderEnabled: exp.reminderEnabled,
        });
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

  const handleBringIn15Days = useCallback(async () => {
    const seeded = seedLast15Days(result);
    for (const exp of seeded) {
      await addExpense({
        title: exp.title,
        amount: exp.amount,
        category: exp.category,
        merchant: exp.merchant,
        date: exp.date,
        isRecurring: false,
        reminderEnabled: false,
      });
    }
    track('scan_seed15_applied', { rows: seeded.length });
    router.push('/(tabs)/habits');
  }, [result, addExpense, router]);

  if (undone) {
    return (
      <View style={[styles.screen, styles.undoneCenter]}>
        <Text style={styles.undoneText}>This import has been undone.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <KpiRow kpi={kpi} evidenceWindow={evidenceWindow} />

        <View style={styles.spacer} />
        <CategoryList categories={categories} onCategoryPress={(c) => setOpenCategory(c.category)} />

        <View style={styles.spacer} />
        <SpendPulse result={result} onCellPress={setOpenPulseCell} />

        <View style={styles.spacer} />
        {result.habits.length > 0 && (
          <View>
            {result.habits.map((candidate, i) => {
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

        <TouchableOpacity style={styles.handoffButton} onPress={handleBringIn15Days} accessibilityRole="button">
          <Text style={styles.handoffButtonText}>{strings.leakScan.bringIn15Days}</Text>
        </TouchableOpacity>

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
        freeTierBlocked={getActiveHabits().length >= FREE_TIER_HABIT_LIMIT}
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
    spacer: {
      height: 14,
    },
    reviewQueueBanner: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
    },
    reviewQueueBannerText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    handoffButton: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },
    handoffButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.white,
    },
    undoneCenter: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    undoneText: {
      fontSize: 15,
      color: theme.textSecondary,
    },
  });
}
