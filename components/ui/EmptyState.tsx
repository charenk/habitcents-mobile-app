/**
 * EmptyState: the app's one empty-state pattern (design/PATTERN_VOCABULARY.md
 * self-check). Before this, empty states drifted across four different
 * structural treatments and two icon sizes; this is the single primitive
 * every zero state renders through.
 *
 * An optional 28pt slate icon, an optional title, the body, and an optional
 * CTA, in a 12pt stack, centered. This is inner content only: callers keep
 * owning their own card or container (white card, list card, sheet, etc.).
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { typeScale, type AppTheme } from '@/constants/theme';

export type EmptyStateProps = {
  /** Optional heading. Omit for a body-only empty state (e.g. a single row's placeholder). */
  title?: string;
  body: string;
  /** Single icon scale for every empty state: 28pt, slate. */
  icon?: IconName;
  cta?: {
    label: string;
    onPress: () => void;
  };
};

export function EmptyState({ title, body, icon, cta }: EmptyStateProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {icon ? (
        <Icon
          name={icon}
          size={28}
          color={theme.slate}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.body}>{body}</Text>
      {cta ? (
        <Button variant="secondary" label={cta.label} onPress={cta.onPress} style={styles.cta} />
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: 12,
    },
    title: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
      textAlign: 'center',
    },
    body: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      textAlign: 'center',
      lineHeight: 20,
    },
    cta: {
      marginTop: 4,
    },
  });
}
