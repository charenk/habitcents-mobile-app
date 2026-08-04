import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useLeakScanIntake } from '@/components/leak-scan/useLeakScanIntake';
import { IntakeScreen } from '@/components/leak-scan/IntakeScreen';
import { ResultsScreen } from '@/components/leak-scan/ResultsScreen';
import { GracefulFailure } from '@/components/leak-scan/GracefulFailure';

/**
 * The Leak Scan route (P2-1b, Door 2). Registered at the exact path
 * app/onboarding's Door 2 pushes to: router.push('/leak-scan'). Owns intake
 * through results end to end; the graceful-failure screen exits into Door 1
 * (docs/design-package-phase2/02-p2-1-onboarding-leak-audit.md section 7,
 * "Door 2 graceful failure re-entry") without touching app/onboarding/,
 * which a sibling build owns.
 */
export default function LeakScanRoute() {
  const router = useRouter();
  const { chooseDoor, completeStep } = useOnboarding();
  const { state, pickAndScan, answerQuestion, reset } = useLeakScanIntake();

  const handleTryDifferentExport = useCallback(() => {
    reset();
  }, [reset]);

  const handleStartLeakAudit = useCallback(async () => {
    // Mirror the intent picker's "break" path (spec 02 section 7: the failure
    // action opens Leak Audit step 1). doorChosen must leave 'statements'
    // first, or welcome's resume effect routes straight back here.
    await chooseDoor('fresh');
    await completeStep('fork');
    router.push('/onboarding/audit-subs');
  }, [chooseDoor, completeStep, router]);

  const handleLogByHand = useCallback(() => {
    router.push('/(tabs)/money');
  }, [router]);

  if (state.stage === 'done' && state.result) {
    if (state.result.gracefulFailure) {
      return (
        <GracefulFailure
          onTryDifferentExport={handleTryDifferentExport}
          onStartLeakAudit={handleStartLeakAudit}
          onLogByHand={handleLogByHand}
        />
      );
    }
    return <ResultsScreen result={state.result} files={state.files} />;
  }

  return <IntakeScreen state={state} onChooseFiles={pickAndScan} onAnswer={answerQuestion} />;
}
