import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { getHasOnboarded } from '@/utils/storage';
import { useTheme } from '@/contexts/ThemeContext';

export default function Index() {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const onboarded = await getHasOnboarded();
    setHasOnboarded(onboarded);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!hasOnboarded) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return <Redirect href="/(tabs)/expenses" />;
}
