import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDate, parseDateOnly } from '@/utils/dates';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useHabits } from '@/contexts/HabitsContext';
import { radii, typeScale, spacing, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { hapticError } from '@/utils/motion';
import { KpiRow } from './KpiRow';
import { CategoryList } from './CategoryList';
import { SpendPulse } from './SpendPulse';
import { HabitCard } from './HabitCard';
import { BiggestLeakCard } from './BiggestLeakCard';
import { ProjectionSection } from './ProjectionSection';
import { ResultsFooter } from './ResultsFooter';
import { useCompleteScanOnboarding } from './useCompleteScanOnboarding';
import { useTrackLeak } from './useTrackLeak';
import { ReviewQueueSheet } from './ReviewQueueSheet';
import { CategoryTransactionsSheet } from './CategoryTransactionsSheet';
import { PulseDayDetailSheet } from './PulseDayDetailSheet';
import {
  buildKpiSummary,
  buildCategorySummary,
  buildProjectionSummary,
  buildReviewQueue,
  runScan,
} from '@/utils/leakScan';
import { spendableRows } from '@/utils/leakScan/netting';
import {
  seedLastDays,
  recurringToExpenses,
  toAddExpenseInput,
  filterAlreadyImported,
} from '@/utils/leakScan/importWrite';
import { scanResultToSummary } from '@/utils/leakScan/summarize';
import type { ScanFileInput } from '@/utils/leakScan';
import type { PulseCell } from '@/utils/leakScan/spendPulse';
import type { GovernClass, HabitCandidate, ScanResult } from '@/utils/leakScan/types';
import type { CategorySummary } from '@/utils/leakScan/resultsSummary';
import type { ExpenseCategory } from '@/types/expense';
import {
  getScanRules,
  saveScanRules,
  setMerchantCategory,
  suppressHabit,
  type ScanRules,
} from '@/utils/scanRules';
import { scanHabitId } from '@/utils/leakScanBridge';
import { applyScope, scopeFromRules } from '@/utils/leakScan/scope';
import { saveScanSummary } from '@/utils/storage';
import { track } from '@/utils/analytics';

type ResultsScreenProps = {
  result: ScanResult;
  files: ScanFileInput[];
};

/** ADR 0020: the ranked-leaks list below the biggest-leak card caps at 5. */
const RANKED_LEAKS_CAP = 5;
/** ADR 0020: the post-scan handoff CTA's import window, widened from 15 to 30
 *  days and promoted to the primary CTA. */
const BRING_IN_DAYS = 30;

/** UX-050: coverage bounds are calendar days, not instants. `new Date(iso)`
 *  parses a date-only string as UTC midnight, which formats to the previous
 *  day west of UTC; the evidence window is the scan's honesty metadata, so it
 *  has to name the days the statements actually cover. */
function formatDayOnly(dateISO: string): string {
  const parsed = parseDateOnly(dateISO);
  return parsed ? formatDate(parsed, { month: 'short', day: 'numeric' }) : dateISO;
}

function evidenceWindowLabel(result: ScanResult, nAccounts: number): string {
  if (!result.coverage) return '';
  const start = formatDayOnly(result.coverage.startISO);
  const end = formatDayOnly(result.coverage.endISO);
  return strings.leakScan.kpiEvidenceWindow(start, end, nAccounts);
}

function monthLabel(dateISO: string): string {
  const parsed = parseDateOnly(dateISO);
  return parsed ? formatDate(parsed, { month: 'long' }) : dateISO;
}

/** Monthly-equivalent cost used to rank the leaks list below the biggest-leak
 *  card (ADR 0020: "ranked by monthly cost with frequency tiebreak"), a
 *  different ordering than the pipeline's own governability-weighted
 *  rankScore that picks the biggest-leak card itself. */
function monthlyCostCents(candidate: HabitCandidate, windowDays: number): number {
  return Math.round((candidate.totalCents / windowDays) * 30);
}

type HabitCardItemProps = {
  rank: number;
  candidate: HabitCandidate;
  month: string;
  monthTotalCents: number;
  spanDays: number;
  tipMonth: string;
  tipAmountCents: number | undefined;
  onTrack: (candidate: HabitCandidate) => void;
  onMonitor: (candidate: HabitCandidate) => void;
  onNotAHabit: (candidate: HabitCandidate) => void;
  onWrongDetails: (category: ExpenseCategory) => void;
};

/**
 * HabitCard is React.memo'd; this wrapper is what makes that memo effective.
 * The old .map() body built onTrack/onMonitor/onNotAHabit/onWrongDetails as
 * fresh inline arrows per candidate on every ResultsScreen render. Here each
 * handler is built once per candidate via useCallback, keyed on the already-
 * stable ResultsScreen callbacks (handleTrackLeak etc.) plus the candidate
 * itself, so HabitCard only re-renders when its own candidate's data (or one
 * of the stats computed for it) actually changes.
 */
const HabitCardItem = memo(function HabitCardItem({
  rank,
  candidate,
  month,
  monthTotalCents,
  spanDays,
  tipMonth,
  tipAmountCents,
  onTrack,
  onMonitor,
  onNotAHabit,
  onWrongDetails,
}: HabitCardItemProps) {
  const handleTrack = useCallback(() => onTrack(candidate), [onTrack, candidate]);
  const handleMonitor = useCallback(() => onMonitor(candidate), [onMonitor, candidate]);
  const handleNotAHabit = useCallback(() => onNotAHabit(candidate), [onNotAHabit, candidate]);
  const handleWrongDetails = useCallback(
    () => onWrongDetails(candidate.category),
    [onWrongDetails, candidate.category]
  );
  return (
    <HabitCard
      rank={rank}
      candidate={candidate}
      month={month}
      monthTotalCents={monthTotalCents}
      spanDays={spanDays}
      tipMonth={tipMonth}
      tipAmountCents={tipAmountCents}
      onTrack={handleTrack}
      onMonitor={handleMonitor}
      onNotAHabit={handleNotAHabit}
      onWrongDetails={handleWrongDetails}
    />
  );
});

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
  const { addExpenses, deleteExpense, expenses } = useExpenses();
  const { dismissHabit, getHabitById } = useHabits();
  const completeScanOnboarding = useCompleteScanOnboarding();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [result, setResult] = useState(initialResult);
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<ExpenseCategory | null>(null);
  const [openPulseCell, setOpenPulseCell] = useState<PulseCell | null>(null);
  const [undone, setUndone] = useState(false);
  // UX-035: busy flags for the two CTAs whose write-loops previously had no
  // pending state, so a double tap could start a second import pass before
  // the first finished (mirrors app/paywall.tsx's `purchasing` pattern).
  const [savingProjection, setSavingProjection] = useState(false);
  const [bringingInDays, setBringingInDays] = useState(false);
  // UX-035: handleUndo's trigger (ResultsFooter's ConfirmSheet) lives in a
  // file this pass does not own, so it can't be visually disabled from here.
  // A ref guard still stops a second delete pass from firing.
  const undoInFlightRef = useRef(false);
  // Finding-first ladder (ADR 0020): collapsed on first render, local state so
  // a re-visit within this session (i.e. this mount) keeps it expanded.
  const [ladderExpanded, setLadderExpanded] = useState(false);

  // UX-013: app/leak-scan.tsx swaps IntakeScreen for this screen as a
  // conditional render, not a real navigation push, so VoiceOver never shifts
  // focus here on its own. Announce arrival on mount (house pattern:
  // components/ui/Toast.tsx, ~:88).
  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(strings.leakScan.resultsTitle);
  }, []);

  const rerun = useCallback(
    async (correct: (current: ScanRules) => ScanRules) => {
      // Read the store fresh rather than trusting the mount-time copy: the
      // intake hook persists the confirmed scope on its own schedule, and a
      // whole-object write from a stale copy could erase it and resurrect
      // out-of-scope candidates on the next correction (review round 3, P2-f;
      // same pattern as HabitsContext.refreshHabits).
      const fresh = await getScanRules();
      const updatedRules = correct(fresh);
      await saveScanRules(updatedRules);
      // A re-run rebuilds the candidate list from scratch, so the user's scope
      // has to be re-applied or every correction would resurrect the categories
      // they placed out of bounds. Dismissing a leak is itself a re-run, which
      // makes this the difference between "Not a habit" narrowing the list and
      // silently repopulating it.
      const next = applyScope(
        runScan(files, { rules: updatedRules, importId: initialResult.importId }),
        scopeFromRules(updatedRules)
      );
      setResult(next);
      // Corrections change what the scan concluded, so the persisted summary
      // follows the corrected result too (same write the intake hook does).
      if (!next.gracefulFailure) {
        void saveScanSummary(scanResultToSummary(next, new Date()));
      }
    },
    [files, initialResult.importId]
  );

  // UX-074: results is the payoff screen of the app's biggest feature and it
  // renders no ScreenHeader, so nothing supplied a top inset and the eyebrow
  // and serif title sat under the status bar and the dynamic island. Intake and
  // graceful failure escape this only because their ScreenHeader back pill
  // carries its own inset.
  const insets = useSafeAreaInsets();
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
  // Calendar span, never the count of transacted days: monthly cost is a rate
  // and its divisor is elapsed time (UX-073, see CoverageWindow).
  const rankedLeaksWindowDays = Math.max(result.coverage?.spanDays ?? 0, 1);
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
  // The hero card's only action is "Break it", so only a candidate the user can
  // actually govern may lead the screen. The ranked list below already renders
  // a fixed-class candidate as a no-CTA tip card (HabitCard.tsx), but the hero
  // path skipped that rule: against a real statement, rent ranked first on
  // monthly cost and the app invited the user to break their housing payment.
  // Influence-class is excluded for the same reason in milder form, its card
  // below offers "Monitor", never "Break it".
  //
  // This filters hero ELIGIBILITY only. Ranking is untouched, and anything
  // passed over here still appears in the list below, so no finding is hidden.
  // "Your biggest leak" stays literally true: a leak is something you can plug,
  // which is what the govern class means; commitments are tips, not leaks.
  const topCandidate = useMemo(
    () => rankedByMonthlyCost.find((c) => c.governClass === 'govern') ?? null,
    [rankedByMonthlyCost]
  );
  const hasFinding = !!topCandidate;
  const rankedLeaksBelow = useMemo(
    () =>
      topCandidate
        ? rankedByMonthlyCost
            .filter((c) => c.merchantStem !== topCandidate.merchantStem)
            .slice(0, RANKED_LEAKS_CAP)
        : result.habits,
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
    () => buildProjectionSummary(result.rows, result.recurring, result.coverage?.spanDays ?? 0, habitClassByCategory),
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
      // The corrector applies to the FRESH store inside rerun, so a correction
      // can never clobber rules another surface persisted after this screen
      // mounted (the confirmed scope, above all).
      await rerun((current) => setMerchantCategory(current, merchantStem, category));
    },
    [rerun]
  );

  /**
   * Tracking and monitoring live in useTrackLeak, shared with the habit deck.
   * Both surfaces make the same promise, so they must keep the same
   * consequences: the same pick-one sheet, the same free-tier gate, the same
   * analytics, and above all the same activation sequence. A second copy of
   * that sequence is a second chance to get its ordering wrong.
   */
  const { trackLeak, monitorLeak, sheet: trackSheet } = useTrackLeak(
    result.coverage?.spanDays ?? 0
  );

  const handleNotAHabit = useCallback(
    async (candidate: HabitCandidate) => {
      await rerun((current) => suppressHabit(current, candidate.merchantStem));
      track('scan_habit_dismissed', { class: candidate.governClass });
      // Also dismiss if it happens to already be a discovered habit in HabitsContext
      // (admitted via a prior Track tap on the same session).
      const existing = getHabitById(scanHabitId(candidate.merchantStem));
      if (existing) await dismissHabit(existing.id);
    },
    [rerun, getHabitById, dismissHabit]
  );

  const handleSaveProjection = useCallback(
    async (remindBefore: Record<string, boolean>) => {
      // UX-035: guards ProjectionSection's Save CTA against a double tap
      // starting a second write pass before the first completes.
      if (savingProjection) return;
      setSavingProjection(true);
      try {
        const recurringExpenses = recurringToExpenses(result, { remindBefore });
        // Re-scan dedup (review fix, build 12 re-scan entry): drop any
        // recurring item already brought in by a prior import before writing,
        // same guard as handleBringInDays below.
        const toWrite = filterAlreadyImported(recurringExpenses, expenses);
        const skipped = recurringExpenses.length - toWrite.length;
        // toAddExpenseInput (utils/leakScan/importWrite.ts) carries source and
        // importId through, not just the fields a manual log would set -- the
        // fix for undo previously removing nothing (see its own doc comment).
        // One commit, not one per row: an import either lands whole or rolls
        // back whole, so there is no half-imported state to describe.
        try {
          await addExpenses(toWrite.map(toAddExpenseInput));
        } catch (error) {
          console.error('Error saving recurring projection:', error);
          hapticError();
          toast.show(strings.toasts.importFailed);
          return;
        }
        // Save had no confirmation surface before; only speak up here when
        // there's something the user wouldn't otherwise know, i.e. a skip.
        if (skipped > 0) {
          toast.show(strings.leakScan.skippedAlreadyImported(skipped));
        }
      } finally {
        setSavingProjection(false);
      }
    },
    [result, addExpenses, expenses, toast, savingProjection]
  );

  const handleUndo = useCallback(async () => {
    // UX-035: ResultsFooter's ConfirmSheet confirm button isn't owned by this
    // pass, so it can't be visually disabled here; this ref guard still stops
    // a double confirm-tap from deleting the same import twice.
    if (undoInFlightRef.current) return;
    undoInFlightRef.current = true;
    try {
      // undoImport is the pure filter the pipeline exports (acceptance 14); applied
      // here via per-item deleteExpense calls so ExpensesContext's own persistence
      // and analytics stay the single write path (no parallel storage write).
      const toDelete = expenses.filter((e) => e.importId === result.importId);
      try {
        for (const exp of toDelete) {
          await deleteExpense(exp.id);
        }
      } catch (error) {
        // Deletes are one row at a time, so some may already be gone. Say the
        // undo did not finish rather than marking it done and firing the
        // event; the remaining rows are still there to try again on.
        console.error('Error undoing scan import:', error);
        hapticError();
        toast.show(strings.toasts.deleteFailed);
        return;
      }
      track('scan_undone', {});
      setUndone(true);
    } finally {
      undoInFlightRef.current = false;
    }
  }, [expenses, result.importId, deleteExpense, toast]);

  const handleBringInDays = useCallback(async () => {
    // UX-035: guards the "Bring in your last N days" CTA against a double
    // tap starting a second ~30-expense import pass before the first
    // completes.
    if (bringingInDays) return;
    setBringingInDays(true);
    try {
      const seeded = seedLastDays(result, BRING_IN_DAYS);
      // Re-scan dedup (review fix, build 12 re-scan entry): re-importing an
      // overlapping statement (reachable via Insights' re-scan entry) used to
      // write every overlapping row a second time with a fresh id, doubling
      // recorded spend. Drop anything already brought in by a prior import.
      const toWrite = filterAlreadyImported(seeded, expenses);
      const skipped = seeded.length - toWrite.length;
      // One commit for the whole import (about 30 rows). Nothing below runs
      // unless it landed: no analytics event, no navigation, and no toast
      // claiming the scan was saved.
      try {
        await addExpenses(toWrite.map(toAddExpenseInput));
      } catch (error) {
        console.error('Error bringing in scanned days:', error);
        hapticError();
        toast.show(strings.toasts.importFailed);
        return;
      }
      track('scan_seed_applied', { rows: toWrite.length, days: BRING_IN_DAYS });
      // This is the scan door's only exit into the app; it must complete
      // onboarding here or the user loops back into an empty scan on relaunch.
      await completeScanOnboarding();
      router.push('/(tabs)');
      // Every mutating action confirms itself (spec 01 section 5). This one
      // writes about 30 expenses, so landing on Today in silence left the user
      // with no evidence the import happened. When some rows were skipped as
      // already-imported duplicates, that's said too, honestly.
      toast.show(
        skipped > 0
          ? `${strings.leakScan.savedToHabitCents} ${strings.leakScan.skippedAlreadyImported(skipped)}`
          : strings.leakScan.savedToHabitCents
      );
    } finally {
      setBringingInDays(false);
    }
  }, [result, addExpenses, expenses, router, toast, completeScanOnboarding, bringingInDays]);

  // UX-033: CategoryList is React.memo'd; this is what makes that memo
  // effective (the old inline arrow was recreated every render).
  const handleCategoryPress = useCallback((c: CategorySummary) => setOpenCategory(c.category), []);

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
      <View
        style={[
          styles.screen,
          styles.undoneCenter,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
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
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.header}>
          {evidenceWindow ? <Text style={styles.eyebrow}>{evidenceWindow}</Text> : null}
          {/* UX-026: results is one of the longest screens in the flow; give
              its title header role so it shows up in VoiceOver's rotor. */}
          <Text style={styles.screenTitle} accessibilityRole="header">
            {strings.leakScan.resultsTitle}
          </Text>
        </View>

        {hasFinding && topCandidate && (
          <>
            <BiggestLeakCard
              candidate={topCandidate}
              spanDays={result.coverage?.spanDays ?? 0}
              onBreak={() => trackLeak(topCandidate)}
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
            <CategoryList categories={categories} onCategoryPress={handleCategoryPress} />

            <View style={styles.spacer} />
            <SpendPulse result={result} onCellPress={setOpenPulseCell} />

            <View style={styles.spacer} />
            {leaksToShow.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>{strings.leakScan.leaksRankedTitle}</Text>
                {leaksToShow.map((candidate, i) => {
                  // Same calendar-span divisor as the ranking above (UX-073).
                  const windowDays = rankedLeaksWindowDays;
                  const monthTotalCents = Math.round((candidate.totalCents / windowDays) * 30);
                  const recurringMatch = recurringByStem.get(candidate.merchantStem);
                  // Extra-payment amount for a biweekly 3-payment month is the
                  // third occurrence's amount, i.e. the item's own per-payment
                  // amount (nextMonthHits already reflects the 3-hit month).
                  const tipAmountCents = recurringMatch ? recurringMatch.amountCents : undefined;
                  return (
                    <HabitCardItem
                      key={candidate.merchantStem}
                      rank={i + 1}
                      candidate={candidate}
                      month={evidenceMonthLabel}
                      monthTotalCents={monthTotalCents}
                      spanDays={rankedLeaksWindowDays}
                      tipMonth={upcomingMonthLabel}
                      tipAmountCents={tipAmountCents}
                      onTrack={trackLeak}
                      onMonitor={monitorLeak}
                      onNotAHabit={handleNotAHabit}
                      onWrongDetails={setOpenCategory}
                    />
                  );
                })}
              </View>
            )}

            <View style={styles.spacer} />
            <ProjectionSection summary={projection} onSave={handleSaveProjection} saving={savingProjection} />
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
              {/* UX-038: this row opens the review-queue sheet; the rows rule
                  says a chevron names that ("opens something in-app"). */}
              <Icon
                name="ChevronRight"
                size={16}
                color={theme.mistText}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
              />
            </TouchableOpacity>
          </>
        )}

        <Button
          label={strings.leakScan.bringInLastDays(BRING_IN_DAYS)}
          onPress={handleBringInDays}
          disabled={bringingInDays}
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

      {trackSheet}
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
      // UX-018: was a flat 16 in both directions; the horizontal gutter
      // becomes the ratified 20, vertical padding is untouched.
      // UX-074: the vertical values are overridden inline with the safe-area
      // insets added; these stay as the zero-inset baseline.
      paddingHorizontal: spacing.gutter,
      paddingVertical: 16,
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
      color: theme.mistText,
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
      fontSize: typeScale.label,
      color: theme.primaryDark,
      textAlign: 'center',
    },
    reviewQueueBanner: {
      backgroundColor: theme.white,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 14,
      // UX-038: chevron trailing slot added; row goes horizontal to sit it
      // at the end without disturbing the text's own layout.
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    reviewQueueBannerText: {
      flex: 1,
      fontSize: typeScale.label,
      fontFamily: theme.fonts.uiMedium,
      color: theme.ink,
    },
    handoffButton: {
      marginTop: 14,
    },
    undoneCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      // UX-018: 24 drifted from the ratified 20pt screen gutter.
      paddingHorizontal: spacing.gutter,
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
