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
import { Sheet } from '@/components/ui/Sheet';
import { SheetHeader } from '@/components/ui/SheetHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';

type PartialSlipSheetProps = {
  visible: boolean;
  skipValue: number;
  onCancel: () => void;
  onSave: (amountSpent: number) => void;
};

export function PartialSlipSheet({ visible, skipValue, onCancel, onSave }: PartialSlipSheetProps) {
  const theme = useTheme();
  const strings = useStrings();
  const { format } = useCurrency();
  const { height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [cents, setCents] = useState(0);

  // Every open starts empty: the amount spent is a fresh fact each time, never
  // a leftover from the last slip.
  useEffect(() => {
    if (visible) setCents(0);
  }, [visible]);

  // UX-020: cents === 0 must never reach onSave. HabitsContext credits
  // max(0, skipValue - amountSpent), so a stray 0 would credit the ENTIRE
  // skip value on a day the user just said they bought something.
  // Disabled-until-valid (ops ADR 0028, 2026-08-16): Save is disabled until
  // an amount is entered, rather than staying live and toasting "Enter an
  // amount first." on an empty tap (the old house pattern).
  const canSave = cents !== 0;

  const handleSave = () => {
    // Unreachable from the UI now that Save is disabled until canSave; kept
    // as a defensive guard.
    if (!canSave) return;
    onSave(cents);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      avoidKeyboard
      accessibilityLabel={strings.habitLogging.partialSheetTitle}
      // Pinned header-save (ADR 0031) inside Sheet's drag zone: this sheet
      // takes an amount and saves, so it heads with sheetTitle like every
      // form sheet rather than the displayMid decision treatment it launched
      // with. No Cancel button; grab handle, header drag, scrim, and
      // VoiceOver escape all run onCancel via Sheet's onClose. Hint only
      // while disabled (ADR 0028).
      header={
        <SheetHeader
          title={strings.habitLogging.partialSheetTitle}
          saveLabel={strings.common.save}
          onSave={handleSave}
          saveDisabled={!canSave}
          saveHint={canSave ? undefined : strings.sheets.saveHintAmount}
        />
      }
    >
      <View style={[styles.body, { maxHeight: height * 0.86 }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
      paddingTop: 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    subtitle: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.label,
      lineHeight: 20,
      color: theme.slate,
      marginBottom: 20,
    },
  });
}
