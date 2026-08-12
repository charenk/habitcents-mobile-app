/**
 * FirstRunRibbon (W2, "the app is the onboarding"). The coach-moment family,
 * a step quieter: sage-light band, 1px sage-tinted border, a sprout glyph,
 * one caption-size line, and a dismiss X. Renders once under the Today
 * SpentKeptChips for a pending first-run message (see useFirstRunRibbon),
 * whatever door produced it; the props here carry no door- or copy-specific
 * knowledge, so Door 3's unit can reuse this component unchanged.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { withAlpha } from '@/utils/color';

export type FirstRunRibbonProps = {
  line: string;
  onDismiss: () => void;
};

export function FirstRunRibbon({ line, onDismiss }: FirstRunRibbonProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      {/* The message reads as one accessible element (icon + line collapse
          to a single VoiceOver/TalkBack stop); the dismiss button sits
          outside this wrapper so it stays independently reachable with its
          own label, rather than being swallowed by the message's node. */}
      <View style={styles.message} accessible accessibilityLabel={line}>
        <Icon name="Sprout" size={16} color={theme.primaryDark} style={styles.icon} />
        <Text style={styles.text}>{line}</Text>
      </View>
      <Pressable
        onPress={onDismiss}
        // UX-053: was hitSlop 12 (14pt icon + 24 = ~38pt effective); raised
        // to clear the 44pt floor without growing the visible icon.
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        accessibilityRole="button"
        accessibilityLabel={strings.common.dismiss}
        style={styles.dismiss}
      >
        <Icon name="X" size={14} color={theme.mistText} />
      </Pressable>
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
