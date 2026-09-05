/**
 * EmptyState: the app's one empty-state pattern (design/PATTERN_VOCABULARY.md
 * self-check). Before this, empty states drifted across four different
 * structural treatments and two icon sizes; this is the single primitive
 * every zero state renders through.
 *
 * An optional mark, an optional title, the body, and an optional text CTA,
 * in a 12pt stack, centered. The mark is either a 96pt illustration (`illustration`,
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
 * are deliberately inline (app/(tabs)/index.tsx), because their own wrapper
 * centers the hook between the chips and the ActionDock, and fill's top
 * padding would push it off centre. Gating art on the layout would have left
 * Today on a 28pt glyph while every sibling pane grew to 96pt, which is
 * exactly the two-scale drift this primitive exists to end.
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
  /** Optional. No pane-level zero state passes one any more: every one of
   *  them is mark, one hook line, text CTA (ADR 0037). The prop stays for the
   *  in-card empty states, which are a single body line with no title at all
   *  (leaks, pace, where it went, event history, category detail, and
   *  Upcoming's window-empty branch). */
  body?: string;
  /** Single icon scale for every empty state that uses a glyph: 28pt, slate.
   *  Ignored when `illustration` is set. */
  icon?: IconName;
  /** Pane-level zero-state art, named from the constants/emptyArt registry
   *  (ADR 0036). Takes precedence over `icon`, renders at 96pt, and is hidden
   *  from assistive tech: the title and CTA carry the meaning. */
  illustration?: EmptyArtName;
  /** An ordered explainer between the hook and the CTA (ADR 0039).
   *
   *  The deliberate exception to the one-hook rule, and it has exactly one
   *  caller: Today's Kept true-zero. That state is the only place in the app
   *  where the user has no evidence of their own to read, so the mechanic has
   *  to be told rather than shown. Everywhere else, one line still stands.
   *
   *  `stepsTitle` labels the list; omit both and nothing renders. */
  steps?: readonly string[];
  stepsTitle?: string;
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
  steps,
  stepsTitle,
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
      {steps && steps.length > 0 ? (
        <View style={styles.steps} testID="empty-state-steps">
          {stepsTitle ? (
            // Capped: this is a label for the list, not the content of it.
            <Text style={styles.stepsTitle} maxFontSizeMultiplier={1.5}>
              {stepsTitle}
            </Text>
          ) : null}
          {steps.map((step, i) => (
            // The index is the numeral AND the key: the copy never carries
            // "1." itself so a translation cannot renumber the list, and an
            // ordered list's identity is its position, so two identical lines
            // in some locale cannot collide.
            //
            // One VoiceOver stop per step, not two: without the wrapper's
            // composed label the numeral is announced on its own ("1.")
            // disconnected from its sentence. Same idiom as ExpenseRow.
            <View
              key={i}
              style={styles.stepRow}
              accessible
              accessibilityLabel={`${i + 1}. ${step}`}
            >
              <Text style={styles.stepNumber}>{`${i + 1}.`}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {cta ? (
        // Text, not a bordered pill (ADR 0037): beside a 96pt illustration and
        // a single hook line, the pill was the heaviest thing in a pane meant
        // to read quiet. 44pt minimum, so the target rule and the PRD's
        // "concrete first action" both still hold.
        //
        // Sage, not slate (ADR 0038): text alone made the pane's only action
        // its quietest element. This is the surface the vocabulary means by
        // "the action that produces a kept outcome".
        <Button variant="tertiaryBrand" label={cta.label} onPress={cta.onPress} style={styles.cta} />
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
    // Left-aligned, unlike everything else in this stack: a numbered list reads
    // as a list only when its numerals line up, and centring them turns three
    // steps into three unrelated sentences.
    steps: {
      alignSelf: 'stretch',
      gap: spacing.xs,
    },
    stepsTitle: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.secondary,
      color: theme.ink,
      marginBottom: spacing.tight,
    },
    stepRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    stepNumber: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.secondary,
      color: theme.slate,
      lineHeight: 20,
      // Tabular so 1. 2. 3. share one gutter and the text edges align.
      fontVariant: ['tabular-nums'],
    },
    stepText: {
      flex: 1,
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      lineHeight: 20,
    },
    cta: {
      marginTop: 4,
    },
  });
}
