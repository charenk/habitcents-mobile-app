import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarIcon } from '@/components/ui/TabBarIcon';
import { useTheme } from '@/contexts/ThemeContext';
import { strings } from '@/constants/strings';
import { layout, typeScale } from '@/constants/theme';

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
  // 8 top padding + 48 content (tabBarHeight 56, back down from 64 now that the
  // selected tab is a filled glyph rather than a pill) + home-indicator inset
  // (min 8 on inset-less devices), instead of the old fixed height 84 /
  // paddingBottom 28.
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
          height: layout.tabBarHeight + tabBarBottomPad,
          paddingTop: 8,
          paddingBottom: tabBarBottomPad,
        },
        // No tabBarLabelStyle: the tabBarLabel render prop below owns every
        // label style, and two sources for one thing is how they drift apart.
        //
        // UX-067: the default tabBarLabel scales with Dynamic Type unbounded
        // and the bar's height is fixed, so a large accessibility size clips.
        // Capped at 1.5x, matching the vocabulary's chrome/eyebrow ceiling.
        //
        // The cap alone was not enough. The clipping is HORIZONTAL, not
        // vertical: four tabs split a 393pt screen into 98pt columns, and
        // "Categories" at the capped size needs about 91pt before React
        // Navigation's own item padding, so it shipped as "Cate".
        // adjustsFontSizeToFit shrinks it to fit instead of truncating, and
        // minimumFontScale floors that shrink at the 11pt a default-size user
        // already sees. Whole word, every size (ADR 0037).
        //
        // iOS ONLY. Under the New Architecture, RN's Android path serializes
        // minimumFontSize but never minimumFontScale, and its fallback floor
        // is 4dp, so on Android this pair shrinks large-text labels toward
        // unreadable instead of stopping at the baseline. Android keeps the
        // cap and truncates with an ellipsis, which is the lesser harm until
        // upstream forwards the scale floor (ADR 0039 review).
        //
        // Weight carries the selected state alongside colour, because colour
        // alone measured 1.12:1 between the two states. Loaded font families
        // ignore fontWeight on Android, so it has to come from the family.
        tabBarLabel: ({ color, children, focused }) => (
          <Text
            style={{
              fontSize: typeScale.eyebrow,
              fontFamily: focused ? theme.fonts.uiBold : theme.fonts.uiMedium,
              color,
            }}
            maxFontSizeMultiplier={1.5}
            numberOfLines={1}
            adjustsFontSizeToFit={Platform.OS === 'ios'}
            minimumFontScale={1 / 1.5}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.today,
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="Sun" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: strings.tabs.money,
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="Wallet" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: strings.tabs.insights,
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="TrendingUp" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: strings.tabs.categories,
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="LayoutGrid" size={size} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
