/**
 * SegmentedControl (design/redesign-handoff/04-screens.md, "Money").
 *
 * A cloud track with a single white raised thumb: the selected segment is the
 * only white surface, so the control reads as one physical switch rather than
 * two buttons. Labels are 13/600, ink when selected and slate when not, which
 * keeps the state legible without relying on the fill alone.
 *
 * Geometry (Charen's call, 2026-08-16): the family moved off the stadium
 * (radii.pill) shape onto the rounded-rect radius family, to match
 * SpentKeptChips and Charen's mock of all three tab styles as rounded
 * rectangles. The nesting rule shared by both scales is:
 *
 *     track radius = thumb radius + track padding
 *
 * Here the thumb is a segment at radii.card (14) and the track padding is
 * TRACK_PADDING (3), so the track sits at 17. See SpentKeptChips.tsx for the
 * value-scale application of the same rule.
 *
 * No motion: the thumb is the selected segment's own background, so it swaps
 * instantly. That is deliberate. A sliding thumb would be a second animated
 * surface competing with the sheet and toast motion the spec already budgets.
 *
 * SECOND TONE, compact + quiet (ADR 0040, 2026-09-11). Same control, figure and
 * ground swapped. In the default tone the selected segment is the only WHITE
 * surface, because the track is cloud. Inside a white card the card is already
 * the raised surface, so a cloud track would be a panel inside a panel: the
 * quiet tone draws no track at all and the selected segment becomes the only
 * FILLED surface instead. It is not a third switcher (PATTERN_VOCABULARY.md:25)
 * and not UX-037's mistake: one component, one set of tablist/tab roles, one
 * haptic rule, two style branches. Permitted only for a filter that sits inside
 * the card whose content it filters; a switcher between VIEWS keeps its track.
 *
 * The nesting rule above is not violated by the quiet tone, it is inapplicable:
 * no track is drawn, so nothing is derived from the thumb's radius.
 *
 * Contrast, stated here so review need not re-derive it: unselected labels are
 * slate on the card's white, the selected label is ink on cloud. mistText is
 * deliberately absent from both tones, because UXUI_AUDIT.md:562 records it
 * measuring 4.06:1 on a cloud fill. There is no automated contrast test.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticSelection } from '@/utils/motion';
import type { AppTheme } from '@/constants/theme';
import { radii, shadows, typeScale } from '@/constants/theme';
import { selectableLabel } from '@/utils/a11y';

// Track padding (also the inter-segment gap): the nesting rule this file and
// SpentKeptChips.tsx both follow is track radius = thumb radius + this value.
const TRACK_PADDING = 3;

export type SegmentedControlProps<T extends string | number> = {
  /**
   * `badge` is an optional annotation on a segment whose destination is not
   * live yet (Insights' Leak finder, decision 0009). Keep it to a word: a
   * segment carries roughly 148pt of content width on a small phone, and a
   * two-word pill beside a two-word label overflows at large text sizes.
   *
   * `badgeSpoken` is what VoiceOver hears in its place, so the pill can stay
   * short without the screen reader losing the meaning ("Soon" on screen,
   * "coming soon" spoken). Omitted, the badge text itself is spoken.
   *
   * `labelSpoken` is the same contract for the label itself, so a compact
   * filter can abbreviate on screen without the screen reader losing the word
   * ("2w" on screen, "2 weeks" spoken). Omitted, the label is spoken as-is.
   */
  options: ReadonlyArray<{
    value: T;
    label: string;
    labelSpoken?: string;
    badge?: string;
    badgeSpoken?: string;
  }>;
  value: T;
  onChange: (v: T) => void;
  /** Names the whole control, e.g. "Money view". */
  accessibilityLabel?: string;
  /**
   * 'compact' shrinks the control to a filter that sits beside a label rather
   * than spanning its container. Only drawn with tone 'quiet'; see the file
   * header and design/decisions/components/SegmentedControl.md.
   */
  size?: 'default' | 'compact';
  /** 'quiet' drops the track and fills the selected segment instead. */
  tone?: 'track' | 'quiet';
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  size = 'default',
  tone = 'track',
}: SegmentedControlProps<T>): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const compact = size === 'compact';
  const quiet = tone === 'quiet';
  // 44 wide by 28 tall, so (44 - 28) / 2 = 8 lifts the compact segment to a
  // 44pt target vertically. No horizontal slop on purpose: the inter-segment
  // gap is 3, so any would overlap the neighbour's hit region. minWidth 44
  // rather than sizing to the glyphs is what buys the horizontal half.
  const hitSlop = compact ? { top: 8, bottom: 8 } : { top: 3, bottom: 3 };

  return (
    <View
      style={[styles.track, compact ? styles.trackCompact : null, quiet ? styles.trackQuiet : null]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        // The badge is part of what this tab IS, not decoration beside it, so
        // it goes into the spoken label rather than being announced as its own
        // stop after the tab. selectableLabel then appends the state, giving
        // "Leak finder, coming soon, selected".
        const spokenBase = option.labelSpoken ?? option.label;
        const spokenBadge = option.badge ? option.badgeSpoken ?? option.badge : null;
        const spokenLabel = spokenBadge ? `${spokenBase}, ${spokenBadge}` : spokenBase;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              // Selection haptic, and only on a real change: re-pressing the
              // selected segment is a no-op, so buzzing for it would be the
              // control lying about what happened (2026-09-10). No motion
              // here either way; thumb swaps stay instant by house rule.
              if (!selected) hapticSelection();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityLabel={selectableLabel(spokenLabel, selected)}
            accessibilityState={{ selected }}
            // UX-030: minHeight 38 sits below the 44pt target floor. The
            // track's 3pt padding plus this segment's own edge leaves 3pt of
            // headroom top and bottom before hitting the track edge, so this
            // extends the hit area without changing the visual. The compact
            // tone needs 8; see the hitSlop constant above.
            hitSlop={hitSlop}
            style={({ pressed }) => [
              styles.segment,
              compact ? styles.segmentCompact : null,
              selected ? (quiet ? styles.segmentSelectedQuiet : styles.segmentSelected) : null,
              pressed && !selected ? styles.segmentPressed : null,
            ]}
          >
            <Text
              style={[
                styles.label,
                compact ? styles.labelCompact : null,
                selected ? styles.labelSelected : null,
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.5}
            >
              {option.label}
            </Text>
            {option.badge ? (
              // Hidden from assistive tech: the spoken label above already
              // carries it, and announcing it twice makes the tab read as two
              // things. Same reasoning as EmptyState's art wrapper.
              <View
                testID="segment-badge"
                style={[styles.badge, selected ? styles.badgeSelected : null]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Text style={styles.badgeLabel} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                  {option.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      backgroundColor: theme.cloud,
      borderRadius: radii.card + TRACK_PADDING,
      padding: TRACK_PADDING,
      gap: TRACK_PADDING,
    },
    trackCompact: {
      // Sizes to its content so it can sit at the end of a row beside a label,
      // instead of spanning the container the way a view switcher does.
      alignSelf: 'center',
    },
    trackQuiet: {
      backgroundColor: 'transparent',
      // No track is drawn, so the nesting rule has nothing to derive from.
      borderRadius: 0,
      padding: 0,
    },
    segment: {
      flex: 1,
      minHeight: 38,
      borderRadius: radii.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      // 12 with no badge; a badged segment needs the room, and the label
      // already truncates to one line before the pill would be squeezed out.
      paddingHorizontal: 10,
    },
    segmentCompact: {
      flex: 0,
      // The horizontal half of the 44pt target; see the hitSlop note above.
      minWidth: 44,
      minHeight: 28,
      borderRadius: radii.control,
      paddingHorizontal: 8,
    },
    segmentSelected: {
      backgroundColor: theme.white,
      ...shadows.card,
    },
    // No shadow: the card the quiet tone lives in is already the raised
    // surface, so a second one would read as a chip floating off the card.
    segmentSelectedQuiet: {
      backgroundColor: theme.cloud,
    },
    segmentPressed: {
      opacity: 0.6,
    },
    label: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.secondary,
      color: theme.slate,
    },
    labelCompact: {
      fontSize: typeScale.caption,
    },
    labelSelected: {
      color: theme.ink,
    },
    // Same pill geometry as TierBadge, one notch smaller because it sits
    // inside a 38pt control rather than on a card. minHeight, never height:
    // the label scales with the user's text size and a fixed box clips it.
    badge: {
      minHeight: 18,
      paddingVertical: 1,
      paddingHorizontal: 8,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      // Unselected segments sit on the cloud track, so white reads as raised;
      // the selected segment is itself white, so the pill inverts to cloud.
      // Meaning is in the word, never the fill.
      backgroundColor: theme.white,
    },
    badgeSelected: {
      backgroundColor: theme.cloud,
    },
    badgeLabel: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiBold,
      color: theme.slate,
    },
  });
}
