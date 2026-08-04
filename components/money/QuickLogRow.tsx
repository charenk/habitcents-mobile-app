/**
 * QuickLogRow (redesign U5, ADR 0019, DI-5): the amount-first quick-log card,
 * extracted verbatim from the old Today screen footer so the Spent view can
 * mount it directly. The five-category-tile row moves with it, gated behind
 * `showCategoryTiles` (default false, spec 04 "Today" 3): the log sheet's own
 * category picker covers that choice now, so Today ships without the tiles.
 * The prop and the tile markup both stay so a one-line flip is a real revert,
 * not a rebuild.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { Icon } from '@/components/ui/Icon';
import { categoryEmoji, categoryIdentityColor } from '@/constants/categoryEmoji';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { Category } from '@/types/category';
import type { ExpenseCategory } from '@/types/expense';

/** Pads the 40pt quick-log tiles out to the 44pt minimum touch target. */
const QUICK_TILE_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

export type QuickLogRowProps = {
  onOpenSheet: (category?: ExpenseCategory) => void;
  categories: Category[];
  /** Ships false (ADR 0019): the log sheet's picker covers category choice. Kept for one-line revert. */
  showCategoryTiles?: boolean;
};

export function QuickLogRow({
  onOpenSheet,
  categories,
  showCategoryTiles = false,
}: QuickLogRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.quickLogCard}>
      <View style={styles.quickLogHeader}>
        <Text style={styles.eyebrow}>{strings.today.quickLogEyebrow.toUpperCase()}</Text>
        <Text style={styles.quickLogHint}>{strings.today.quickLogHint}</Text>
      </View>
      <View style={styles.quickLogAmountRow}>
        {/* The big zero is the obvious thing to tap, so it opens the sheet
            too; the plus stays for anyone who reads it as the only control. */}
        <Pressable
          style={styles.quickLogAmountTap}
          onPress={() => onOpenSheet(undefined)}
          accessibilityRole="button"
          accessibilityLabel={strings.today.quickLogOpenLabel}
        >
          <AmountDisplay valueCents={0} size={40} zeroAsPlaceholder />
        </Pressable>
        <TouchableOpacity
          style={styles.quickLogPlus}
          onPress={() => onOpenSheet(undefined)}
          accessibilityRole="button"
          accessibilityLabel={strings.today.quickLogOpenLabel}
        >
          <Icon name="Plus" size={22} color={theme.white} />
        </TouchableOpacity>
      </View>
      {showCategoryTiles ? (
        <View style={styles.quickLogTiles}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onOpenSheet(cat.name as ExpenseCategory)}
              accessibilityRole="button"
              accessibilityLabel={strings.today.quickLogCategoryLabel(cat.name)}
              // 40pt tiles with a 10pt gap: 4pt of slop all round reaches the
              // 44pt minimum without touching the neighbouring tile.
              hitSlop={QUICK_TILE_HIT_SLOP}
            >
              <EmojiTile
                emoji={categoryEmoji(cat.name)}
                size={40}
                color={categoryIdentityColor(cat.name)}
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.quickLogMore}
            onPress={() => onOpenSheet(undefined)}
            accessibilityRole="button"
            accessibilityLabel={strings.today.quickLogMoreLabel}
            hitSlop={QUICK_TILE_HIT_SLOP}
          >
            <Text style={styles.quickLogMoreText}>...</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.mist,
    },
    quickLogCard: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    quickLogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    quickLogHint: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.uiMedium,
      color: theme.primaryDark,
    },
    quickLogAmountRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    // Takes the row's free width so the whole left side of the card opens the
    // sheet, not just the glyphs. No visual change: the amount still sits on
    // the baseline it did before.
    quickLogAmountTap: {
      flex: 1,
      minHeight: 44,
      justifyContent: 'flex-end',
    },
    quickLogPlus: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLogTiles: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
    },
    quickLogMore: {
      width: 40,
      height: 40,
      borderRadius: radii.control,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLogMoreText: {
      fontSize: 16,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.mist,
      marginTop: -6,
    },
  });
}
