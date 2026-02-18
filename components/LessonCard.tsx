import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import type { MicroLesson, MicroLessonCategory } from '@/types/habit';

type LessonCardProps = {
  lesson: MicroLesson;
  onPress: () => void;
  onComplete?: () => void;
};

const CATEGORY_CONFIG: Record<MicroLessonCategory, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
}> = {
  cue: { icon: 'eye-outline', color: '#42A5F5', label: 'Cue' },
  routine: { icon: 'refresh-outline', color: '#66BB6A', label: 'Routine' },
  reward: { icon: 'gift-outline', color: '#FFA726', label: 'Reward' },
  craving: { icon: 'heart-outline', color: '#EC407A', label: 'Craving' },
  identity: { icon: 'person-outline', color: '#7E57C2', label: 'Identity' },
};

export function LessonCard({ lesson, onPress, onComplete }: LessonCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const categoryConfig = CATEGORY_CONFIG[lesson.category];
  const isCompleted = !!lesson.completedAt;

  return (
    <TouchableOpacity
      style={[styles.container, isCompleted && styles.containerCompleted]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + '20' }]}>
            <Ionicons
              name={categoryConfig.icon}
              size={14}
              color={categoryConfig.color}
            />
            <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
              {categoryConfig.label}
            </Text>
          </View>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={12} color={theme.textTertiary} />
            <Text style={styles.durationText}>{lesson.duration}</Text>
          </View>
        </View>

        <Text style={styles.title}>{lesson.title}</Text>

        <Text style={styles.preview} numberOfLines={2}>
          {lesson.content}
        </Text>

        <View style={styles.footer}>
          {isCompleted ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          ) : (
            <View style={styles.startPrompt}>
              <Text style={styles.startText}>Start lesson</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </View>
          )}
        </View>
      </View>

      {isCompleted && (
        <View style={styles.completedOverlay} />
      )}
    </TouchableOpacity>
  );
}

type LessonDetailProps = {
  lesson: MicroLesson;
  onComplete: () => void;
  onClose: () => void;
};

export function LessonDetail({ lesson, onComplete, onClose }: LessonDetailProps) {
  const theme = useTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);

  const categoryConfig = CATEGORY_CONFIG[lesson.category];
  const isCompleted = !!lesson.completedAt;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + '20' }]}>
          <Ionicons
            name={categoryConfig.icon}
            size={16}
            color={categoryConfig.color}
          />
          <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
            {categoryConfig.label}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{lesson.title}</Text>

      <View style={styles.contentContainer}>
        <Text style={styles.content}>{lesson.content}</Text>
      </View>

      {!isCompleted && (
        <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
          <Ionicons name="checkmark-circle-outline" size={22} color={theme.white} />
          <Text style={styles.completeButtonText}>Mark as Complete</Text>
        </TouchableOpacity>
      )}

      {isCompleted && (
        <View style={styles.completedMessage}>
          <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
          <Text style={styles.completedMessageText}>
            Completed on {new Date(lesson.completedAt!).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      overflow: 'hidden',
    },
    containerCompleted: {
      opacity: 0.8,
    },
    content: {
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    categoryText: {
      fontSize: 11,
      fontWeight: '600',
      marginLeft: 4,
      textTransform: 'uppercase',
    },
    durationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    durationText: {
      fontSize: 12,
      color: theme.textTertiary,
      marginLeft: 4,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    preview: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    footer: {
      marginTop: 12,
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    completedText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.primary,
      marginLeft: 6,
    },
    startPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    startText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
    completedOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.surface,
      opacity: 0.3,
    },
  });
}

function createDetailStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    closeButton: {
      padding: 4,
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    categoryText: {
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 6,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 24,
    },
    contentContainer: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
    },
    content: {
      fontSize: 17,
      color: theme.text,
      lineHeight: 28,
    },
    completeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 20,
    },
    completeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.white,
      marginLeft: 8,
    },
    completedMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      marginTop: 20,
    },
    completedMessageText: {
      fontSize: 15,
      color: theme.primary,
      marginLeft: 8,
    },
  });
}
