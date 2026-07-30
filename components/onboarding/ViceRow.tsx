import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Icon } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { currencyMeta } from '@/utils/currency';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
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
              <Icon name="X" size={14} color={theme.slate} />
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
            {band === b && (
              <View style={styles.bandCheck} importantForAccessibility="no">
                <Icon name="Check" size={12} color={theme.primaryDark} />
              </View>
            )}
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
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      borderRadius: radii.card,
      padding: 14,
      marginBottom: 10,
    },
    name: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    priceTouchable: {
      marginTop: 2,
      marginBottom: 12,
      minHeight: 22,
      justifyContent: 'center',
    },
    price: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      fontVariant: ['tabular-nums'],
      // Informational price in its default state: slate for the 4.5:1
      // contrast floor (spec 09 section 1.5). priceEdited overrides this once
      // the user sets a custom price.
      color: theme.slate,
    },
    priceEdited: {
      color: theme.primaryDark,
      fontFamily: theme.fonts.uiSemibold,
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
    },
    bandGroup: {
      flexDirection: 'row',
      gap: 6,
    },
    // Same chip grammar as the step 1 preset chips: white/cloud at rest,
    // sage-light + sage border + a check when selected.
    bandSegment: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1.5,
      borderColor: theme.cloud,
      borderRadius: radii.control,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.white,
    },
    bandSegmentOn: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    bandCheck: {
      position: 'absolute',
      top: 4,
      right: 4,
    },
    bandText: {
      fontSize: 13,
      fontFamily: theme.fonts.uiMedium,
      color: theme.slate,
    },
    bandTextOn: {
      fontFamily: theme.fonts.uiSemibold,
      color: theme.primaryDark,
    },
    editBlock: {
      marginBottom: 12,
    },
    editHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    editHeadText: {
      fontSize: 13,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      flex: 1,
    },
    xButton: {
      width: 28,
      height: 28,
      borderRadius: radii.pill,
      backgroundColor: theme.snow,
      alignItems: 'center',
      justifyContent: 'center',
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
      borderRadius: radii.control,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 44,
    },
    editCurrency: {
      fontSize: 13,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    editInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: theme.fonts.uiSemibold,
      fontVariant: ['tabular-nums'],
      color: theme.ink,
      padding: 0,
    },
    setButton: {
      backgroundColor: theme.primary,
      borderRadius: radii.control,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    setButtonText: {
      fontSize: 13,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.white,
    },
    editCaption: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.ui,
      // Informational reference caption: slate for the 4.5:1 contrast floor
      // (spec 09 section 1.5).
      color: theme.slate,
      marginTop: 6,
    },
  });
}
