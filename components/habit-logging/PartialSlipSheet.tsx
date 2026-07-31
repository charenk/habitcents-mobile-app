/**
 * Partial slip sheet (docs/design-package-phase2/01-habit-logging-spec.md
 * section 4.7; visual language from design/redesign-handoff/04-screens.md).
 *
 * "Spent less than usual?" The day stays a slip and total skips do not move;
 * max(0, skipValue - amount) is credited to Kept. The whole point is that being
 * honest about a smaller purchase still counts for something, so the sheet is
 * one amount and a Save, on the same keypad as everything else.
 *
 * PROPS ARE FROZEN: Today and habit detail both render this sheet; only the
 * internals were rebuilt on Sheet + AmountDisplay + Keypad.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { Keypad } from '@/components/ui/Keypad';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { keypadValueToCents } from '@/utils/keypad';
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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [value, setValue] = useState('');

  // Every open starts empty: the amount spent is a fresh fact each time, never
  // a leftover from the last slip.
  useEffect(() => {
    if (visible) setValue('');
  }, [visible]);

  const cents = keypadValueToCents(value);

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      accessibilityLabel={strings.habitLogging.partialSheetTitle}
    >
      <ScrollView
        style={{ maxHeight: height * 0.86 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title} accessibilityRole="header">
          {strings.habitLogging.partialSheetTitle}
        </Text>
        <Text style={styles.subtitle}>
          {strings.habitLogging.partialSheetSubtitle(format(skipValue))}
        </Text>

        <View accessible accessibilityLabel={`${strings.habitLogging.partialAmountLabel}, ${format(cents)}`}>
          <AmountDisplay valueCents={cents} focused size={46} zeroAsPlaceholder />
        </View>

        <View style={styles.keypad}>
          <Keypad value={value} onChange={setValue} />
        </View>

        <Button label={strings.common.save} onPress={() => onSave(cents)} style={styles.primary} />
        <Button label={strings.common.cancel} variant="tertiary" onPress={onCancel} />
      </ScrollView>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
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
    keypad: {
      marginTop: 20,
    },
    primary: {
      marginTop: 18,
    },
  });
}
