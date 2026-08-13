import React, { useEffect, useMemo } from 'react';
import { AccessibilityInfo, View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Button, Icon } from '@/components/ui';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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
  /**
   * Door 2's only visible exit before a scan produces results (design/
   * leakscan-migration, U12a): previously the invisible iOS edge swipe was
   * the sole way out. A quiet ScreenHeader back pill, wired to router.back()
   * by the caller. Deliberately not offered on ResultsScreen: a finished
   * scan reads forward (its own CTAs), not back (see ResultsScreen.tsx).
   */
  onBack: () => void;
};

/**
 * Intake: CSV file selection, progress state, and the at-most-two permitted
 * questions (spec Stage 0/3/4, visual spec 11; restyled per redesign spec 03
 * path B). Everything on-device; no network. Caps (10MB/50k rows/5 files) are
 * enforced by the intake hook, which reports skipped files here for a
 * plain-language notice.
 */
export function IntakeScreen({ state, onChooseFiles, onAnswer, onBack }: IntakeScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // UX-013: the flow was silent for VoiceOver between the "Choose CSV files"
  // tap and manually exploring for what happened next. Announce entering the
  // scanning stage (house pattern: components/ui/Toast.tsx, ~:88); completion
  // and failure are announced on mount by ResultsScreen and GracefulFailure,
  // the two screens app/leak-scan.tsx swaps in once state.stage is 'done'.
  useEffect(() => {
    if (state.stage === 'scanning') {
      AccessibilityInfo.announceForAccessibility(strings.leakScan.scanningTitle);
    }
  }, [state.stage]);

  if (state.stage === 'question' && state.pendingQuestion) {
    return (
      <View style={styles.screen}>
        <ScreenHeader onBack={onBack} />
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title} accessibilityRole="header">
            {strings.leakScan.intakeTitle}
          </Text>
          <QuestionCard question={state.pendingQuestion} onAnswer={onAnswer} />
        </ScrollView>
      </View>
    );
  }

  if (state.stage === 'scanning' || state.stage === 'picking') {
    return (
      <View style={styles.screen}>
        <ScreenHeader onBack={onBack} />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.scanningTitle}>{strings.leakScan.scanningTitle}</Text>
          <Text style={styles.scanningSubtitle}>{strings.leakScan.scanningSubtitle}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader onBack={onBack} />
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.title} accessibilityRole="header">
          {strings.leakScan.intakeTitle}
        </Text>
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

        {/* UX-014: a document-picker exception or an all-invalid file set used
            to bounce back to idle with zero explanation (state.error went
            unread here). Reuses the same notice-box styling as the skipped-
            file messages below rather than a new pattern. */}
        {state.error && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              {state.error === 'no-valid-files'
                ? strings.leakScan.errorNoValidFiles
                : strings.leakScan.errorPickFailed}
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
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flexGrow: 1,
      padding: 24,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: typeScale.screenTitle,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      textAlign: 'center',
      lineHeight: 38,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: typeScale.label,
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
      fontSize: typeScale.lead,
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
