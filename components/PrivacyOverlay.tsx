import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, type AppStateStatus } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

/**
 * App-switcher privacy cover (P2-4, spec 05 section 7). The product's core
 * promise is privacy; a Kept total or a habit name surfacing in the iOS app
 * switcher is the most visible possible breach. This is a solid, opaque cover
 * (never a blur: blur can leak large numerals like the Kept hero), shown the
 * instant the app leaves 'active' and removed the instant it returns.
 *
 * No animation, on purpose: the cover must exist before the iOS snapshot is
 * taken, so a fade-in is a risk (a partially-transparent frame could be the
 * one that gets snapshotted), not a feature. State is set synchronously in
 * the AppState listener with no timers in between.
 *
 * Mounted once at the app root (app/_layout.tsx), above the Stack, so it
 * covers every screen regardless of navigation state.
 */
export function PrivacyOverlay() {
  const theme = useTheme();
  const styles = createStyles(theme);
  // 'active' is the only state where the app is in the foreground and safe to
  // show; both 'inactive' (iOS transitional state, present during the
  // app-switcher snapshot) and 'background' must be covered.
  const [covered, setCovered] = useState(AppState.currentState !== 'active');
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      appState.current = next;
      setCovered(next !== 'active');
    });
    return () => sub.remove();
  }, []);

  if (!covered) return null;

  return (
    <View style={styles.cover} pointerEvents="none">
      <View style={styles.wordmarkDot}>
        <Text style={styles.wordmarkDotText}>¢</Text>
      </View>
      <Text style={styles.wordmarkText}>HabitCents</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    cover: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
      elevation: 999,
    },
    wordmarkDot: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    wordmarkDotText: {
      color: theme.white,
      fontSize: 22,
      fontWeight: '800',
    },
    wordmarkText: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
  });
}
