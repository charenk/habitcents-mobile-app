import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
import type { DetectedHabit } from '@/types/habit';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

type HabitInsightCardProps = {
  habit: DetectedHabit;
  onTrack: () => void;
  onDismiss: () => void;
  onPress?: () => void;
};

export function HabitInsightCard({
  habit,
  onTrack,
  onDismiss,
  onPress,
}: HabitInsightCardProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right - Track
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onTrack());
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left - Dismiss
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDismiss());
        } else {
          // Reset
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getTrendIcon = () => {
    switch (habit.trend) {
      case 'increasing':
        return 'trending-up';
      case 'decreasing':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (habit.trend) {
      case 'increasing':
        return theme.danger;
      case 'decreasing':
        return theme.primary;
      default:
        return theme.textSecondary;
    }
  };

  const getSentimentColor = () => {
    switch (habit.sentiment) {
      case 'good':
        return theme.primary;
      case 'bad':
        return theme.danger;
      default:
        return theme.iconOrange;
    }
  };

  const cardRotation = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-5deg', '0deg', '5deg'],
    extrapolate: 'clamp',
  });

  const leftOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const rightOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrapper}>
      {/* Background actions */}
      <View style={styles.actionsContainer}>
        <Animated.View style={[styles.actionLeft, { opacity: rightOpacity }]}>
          <Ionicons name="checkmark-circle" size={32} color={theme.primary} />
          <Text style={[styles.actionText, { color: theme.primary }]}>Track</Text>
        </Animated.View>
        <Animated.View style={[styles.actionRight, { opacity: leftOpacity }]}>
          <Ionicons name="close-circle" size={32} color={theme.danger} />
          <Text style={[styles.actionText, { color: theme.danger }]}>Dismiss</Text>
        </Animated.View>
      </View>

      {/* Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            transform: [
              { translateX },
              { rotate: cardRotation },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          style={styles.card}
        >
          <View style={styles.header}>
            <View style={[styles.sentimentDot, { backgroundColor: getSentimentColor() }]} />
            <View style={styles.headerContent}>
              <Text style={styles.name}>{habit.name}</Text>
              <Text style={styles.description}>{habit.description}</Text>
            </View>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {format(habit.totalMonthlySpend, { compact: true })}
              </Text>
              <Text style={styles.statLabel}>per month</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {habit.occurrencesPerPeriod}x
              </Text>
              <Text style={styles.statLabel}>per {habit.frequency === 'daily' ? 'day' : habit.frequency === 'weekly' ? 'week' : 'month'}</Text>
            </View>

            <View style={styles.stat}>
              <View style={styles.trendRow}>
                <Ionicons
                  name={getTrendIcon()}
                  size={18}
                  color={getTrendColor()}
                />
                <Text style={[styles.statValue, { color: getTrendColor(), marginLeft: 4 }]}>
                  {habit.trendPercentage}%
                </Text>
              </View>
              <Text style={styles.statLabel}>{habit.trend}</Text>
            </View>
          </View>

          {habit.triggers.length > 0 && (
            <View style={styles.triggers}>
              {habit.triggers.slice(0, 2).map((trigger, index) => (
                <View key={index} style={styles.triggerChip}>
                  <Ionicons
                    name={trigger.type === 'time' ? 'time-outline' : 'information-circle-outline'}
                    size={14}
                    color={theme.textSecondary}
                  />
                  <Text style={styles.triggerText}>{trigger.description}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.swipeHint}>
            <Ionicons name="swap-horizontal" size={16} color={theme.textTertiary} />
            <Text style={styles.swipeHintText}>Swipe to track or dismiss</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: 12,
    },
    actionsContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    actionLeft: {
      alignItems: 'center',
    },
    actionRight: {
      alignItems: 'center',
    },
    actionText: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      overflow: 'hidden',
    },
    card: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    sentimentDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      marginRight: 12,
    },
    headerContent: {
      flex: 1,
    },
    name: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    stats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    stat: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    triggers: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    triggerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginRight: 8,
      marginBottom: 4,
    },
    triggerText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    swipeHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    swipeHintText: {
      fontSize: 12,
      color: theme.textTertiary,
      marginLeft: 6,
    },
  });
}
