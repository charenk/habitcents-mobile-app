/**
 * LanguageSheet (routine/localization plan item 1): mirrors CurrencySheet's
 * pattern (house bottom sheet, left-aligned rows, an ink check plus
 * accessibilityState.selected on the current row, Cancel the only centered
 * text). "System default" represents override === null (follow the
 * device's locale) and sits above the 11 named languages.
 *
 * Foundation piece only: selecting a language persists the override through
 * LocaleContext, but no catalog exists yet (plan item 2), so nothing else on
 * screen changes language when a row here is tapped.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import { useToast } from '@/components/ui/Toast';
import { hapticError } from '@/utils/motion';
import { LOCALES, type LocaleCode } from '@/utils/locale';
import { selectableLabel } from '@/utils/a11y';

export type LanguageSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function LanguageSheet({ visible, onClose }: LanguageSheetProps): React.JSX.Element {
  const theme = useTheme();
  const strings = useStrings();
  const { override, setOverride } = useLocale();
  const { show } = useToast();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleSelect = (code: LocaleCode | null) => {
    // Close first: the picker's job is done either way, and LocaleContext
    // rolls the override back on a failed write. The toast is the only
    // thing that has to wait for the outcome.
    onClose();
    void setOverride(code).catch((error) => {
      console.error('Error saving language:', error);
      hapticError();
      show(strings.toasts.languageFailed);
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={strings.settings.languageSheetTitle}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
          {strings.settings.languageSheetTitle}
        </Text>

        {(() => {
          const systemSelected = override === null;
          return (
            <Pressable
              onPress={() => handleSelect(null)}
              accessibilityRole="button"
              accessibilityState={{ selected: systemSelected }}
              accessibilityLabel={selectableLabel(strings.settings.languageSystemDefault, systemSelected)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.rowLabel}>{strings.settings.languageSystemDefault}</Text>
              {systemSelected ? <Icon name="Check" size={20} color={theme.ink} /> : null}
            </Pressable>
          );
        })()}

        {LOCALES.map((l, index) => {
          const selected = l.code === override;
          const label = strings.settings.languageRowLabel(l.nativeName, l.englishName);
          return (
            <Pressable
              key={l.code}
              onPress={() => handleSelect(l.code)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={selectableLabel(label, selected)}
              style={({ pressed }) => [
                styles.row,
                index === LOCALES.length - 1 && styles.rowLast,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowLabel}>{label}</Text>
              {selected ? <Icon name="Check" size={20} color={theme.ink} /> : null}
            </Pressable>
          );
        })}

        <Button
          label={strings.common.cancel}
          variant="tertiary"
          onPress={onClose}
          style={styles.cancel}
        />
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
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: typeScale.sheetTitle,
      lineHeight: 32,
      color: theme.ink,
      includeFontPadding: false,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.hairlineSubtle,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowLabel: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.body,
      color: theme.ink,
      flexShrink: 1,
    },
    cancel: {
      marginTop: 14,
    },
  });
}
