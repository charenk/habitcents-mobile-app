import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initAnalytics, track, flushAnalytics } from '@/utils/analytics';
import { ThemeProvider, useIsDark } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

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
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <CategoriesProvider>
        <ExpensesProvider>
          <HabitsProvider>
            <ReportsProvider>
              <OnboardingProvider>
                <AnalyticsLifecycle />
                <StatusBarThemed />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="welcome" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="habit" />
                  <Stack.Screen name="category" />
                </Stack>
              </OnboardingProvider>
            </ReportsProvider>
          </HabitsProvider>
        </ExpensesProvider>
        </CategoriesProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
