/**
 * Profile (design/header-unification U4, ADR 0019; back control unified onto
 * ScreenHeader U1). Mirrors the deleted __tests__/settingsSheet.test.tsx: it
 * renders the specced title, plan line and every row (now pushed as its own
 * screen rather than a bottom sheet), and pins the same two mutating
 * behaviors (Premium push, Sign out) plus the new Support row and both
 * restore-purchases outcomes.
 *
 * Provider wiring mirrors the deleted test (SafeAreaProvider with
 * initialMetrics + ThemeProvider + ToastProvider), plus CurrencyProvider and
 * OnboardingProvider because the page reads both contexts.
 *
 * Module mocks carry the seams: utils/storage (so the sign-out clear is
 * observable without touching AsyncStorage), utils/purchases (so both restore
 * outcomes are directly controllable) and expo-router (no navigator in a unit
 * test). The screen no longer renders a native Stack.Screen header (that was
 * the bug: a transparent floating header whose clearance could overlap the
 * title), so the back control asserted below is the real ScreenHeader pill
 * button, not a stub. Copy comes from the real constants/strings.ts, so a
 * reworded string moves the assertions with it.
 */
// Full-provider renders exceed jest's 5s default under CI worker load.
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
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
import { Linking } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ToastProvider } from '@/components/ui/Toast';
import ProfileScreen from '@/app/profile';
import { clearOnboarding } from '@/utils/storage';
import { strings } from '@/constants/strings';
import { settingsRowLabel } from '@/utils/a11y';

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
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe('Profile', () => {
  it('renders the title, plan line and every row', async () => {
    const view = await renderProfile();

    // The serif title is rendered by the shared ScreenHeader and carries the
    // header role VoiceOver needs (ADA-005 pattern).
    const title = view.getByText(strings.profile.title);
    expect(title).toBeTruthy();
    expect(title.props.accessibilityRole).toBe('header');
    expect(view.getByText(strings.settings.planFree)).toBeTruthy();
    expect(view.getByText(strings.settings.groupPreferences)).toBeTruthy();
    expect(view.getByText(strings.settings.groupAbout)).toBeTruthy();

    // Rows are found by their accessibility label, which is what VoiceOver reads.
    expect(view.getByLabelText('Currency, USD')).toBeTruthy();
    expect(
      view.getByLabelText(
        settingsRowLabel(strings.settings.subscriptionRow, strings.settings.subscriptionValueFree)
      )
    ).toBeTruthy();
    expect(view.getByLabelText(strings.settings.restoreRow)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.privacyPolicy)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.termsOfService)).toBeTruthy();
    expect(
      view.getByLabelText(settingsRowLabel(strings.profile.supportRow, strings.settings.supportEmail))
    ).toBeTruthy();
    expect(view.getByLabelText(strings.settings.signOutRow)).toBeTruthy();
    expect(view.getByLabelText('Version, 1.0.0')).toBeTruthy();
    // The sign-out reassurance sits on the right of its row.
    expect(view.getByText(strings.settings.signOutHint)).toBeTruthy();
    // Subscription mirrors Currency: a status value left of the chevron. The
    // dev menu's Entitlement row (gated on DEV_MENU_ENABLED) can render the
    // same "Free" text, so this only asserts the value renders at least once
    // rather than requiring a single match.
    expect(view.getAllByText(strings.settings.subscriptionValueFree).length).toBeGreaterThan(0);
    // Support shows the address it will mail to, right-aligned as the row's value.
    expect(view.getByText(strings.settings.supportEmail)).toBeTruthy();
  });

  it('the shared header back button pops the screen', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.common.back));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
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

  it('subscription row pushes the paywall with the settings placement, no back needed', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(
        view.getByLabelText(
          settingsRowLabel(strings.settings.subscriptionRow, strings.settings.subscriptionValueFree)
        )
      );
    });

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=settings');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('support row opens the mail composer at the shown address', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(
        view.getByLabelText(settingsRowLabel(strings.profile.supportRow, strings.settings.supportEmail))
      );
    });

    expect(Linking.openURL).toHaveBeenCalledWith(`mailto:${strings.settings.supportEmail}`);
  });

  it('support row toasts on a Linking failure instead of failing silently', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no mail client'));
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(
        view.getByLabelText(settingsRowLabel(strings.profile.supportRow, strings.settings.supportEmail))
      );
    });

    expect(await view.findByText(strings.settings.mailOpenFailed)).toBeTruthy();
  });

  it('privacy policy row opens the browser and toasts on a Linking failure', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no browser'));
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.privacyPolicy));
    });

    expect(Linking.openURL).toHaveBeenCalledWith('https://habitcents.com/privacy');
    expect(await view.findByText(strings.settings.linkOpenFailed)).toBeTruthy();
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
