import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button, Icon } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

type GracefulFailureProps = {
  onTryDifferentExport: () => void;
  onStartLeakAudit: () => void;
  onLogByHand: () => void;
};

/**
 * "This one's on us" (spec 7, visual spec 9; restyled per redesign spec 03
 * path B). No red, no error iconography: the mark is the brand sprout in a
 * sage-light disc. Three ordered next-best actions so the flow degrades into
 * the audit path rather than dead-ending. Copy is unchanged.
 */
export function GracefulFailure({
  onTryDifferentExport,
  onStartLeakAudit,
  onLogByHand,
}: GracefulFailureProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.mark}>
        <Icon name="Sprout" size={22} color={theme.primaryDark} />
      </View>
      <Text style={styles.title}>{strings.leakScan.failureTitle}</Text>
      <Text style={styles.body}>{strings.leakScan.failureBody}</Text>

      <View style={styles.actions}>
        <Button label={strings.leakScan.failureTryDifferentExport} onPress={onTryDifferentExport} />
        <Text style={styles.hint}>{strings.leakScan.failureTryDifferentExportHint}</Text>

        <Button
          label={strings.leakScan.failureStartLeakAudit}
          onPress={onStartLeakAudit}
          variant="secondary"
        />

        <Button
          label={strings.leakScan.failureLogByHand}
          onPress={onLogByHand}
          variant="tertiary"
        />
      </View>
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.background,
      padding: 24,
      justifyContent: 'center',
    },
    mark: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: radii.pill,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    title: {
      fontSize: 30,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      textAlign: 'center',
      lineHeight: 34,
      marginBottom: 12,
    },
    body: {
      fontSize: 14,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 24,
    },
    actions: {
      gap: 8,
    },
    hint: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      textAlign: 'center',
      marginBottom: 8,
      paddingHorizontal: 8,
      lineHeight: 18,
    },
  });
}
