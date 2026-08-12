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
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon, categoryIconName } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import type { CategoryIcon } from '@/types/category';
import { ICON_OPTIONS, COLOR_OPTIONS } from '@/types/category';
import { strings } from '@/constants/strings';
import { withAlpha } from '@/utils/color';

// "home-outline" -> "home icon" (spec 09 §2, icon-grid label).
function iconOptionLabel(icon: string): string {
  return `${icon.replace(/-outline$/, '').replace(/-/g, ' ')} icon`;
}

type AddCategoryModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, icon: CategoryIcon, color: string) => void;
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

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), selectedIcon, selectedColor);
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
    <Sheet visible={visible} onClose={handleClose} avoidKeyboard accessibilityLabel={title}>
      <ScrollView
        style={{ maxHeight: height * 0.86 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
          {title}
        </Text>

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
              accessibilityLabel={`color option ${index + 1}`}
            >
              {selectedColor === color && <Icon name="Check" size={20} color={theme.white} />}
            </TouchableOpacity>
          ))}
        </View>

        <Button
          label={strings.common.save}
          onPress={handleSave}
          disabled={!name.trim()}
          style={styles.save}
        />
        <Button label={strings.common.cancel} variant="tertiary" onPress={handleClose} />
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
      fontSize: 26,
      lineHeight: 32,
      color: theme.ink,
      includeFontPadding: false,
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
      fontSize: 18,
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
    save: {
      marginTop: 20,
    },
  });
}
