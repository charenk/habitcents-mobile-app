import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import type { ScanQuestion } from '@/utils/leakScan/types';

type QuestionCardProps = {
  question: ScanQuestion;
  onAnswer: (question: ScanQuestion, answer: 'march' | 'april' | 'yes' | 'no') => void;
};

/**
 * One of the two permitted questions (spec section 3, 4; visual spec 11),
 * rendered as one-tap chip pairs on a plain card, never a modal wall. Each
 * question is asked at most once per session; the answer is persisted as a
 * rule keyed to the file's header fingerprint.
 */
export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const theme = useTheme();
  const strings = useStrings();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isDateOrder = question.type === 'date-order';

  return (
    <View style={styles.card}>
      <Text style={styles.question}>
        {isDateOrder ? strings.leakScan.dateOrderQuestion : strings.leakScan.signConfirmationQuestion}
      </Text>
      <View style={styles.chipRow}>
        {isDateOrder ? (
          <>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => onAnswer(question, 'march')}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>{strings.leakScan.dateOrderChipMarch}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => onAnswer(question, 'april')}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>{strings.leakScan.dateOrderChipApril}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => onAnswer(question, 'yes')}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>{strings.leakScan.signConfirmationYes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => onAnswer(question, 'no')}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>{strings.leakScan.signConfirmationNo}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 16,
      marginBottom: 12,
    },
    question: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.ink,
      marginBottom: 12,
      lineHeight: 21,
    },
    chipRow: {
      flexDirection: 'row',
      gap: 10,
    },
    chip: {
      flex: 1,
      minHeight: 44,
      borderRadius: radii.control,
      borderWidth: 1,
      borderColor: theme.cloud,
      backgroundColor: theme.snow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
  });
}
