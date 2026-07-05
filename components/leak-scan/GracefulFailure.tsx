import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

type GracefulFailureProps = {
  onTryDifferentExport: () => void;
  onStartLeakAudit: () => void;
  onLogByHand: () => void;
};

/**
 * "This one's on us" (spec 7, visual spec 9). No red, no error iconography;
 * three ordered next-best actions so the flow degrades into Door 1 rather
 * than dead-ending. This is the one screen where the apology carries the
 * warmth; everything else stays the same calm tokens as the rest of the app.
 */
export function GracefulFailure({
  onTryDifferentExport,
  onStartLeakAudit,
  onLogByHand,
}: GracefulFailureProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.mark}>
        <Text style={styles.markText}>¢</Text>
      </View>
      <Text style={styles.title}>{strings.leakScan.failureTitle}</Text>
      <Text style={styles.body}>{strings.leakScan.failureBody}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={onTryDifferentExport} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{strings.leakScan.failureTryDifferentExport}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>{strings.leakScan.failureTryDifferentExportHint}</Text>

        <TouchableOpacity style={styles.secondaryButton} onPress={onStartLeakAudit} accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>{strings.leakScan.failureStartLeakAudit}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tertiaryButton} onPress={onLogByHand} accessibilityRole="button">
          <Text style={styles.tertiaryButtonText}>{strings.leakScan.failureLogByHand}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.background,
      padding: 24,
      justifyContent: 'center',
    },
    mark: {
      alignItems: 'center',
      marginBottom: 16,
    },
    markText: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.primary,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    body: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 24,
    },
    actions: {
      gap: 8,
    },
    primaryButton: {
      minHeight: 48,
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
    hint: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
      paddingHorizontal: 8,
    },
    secondaryButton: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    tertiaryButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tertiaryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
  });
}
