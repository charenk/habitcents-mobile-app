/**
 * Partial slip sheet (docs/design-package-phase2/01-habit-logging-spec.md
 * section 4.7; visual language from design/redesign-handoff/04-screens.md).
 *
 * "Spent less than usual?" The day stays a slip and total skips do not move;
 * max(0, skipValue - amount) is credited to Kept. The whole point is that being
 * honest about a smaller purchase still counts for something, so the sheet is
 * one amount and a Save, on the same native-keyboard field as everything else
 * (ADR 0023). The amount spent is a fresh fact each open, never prefilled, so
 * the field auto-focuses: there's nothing to check before typing.
 *
 * PROPS ARE FROZEN: Today and habit detail both render this sheet; only the
 * internals were rebuilt on Sheet + AmountField.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

type PartialSlipSheetProps = {
  visible: boolean;
  skipValue: number;
  onCancel: () => void;
  onSave: (amountSpent: number) => void;
};

export function PartialSlipSheet({ visible, skipValue, onCancel, onSave }: PartialSlipSheetProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const { height } = useWindowDimensions();
  const { show } = useToast();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [cents, setCents] = useState(0);

  // Every open starts empty: the amount spent is a fresh fact each time, never
  // a leftover from the last slip.
  useEffect(() => {
    if (visible) setCents(0);
  }, [visible]);

  // UX-020: cents === 0 must never reach onSave. HabitsContext credits
  // max(0, skipValue - amountSpent), so a stray 0 would credit the ENTIRE
  // skip value on a day the user just said they bought something. House
  // pattern (components/money/ExpenseSheet.tsx handleSave): keep the button
  // live and toast instead of a dead disabled control.
  const handleSave = () => {
    if (cents === 0) {
      show(strings.toasts.enterAmountFirst);
      return;
    }
    onSave(cents);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      avoidKeyboard
      accessibilityLabel={strings.habitLogging.partialSheetTitle}
    >
      <View style={[styles.body, { maxHeight: height * 0.86 }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
            {strings.habitLogging.partialSheetTitle}
          </Text>
          <Text style={styles.subtitle}>
            {strings.habitLogging.partialSheetSubtitle(format(skipValue))}
          </Text>

          <AmountField
            valueCents={cents}
            onChangeCents={setCents}
            autoFocus={visible}
            size={48}
            accessibilityLabel={`${strings.habitLogging.partialAmountLabel}, ${format(cents)}`}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Button label={strings.common.save} onPress={handleSave} />
          <Button label={strings.common.cancel} variant="tertiary" onPress={onCancel} />
        </View>
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: {
      flexShrink: 1,
    },
    scroll: {
      flexShrink: 1,
    },
    content: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 8,
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: 32,
      lineHeight: 38,
      color: theme.ink,
    },
    subtitle: {
      fontFamily: theme.fonts.ui,
      fontSize: 14,
      lineHeight: 20,
      color: theme.slate,
      marginTop: 4,
      marginBottom: 20,
    },
  });
}
