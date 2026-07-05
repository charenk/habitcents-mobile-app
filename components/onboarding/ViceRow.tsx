import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { currencyMeta } from '@/utils/currency';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { FREQUENCY_BANDS, type FrequencyBand } from '@/constants/onboardingPresets';

const BAND_LABEL: Record<FrequencyBand, string> = {
  never: strings.onboarding.bandNever,
  oneToTwo: strings.onboarding.bandOneToTwo,
  threeToFive: strings.onboarding.bandThreeToFive,
  daily: strings.onboarding.bandDaily,
};

export type ViceRowProps = {
  name: string;
  presetCents: number;
  editedCents: number | null;
  band: FrequencyBand | null;
  onBandChange: (band: FrequencyBand) => void;
  onCommitEdit: (cents: number) => void;
};

/**
 * One vice row in step 2 (spec 02 section 3.4): name, per-item value (tap to
 * edit, same editor pattern as step 1's chips), and a 4-segment frequency band
 * control. No default selection; an unanswered row counts as Never in the math
 * (section 3.4) but is tracked separately as "unanswered" for analytics.
 */
export function ViceRow({ name, presetCents, editedCents, band, onBandChange, onCommitEdit }: ViceRowProps) {
  const theme = useTheme();
  const { format, currency } = useCurrency();
  const currencySymbol = currencyMeta(currency).symbol;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const hasEdit = editedCents !== null;
  const displayCents = hasEdit ? editedCents : presetCents;

  const openEditor = () => {
    setDraft((displayCents / 100).toFixed(2));
    setEditing(true);
  };

  const commit = () => {
    const raw = parseFloat(draft || '0');
    const parsed = Math.max(0, Math.round((Number.isFinite(raw) ? raw : 0) * 100));
    onCommitEdit(parsed);
    setEditing(false);
  };

  const priceLabel = hasEdit
    ? format(displayCents)
    : strings.onboarding.eachAmount(format(presetCents));

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{name}</Text>

      {editing ? (
        <View style={styles.editBlock}>
          <View style={styles.editHead}>
            <Text style={styles.editHeadText}>{strings.onboarding.editorRealPrice(name)}</Text>
            <TouchableOpacity
              onPress={() => setEditing(false)}
              accessibilityRole="button"
              accessibilityLabel={strings.onboarding.editorCancelLabel}
              style={styles.xButton}
            >
              <Text style={styles.xButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.editRow}>
            <View style={styles.editField}>
              <Text style={styles.editCurrency}>{currencySymbol}</Text>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                keyboardType="decimal-pad"
                style={styles.editInput}
                autoFocus
                accessibilityLabel={`${name}, amount`}
              />
            </View>
            <TouchableOpacity onPress={commit} accessibilityRole="button" style={styles.setButton}>
              <Text style={styles.setButtonText}>{strings.onboarding.editorSet}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.editCaption}>
            {strings.onboarding.editorPresetCaption(strings.onboarding.eachAmount(format(presetCents)))}
          </Text>
        </View>
      ) : (
        <TouchableOpacity onPress={openEditor} accessibilityRole="button" style={styles.priceTouchable}>
          <Text style={[styles.price, hasEdit && styles.priceEdited]}>{priceLabel}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.bandGroup} accessibilityRole="adjustable">
        {FREQUENCY_BANDS.map((b) => (
          <TouchableOpacity
            key={b}
            style={[styles.bandSegment, band === b && styles.bandSegmentOn]}
            onPress={() => onBandChange(b)}
            accessibilityRole="button"
            accessibilityState={{ selected: band === b }}
          >
            <Text style={[styles.bandText, band === b && styles.bandTextOn]}>{BAND_LABEL[b]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    priceTouchable: {
      marginTop: 2,
      marginBottom: 10,
      minHeight: 22,
      justifyContent: 'center',
    },
    price: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    priceEdited: {
      color: theme.primary,
      fontWeight: '700',
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
    },
    bandGroup: {
      flexDirection: 'row',
      gap: 6,
    },
    bandSegment: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    bandSegmentOn: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    bandText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    bandTextOn: {
      color: theme.white,
    },
    editBlock: {
      marginBottom: 10,
    },
    editHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    editHeadText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
    },
    xButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    xButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    editRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      alignItems: 'stretch',
    },
    editField: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1.5,
      borderColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 44,
    },
    editCurrency: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    editInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      padding: 0,
    },
    setButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    setButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.white,
    },
    editCaption: {
      fontSize: 11,
      color: theme.textTertiary,
      marginTop: 6,
    },
  });
}
