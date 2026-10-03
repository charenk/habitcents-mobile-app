import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import { Icon, type IconName } from './Icon';

export type ScreenHeaderAction = {
  icon: IconName;
  label: string;
  onPress: () => void;
};

export type ScreenHeaderProps = {
  title?: string;
  eyebrow?: string;
  actions?: ScreenHeaderAction[];
  /**
   * Present on every pushed route (profile, habit detail, category detail).
   * Renders the 40pt pill back button ahead of the title and switches the
   * header into "pushed" mode: it draws its own top inset instead of relying
   * on a parent container, so it can sit as the first child of the screen's
   * ScrollView content and travel with it. That is deliberate: the header
   * used to be a native transparent Stack.Screen header floating above a
   * ScrollView whose clearance was hardcoded padding on `style` (magic 44),
   * which let the serif title slide under the back control on scroll and
   * never respected Dynamic Type. Tabs never pass this, so their layout is
   * unchanged (see ADR 0019, design/header-unification U1).
   */
  onBack?: () => void;
};

/**
 * ScreenHeader: the one header every tab, and now every pushed route,
 * renders through.
 *
 * Before this, each tab hand-rolled its own title block and the paddings
 * quietly drifted apart (Money's paddingTop 8 versus 16 everywhere else,
 * Today's eyebrow above the title instead of below), so the serif title
 * visibly jumped a few points every time you switched tabs. One component,
 * one set of paddings, no jump.
 *
 * The eyebrow sits below the title, not above it: the title is the thing a
 * user reads first. Uppercasing lives here so strings.ts keeps storing
 * sentence case, same convention as Today's section titles.
 */
export function ScreenHeader({ title, eyebrow, actions, onBack }: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const strings = useStrings();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    // Pushed mode also zeroes the header's own horizontal padding: pushed
    // routes render this as the first child of scroll content that already
    // carries the 20pt gutter, so the header's own 20 doubled it and the
    // back pill sat at 40pt from the edge (Charen, 2026-09-04). Tabs render
    // the header outside any padded container and keep the built-in gutter.
    <View
      style={[styles.row, onBack ? { paddingTop: insets.top + 16, paddingHorizontal: 0 } : null]}
    >
      <View style={styles.leftGroup}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed ? styles.buttonPressed : null]}
            accessibilityRole="button"
            accessibilityLabel={strings.common.back}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Icon name="ArrowLeft" size={18} color={theme.slate} />
          </Pressable>
        ) : null}

        {title ? (
          <View style={styles.titleColumn}>
            {/* Dense chrome caps Dynamic Type at 1.5x (ADA-005 pattern): past
                that the serif title wraps onto the actions column. */}
            <Text
              style={styles.title}
              accessibilityRole="header"
              maxFontSizeMultiplier={1.5}
            >
              {title}
            </Text>
            {eyebrow ? (
              <Text style={styles.eyebrow} maxFontSizeMultiplier={1.5}>
                {eyebrow}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {actions && actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.actionButton, pressed ? styles.buttonPressed : null]}
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              hitSlop={4}
            >
              <Icon name={action.icon} size={18} color={theme.slate} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
    },
    leftGroup: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    // The house press convention, finally applied to the chrome that carries
    // it everywhere (2026-09-10). Both controls were TouchableOpacity on its
    // default opacity fade, so the app's most-touched buttons were the one
    // exception to Button.tsx's stated rule, "a pressed background swap,
    // never a scale". Snow is the same swap Button's secondary uses, and both
    // controls are white-on-cloud like a secondary button.
    buttonPressed: {
      backgroundColor: theme.snow,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleColumn: {
      flex: 1,
    },
    title: {
      fontSize: typeScale.screenTitle,
      fontFamily: theme.fonts.display,
      lineHeight: 40,
      includeFontPadding: false,
      color: theme.ink,
    },
    eyebrow: {
      marginTop: 2,
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.mistText,
      textTransform: 'uppercase',
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
