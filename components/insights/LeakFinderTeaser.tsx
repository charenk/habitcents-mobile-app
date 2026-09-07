/**
 * The Leak finder pane while the scan is dormant (decision 0009).
 *
 * Why this is its own component rather than an EmptyState. That primitive is
 * deliberately three things: a mark, one hook line, a text link (ADR 0037),
 * and its own record warns against new exceptions. This pane needs four more:
 * an explanation of what is being built, a research invitation, a reward
 * line, and a confirmed state it remembers. Bending EmptyState to carry those
 * would weaken the one-hook rule everywhere else it is doing real work, so
 * the exception lives here instead, where it is visible.
 *
 * It borrows EmptyState's proportions on purpose (96pt art, centered stack,
 * same fill padding) so switching segments does not feel like switching apps.
 *
 * No motion: the CTA-to-confirmed swap is instant, matching the segmented
 * control's own no-motion stance and needing no reduced-motion branch.
 */
import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { EMPTY_ART, EMPTY_ART_SIZE } from '@/constants/emptyArt';
import { spacing, typeScale, type AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';

type LeakFinderTeaserProps = {
  /** True once the user has opted in: the invitation and its CTA are replaced
   *  by the receipt, which carries the offer from then on. */
  interestRecorded: boolean;
  onRecordInterest: () => void;
};

export function LeakFinderTeaser({ interestRecorded, onRecordInterest }: LeakFinderTeaserProps) {
  const theme = useTheme();
  const strings = useStrings();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container} testID="leak-finder-teaser">
      {/* Hidden from assistive tech, like every other zero-state mark: the
          hook and the CTA carry the meaning. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image
          testID="leak-finder-art"
          source={EMPTY_ART['insights-scan']}
          style={styles.art}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
        {strings.insights.scanEmptyTitle}
      </Text>

      {/* Uncapped, same reasoning as EmptyState's body: this is the only
          explanation of what the tab is for, so a low-vision reader gets the
          size iOS offered them rather than a polished 19.5pt ceiling. */}
      <Text style={styles.body}>{strings.insights.leakFinderBody}</Text>

      {/* The invitation and the receipt are the same slot, never both. Before
          opting in the pane asks; after, it answers, and the answer carries
          the offer so nothing on screen still invites someone who is already
          on the list. */}
      {interestRecorded ? (
        <View style={styles.confirmed} testID="leak-finder-confirmed">
          <View style={styles.confirmedHead}>
            <Icon name="CircleCheck" size={18} color={theme.primary} />
            <Text style={styles.confirmedTitle} maxFontSizeMultiplier={1.5}>
              {strings.insights.leakFinderConfirmedTitle}
            </Text>
          </View>
          <Text style={styles.confirmedBody}>{strings.insights.leakFinderConfirmedBody}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.reward}>{strings.insights.leakFinderReward}</Text>
          <Button
            label={strings.insights.leakFinderCta}
            onPress={onRecordInterest}
            style={styles.cta}
          />
        </>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    // EmptyState's fill geometry: 40pt top (section + stack), 24pt sides.
    container: {
      alignItems: 'center',
      gap: 12,
      paddingTop: spacing.section + spacing.stack,
      paddingHorizontal: spacing.xxl,
    },
    // Fixed 96pt, never scaled: the copy below grows uncapped, and art that
    // grew with it would push the CTA off screen at the largest text sizes.
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
    // Ink rather than slate so the offer reads as the one promise on the
    // pane, and never sage: green in this app means money the user kept, not
    // a marketing highlight.
    reward: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.secondary,
      color: theme.ink,
      textAlign: 'center',
      lineHeight: 20,
    },
    cta: {
      marginTop: spacing.tight,
      alignSelf: 'stretch',
    },
    confirmed: {
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.tight,
    },
    confirmedHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    confirmedTitle: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
    },
    confirmedBody: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.secondary,
      color: theme.slate,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
