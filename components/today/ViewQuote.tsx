/**
 * ViewQuote (U6, Charen-approved live preview placements): a single quote
 * that opens the Kept pane or closes the Spent pane on Today. Real curly
 * double quotes wrap the text (unicode 201C/201D, never straight quotes),
 * with an optional attribution line under it. No animation of any kind: it
 * is present or it isn't, on whichever quote useViewQuote resolved.
 *
 * Deliberately renders as one accessibility element (message + attribution
 * collapse to a single VoiceOver/TalkBack stop), the same grammar
 * FirstRunRibbon's message wrapper uses (components/onboarding/
 * FirstRunRibbon.tsx).
 *
 * Deviation named per design/PATTERN_VOCABULARY.md's PR self-check:
 * Instrument Serif normally appears only in screen titles and money
 * (displayItalic here is a third, approved use for the quote's editorial
 * voice, not a body or button label).
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import type { TodayQuote } from '@/constants/strings';

const OPEN_CURLY_QUOTE = '“';
const CLOSE_CURLY_QUOTE = '”';

export type ViewQuoteProps = {
  quote: TodayQuote;
  /** Placement margin only (e.g. marginTop/marginBottom); the 20pt
   *  horizontal gutter below is always the component's own. */
  style?: StyleProp<ViewStyle>;
  /** Same convention as today-pager/spent-chip/kept-chip: identifies which
   *  pane's instance this is for scoped test queries. Purely a test hook. */
  testID?: string;
};

export function ViewQuote({ quote, style, testID }: ViewQuoteProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // "the quote text plus the attribution when present" -- the plain text,
  // not the rendered curly-quote glyphs, so VoiceOver reads it as prose
  // rather than spelling out punctuation marks.
  const label = quote.by ? `${quote.text}, ${quote.by}` : quote.text;

  return (
    <View style={[styles.wrap, style]} testID={testID} accessible accessibilityLabel={label}>
      <Text style={styles.quote} maxFontSizeMultiplier={1.5}>
        {OPEN_CURLY_QUOTE}
        {quote.text}
        {CLOSE_CURLY_QUOTE}
      </Text>
      {quote.by ? (
        <Text style={styles.attribution} maxFontSizeMultiplier={1.5}>
          {quote.by}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 20,
    },
    quote: {
      fontFamily: theme.fonts.displayItalic,
      // Batch 2: token, was a literal 19. Deliberate 1pt move to quote (20),
      // unifying with LongArc's identity line, which sat 1pt apart for no
      // reason anyone could point to. Visible change: this quote renders
      // fractionally larger than before.
      fontSize: typeScale.quote,
      lineHeight: 26,
      color: theme.ink,
    },
    attribution: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
      marginTop: 4,
    },
  });
}
