/**
 * Door 2 graceful failure re-entry (spec 02 section 7). The failure screen's
 * "Start with the 90-second Leak Audit" must land in Leak Audit step 1, which
 * means it has to rewrite onboarding state first: a scan user has
 * doorChosen 'statements', and welcome's resume effect routes 'statements'
 * straight back to /leak-scan. What is pinned here is the regression this file
 * fixes: the button clears the scan door (to 'fresh'), advances the stored
 * step past the picker (so an abandon resumes in the audit), and routes to
 * /onboarding/audit-subs rather than bouncing through welcome.
 *
 * Provider wiring mirrors __tests__/intentPicker.test.tsx. The intake hook is
 * mocked to hold the graceful-failure result; the pipeline that produces it
 * has its own acceptance tests.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

const mockIntakeState = {
  stage: 'done' as const,
  fileNames: ['statement.csv'],
  files: [],
  skippedFileMessages: [],
  pendingQuestion: null,
  result: { gracefulFailure: true },
  error: null,
};
jest.mock('@/components/leak-scan/useLeakScanIntake', () => ({
  useLeakScanIntake: () => ({
    state: mockIntakeState,
    pickAndScan: jest.fn(),
    answerQuestion: jest.fn(),
    reset: jest.fn(),
  }),
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import LeakScanRoute from '@/app/leak-scan';
import { strings } from '@/constants/strings';
import { getOnboardingState, saveOnboardingState } from '@/utils/storage';
import { INITIAL_ONBOARDING_STATE } from '@/types/onboarding';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type RenderApi = Awaited<ReturnType<typeof render>>;

async function renderRoute(): Promise<RenderApi> {
  let view!: RenderApi;
  await act(async () => {
    view = await render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <OnboardingProvider>
            <LeakScanRoute />
          </OnboardingProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  });
  return view;
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

afterEach(cleanup);

describe('Leak Scan graceful failure re-entry', () => {
  it('starts the Leak Audit at step 1 and clears the scan door', async () => {
    // The state a real scan user arrives with: they picked the scan intent,
    // so the door is 'statements' and the stored step still sits at the picker.
    await saveOnboardingState({
      ...INITIAL_ONBOARDING_STATE,
      currentStep: 'fork',
      doorChosen: 'statements',
    });

    const view = await renderRoute();
    await act(async () => {
      fireEvent.press(view.getByText(strings.leakScan.failureStartLeakAudit));
    });

    expect(mockPush).toHaveBeenCalledWith('/onboarding/audit-subs');
    // Welcome bounces doorChosen 'statements' back into /leak-scan, so the
    // stored state must no longer say 'statements', and the step must sit in
    // the audit so an abandon resumes there.
    const stored = await getOnboardingState();
    expect(stored?.doorChosen).toBe('fresh');
    expect(stored?.currentStep).toBe('audit_subs');
  });
});
