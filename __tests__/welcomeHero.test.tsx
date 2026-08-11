/**
 * Minimal splash (Charen's 2026-08-10 exploration on design/welcome-aurora):
 * welcome reduces to the aurora background, the serif headline, and the
 * single Get started action. The honest-zero KeptHero and value rows are
 * retired from this screen; ADR 0022's no-invented-totals rule still holds
 * app-wide (KeptHero's own coverage lives with the component), and this
 * suite pins what the splash still owes: the headline as a header, the CTA
 * navigating to the intent picker, and NO dollar figure of any kind on the
 * screen (a splash with no numbers can't invent a total).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockUseReducedMotion = jest.fn(() => false);
jest.mock('@/utils/motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import OnboardingWelcomeScreen from '@/app/onboarding/welcome';
import { strings } from '@/constants/strings';

// Non-zero frame + insets so useSafeAreaInsets resolves without a live layout.
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <OnboardingProvider>{children}</OnboardingProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type RenderApi = Awaited<ReturnType<typeof render>>;

// Async render + async act: the onboarding provider loads stored state in a
// passive effect (mirrors __tests__/intentPicker.test.tsx), and Get started
// awaits a context write before it calls router.
async function renderScreen(): Promise<RenderApi> {
  let view!: RenderApi;
  await act(async () => {
    view = await render(
      <Providers>
        <OnboardingWelcomeScreen />
      </Providers>
    );
  });
  return view;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPush.mockClear();
  mockReplace.mockClear();
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  mockUseReducedMotion.mockReturnValue(false);
});

describe('Minimal splash', () => {
  it('renders the headline as a header', async () => {
    const view = await renderScreen();

    expect(view.getByRole('header', { name: strings.onboarding.welcomeHeadline })).toBeTruthy();
  });

  it('renders no dollar figure anywhere (no totals to invent, ADR 0022)', async () => {
    const view = await renderScreen();

    expect(view.queryByText(/\$\s?\d/)).toBeNull();
  });

  it('does not render the retired hero or value rows', async () => {
    const view = await renderScreen();

    expect(view.queryByText(strings.habitLogging.keptZeroCaption)).toBeNull();
    expect(view.queryByText(strings.onboarding.valuePropLog)).toBeNull();
    expect(view.queryByText(strings.onboarding.outcomeKeptCounts)).toBeNull();
  });

  it('Get started completes the welcome step and navigates to the intent picker', async () => {
    const view = await renderScreen();

    await act(async () => {
      fireEvent.press(view.getByText(strings.onboarding.getStarted));
      await Promise.resolve();
    });

    expect(mockPush).toHaveBeenCalledWith('/onboarding/intent');
  });
});
