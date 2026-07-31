import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Icon } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { currencyMeta } from '@/utils/currency';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

export type PresetChipProps = {
  name: string;
  /** Preset display amount, integer cents. */
  presetCents: number;
  selected: boolean;
  /** Exact cents if the user edited the price via the inline editor. */
  editedCents: number | null;
  /** True when this chip was pre-selected from a Door 2 scan re-entry (section 8.6):
   * exact value, no tilde, annotated. */
  fromScan?: boolean;
  onToggle: () => void;
  onCommitEdit: (cents: number) => void;
  /** "Something else" is the only typed chip (section 3.3). */
  isCustom?: boolean;
  customName?: string;
  onCustomNameChange?: (name: string) => void;
};

/**
 * One chip in the step 1 auto-pilot charges grid (spec 02 section 3.3). Tapping
 * the price expands the chip to a full-width inline editor (the "B fold-in").
 * Fast path A (tap only, ignore every edit affordance) never opens the editor.
 */
export function PresetChip({
  name,
  presetCents,
  selected,
  editedCents,
  fromScan = false,
  onToggle,
  onCommitEdit,
  isCustom = false,
  customName,
  onCustomNameChange,
}: PresetChipProps) {
  const theme = useTheme();
  const { format, currency } = useCurrency();
  const currencySymbol = currencyMeta(currency).symbol;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const hasEdit = editedCents !== null;
  const displayCents = hasEdit ? editedCents : presetCents;
  const showTilde = !hasEdit && !fromScan;

  const openEditor = () => {
    setDraft(((hasEdit ? editedCents : presetCents) / 100).toFixed(2));
    setEditing(true);
  };

  const commit = () => {
    const raw = parseFloat(draft || '0');
    const parsed = Math.max(0, Math.round((Number.isFinite(raw) ? raw : 0) * 100));
    onCommitEdit(parsed);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  const scanSuffix = fromScan ? ` · ${strings.onboarding.fromYourStatements}` : '';

  const priceLabel = isCustom
    ? strings.onboarding.somethingElseYouSetIt
    : `${showTilde ? '~' : ''}${format(displayCents)}${isCustom ? '' : '/mo'}${scanSuffix}`;

  const a11yLabel = hasEdit
    ? `${name}, ${format(displayCents)}, your price${scanSuffix}, ${selected ? 'selected' : 'not selected'}`
    : `${name}, about ${format(presetCents)} a month, ${selected ? 'selected' : 'not selected'}`;

  if (editing) {
    return (
      <View style={[styles.chip, styles.chipEditing]}>
        <View style={styles.editHead}>
          <Text style={styles.editHeadText}>
            {strings.onboarding.editorRealPrice(name)}
          </Text>
          <TouchableOpacity
            onPress={cancel}
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
          {strings.onboarding.editorPresetCaption(`~${format(presetCents)}/mo`)}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipOn]}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected }}
    >
      {selected && (
        <View style={styles.checkMark} importantForAccessibility="no">
          <Icon name="Check" size={14} color={theme.primaryDark} />
        </View>
      )}
      {isCustom && selected ? (
        <TextInput
          value={customName}
          onChangeText={onCustomNameChange}
          placeholder={strings.onboarding.somethingElseNamePlaceholder}
          placeholderTextColor={theme.textTertiary}
          style={styles.customNameInput}
        />
      ) : (
        <Text style={styles.name}>{name}</Text>
      )}
      <TouchableOpacity
        // Only a selected, non-custom chip opens the price editor: tapping an
        // unselected chip's price selects it instead (matches tapping the chip
        // itself), so a commitEdit for a chip not yet in `selections` can never
        // be silently dropped by the caller.
        onPress={isCustom ? onToggle : selected ? openEditor : onToggle}
        style={styles.priceTouchable}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.price,
            selected && styles.priceOn,
            hasEdit && styles.priceEdited,
          ]}
        >
          {priceLabel}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    // Chip at rest: white on the snow page, cloud hairline. Selected: sage-light
    // fill + sage border + the check mark below, so selection never rides on
    // color alone (redesign spec 03 path C).
    chip: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: theme.white,
      borderWidth: 1.5,
      borderColor: theme.cloud,
      borderRadius: radii.card,
      paddingVertical: 12,
      paddingLeft: 12,
      paddingRight: 34,
      minHeight: 64,
    },
    chipOn: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    chipEditing: {
      flexBasis: '100%',
      minWidth: '100%',
      borderColor: theme.primary,
      backgroundColor: theme.white,
      paddingRight: 12,
    },
    checkMark: {
      position: 'absolute',
      top: 10,
      right: 10,
    },
    name: {
      fontSize: 14,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    priceTouchable: {
      marginTop: 4,
      minHeight: 24,
      justifyContent: 'center',
    },
    price: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      fontVariant: ['tabular-nums'],
      // Informational price on an unselected chip: slate for the 4.5:1
      // contrast floor (spec 09 section 1.5). priceOn/priceEdited override
      // this when the chip is selected or edited.
      color: theme.slate,
    },
    priceOn: {
      color: theme.primaryDark,
      fontFamily: theme.fonts.uiSemibold,
    },
    priceEdited: {
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
      color: theme.primaryDark,
      fontFamily: theme.fonts.uiSemibold,
    },
    customNameInput: {
      fontSize: 14,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      padding: 0,
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
