/**
 * EmptyState: the app's one empty-state pattern (design/PATTERN_VOCABULARY.md
 * self-check). Before this, empty states drifted across four different
 * structural treatments and two icon sizes; this is the single primitive
 * every zero state renders through.
 *
 * An optional 28pt slate icon, an optional title, the body, and an optional
 * CTA, in a 12pt stack, centered.
 *
 * Two layouts, chosen with the `layout` prop:
 * - 'inline' (default): inner content only. Callers keep owning their own
 *   card or container (white card, list card, sheet, etc.) and its padding.
 * - 'fill': the pane-level treatment for a whole screen or tab pane that has
 *   nothing to show. Adds the icon (defaulted to ChartLine if none is given)
 *   and a standard 40pt top / 24pt horizontal padding, so a caller renders a
 *   whole zero-data pane by dropping this in rather than inventing its own
 *   padding around an inline EmptyState.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typeScale, type AppTheme } from '@/constants/theme';

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
  /** 'inline' (default) is byte-identical to the original primitive: no
   *  default icon, no padding. 'fill' is the pane-level treatment; see the
   *  file header comment. */
  layout?: 'inline' | 'fill';
};

export function EmptyState({ title, body, icon, cta, layout = 'inline' }: EmptyStateProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isFill = layout === 'fill';
  // Inline mode never gets a default icon; fill is the one pane-level
  // treatment that always shows one.
  const resolvedIcon = isFill ? icon ?? 'ChartLine' : icon;

  return (
    <View style={[styles.container, isFill && styles.containerFill]}>
      {resolvedIcon ? (
        // testID lives on this wrapper, not the Icon itself: lucide-react-native
        // intercepts a `testID` prop and forwards it to react-native-svg's Svg
        // as `data-testid`, which react-native-svg has no special handling for,
        // so it never reaches the native view as a real `testID` an RNTL query
        // can find. A plain View is a real host component with no such lossy
        // prop translation.
        <View
          testID="empty-state-icon"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon name={resolvedIcon} size={28} color={theme.slate} />
        </View>
      ) : null}
      {title ? (
        <Text style={styles.title} maxFontSizeMultiplier={1.5}>
          {title}
        </Text>
      ) : null}
      {/* Deliberately UNCAPPED. The ratified caps cover chrome and eyebrows;
          an empty state's body is content, and often the only explanation of
          what a screen is for and how to get started. Capping it at 1.5 would
          hand a low-vision user 19.5pt where iOS offered them about 40pt,
          which is an accessibility regression dressed up as polish. */}
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
    // Fill (pane-level): 40pt top (section + stack), 24pt horizontal (xxl).
    containerFill: {
      paddingTop: spacing.section + spacing.stack,
      paddingHorizontal: spacing.xxl,
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
