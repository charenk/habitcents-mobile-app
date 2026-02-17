import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function HabitsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today</Text>
        <Text style={styles.headerSubtitle}>0 / 0 completed</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.placeholder}>Coming soon</Text>
        <Text style={styles.hint}>Your daily habits will appear here.</Text>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 16,
    },
    header: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.white,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: 4,
    },
    section: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 40,
    },
    placeholder: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    hint: {
      fontSize: 14,
      color: theme.textSecondary,
    },
  });
}
