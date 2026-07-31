/**
 * Dev-only floating control to load or clear the sample account
 * (data/devSeed). Renders null in production, so it is fully stripped from
 * release bundles and never appears for users. Placed bottom-left, above the
 * tab bar, deliberately small and low-contrast to stay out of the way while
 * checking real screens.
 */
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { seedDevData, clearDevData } from '@/data/devSeed';

export function DevSeedButton() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  if (!__DEV__) return null;

  const run = (fn: () => Promise<void>) => async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      // The reload inside fn tears this component down; this is only reached if
      // seeding threw before reload.
      setBusy(false);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 180 }]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Load sample data"
          onPress={run(seedDevData)}
          style={styles.seed}
        >
          <Text style={styles.seedText}>Seed</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear all data"
          onPress={run(clearDevData)}
          style={styles.clear}
        >
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Pinned to the right edge below the header band: primary CTAs live along the
  // bottom of most screens and titles along the top, so this is the one strip
  // that stays clear on every screen.
  host: { position: 'absolute', right: 8 },
  row: { flexDirection: 'column', gap: 6, opacity: 0.75 },
  seed: {
    backgroundColor: '#1A1D23',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  seedText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  clear: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EDF2',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearText: { color: '#8898AA', fontSize: 11, fontWeight: '700' },
});
