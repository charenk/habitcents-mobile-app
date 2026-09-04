/**
 * AddCategoryModal (design/selection-sheets U3): converted off a raw Modal
 * with a hand-rolled overlay onto the house ui/Sheet, and its styles migrated
 * off the legacy token set (theme.surface/text/textSecondary/border, raw
 * fontWeight) onto the redesign tokens (theme.fonts.*, ink/slate/mist/cloud/
 * snow, typeScale).
 *
 * Per D10 (budgets removed from MVP), the monthly budget field is gone
 * entirely: no input, no state, no strings. types/category.ts keeps
 * `monthlyBudget` on the Category type since stored data may still carry it;
 * this form just never writes or reads it anymore.
 */
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Icon, categoryIconName } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { SheetHeader } from '@/components/ui/SheetHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { hapticError } from '@/utils/motion';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import type { CategoryIcon } from '@/types/category';
import { ICON_OPTIONS, COLOR_OPTIONS } from '@/types/category';
import { strings } from '@/constants/strings';
import { withAlpha, contrastRatio } from '@/utils/color';

// "home-outline" -> "home icon" (spec 09 §2, icon-grid label).
function iconOptionLabel(icon: string): string {
  return `${icon.replace(/-outline$/, '').replace(/-/g, ' ')} icon`;
}

// UX-028: hue names for the color grid's accessibility labels, in the exact
// order types/category.ts defines COLOR_OPTIONS (that file's own inline
// comments name each hue; this mirrors them so a VoiceOver user picking a
// category color hears what hue they are choosing instead of "color option
// 3" with zero color information).
const COLOR_OPTION_HUE_NAMES = [
  'coral red',
  'orange',
  'sky blue',
  'lavender purple',
  'amber',
  'pink',
  'cyan',
  'teal green',
  'brown',
  'indigo',
  'slate grey',
  'deep amber',
];

const colorHueNameByHex = new Map<string, string>(
  COLOR_OPTIONS.map((hex, i) => [hex, COLOR_OPTION_HUE_NAMES[i]])
);

// A stored-but-orphaned legacy swatch (see colorOptions below) has no hue
// name in the map above, so it keeps the old positional fallback rather than
// claiming a hue that was never named for it.
function colorOptionLabel(hex: string, index: number): string {
  const hue = colorHueNameByHex.get(hex);
  return hue ? `${hue} color` : `color option ${index + 1}`;
}

// UX carried from Phase B: a white Check renders on every selected swatch
// regardless of how light that swatch is (groceries #FF9F43 against white is
// 2.04:1), so the check can be nearly invisible. Pick whichever of ink/white
// actually contrasts more against this specific swatch, using WCAG relative
// luminance (utils/color.ts). This helper itself stays local: it is
// component-specific policy (which two colors to compare, which one wins),
// not general color maths.
function checkIconColor(swatchHex: string, theme: AppTheme): string {
  const inkContrast = contrastRatio(swatchHex, theme.ink);
  const whiteContrast = contrastRatio(swatchHex, theme.white);
  return inkContrast >= whiteContrast ? theme.ink : theme.white;
}

type AddCategoryModalProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Persists. Returns a promise so the modal only clears the form and closes
   * once the category is on disk; a rejection keeps the sheet open with what
   * the user typed still in it.
   */
  onSave: (name: string, icon: CategoryIcon, color: string) => void | Promise<void>;
  initialName?: string;
  initialIcon?: CategoryIcon;
  initialColor?: string;
  isEditing?: boolean;
};

