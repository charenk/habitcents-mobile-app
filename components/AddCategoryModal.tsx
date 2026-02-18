import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import type { CategoryIcon } from '@/types/category';
import { ICON_OPTIONS, COLOR_OPTIONS } from '@/types/category';

type AddCategoryModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, icon: CategoryIcon, color: string, monthlyBudget?: number) => void;
  initialName?: string;
  initialIcon?: CategoryIcon;
  initialColor?: string;
  initialBudget?: number;
  isEditing?: boolean;
};

export function AddCategoryModal({
  visible,
  onClose,
  onSave,
  initialName = '',
  initialIcon = 'wallet-outline',
  initialColor = '#7E57C2',
  initialBudget,
  isEditing = false,
}: AddCategoryModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [name, setName] = useState(initialName);
  const [selectedIcon, setSelectedIcon] = useState<CategoryIcon>(initialIcon);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [budget, setBudget] = useState(initialBudget?.toString() || '');

  const handleSave = () => {
    if (!name.trim()) return;
    const budgetValue = budget ? parseInt(budget, 10) * 100 : undefined;
    onSave(name.trim(), selectedIcon, selectedColor, budgetValue);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setSelectedIcon('wallet-outline');
    setSelectedColor('#7E57C2');
    setBudget('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {isEditing ? 'Edit Category' : 'New Category'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={!name.trim()}>
              <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Preview */}
            <View style={styles.previewContainer}>
              <View style={[styles.previewIcon, { backgroundColor: selectedColor + '20' }]}>
                <Ionicons
                  name={selectedIcon as keyof typeof Ionicons.glyphMap}
                  size={32}
                  color={selectedColor}
                />
              </View>
              <Text style={styles.previewName}>
                {name || 'Category Name'}
              </Text>
            </View>

            {/* Name Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter category name"
                placeholderTextColor={theme.textTertiary}
                maxLength={30}
              />
            </View>

            {/* Icon Picker */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Icon</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      selectedIcon === icon && styles.iconOptionSelected,
                      selectedIcon === icon && { borderColor: selectedColor },
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons
                      name={icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={selectedIcon === icon ? selectedColor : theme.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color Picker */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color</Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Budget Input (Optional) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Budget (Optional)</Text>
              <View style={styles.budgetInputContainer}>
                <Text style={styles.budgetPrefix}>$</Text>
                <TextInput
                  style={styles.budgetInput}
                  value={budget}
                  onChangeText={(text) => setBudget(text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="number-pad"
                  maxLength={8}
                />
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    cancelText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
    },
    saveText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    saveTextDisabled: {
      color: theme.textTertiary,
    },
    content: {
      paddingHorizontal: 16,
    },
    previewContainer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    previewIcon: {
      width: 72,
      height: 72,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    previewName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
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
      borderRadius: 12,
      backgroundColor: theme.surface,
      margin: 4,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    iconOptionSelected: {
      borderWidth: 2,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
    },
    colorOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      margin: 6,
    },
    colorOptionSelected: {
      borderWidth: 3,
      borderColor: theme.text,
    },
    budgetInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    budgetPrefix: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textSecondary,
      marginRight: 4,
    },
    budgetInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 18,
      color: theme.text,
    },
    bottomPadding: {
      height: 40,
    },
  });
}
