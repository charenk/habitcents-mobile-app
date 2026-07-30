import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { withAlpha } from '@/utils/color';

type EmojiTileSize = 36 | 40 | 44 | 48;

type EmojiTileProps = {
  emoji: string;
  size?: EmojiTileSize;
  /** Category identity color; the tile fills with this color at 12% alpha. */
  color: string;
  /**
   * Spoken label for the tile. When omitted, the tile is treated as decorative
   * (the surrounding row already names the category) and hidden from a11y.
   */
  accessibilityLabel?: string;
};

/**
 * A category emoji centered in a tinted square tile. The emoji never floats
 * outside a tile (design/redesign-handoff/01-tokens-and-foundations.md, §5).
 */
export function EmojiTile({ emoji, size = 36, color, accessibilityLabel }: EmojiTileProps) {
  const decorative = accessibilityLabel == null;

  const styles = useMemo(() => {
    const borderRadius = size <= 40 ? 10 : 14;
    return StyleSheet.create({
      tile: {
        width: size,
        height: size,
        borderRadius,
        backgroundColor: withAlpha(color, 0.12),
        alignItems: 'center',
        justifyContent: 'center',
      },
      emoji: {
        fontSize: Math.round(size * 0.5),
        textAlign: 'center',
        includeFontPadding: false,
      },
    });
  }, [size, color]);

  return (
    <View
      style={styles.tile}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={decorative ? 'no' : 'yes'}
    >
      <Text style={styles.emoji} importantForAccessibility="no">
        {emoji}
      </Text>
    </View>
  );
}
