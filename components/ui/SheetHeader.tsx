/**
 * SheetHeader: the pinned header row every form sheet shares (ADR 0031).
 *
 * Anatomy, extracted verbatim from ExpenseSheet's shipped header so the
 * refactor there is pixel-identical: serif sheetTitle on the left, a compact
 * primary Save on the right, a hairline bottom border marking the fixed
 * edge. Render it as a sibling ABOVE the sheet's ScrollView, never inside
 * it, so title and Save stay put while the form scrolls. Form sheets carry
 * no Cancel button; the grab handle, scrim tap, and VoiceOver escape are
 * the dismissal (decision sheets like PickOne/BreakHabit keep their bottom
 * CTAs and do not use this).
 *
 * saveHint is passed ONLY while the save is disabled, naming the first
 * missing thing (ADR 0028), so an enabled button never reads stale
 * guidance. The disabled computation stays in the caller because zero
 * guards deliberately differ across sheets (cents > 0 vs cents !== 0).
 *
 * No generic right-content slot on purpose: the consumers are title + save,
 * plus at most one optional icon action (`secondaryAction`, the sixth
 * consumer this comment used to wait for: the edit expense sheet's delete,
 * Charen's drawer feedback 2026-09-04). It renders as a 44pt tertiary icon
 * button with a 12pt gap left of Save, never flush against it, since a
 * destructive control beside the most-tapped button is the classic mis-tap
 * layout; the consumer keeps its Undo path. Icon-only, so the spoken label
 * is required. No motion (house style): the header never shadows or
 * animates on scroll.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { typeScale } from '@/constants/theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export type SheetHeaderSecondaryAction = {
  icon: IconName;
  /** Spoken label; the action is icon-only. */
  accessibilityLabel: string;
  onPress: () => void;
  /** 'destructive' paints the glyph coral. Default is slate. */
  tone?: 'default' | 'destructive';
};

export type SheetHeaderProps = {
  title: string;
  saveLabel: string;
  onSave: () => void;
  saveDisabled?: boolean;
  /** ADR 0028: pass only while disabled, naming the first missing thing. */
  saveHint?: string;
  /** One optional icon action left of Save (see the file header). */
  secondaryAction?: SheetHeaderSecondaryAction;
};

export function SheetHeader({
  title,
  saveLabel,
  onSave,
  saveDisabled = false,
  saveHint,
  secondaryAction,
}: SheetHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
        {title}
      </Text>
      <View style={styles.actions}>
        {secondaryAction ? (
          <Pressable
            onPress={secondaryAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={secondaryAction.accessibilityLabel}
            style={({ pressed }) => [styles.secondary, pressed ? styles.secondaryPressed : null]}
          >
            <Icon
              name={secondaryAction.icon}
              size={20}
              color={secondaryAction.tone === 'destructive' ? theme.coral : theme.slate}
            />
          </Pressable>
        ) : null}
        <Button
          label={saveLabel}
          onPress={onSave}
          variant="primary"
          disabled={saveDisabled}
          accessibilityHint={saveHint}
          style={styles.save}
        />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.cloud,
    },
    title: {
      flex: 1,
      fontFamily: theme.fonts.display,
      fontSize: typeScale.sheetTitle,
      lineHeight: 32,
      color: theme.ink,
      includeFontPadding: false,
      marginRight: 12,
    },
    // Compact enough to sit in a header row without touching Button.tsx: a
    // shorter minHeight than the default primary (50) and tighter horizontal
    // padding than the default 20.
    save: {
      minHeight: 44,
      paddingHorizontal: 16,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    // Tertiary icon button: no fill, 44pt square, pressed like Button's
    // tertiary (opacity swap, never a scale).
    secondary: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryPressed: {
      opacity: 0.6,
    },
  });
}
