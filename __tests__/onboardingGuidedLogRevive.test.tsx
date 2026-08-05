/**
 * Onboarding step machine: reviving a stored currentStep of 'guided_log'
 * (W2, "the app is the onboarding"). That step's screen (app/onboarding/
 * guided-log.tsx) is retired; a device that was mid-flow on it before this
 * update still has it in AsyncStorage, so welcome.tsx's resume effect
 * (STEP_ROUTE) must not crash or route to a screen that no longer exists.
 * It's mapped forward to success.tsx, guided_log's former next step
 * (Door 3's unit owns the full step-machine rewrite this implies).
 *
 * Uses the real OnboardingProvider (unlike door1FirstRun.test.tsx, which
 * mocks it) so the actual STEP_ROUTE resume effect runs against real
 * persisted state, seeded directly into the AsyncStorage mock.
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
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import OnboardingWelcomeScreen from '@/app/onboarding/welcome';
import type { OnboardingState } from '@/types/onboarding';

const ONBOARDING_STATE_KEY = '@habitcents_onboarding_state';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <OnboardingProvider>{children}</OnboardingProvider>
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

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
});

afterEach(cleanup);

describe('Onboarding step machine: stored guided_log step', () => {
  it('resumes to success rather than the retired guided-log route, without crashing', async () => {
    await seedStoredStep('guided_log');

    await expect(
      (async () => {
        await act(async () => {
          render(
            <Providers>
              <OnboardingWelcomeScreen />
            </Providers>
          );
        });
        // Flush the provider's storage load and the resume effect.
        await act(async () => {});
      })()
    ).resolves.not.toThrow();

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/success');
    expect(mockReplace).not.toHaveBeenCalledWith('/onboarding/guided-log');
  });

  it('a step still shipped (reveal) keeps resuming to its own screen unaffected', async () => {
    await seedStoredStep('reveal');

    await act(async () => {
      render(
        <Providers>
          <OnboardingWelcomeScreen />
        </Providers>
      );
    });
    await act(async () => {});

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/reveal');
  });
});
