import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { FileScan } from '@/utils/leakScan/types';

type ResultsFooterProps = {
  files: FileScan[];
  duplicatesMerged: number;
  transfersNetted: number;
  onUndo: () => void;
};

/**
 * Footer (spec 5.6, visual spec 8): per-file rows-read/skipped summary plus
 * duplicates merged and transfers netted, and a confirm-gated Undo. Undo is
 * plain destructive text (danger ink, the word "Undo", never color alone).
 */
export function ResultsFooter({ files, duplicatesMerged, transfersNetted, onUndo }: ResultsFooterProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.container}>
      {files.map((f) => (
        <Text key={f.fileName} style={styles.row}>
          {strings.leakScan.footerRowsSummary(
            f.rowsRead,
            f.rowsRead + f.rowsSkipped,
            f.rowsSkipped,
            duplicatesMerged,
            transfersNetted
          )}
        </Text>
      ))}

      <TouchableOpacity
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <Text style={styles.undo}>{strings.leakScan.undoImport}</Text>
      </TouchableOpacity>

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{strings.leakScan.undoConfirmTitle}</Text>
            <Text style={styles.modalMessage}>{strings.leakScan.undoConfirmMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setConfirming(false)}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>{strings.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  setConfirming(false);
                  onUndo();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.modalConfirmText}>{strings.leakScan.undoImport}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      paddingVertical: 16,
      gap: 6,
    },
    row: {
      fontSize: 11.5,
      fontFamily: theme.fonts.ui,
      fontVariant: ['tabular-nums'],
      color: theme.slate,
    },
    // Destructive, so coral ink plus the word "Undo": never color alone.
    undo: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.coral,
      marginTop: 10,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      padding: 20,
      width: '100%',
      maxWidth: 340,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      marginBottom: 8,
    },
    modalMessage: {
      fontSize: 14,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 20,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    modalCancel: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.control,
      borderWidth: 1,
      borderColor: theme.cloud,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelText: {
      fontSize: 15,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    modalConfirm: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.control,
      backgroundColor: theme.coral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalConfirmText: {
      fontSize: 15,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.white,
    },
  });
}
