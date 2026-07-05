import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { QuestionCard } from './QuestionCard';
import type { IntakeState } from './useLeakScanIntake';
import type { ScanQuestion } from '@/utils/leakScan/types';

type IntakeScreenProps = {
  state: IntakeState;
  onChooseFiles: () => void;
  onAnswer: (question: ScanQuestion, answer: 'march' | 'april' | 'yes' | 'no') => void;
};

/**
 * Intake: CSV file selection, progress state, and the at-most-two permitted
 * questions (spec Stage 0/3/4, visual spec 11). Everything on-device; no
 * network. Caps (10MB/50k rows/5 files) are enforced by the intake hook,
 * which reports skipped files here for a plain-language notice.
 */
export function IntakeScreen({ state, onChooseFiles, onAnswer }: IntakeScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (state.stage === 'question' && state.pendingQuestion) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{strings.leakScan.intakeTitle}</Text>
        <QuestionCard question={state.pendingQuestion} onAnswer={onAnswer} />
      </ScrollView>
    );
  }

  if (state.stage === 'scanning' || state.stage === 'picking') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.scanningTitle}>{strings.leakScan.scanningTitle}</Text>
        <Text style={styles.scanningSubtitle}>{strings.leakScan.scanningSubtitle}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.centered]}>
      <Text style={styles.title}>{strings.leakScan.intakeTitle}</Text>
      <Text style={styles.subtitle}>{strings.leakScan.intakeSubtitle}</Text>

      {state.fileNames.length > 0 && (
        <Text style={styles.filesChosen}>{strings.leakScan.filesChosenCount(state.fileNames.length)}</Text>
      )}

      {state.skippedFileMessages.length > 0 && (
        <View style={styles.noticeBox}>
          {state.skippedFileMessages.map((msg, i) => (
            <Text key={i} style={styles.noticeText}>
              {msg === 'too-many-files' ? strings.leakScan.tooManyFiles : strings.leakScan.fileTooLarge(msg)}
            </Text>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={onChooseFiles} accessibilityRole="button">
        <Text style={styles.primaryButtonText}>{strings.leakScan.chooseFiles}</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.background,
      padding: 24,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    filesChosen: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    noticeBox: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 16,
      width: '100%',
    },
    noticeText: {
      fontSize: 12.5,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    primaryButton: {
      minHeight: 48,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.white,
    },
    scanningTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      marginTop: 16,
    },
    scanningSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
    },
  });
}
