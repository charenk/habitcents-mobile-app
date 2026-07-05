import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
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
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import {
  buildKpiSummary,
  buildCategorySummary,
  buildProjectionSummary,
  buildReviewQueue,
  runScan,
} from '@/utils/leakScan';
import { seedLast15Days, recurringToExpenses, undoImport } from '@/utils/leakScan/importWrite';
import type { ScanFileInput } from '@/utils/leakScan';
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
  const { format } = useCurrency();
  const router = useRouter();
  const { addExpense, updateExpense, deleteExpense, expenses } = useExpenses();
  const { addScanHabit, startBreakingHabit, dismissHabit, getHabitById } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [result, setResult] = useState(initialResult);
  const [rules, setRulesState] = useState<ScanRules | null>(null);
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [pickOneHabit, setPickOneHabit] = useState<ReturnType<typeof habitCandidateToDetectedHabit> | null>(null);
  const [pickOneCandidate, setPickOneCandidate] = useState<HabitCandidate | null>(null);
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

  const habitClassByCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, GovernClass>();
    for (const h of result.habits) map.set(h.category, h.governClass);
    return map;
  }, [result.habits]);

  const projection = useMemo(
    () => buildProjectionSummary(result.rows, result.recurring, result.coverage?.coveredDays ?? 0, habitClassByCategory),
    [result, habitClassByCategory]
  );

  const nextMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const handleCategoryCorrect = useCallback(
    async (merchantStem: string, category: ExpenseCategory) => {
      if (!rules) return;
      const updated = setMerchantCategory(rules, merchantStem, category);
      await rerun(updated);
    },
    [rules, rerun]
  );

  const handleTrackLeak = useCallback(
    async (candidate: HabitCandidate) => {
      const habit = habitCandidateToDetectedHabit(candidate, result.coverage?.coveredDays ?? 0);
      await addScanHabit(habit);
      setPickOneCandidate(candidate);
      setPickOneHabit(habit);
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
    const remaining = undoImport(expenses, result.importId);
    const toDelete = expenses.filter((e) => e.importId === result.importId);
    for (const exp of toDelete) {
      await deleteExpense(exp.id);
    }
    track('scan_undone', {});
    setUndone(true);
    void remaining;
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
        <CategoryList categories={categories} />

        <View style={styles.spacer} />
        <SpendPulse result={result} />

        <View style={styles.spacer} />
        {result.habits.length > 0 && (
          <View>
            {result.habits.map((candidate, i) => (
              <HabitCard
                key={candidate.merchantStem}
                rank={i + 1}
                candidate={candidate}
                month={monthLabel(nextMonth)}
                monthTotalCents={candidate.totalCents}
                coveredDays={result.coverage?.coveredDays ?? 0}
                onTrack={() => handleTrackLeak(candidate)}
                onMonitor={() => handleTrackLeak(candidate)}
                onNotAHabit={() => handleNotAHabit(candidate)}
              />
            ))}
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
