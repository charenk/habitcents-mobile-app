import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { Icon, type IconName } from './Icon';

export type ScreenHeaderAction = {
  icon: IconName;
  label: string;
  onPress: () => void;
};

export type ScreenHeaderProps = {
  title: string;
  eyebrow?: string;
  actions?: ScreenHeaderAction[];
};

/**
 * ScreenHeader: the one header every tab renders through.
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
export function ScreenHeader({ title, eyebrow, actions }: ScreenHeaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <View style={styles.titleColumn}>
        {/* Dense chrome caps Dynamic Type at 1.5x (ADA-005 pattern): past that
            the serif title wraps onto the actions column. */}
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.5}
        >
          {title}
        </Text>
        {eyebrow ? (
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.5}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
      </View>

      {actions && actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionButton}
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              hitSlop={4}
            >
              <Icon name={action.icon} size={18} color={theme.slate} />
            </TouchableOpacity>
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
      color: theme.mist,
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
