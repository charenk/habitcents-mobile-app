import { Stack } from 'expo-router';

// ADR 0020 + 0022, amended by ADR 0026: audit-subs, audit-vices, reveal and
// success are deleted, and the intent picker became the carousel's three beats
// on the welcome route. `intent` stays REGISTERED as a redirect so a persisted
// deep link to it still resolves (the build 5 crash class); every beat
// completes onboarding from within the real app instead of a chain of
// onboarding screens.
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="intent" />
    </Stack>
  );
}
