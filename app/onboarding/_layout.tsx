import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="fork" />
      <Stack.Screen name="audit-subs" />
      <Stack.Screen name="audit-vices" />
      <Stack.Screen name="reveal" />
      <Stack.Screen name="guided-log" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
