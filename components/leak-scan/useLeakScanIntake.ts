import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { runScan, type ScanFileInput } from '@/utils/leakScan';
import { MAX_FILES, MAX_FILE_BYTES, type ScanQuestion, type ScanResult } from '@/utils/leakScan/types';
import { getScanRules, saveScanRules, setDateOrder, setSignConvention, type ScanRules } from '@/utils/scanRules';
import { track } from '@/utils/analytics';

export type IntakeStage = 'idle' | 'picking' | 'scanning' | 'question' | 'done';

export type IntakeState = {
  stage: IntakeStage;
  fileNames: string[];
  skippedFileMessages: string[];
  pendingQuestion: ScanQuestion | null;
  result: ScanResult | null;
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
    skippedFileMessages: [],
    pendingQuestion: null,
    result: null,
    error: null,
  });
  const [rules, setRules] = useState<ScanRules | null>(null);
  const [pendingFiles, setPendingFiles] = useState<ScanFileInput[]>([]);

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
        coverage_days: result.coverage?.coveredDays ?? 0,
        n_accounts: new Set(result.files.map((f) => f.account)).size,
        n_habits_found: result.habits.length,
        solid_count: tierBreakdown.solid,
        likely_count: tierBreakdown.likely,
        needs_review_count: tierBreakdown['needs-review'],
      });
    }
    setState((s) => ({ ...s, stage: 'done', pendingQuestion: null, result }));
  }, []);

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
      skippedFileMessages: [],
      pendingQuestion: null,
      result: null,
      error: null,
    });
    setPendingFiles([]);
  }, []);

  return { state, pickAndScan, answerQuestion, reset };
}
