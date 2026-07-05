import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
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
  const { state, pickAndScan, answerQuestion, reset } = useLeakScanIntake();

  const handleTryDifferentExport = useCallback(() => {
    reset();
  }, [reset]);

  const handleStartLeakAudit = useCallback(() => {
    // Door 1 entry point; the exact Leak Audit step route is a sibling build
    // (P2-1 onboarding two-door fork), not yet registered. Routing to the
    // fork's own entry keeps this a stable anchor regardless of that build's
    // internal step routing.
    router.push('/onboarding/welcome');
  }, [router]);

  const handleLogByHand = useCallback(() => {
    router.push('/(tabs)/expenses');
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
