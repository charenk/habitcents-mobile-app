import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="value" />
      <Stack.Screen name="first-expense" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
