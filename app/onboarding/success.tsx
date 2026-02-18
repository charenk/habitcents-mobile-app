import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { AppTheme } from '@/constants/theme';

export default function SuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { completeOnboarding } = useOnboarding();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation sequence
    Animated.sequence([
      // Scale up the circle
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // Show the checkmark
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Show the text
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after delay
    const timer = setTimeout(async () => {
      await completeOnboarding();
      router.replace('/(tabs)/finance');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        {/* Animated checkmark */}
        <Animated.View
          style={[
            styles.checkCircle,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: checkAnim,
              transform: [
                {
                  scale: checkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="checkmark" size={64} color={theme.white} />
          </Animated.View>
        </Animated.View>

        {/* Success text */}
        <Animated.View style={{ opacity: opacityAnim }}>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>
            Your first expense has been saved.{'\n'}Let's start building better habits.
          </Text>
        </Animated.View>
      </View>

      {/* Confetti-like dots */}
      <View style={styles.dotsContainer}>
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * 2 * Math.PI;
          const radius = 120 + Math.random() * 40;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const size = 8 + Math.random() * 8;
          const colors = [theme.primary, '#FFA726', '#42A5F5', '#EC407A', '#66BB6A'];
          const color = colors[i % colors.length];

          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: color,
                  transform: [
                    { translateX: x },
                    { translateY: y },
                    { scale: scaleAnim },
                  ],
                  opacity: scaleAnim,
                },
              ]}
            />
          );
        })}
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
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    checkCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 17,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 26,
    },
    dotsContainer: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 0,
      height: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      position: 'absolute',
    },
  });
}
