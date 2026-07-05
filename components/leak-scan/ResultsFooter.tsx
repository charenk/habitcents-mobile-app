import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
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

      <TouchableOpacity onPress={() => setConfirming(true)} accessibilityRole="button">
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
      color: theme.textSecondary,
    },
    undo: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.danger,
      marginTop: 8,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 340,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    modalMessage: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    modalCancel: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    modalConfirm: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: theme.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalConfirmText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.white,
    },
  });
}
