import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { AppTheme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ValueProp = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
};

const VALUE_PROPS: ValueProp[] = [
  {
    id: '1',
    icon: 'flash-outline',
    title: 'Quick Tracking',
    description: 'Add expenses in seconds. Just enter the amount and category - done!',
    color: '#FFA726',
  },
  {
    id: '2',
    icon: 'bulb-outline',
    title: 'Smart Insights',
    description: 'We automatically detect your spending habits and patterns over time.',
    color: '#42A5F5',
  },
  {
    id: '3',
    icon: 'trophy-outline',
    title: 'Build Better Habits',
    description: 'Set goals, track streaks, and celebrate wins. Small changes add up!',
    color: '#66BB6A',
  },
];

export default function ValuePropsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { completeStep, skipStep } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    if (currentIndex < VALUE_PROPS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await completeStep('value_props');
      router.push('/onboarding/first-expense');
    }
  };

  const handleSkip = async () => {
    await skipStep('value_props');
    router.push('/onboarding/first-expense');
  };

  const renderItem = ({ item }: { item: ValueProp }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={64} color={item.color} />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={VALUE_PROPS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        contentContainerStyle={styles.slideList}
      />

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {VALUE_PROPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Next button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === VALUE_PROPS.length - 1 ? "Let's Go" : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={theme.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    skipText: {
      fontSize: 16,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    slideList: {
      flexGrow: 1,
    },
    slide: {
      width: SCREEN_WIDTH,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    iconContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    slideTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    slideDescription: {
      fontSize: 17,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 26,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 32,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.border,
    },
    dotActive: {
      backgroundColor: theme.primary,
      width: 24,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 18,
      borderRadius: 16,
      gap: 8,
    },
    buttonText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.white,
    },
  });
}
