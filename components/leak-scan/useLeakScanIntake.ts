import { useCallback, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { runScan, type ScanFileInput } from '@/utils/leakScan';
import { MAX_FILES, MAX_FILE_BYTES, type ScanQuestion, type ScanResult } from '@/utils/leakScan/types';
import { scanResultToSummary } from '@/utils/leakScan/summarize';
import { getScanRules, saveScanRules, setDateOrder, setScope, setSignConvention, type ScanRules } from '@/utils/scanRules';
import {
  applyScope,
  defaultScope,
  isDefaultScope,
  scopeCodes,
  scopeFromRules,
  selectedCategories,
  toggleScope,
  unselectedCategories,
  type ScanScope,
} from '@/utils/leakScan/scope';
import type { ExpenseCategory } from '@/types/expense';
import { saveScanSummary } from '@/utils/storage';
import { track } from '@/utils/analytics';

export type IntakeStage = 'idle' | 'picking' | 'scanning' | 'question' | 'scope' | 'done';

export type IntakeState = {
  stage: IntakeStage;
  fileNames: string[];
  /** The real in-memory file inputs (name + text), so the results screen can
   *  re-run the pipeline on a rule correction without re-picking files. */
  files: ScanFileInput[];
  skippedFileMessages: string[];
  pendingQuestion: ScanQuestion | null;
  /**
   * The scan result. While stage is 'scope' this is the UNSCOPED result; the
   * scoped copy replaces it on confirm, so the results screen never has to know
   * scope exists.
   */
  result: ScanResult | null;
  /** The working scope selection, live while stage is 'scope'. */
  scope: ScanScope;
  error: string | null;
};

/**
 * Owns Leak Scan intake: file selection (CSV, on-device caps), reading file
 * contents, running the pipeline, and resolving the at-most-two permitted
 * questions by re-running the scan with the answer persisted as a rule
 * (spec Stage 0/3/4). The pipeline itself stays UI-free; this hook is the
 * only place that touches expo-document-picker / expo-file-system / AsyncStorage.
 */
export function useLeakScanIntake() {
  const [state, setState] = useState<IntakeState>({
    stage: 'idle',
    fileNames: [],
    files: [],
    skippedFileMessages: [],
    pendingQuestion: null,
    result: null,
    scope: defaultScope(),
    error: null,
  });
  const [rules, setRules] = useState<ScanRules | null>(null);
  const [pendingFiles, setPendingFiles] = useState<ScanFileInput[]>([]);

  // Mirrors state so confirmScope reads the scope and result the user is
  // actually looking at, not a stale render closure. Same pattern as
  // OnboardingContext's onboardingStateRef and ExpensesContext's expensesRef.
  const stateRef = useRef(state);
  stateRef.current = state;

  const runWithRules = useCallback(async (files: ScanFileInput[], currentRules: ScanRules) => {
    const result = runScan(files, { rules: currentRules });
    if (result.questions.length > 0) {
      const question = result.questions[0];
      track('scan_question_shown', { type: question.type });
      setState((s) => ({ ...s, stage: 'question', pendingQuestion: question, result }));
      return;
    }
    if (result.gracefulFailure) {
      track('scan_failed', {
        n_files: files.length,
        encoding_guess: 'utf-8',
        delimiter_guess: 'unknown',
        header_found: result.files[0]?.headerFound ?? false,
        date_parse_rate: 0,
        amount_parse_rate: 0,
        sign_confidence: 0,
      });
    } else {
      const tierBreakdown = { solid: 0, likely: 0, 'needs-review': 0 };
      for (const f of result.files) tierBreakdown[f.confidenceTier]++;
      track('scan_completed', {
        coverage_days: result.coverage?.spanDays ?? 0,
        n_accounts: new Set(result.files.map((f) => f.account)).size,
        n_habits_found: result.habits.length,
        solid_count: tierBreakdown.solid,
        likely_count: tierBreakdown.likely,
        needs_review_count: tierBreakdown['needs-review'],
      });
      // Scope selection (PRD v3.1 sect 7.1) sits between extraction and
      // results: the user says where to look before the app proposes anything.
      // Skipped when the pipeline found no candidates at all, because there is
      // then nothing to scope and the screen would be a dead step. The summary
      // is deliberately NOT saved here in that case, it is saved once the
      // scoped result is known, so the Insights snapshot never advertises a
      // leak the user placed out of bounds.
      if (result.habits.length > 0) {
        const startingScope = scopeFromRules(currentRules);
        setState((s) => ({
          ...s,
          stage: 'scope',
          pendingQuestion: null,
          result,
          scope: startingScope,
        }));
        return;
      }

      // Fire-and-forget (OB-4, ADR 0020): persists a small display-ready
      // snapshot so a later Insights segment can show it without re-running
      // the pipeline. A rule-answer re-run lands here too, so a correction's
      // re-run naturally overwrites the prior summary with the corrected
      // result, the right behavior per the "kept until replaced" contract.
      void saveScanSummary(scanResultToSummary(result, new Date()));
    }
    setState((s) => ({ ...s, stage: 'done', pendingQuestion: null, result }));
  }, []);

  /** Toggle one category on the scope screen. Locked ones are inert. */
  const toggleScopeCategory = useCallback((category: ExpenseCategory) => {
    setState((s) => ({ ...s, scope: toggleScope(s.scope, category) }));
  }, []);

  /**
   * Confirm the scope: filter the candidates, save the snapshot from the
   * SCOPED result, persist the selection for the next scan, and hand the
   * results screen a result it can treat as final.
   *
   * Side effects stay out of the setState updater on purpose: React may invoke
   * an updater more than once, which would double-write the summary.
   */
  const confirmScope = useCallback(async () => {
    const { result, scope } = stateRef.current;
    if (!result) return;
    const scoped = applyScope(result, scope);

    track('scope_selected', {
      categories_on: scopeCodes(selectedCategories(scope)),
      categories_off: scopeCodes(unselectedCategories(scope)),
      used_defaults: isDefaultScope(scope),
    });

    setState((s) => ({ ...s, stage: 'done', result: scoped }));
    void saveScanSummary(scanResultToSummary(scoped, new Date()));

    const current = rules ?? (await getScanRules());
    const updated = setScope(current, scope as Record<string, boolean>);
    setRules(updated);
    await saveScanRules(updated);
  }, [rules]);

  const pickAndScan = useCallback(async () => {
    setState((s) => ({ ...s, stage: 'picking', error: null }));
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '.csv'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets) {
        setState((s) => ({ ...s, stage: 'idle' }));
        return;
      }

      const assets = picked.assets;
      const capped = assets.slice(0, MAX_FILES);
      const skippedFileMessages: string[] = [];
      if (assets.length > MAX_FILES) {
        skippedFileMessages.push('too-many-files');
      }

      const files: ScanFileInput[] = [];
      for (const asset of capped) {
        if ((asset.size ?? 0) > MAX_FILE_BYTES) {
          skippedFileMessages.push(asset.name);
          continue;
        }
        const file = new File(asset.uri);
        const text = await file.text();
        files.push({ fileName: asset.name, text, byteLength: asset.size });
      }

      if (files.length === 0) {
        setState((s) => ({ ...s, stage: 'idle', skippedFileMessages, error: 'no-valid-files' }));
        return;
      }

      track('scan_started', { n_files: files.length });
      const loadedRules = await getScanRules();
      setRules(loadedRules);
      setPendingFiles(files);
      setState((s) => ({
        ...s,
        stage: 'scanning',
        fileNames: files.map((f) => f.fileName),
        files,
        skippedFileMessages,
      }));
      await runWithRules(files, loadedRules);
    } catch {
      setState((s) => ({ ...s, stage: 'idle', error: 'pick-failed' }));
    }
  }, [runWithRules]);

  /** Answer the current pending question, persist the rule, and re-run the
   *  scan against the same in-memory files with the updated rules. */
  const answerQuestion = useCallback(
    async (question: ScanQuestion, answer: 'march' | 'april' | 'yes' | 'no') => {
      if (!rules) return;
      let updated = rules;
      if (question.type === 'date-order') {
        updated = setDateOrder(rules, question.headerFingerprint, answer === 'march' ? 'MDY' : 'DMY');
      } else {
        // "Purchases look like negative numbers" Yes -> outflow already negative (+1
        // multiplier keeps sign as-is); No -> flip (outflow is positive in this file).
        updated = setSignConvention(rules, question.headerFingerprint, answer === 'yes' ? 1 : -1);
      }
      setRules(updated);
      await saveScanRules(updated);
      setState((s) => ({ ...s, stage: 'scanning', pendingQuestion: null }));
      await runWithRules(pendingFiles, updated);
    },
    [rules, pendingFiles, runWithRules]
  );

  const reset = useCallback(() => {
    setState({
      stage: 'idle',
      fileNames: [],
      files: [],
      skippedFileMessages: [],
      pendingQuestion: null,
      result: null,
      scope: defaultScope(),
      error: null,
    });
    setPendingFiles([]);
  }, []);

  return { state, pickAndScan, answerQuestion, toggleScopeCategory, confirmScope, reset };
}
