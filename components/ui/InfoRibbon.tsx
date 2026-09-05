/**
 * InfoRibbon: the app's one pattern for persistent positive communication
 * (Charen's Today annotations, 2026-09-04). A sage-light band with a 1px
 * sage-tinted border, a sprout glyph, and one caption-size line. It grew
 * out of components/onboarding/FirstRunRibbon (the coach-moment family, a
 * step quieter), which now re-exports it.
 *
 * Two variants, chosen by whether `onDismiss` is passed:
 * - dismissible (X at the trailing edge): one-shot messages such as the
 *   first-run lines, which the user closes when read;
 * - persistent (no X): standing lines such as the quiet-day placeholder
 *   inside Today's log, which must never leave an empty card behind.
 *
 * Placement rule: always inside a list section, below the content it
 * comments on, so it reads as a receipt for what just happened (ADR 0033).
 * The rule's original "never above an input" clause was positional shorthand
 * for a top-anchored quick log, where a message over the field read as an
 * instruction about it; ADR 0038 docked the input at the bottom, everything
 * is above it now, and only the below-its-content half is operative.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { withAlpha } from '@/utils/color';

export type InfoRibbonProps = {
  line: string;
  /** Present: dismissible variant with the X. Absent: persistent variant. */
  onDismiss?: () => void;
  testID?: string;
};

export function InfoRibbon({ line, onDismiss, testID }: InfoRibbonProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card} testID={testID}>
      {/* The message reads as one accessible element (icon + line collapse
          to a single VoiceOver/TalkBack stop); the dismiss button sits
          outside this wrapper so it stays independently reachable with its
          own label, rather than being swallowed by the message's node. */}
      <View style={styles.message} accessible accessibilityLabel={line}>
        <Icon name="Sprout" size={16} color={theme.primaryDark} style={styles.icon} />
        <Text style={styles.text}>{line}</Text>
      </View>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          // UX-053: 15pt slop on a 14pt icon clears the 44pt floor without
          // growing the visible glyph.
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          accessibilityRole="button"
          accessibilityLabel={strings.common.dismiss}
          style={styles.dismiss}
        >
          <Icon name="X" size={14} color={theme.mistText} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: theme.primaryLight,
      borderWidth: 1,
      borderColor: withAlpha(theme.primary, 0.3),
      borderRadius: radii.card,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    message: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    icon: {
      marginTop: 1,
    },
    text: {
      flex: 1,
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.primaryDark,
      lineHeight: 17,
    },
    dismiss: {
      marginTop: -2,
      marginRight: -4,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
