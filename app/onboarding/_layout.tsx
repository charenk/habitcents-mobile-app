import { Stack } from 'expo-router';

// W3, "the app is the onboarding" complete (ADR 0020 + 0022): audit-subs,
// audit-vices, reveal, and success are deleted. The intent picker is the
// stack's only screen past welcome now; every door completes onboarding from
// within the real app (Today) instead of a chain of onboarding screens.
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="intent" />
    </Stack>
  );
}
