/**
 * Intent picker (redesign step 03, screen 2). The picked card is the
 * acquisition metric for this redesign, so what is pinned here is the analytics
 * contract: the three cards are reachable by their accessible names, each one
 * fires onboarding_intent_selected with its own intent, and skip fires
 * onboarding_intent_skipped.
 *
 * Provider wiring mirrors __tests__/toast.test.tsx (SafeAreaProvider with
 * initialMetrics + ThemeProvider) plus OnboardingProvider, which the screen
 * reads. Two module mocks carry the seams: expo-router (no navigator in a unit
 * test) and utils/analytics (so track() is observable). Copy comes from the real
 * constants/strings.ts, so a reworded card moves the assertions with it.
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

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import OnboardingIntentScreen from '@/app/onboarding/intent';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';

const trackMock = track as jest.MockedFunction<typeof track>;

// Non-zero frame + insets so useSafeAreaInsets resolves without a live layout.
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

type RenderApi = Awaited<ReturnType<typeof render>>;

// Async render + async act: the provider tree loads stored onboarding state in a
// passive effect, and the press handlers await context writes before they call
// router. A synchronous act would assert before either settles.
async function renderScreen(): Promise<RenderApi> {
  let view!: RenderApi;
  await act(async () => {
    view = await render(
      <Providers>
        <OnboardingIntentScreen />
      </Providers>
    );
  });
  return view;
}

async function pressLabel(view: RenderApi, label: string) {
  await act(async () => {
    fireEvent.press(view.getByLabelText(label));
  });
}

// Skip is a shared Button whose accessible name is its rendered label.
async function pressText(view: RenderApi, text: string) {
  await act(async () => {
    fireEvent.press(view.getByText(text));
  });
}

beforeEach(() => {
  trackMock.mockClear();
  mockPush.mockClear();
  mockReplace.mockClear();
});

afterEach(cleanup);

describe('Onboarding intent picker', () => {
  it('renders the three intent cards by their accessible name', async () => {
    const view = await renderScreen();
    expect(view.getByLabelText(strings.onboarding.intentTrackTitle)).toBeTruthy();
    expect(view.getByLabelText(strings.onboarding.intentScanTitle)).toBeTruthy();
    expect(view.getByLabelText(strings.onboarding.intentBreakTitle)).toBeTruthy();
    expect(view.getByText(strings.onboarding.intentTitle)).toBeTruthy();
    expect(view.getByText(strings.onboarding.intentSub)).toBeTruthy();
  });

  it.each([
    ['track', 'intentTrackTitle', '/onboarding/guided-log'],
    ['scan', 'intentScanTitle', '/leak-scan'],
    ['break', 'intentBreakTitle', '/onboarding/audit-subs'],
  ] as const)(
    'fires onboarding_intent_selected with intent %s and routes onward',
    async (intent, labelKey, route) => {
      const view = await renderScreen();
      await pressLabel(view, strings.onboarding[labelKey]);
      expect(trackMock).toHaveBeenCalledWith('onboarding_intent_selected', { intent });
      expect(mockPush).toHaveBeenCalledWith(route);
    }
  );

  it('fires onboarding_intent_skipped on skip and lands on Today', async () => {
    const view = await renderScreen();
    await pressText(view, strings.onboarding.skipForNow);
    expect(trackMock).toHaveBeenCalledWith('onboarding_intent_skipped', {});
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
