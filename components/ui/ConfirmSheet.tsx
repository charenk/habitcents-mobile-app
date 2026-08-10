/**
 * ConfirmSheet (design/selection-sheets U3): the house destructive-confirm
 * pattern, extracted from the inline sheet at app/habit/[id].tsx (stop
 * breaking a habit) so a second caller (the category delete confirm) does not
 * duplicate it. Serif title, one body line, a coral fill confirm and a
 * secondary "keep going" exit. Kept minimal on purpose: title, body, one
 * confirm action, one cancel action.
 *
 * Re-entrancy guard: the sheet stays interactive through Sheet's 220ms exit
 * animation (constants/theme.ts motion.sheet), so a fast double tap on
 * confirm could fire onConfirm twice before the sheet visually closed (for
 * Profile's "Start over" caller, two router.back() calls). `confirmedRef`
 * is set on the first confirm press and blocks every press after that,
 * including cancel, until `visible` flips true again (the sheet reopening),
 * which resets it. The API is unchanged; every caller is covered without
 * having to add its own guard.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';

export type ConfirmSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
};

export function ConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
}: ConfirmSheetProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      confirmedRef.current = false;
    }
  }, [visible]);

  const handleConfirm = () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm();
  };

  const handleCancel = () => {
    // A confirm already in flight wins; a cancel that lands during the exit
    // animation right after it is a stray tap, not a change of mind.
    if (confirmedRef.current) return;
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={title}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
        <Button label={confirmLabel} variant="destructiveFill" onPress={handleConfirm} />
        <Button label={cancelLabel} variant="secondary" onPress={handleCancel} />
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 12,
      gap: 10,
    },
    title: {
      fontSize: 26,
      lineHeight: 32,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      includeFontPadding: false,
    },
    body: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 22,
      marginBottom: 6,
    },
  });
}
