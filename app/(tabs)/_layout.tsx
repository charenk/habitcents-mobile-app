import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { strings } from '@/constants/strings';

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
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 56 + tabBarBottomPad,
          paddingTop: 8,
          paddingBottom: tabBarBottomPad,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="expenses"
        options={{
          title: strings.tabs.expenses,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="Wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: strings.tabs.reports,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="ChartColumn" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: strings.tabs.categories,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="LayoutGrid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: strings.tabs.habits,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="CircleCheck" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
