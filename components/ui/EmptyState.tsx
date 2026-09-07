/**
 * EmptyState: the app's one empty-state pattern (design/PATTERN_VOCABULARY.md
 * self-check). Before this, empty states drifted across four different
 * structural treatments and two icon sizes; this is the single primitive
 * every zero state renders through.
 *
 * An optional mark, an optional title, the body, and one optional text action
 * (a sage CTA, or a quiet underlined link), in a 12pt stack, centered. The
 * mark is either a 96pt illustration (`illustration`, ADR 0036) or a 28pt
 * slate icon (`icon`); a state names one or the other, never both.
 *
 * Two layouts, chosen with the `layout` prop:
 * - 'inline' (default): inner content only. Callers keep owning their own
 *   card or container (white card, list card, sheet, etc.) and its padding.
 * - 'fill': the pane-level treatment for a whole screen or tab pane that has
 *   nothing to show. Adds the icon (defaulted to ChartLine if none is given),
 *   24pt horizontal padding, and, since 2026-09-07, CENTRES the block in
 *   whatever height the caller gives it (a flexGrow wrapper; the caller's
 *   scroll content container needs `flexGrow: 1` for that to mean anything).
 *   Before that, fill was a 40pt top pad and nothing else, so every fill pane
 *   was top-anchored and only Today, with its own wrapper, centred.
 *
 * Why the block carries a MINIMUM HEIGHT whenever it holds art: centring a
 * stack centres the whole stack, so a one-line title and a two-line title
 * put the 96pt art at different heights, and a swipe between two sibling
 * panes showed the illustration jump. The floor is the standard block (art,
 * gap, two title lines, gap, one 44pt text action) so any two standard
 * blocks are the same height and their art lands on the same y. Content
 * can exceed the floor under Dynamic Type; the floor is a minimum, never a
 * clip. Charen, 2026-09-07.
 *
 * Why the illustration is NOT gated on layout='fill': Today's two zero states
 * are deliberately inline (app/(tabs)/index.tsx), because their own wrapper
 * centers the hook between the chips and the ActionDock. Gating art on the
 * layout would have left Today on a 28pt glyph while every sibling pane grew
 * to 96pt, which is exactly the two-scale drift this primitive exists to end.
 * They do get the block floor, though, so Spent Zero and Kept Zero match.
 *
 * What is NOT here any more (Charen, 2026-09-07): the ordered `steps` list
 * ADR 0039 added for Kept true zero. Explanatory prose does not belong in the
 * empty-state pattern; the mechanic now lives behind a `link` that opens a
 * sheet (components/today/HowItWorksSheet.tsx), so the pane itself stays
 * mark, hook, one text line.
 */
import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { EMPTY_ART, EMPTY_ART_SIZE, type EmptyArtName } from '@/constants/emptyArt';
import { spacing, typeScale, type AppTheme } from '@/constants/theme';

/** The title's line height, declared so the block floor below is computable. */
const TITLE_LINE_HEIGHT = 20;
/** The stack gap. */
const STACK_GAP = 12;
/** The text action's box: Button's 44pt minimum plus the 4pt it sits below the title. */
const ACTION_HEIGHT = 44 + 4;

/**
 * The standard block: art, gap, two title lines, gap, one text action. Any
 * block that holds art is floored to this, so sibling panes with one-line
 * and two-line titles put their art on the same y. 96 + 12 + 40 + 12 + 48.
 */
export const EMPTY_BLOCK_MIN_HEIGHT =
  EMPTY_ART_SIZE + STACK_GAP + 2 * TITLE_LINE_HEIGHT + STACK_GAP + ACTION_HEIGHT;

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
  /** The pane's action: sage text, 44pt (ADR 0037, 0038). */
  cta?: {
    label: string;
    onPress: () => void;
  };
  /** A quiet underlined disclosure that opens an explanation and changes
   *  nothing (Button's `link` variant). Renders under the CTA when both are
   *  present, else where the CTA would be. One caller: Today's Kept true
   *  zero, whose action lives in the dock below rather than in this stack. */
  link?: {
    label: string;
    onPress: () => void;
  };
  /** 'inline' (default) is byte-identical to the original primitive: no
   *  default icon, no padding, no centring wrapper. 'fill' is the pane-level
   *  treatment; see the file header comment. */
  layout?: 'inline' | 'fill';
};

export function EmptyState({
  title,
  body,
  icon,
  illustration,
  cta,
  link,
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
  // The floor applies to every pane-level block: fill callers, and Today's
  // inline-with-art states. In-card body-only states keep their own height.
  const isPaneBlock = isFill || !!illustration;

  const block = (
    <View style={[styles.container, isPaneBlock && styles.paneBlock]} testID="empty-state-block">
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
      {link ? (
        // testID on a wrapper so a test can find the slot without depending
        // on Button's internals. The link itself is Button's `link` variant:
        // slate, regular, underlined, the quietest thing in the stack, because
        // it discloses rather than acts.
        <View testID="empty-state-link">
          <Button variant="link" label={link.label} onPress={link.onPress} style={styles.cta} />
        </View>
      ) : null}
    </View>
  );

  if (!isFill) return block;

  // The centring wrapper lives here, not in each caller, so N panes cannot
  // drift apart the way their top paddings once did (Money's Spent sat 2pt
  // above its siblings for a week because its list owned its own padding).
  return (
    <View style={styles.fillWrap} testID="empty-state-fill">
      {block}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: STACK_GAP,
    },
    // Any block holding art: floored to the standard block so sibling panes
    // put their art on one y. justifyContent stays flex-start, so the art
    // sits at the block's top whatever the title's line count.
    paneBlock: {
      minHeight: EMPTY_BLOCK_MIN_HEIGHT,
      alignSelf: 'stretch',
    },
    // Fill (pane-level): fills the caller's height and centres the block in
    // it. flexGrow, never flex: flex also sets flexShrink, which let a block
    // squash below its content at large Dynamic Type and clip the hook.
    fillWrap: {
      flexGrow: 1,
      justifyContent: 'center',
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
      lineHeight: TITLE_LINE_HEIGHT,
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
