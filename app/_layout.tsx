import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useIsDark } from '@/contexts/ThemeContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

function StatusBarThemed() {
  const isDark = useIsDark();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <CategoriesProvider>
        <ExpensesProvider>
          <HabitsProvider>
            <ReportsProvider>
              <OnboardingProvider>
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
    </ThemeProvider>
  );
}
