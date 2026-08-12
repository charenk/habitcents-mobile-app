import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
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
 *
 * The confirm (design/leakscan-migration, U12a) is the house destructive
 * ConfirmSheet, not a bespoke alert-style Modal: same "Undo this import"
 * confirm label, cancel keeps the existing strings.common.cancel phrasing.
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

      <ConfirmSheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onUndo();
        }}
        title={strings.leakScan.undoConfirmTitle}
        body={strings.leakScan.undoConfirmMessage}
        confirmLabel={strings.leakScan.undoImport}
        cancelLabel={strings.common.cancel}
      />
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
      fontSize: typeScale.eyebrow,
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
  });
}
