/**
 * EmptyState: the app's one empty-state pattern (design/PATTERN_VOCABULARY.md
 * self-check). Before this, empty states drifted across four different
 * structural treatments and two icon sizes; this is the single primitive
 * every zero state renders through.
 *
 * An optional mark, an optional title, the body, and an optional CTA, in a
 * 12pt stack, centered. The mark is either a 96pt illustration (`illustration`,
 * ADR 0036) or a 28pt slate icon (`icon`); a state names one or the other,
 * never both.
 *
 * Two layouts, chosen with the `layout` prop:
 * - 'inline' (default): inner content only. Callers keep owning their own
 *   card or container (white card, list card, sheet, etc.) and its padding.
 * - 'fill': the pane-level treatment for a whole screen or tab pane that has
 *   nothing to show. Adds the icon (defaulted to ChartLine if none is given)
 *   and a standard 40pt top / 24pt horizontal padding, so a caller renders a
 *   whole zero-data pane by dropping this in rather than inventing its own
 *   padding around an inline EmptyState.
 *
 * Why the illustration is NOT gated on layout='fill': Today's two zero states
 * are deliberately inline (app/(tabs)/index.tsx), because fill's 40pt top
 * padding is the quote-to-hook gap in that composition and is carried by the
 * pane's own wrapper instead. Gating art on the layout would have left Today
 * on a 28pt glyph while every sibling pane grew to 96pt, which is exactly the
 * two-scale drift this primitive exists to end.
 */
import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { EMPTY_ART, EMPTY_ART_SIZE, type EmptyArtName } from '@/constants/emptyArt';
import { spacing, typeScale, type AppTheme } from '@/constants/theme';

export type EmptyStateProps = {
  /** Optional heading. Omit for a body-only empty state (e.g. a single row's placeholder). */
  title?: string;
  /** Optional since Charen's Today annotations (2026-09-04): the Today zero
   *  states are icon, title, CTA and nothing else. Other surfaces keep
   *  their body line. */
  body?: string;
  /** Single icon scale for every empty state that uses a glyph: 28pt, slate.
   *  Ignored when `illustration` is set. */
  icon?: IconName;
  /** Pane-level zero-state art, named from the constants/emptyArt registry
   *  (ADR 0036). Takes precedence over `icon`, renders at 96pt, and is hidden
   *  from assistive tech: the title and CTA carry the meaning. */
  illustration?: EmptyArtName;
  cta?: {
    label: string;
    onPress: () => void;
  };
  /** 'inline' (default) is byte-identical to the original primitive: no
   *  default icon, no padding. 'fill' is the pane-level treatment; see the
   *  file header comment. */
  layout?: 'inline' | 'fill';
};

export function EmptyState({
  title,
  body,
  icon,
  illustration,
  cta,
  layout = 'inline',
}: EmptyStateProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isFill = layout === 'fill';
  // Inline mode never gets a default icon; fill is the one pane-level
  // treatment that always shows one. The ChartLine default is kept as a
  // defensive fallback even though every fill caller now names its own mark,
  // for the same reason Icon.tsx keeps FALLBACK_GLYPH: a missing mark must
  // degrade to something, never to a hole in the layout.
  const resolvedIcon = illustration ? undefined : isFill ? icon ?? 'ChartLine' : icon;

  return (
    <View style={[styles.container, isFill && styles.containerFill]}>
      {illustration ? (
        // Same testID as the glyph branch on purpose: the pinned contract in
        // __tests__/emptyStateSurfaces.test.tsx is "this zero state carries a
        // visual mark", which both branches satisfy. empty-state-art
        // distinguishes them when a test needs to.
        <View
          testID="empty-state-icon"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Image
            testID="empty-state-art"
            source={EMPTY_ART[illustration]}
            style={styles.art}
            resizeMode="contain"
          />
        </View>
      ) : null}
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
      {body ? <Text style={styles.body}>{body}</Text> : null}
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
    // Fixed 96pt square. Deliberately NOT scaled by Dynamic Type: the body
    // below it grows uncapped, and an image that grew with it would push the
    // CTA off screen at the largest sizes rather than making anything legible.
    art: {
      width: EMPTY_ART_SIZE,
      height: EMPTY_ART_SIZE,
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
