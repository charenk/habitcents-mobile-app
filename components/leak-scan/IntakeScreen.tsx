import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Button, Icon } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
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
 * questions (spec Stage 0/3/4, visual spec 11; restyled per redesign spec 03
 * path B). Everything on-device; no network. Caps (10MB/50k rows/5 files) are
 * enforced by the intake hook, which reports skipped files here for a
 * plain-language notice.
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
        <View style={styles.fileChips}>
          {state.fileNames.map((name) => (
            <View key={name} style={styles.fileChip}>
              <Icon name="FileText" size={16} color={theme.slate} />
              <Text style={styles.fileChipText} numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
          <Text style={styles.filesChosen}>
            {strings.leakScan.filesChosenCount(state.fileNames.length)}
          </Text>
        </View>
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

      <Button
        label={strings.leakScan.chooseFiles}
        onPress={onChooseFiles}
        style={styles.primaryButton}
      />
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
      fontSize: 34,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      textAlign: 'center',
      lineHeight: 38,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    fileChips: {
      alignSelf: 'stretch',
      alignItems: 'center',
      gap: 8,
      marginBottom: 20,
    },
    fileChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'center',
      maxWidth: '100%',
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.card,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    fileChipText: {
      flexShrink: 1,
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiMedium,
      color: theme.ink,
    },
    filesChosen: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    noticeBox: {
      backgroundColor: theme.white,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 12,
      marginBottom: 16,
      width: '100%',
    },
    noticeText: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 18,
    },
    primaryButton: {
      alignSelf: 'stretch',
    },
    scanningTitle: {
      fontSize: 17,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      marginTop: 18,
    },
    scanningSubtitle: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 4,
      textAlign: 'center',
    },
  });
}
