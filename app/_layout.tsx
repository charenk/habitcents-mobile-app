import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { initAnalytics, track, flushAnalytics } from '@/utils/analytics';
import { hydrateEntitlement } from '@/utils/purchases';
import { ThemeProvider, useIsDark } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ToastProvider } from '@/components/ui/Toast';
import { PrivacyOverlay } from '@/components/PrivacyOverlay';

// Hold the native splash until fonts are ready so titles and currency numbers
// never flash a fallback face. Safe to call at module scope (expo-splash-screen).
SplashScreen.preventAutoHideAsync();

function StatusBarThemed() {
  const isDark = useIsDark();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

/**
 * App lifecycle analytics. Initializes PostHog once (no-op when unconfigured)
 * and reports cold start plus foreground/background transitions. Renders nothing.
 */
function AnalyticsLifecycle() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    void initAnalytics();
    track('app_opened', { cold_start: true });

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        track('app_foregrounded', {});
      } else if (prev === 'active' && next.match(/inactive|background/)) {
        track('app_backgrounded', {});
        void flushAnalytics();
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Read the stored entitlement back into memory before the first gate check.
  // Feature gates read it synchronously during render, so it has to be warm
  // rather than awaited per call.
  useEffect(() => {
    void hydrateEntitlement();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <CategoriesProvider>
        <ExpensesProvider>
          <HabitsProvider>
            <ReportsProvider>
              <OnboardingProvider>
                {/* ToastProvider is the innermost provider so useToast() is
                    reachable from every screen. Its toast host renders above the
                    Stack but below PrivacyOverlay, which stays the last sibling
                    to remain visually topmost. */}
                <ToastProvider>
                  <AnalyticsLifecycle />
                  <StatusBarThemed />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="habit" />
                    <Stack.Screen name="category" />
                    <Stack.Screen name="profile" />
                    <Stack.Screen name="leak-scan" />
                    <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
                  </Stack>
                </ToastProvider>
                {/* Mounted last so it stacks visually above the Stack's screens
                    and the toast host (spec 05 section 7): must exist before the
                    iOS app-switcher snapshot, so it renders unconditionally at
                    the root rather than per-screen. */}
                <PrivacyOverlay />
              </OnboardingProvider>
            </ReportsProvider>
          </HabitsProvider>
        </ExpensesProvider>
        </CategoriesProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
