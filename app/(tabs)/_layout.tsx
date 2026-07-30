import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { strings } from '@/constants/strings';

/**
 * Tab bar (redesign step 02, design/redesign-handoff/02-navigation.md plus the
 * runbook decision of 2026-07-30 that keeps Categories as a fourth tab).
 *
 * Order: Today / Money / Insights / Categories. Settings is no longer a tab;
 * it opens as a bottom sheet from the gear on Today.
 */
export default function TabLayout() {
  const theme = useTheme();
  // Tab bar metrics derive from the device's real bottom inset (ADA-022):
  // 8 top padding + 48 content + home-indicator inset (min 8 on inset-less
  // devices), instead of the old fixed height 84 / paddingBottom 28.
  const insets = useSafeAreaInsets();
  const tabBarBottomPad = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.white,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 56 + tabBarBottomPad,
          paddingTop: 8,
          paddingBottom: tabBarBottomPad,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          // Loaded font families ignore fontWeight on Android, so the weight
          // has to come from the family itself (Inter 600).
          fontFamily: theme.fonts.uiSemibold,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.today,
          tabBarIcon: ({ color, size }) => <Icon name="Sun" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: strings.tabs.money,
          tabBarIcon: ({ color, size }) => <Icon name="Wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: strings.tabs.insights,
          tabBarIcon: ({ color, size }) => <Icon name="TrendingUp" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: strings.tabs.categories,
          tabBarIcon: ({ color, size }) => <Icon name="LayoutGrid" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
