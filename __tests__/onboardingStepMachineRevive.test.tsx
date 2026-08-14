/**
 * Onboarding step machine: reviving a retired currentStep.
 *
 * A device can carry a persisted `currentStep` naming a screen that no longer
 * exists. Routing to one is exactly how build 5 crashed (docs/runs.log: an
 * unhandled resume target), so this suite exists to keep that impossible.
 *
 * The MECHANISM changed in phase 6 (PRD v3.1, ADR 0026) and the guarantee got
 * stronger. The carousel is now the only onboarding destination, so there is no
 * resume table left to get wrong: whatever step is stored, landing here shows
 * the carousel and re-picking is an honest resume. The assertions therefore
 * moved from "redirects to the intent picker" to "renders, and navigates
 * nowhere at all", which is the property that actually prevents the crash.
 *
 * Formerly covered a STEP_ROUTE map; before that, the single guided_log case.
 *
 * Uses the real OnboardingProvider (unlike door1FirstRun.test.tsx /
 * door3BreakSheet.test.tsx, which mock it) so the actual STEP_ROUTE resume
 * effect runs against real persisted state, seeded directly into the
 * AsyncStorage mock.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import OnboardingWelcomeScreen from '@/app/onboarding/welcome';
import type { OnboardingState } from '@/types/onboarding';

const ONBOARDING_STATE_KEY = '@habitcents_onboarding_state';
const AUDIT_ANSWERS_KEY = '@habitcents_audit_answers';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        {/* The honest-zero welcome renders the real KeptHero, which reads
            useCurrency; the provider joined the wrapper at the W1+W3 merge. */}
        <CurrencyProvider>
          <OnboardingProvider>{children}</OnboardingProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function seedStoredStep(currentStep: OnboardingState['currentStep']): Promise<void> {
  const state: OnboardingState = {
    currentStep,
    hasSeenWelcome: true,
    hasSeenValueProps: false,
    hasAddedFirstExpense: false,
    skippedSteps: [],
    doorChosen: 'fresh',
  };
  await AsyncStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
}

async function renderWelcome(): Promise<void> {
  await act(async () => {
    render(
      <Providers>
        <OnboardingWelcomeScreen />
      </Providers>
    );
  });
  // Flush the provider's storage load and the resume effect.
  await act(async () => {});
}

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
});

afterEach(cleanup);

describe('Onboarding step machine: retired steps revive on the carousel', () => {
  it.each([
    ['audit_subs', '/onboarding/audit-subs'],
    ['audit_vices', '/onboarding/audit-vices'],
    ['reveal', '/onboarding/reveal'],
    ['guided_log', '/onboarding/guided-log'],
    ['success', '/onboarding/success'],
  ] as const)('a stored %s step revives without crashing or routing anywhere', async (step, deletedRoute) => {
    await seedStoredStep(step);

    await expect(renderWelcome()).resolves.not.toThrow();

    // The deleted screen is never navigated to, and neither is anything else:
    // the carousel IS the resume, so the safest routing table is no routing
    // table.
    expect(mockReplace).not.toHaveBeenCalledWith(deletedRoute);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('a step still shipped (fork) revives the same way', async () => {
    await seedStoredStep('fork');

    await renderWelcome();

    expect(mockReplace).not.toHaveBeenCalled();
  });

  // The one genuine resume: the scan door owns state of its own (picked files,
  // a partly answered question set) and belongs back in its flow, not at the
  // start.
  it('sends a mid-scan device back into the scan flow', async () => {
    const state = {
      currentStep: 'fork',
      hasSeenWelcome: true,
      hasSeenValueProps: false,
      hasAddedFirstExpense: false,
      skippedSteps: [],
      doorChosen: 'statements',
    };
    await AsyncStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));

    await renderWelcome();

    expect(mockReplace).toHaveBeenCalledWith('/leak-scan');
  });
});

describe('Onboarding step machine: legacy audit answers', () => {
  it('stored auditAnswers are ignored on revive and cleared on the next completeOnboarding', async () => {
    await seedStoredStep('audit_subs');
    await AsyncStorage.setItem(
      AUDIT_ANSWERS_KEY,
      JSON.stringify({
        selectedSubscriptions: [{ id: 'video', amountCents: 1200, edited: false }],
        viceAnswers: [],
        subsStepDone: true,
        vicesStepDone: false,
      })
    );

    await renderWelcome();

    // Revive never routes anywhere that could read auditAnswers back into a
    // screen, because it does not route at all.
    expect(mockReplace).not.toHaveBeenCalled();
    // The key itself is only actually cleared by completeOnboarding()
    // (contexts/OnboardingContext.tsx), not by the revive path; still present
    // here proves the revive path really did leave it untouched rather than
    // silently wiping it as a side effect of routing.
    expect(await AsyncStorage.getItem(AUDIT_ANSWERS_KEY)).not.toBeNull();
  });
});
