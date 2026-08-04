/**
 * Profile (design/header-unification U4, ADR 0019). Mirrors the deleted
 * __tests__/settingsSheet.test.tsx: it renders the specced title, plan line
 * and every row (now pushed as its own screen rather than a bottom sheet),
 * and pins the same two mutating behaviors (Premium push, Sign out) plus the
 * new Support row and both restore-purchases outcomes.
 *
 * Provider wiring mirrors the deleted test (SafeAreaProvider with
 * initialMetrics + ThemeProvider + ToastProvider), plus CurrencyProvider and
 * OnboardingProvider because the page reads both contexts.
 *
 * Module mocks carry the seams: utils/storage (so the sign-out clear is
 * observable without touching AsyncStorage), utils/purchases (so both restore
 * outcomes are directly controllable) and expo-router (no navigator in a unit
 * test; Stack.Screen renders nothing so it never needs a real navigation
 * context). Copy comes from the real constants/strings.ts, so a reworded
 * string moves the assertions with it.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
  Stack: { Screen: () => null },
}));

jest.mock('@/utils/storage', () => {
  const actual = jest.requireActual('@/utils/storage');
  return { ...actual, clearOnboarding: jest.fn(async () => {}) };
});

const mockRestore = jest.fn();
jest.mock('@/utils/purchases', () => {
  const actual = jest.requireActual('@/utils/purchases');
  return { ...actual, restore: (...args: unknown[]) => mockRestore(...args) };
});

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ToastProvider } from '@/components/ui/Toast';
import ProfileScreen from '@/app/profile';
import { clearOnboarding } from '@/utils/storage';
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
          <OnboardingProvider>
            <ToastProvider>{children}</ToastProvider>
          </OnboardingProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderProfile() {
  const view = await render(
    <Providers>
      <ProfileScreen />
    </Providers>
  );
  // Flush the provider load effects.
  await act(async () => {});
  return view;
}

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockBack.mockClear();
  (clearOnboarding as jest.Mock).mockClear();
  mockRestore.mockReset();
  mockRestore.mockResolvedValue({ ok: true, mode: 'mock', entitlement: 'free' });
});

afterEach(cleanup);

describe('Profile', () => {
  it('renders the title, plan line and every row', async () => {
    const view = await renderProfile();

    expect(view.getByText(strings.profile.title)).toBeTruthy();
    expect(view.getByText(strings.settings.planFree)).toBeTruthy();
    expect(view.getByText(strings.settings.groupPreferences)).toBeTruthy();
    expect(view.getByText(strings.settings.groupAbout)).toBeTruthy();

    // Rows are found by their accessibility label, which is what VoiceOver reads.
    expect(view.getByLabelText('Currency, USD')).toBeTruthy();
    expect(view.getByLabelText(strings.settings.premiumRow)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.restoreRow)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.privacyPolicy)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.termsOfService)).toBeTruthy();
    expect(view.getByLabelText(strings.profile.supportRow)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.signOutRow)).toBeTruthy();
    expect(view.getByLabelText('Version, 1.0.0')).toBeTruthy();
    // The sign-out reassurance sits on the right of its row.
    expect(view.getByText(strings.settings.signOutHint)).toBeTruthy();
  });

  it('sign out clears the local session, pops back, replaces to onboarding and toasts', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.signOutRow));
    });

    expect(clearOnboarding).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/welcome');
    expect(view.getByText(strings.settings.signOutToast)).toBeTruthy();
  });

  it('premium row pushes the paywall with the settings placement, no back needed', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.premiumRow));
    });

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=settings');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('restore purchases reports no-purchases-found in a toast', async () => {
    mockRestore.mockResolvedValueOnce({ ok: true, mode: 'mock', entitlement: 'free' });
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.restoreRow));
    });

    expect(view.getByText(strings.settings.restoreNoneMessage)).toBeTruthy();
  });

  it('restore purchases reports a restored premium entitlement in a toast', async () => {
    mockRestore.mockResolvedValueOnce({ ok: true, mode: 'mock', entitlement: 'premium' });
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.restoreRow));
    });

    expect(view.getByText(strings.settings.restoreDoneMessage)).toBeTruthy();
  });

  it('renders the app version from Constants', async () => {
    const view = await renderProfile();
    expect(view.getByLabelText('Version, 1.0.0')).toBeTruthy();
  });
});