export function AddCategoryModal({
  visible,
  onClose,
  onSave,
  initialName = '',
  initialIcon = 'wallet-outline',
  initialColor = COLOR_OPTIONS[0],
  isEditing = false,
}: AddCategoryModalProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { show } = useToast();
  // The sheet stays open until the write lands, so Save is reachable twice on
  // a slow device; same in-flight guard as the two Money sheets.
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initialName);
  const [selectedIcon, setSelectedIcon] = useState<CategoryIcon>(initialIcon);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  // Review fix (orphaned swatch selection): a category saved before
  // COLOR_OPTIONS' current palette landed can carry a stored hex the grid no
  // longer offers, so editing it used to render no selected swatch at all.
  // Prepend that stored color to the grid as the current swatch (selected,
  // same size, no special labeling) so editing keeps visual continuity; not
  // touching the color picker still saves the original stored hex, since
  // selectedColor only ever changes on an explicit tap.
  const colorOptions = useMemo(
    () => (initialColor && !COLOR_OPTIONS.includes(initialColor) ? [initialColor, ...COLOR_OPTIONS] : COLOR_OPTIONS),
    [initialColor]
  );

  // Re-sync when the modal opens or targets a different category, so editing a
  // second category no longer shows the first one's values / resets its icon and
  // color on save (the C4 data-corruption bug).
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setSelectedIcon(initialIcon);
      setSelectedColor(initialColor);
    }
  }, [visible, initialName, initialIcon, initialColor]);

  const handleSave = async () => {
    // ADR 0028: unreachable from the UI (the header Save is disabled until
    // the name is non-empty, with a hint naming the gap); kept as a guard.
    if (!name.trim()) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(name.trim(), selectedIcon, selectedColor);
    } catch (error) {
      console.error('Error saving category:', error);
      hapticError();
      show(strings.toasts.categoryFailed);
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setSelectedIcon('wallet-outline');
    setSelectedColor(COLOR_OPTIONS[0]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const title = isEditing ? strings.addCategoryModal.editCategory : strings.addCategoryModal.newCategory;

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      avoidKeyboard
      accessibilityLabel={title}
      // Pinned header-save (ADR 0031) inside Sheet's drag zone: title + Save
      // fixed above the scroll, no in-sheet Cancel (grab handle, header
      // drag, scrim, and VoiceOver escape dismiss; handleClose still resets
      // the form via Sheet's onClose). Hint only while disabled, per ADR 0028.
      header={
        <SheetHeader
          title={title}
          saveLabel={strings.common.save}
          onSave={handleSave}
          saveDisabled={!name.trim() || saving}
          saveHint={name.trim() ? undefined : strings.sheets.saveHintCategoryName}
        />
      }
    >
      <View style={[styles.body, { maxHeight: height * 0.86 }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Preview */}
        <View style={styles.previewContainer}>
          <View style={[styles.previewIcon, { backgroundColor: withAlpha(selectedColor, 0.12) }]}>
            <Icon name={categoryIconName(selectedIcon)} size={32} color={selectedColor} />
          </View>
          <Text style={styles.previewName}>
            {name || strings.addCategoryModal.categoryNamePreview}
          </Text>
        </View>

        {/* Name Input */}
        <Text style={styles.eyebrow}>{strings.addCategoryModal.name}</Text>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder={strings.addCategoryModal.namePlaceholder}
          accessibilityLabel={strings.addCategoryModal.name}
          maxLength={30}
        />

        {/* Icon Picker */}
        <Text style={styles.eyebrow}>{strings.addCategoryModal.icon}</Text>
        <View style={styles.iconGrid}>
          {ICON_OPTIONS.map((icon) => (
            <TouchableOpacity
              key={icon}
              style={[
                styles.iconOption,
                selectedIcon === icon && { borderColor: selectedColor },
              ]}
              onPress={() => setSelectedIcon(icon)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedIcon === icon }}
              accessibilityLabel={iconOptionLabel(icon)}
            >
              <Icon
                name={categoryIconName(icon)}
                size={24}
                color={selectedIcon === icon ? selectedColor : theme.slate}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Color Picker */}
        <Text style={styles.eyebrow}>{strings.addCategoryModal.color}</Text>
        <View style={styles.colorGrid}>
          {colorOptions.map((color, index) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.colorOptionSelected,
              ]}
              onPress={() => setSelectedColor(color)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedColor === color }}
              // UX-028: named hue instead of a bare ordinal.
              accessibilityLabel={colorOptionLabel(color, index)}
              testID={`color-swatch-${index}`}
            >
              {selectedColor === color && (
                // Carried from Phase B: pick ink or white per swatch instead
                // of a fixed white check, so the mark stays legible on light
                // swatches (e.g. groceries #FF9F43, where white was 2.04:1).
                <Icon name="Check" size={20} color={checkIconColor(color, theme)} />
              )}
            </TouchableOpacity>
          ))}
        </View>

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
    previewContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    previewIcon: {
      width: 72,
      height: 72,
      borderRadius: radii.card,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    previewName: {
      fontFamily: theme.fonts.uiSemibold,
      // Batch 2 token pass: literal 18 -> typeScale.titleSm.
      fontSize: typeScale.titleSm,
      color: theme.ink,
    },
    eyebrow: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginTop: 18,
      marginBottom: 8,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    iconOption: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: radii.control,
      backgroundColor: theme.snow,
      margin: 4,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
    },
    colorOption: {
      width: 44,
      height: 44,
      borderRadius: radii.pill,
      justifyContent: 'center',
      alignItems: 'center',
      margin: 6,
    },
    colorOptionSelected: {
      borderWidth: 3,
      borderColor: theme.ink,
    },
  });
}
