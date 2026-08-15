import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon } from '@/components/ui';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { categoriesInTier, selectedCategories, type ScanScope } from '@/utils/leakScan/scope';
import type { ExpenseCategory } from '@/types/expense';

type ScopeScreenProps = {
  scope: ScanScope;
  onToggle: (category: ExpenseCategory) => void;
  onConfirm: () => void;
  onBack: () => void;
};

/**
 * Scope selection (PRD v3.1 sect 7.1, phase 2).
 *
 * The screen asks WHERE TO LOOK, not "review what we found". That inversion is
 * the whole point: the user draws the boundary, so the app never has to claim
 * it knows what is essential, and no server-side merchant taxonomy is needed to
 * keep essentials out of habit proposals.
 *
 * The locked tier is shown rather than hidden, with its reason, so the
 * exclusion reads as judgment rather than omission.
 */
export function ScopeScreen({ scope, onToggle, onConfirm, onBack }: ScopeScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // Confirming persists rules AND writes the scan summary, so a double tap
  // fired scope_selected twice and wrote the snapshot twice (review round 3,
  // P3-2). Same shape as BillsScreen's `filing`.
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  const locked = useMemo(() => categoriesInTier('locked'), []);
  const available = useMemo(
    () => [...categoriesInTier('available-on'), ...categoriesInTier('available-off')],
    []
  );
  const selectedCount = selectedCategories(scope).length;

  // Same announcement contract the rest of the flow follows (UX-013):
  // IntakeScreen announces scanning, ResultsScreen and GracefulFailure announce
  // themselves on mount. Without this the flow goes silent at the one screen
  // that asks the user for a decision.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(strings.leakScan.scopeTitle);
  }, []);

  return (
    <View style={styles.screen}>
      <ScreenHeader onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.title} accessibilityRole="header">
          {strings.leakScan.scopeTitle}
        </Text>
        <Text style={styles.subtitle}>{strings.leakScan.scopeSubtitle}</Text>

        <Text style={styles.sectionHeading} accessibilityRole="header">
          {strings.leakScan.scopeAvailableHeading}
        </Text>
        <View style={styles.rows}>
          {available.map((category) => {
            const on = !!scope[category];
            return (
              <Pressable
                key={category}
                style={({ pressed }) => [
                  styles.row,
                  on ? styles.rowOn : null,
                  pressed ? styles.rowPressed : null,
                ]}
                onPress={() => onToggle(category)}
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                accessibilityLabel={category}
                // Status is carried by colour AND by the label, so the state is
                // never colour-only (PATTERN_VOCABULARY, accessibility).
                accessibilityHint={on ? strings.leakScan.scopeOn : strings.leakScan.scopeOff}
              >
                <EmojiTile
                  emoji={categoryEmoji(category)}
                  size={40}
                  color={categoryIdentityColor(category)}
                />
                <Text style={styles.rowLabel}>{category}</Text>
                <View style={[styles.check, on ? styles.checkOn : null]}>
                  {on ? <Icon name="Check" size={14} color={theme.white} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionHeading} accessibilityRole="header">
          {strings.leakScan.scopeLockedHeading}
        </Text>
        <View style={styles.lockedCard}>
          <Text style={styles.lockedReason}>{strings.leakScan.scopeLockedReason}</Text>
          <View style={styles.lockedRows}>
            {locked.map((category) => (
              <View
                key={category}
                style={styles.lockedRow}
                accessibilityLabel={`${category}. ${strings.leakScan.scopeLockedHint}`}
              >
                <EmojiTile
                  emoji={categoryEmoji(category)}
                  size={36}
                  color={categoryIdentityColor(category)}
                />
                <Text style={styles.lockedLabel}>{category}</Text>
                {/* Spelled out rather than a padlock glyph: the icon map is a
                    curated vocabulary and this state is clearer in words. */}
                <Text style={styles.lockedHint}>{strings.leakScan.scopeLockedHint}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.count}>
          {selectedCount === 0
            ? strings.leakScan.scopeNoneSelected
            : strings.leakScan.scopeSelectedCount(selectedCount)}
        </Text>
        <Button
          label={strings.leakScan.scopeConfirm}
          onPress={handleConfirm}
          disabled={confirming}
          style={styles.confirm}
        />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: spacing.gutter,
      paddingTop: 8,
    },
    title: {
      fontSize: typeScale.screenTitle,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      lineHeight: 38,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 20,
      marginBottom: 24,
    },
    sectionHeading: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
      marginBottom: 10,
    },
    rows: {
      gap: 8,
      marginBottom: 28,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      // 44pt minimum target with the 40pt tile plus padding.
      minHeight: 56,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radii.card,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    rowOn: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    rowPressed: {
      backgroundColor: theme.snow,
    },
    rowLabel: {
      flex: 1,
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiMedium,
      color: theme.ink,
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: theme.cloud,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    lockedCard: {
      backgroundColor: theme.snow,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
    },
    lockedReason: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 19,
      marginBottom: 12,
    },
    lockedRows: {
      gap: 10,
    },
    lockedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    lockedLabel: {
      flex: 1,
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.mistText,
    },
    lockedHint: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.mistText,
    },
    footer: {
      paddingHorizontal: spacing.gutter,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    count: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      textAlign: 'center',
      marginBottom: 10,
    },
    confirm: {
      alignSelf: 'stretch',
    },
  });
}
